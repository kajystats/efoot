require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { Pool } = require("pg");

const app = express();
app.use(express.json({ limit: "100kb" }));
const allowed = (process.env.CORS_ORIGINS || "*").split(",").map(s => s.trim());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Origin non autorisée par CORS"));
  }
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
const API_BASE = `https://${process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io"}`;

app.get("/api/health", async (_req, res) => {
  let database = "not-configured";
  try { await pool.query("SELECT 1"); database = "ok"; } catch (_) { database = "error"; }
  res.status(200).json({ status: "ok", service: "euro-football-intelligence-api", database, providerConfigured: Boolean(process.env.API_FOOTBALL_KEY), timestamp: new Date().toISOString() });
});

async function providerGet(path) {
  if (!process.env.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY n'est pas configurée.");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Fournisseur football : HTTP ${response.status}`);
  const body = await response.json();
  if (body.errors && Object.keys(body.errors).length) throw new Error(`Erreur fournisseur : ${JSON.stringify(body.errors)}`);
  return body;
}

function normalizeFixture(f) {
  const home = f.teams?.home || {}, away = f.teams?.away || {};
  const league = f.league || {};
  const kickoff = f.fixture?.date || null;
  const goals = f.goals || {};
  const status = f.fixture?.status?.short || "NS";
  return {
    external_id: f.fixture?.id,
    league_external_id: league.id,
    league_name: league.name || "Compétition",
    country: league.country || null,
    season: league.season || null,
    home_external_id: home.id,
    home_name: home.name || "Équipe domicile",
    home_logo: home.logo || null,
    away_external_id: away.id,
    away_name: away.name || "Équipe extérieure",
    away_logo: away.logo || null,
    kickoff,
    status,
    home_score: Number.isInteger(goals.home) ? goals.home : null,
    away_score: Number.isInteger(goals.away) ? goals.away : null,
    raw: f
  };
}

async function upsertFixture(f) {
  const c = await pool.query(
    `INSERT INTO competitions(external_id,name,country,season)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(external_id) DO UPDATE SET name=EXCLUDED.name,country=EXCLUDED.country,season=EXCLUDED.season
     RETURNING id`,
    [f.league_external_id, f.league_name, f.country, f.season]
  );
  const h = await pool.query(
    `INSERT INTO teams(external_id,name,country,logo_url) VALUES($1,$2,$3,$4)
     ON CONFLICT(external_id) DO UPDATE SET name=EXCLUDED.name,logo_url=EXCLUDED.logo_url
     RETURNING id`,
    [f.home_external_id, f.home_name, f.country, f.home_logo]
  );
  const a = await pool.query(
    `INSERT INTO teams(external_id,name,country,logo_url) VALUES($1,$2,$3,$4)
     ON CONFLICT(external_id) DO UPDATE SET name=EXCLUDED.name,logo_url=EXCLUDED.logo_url
     RETURNING id`,
    [f.away_external_id, f.away_name, f.country, f.away_logo]
  );
  await pool.query(
    `INSERT INTO matches(external_id,competition_id,home_team_id,away_team_id,kickoff,status,home_score,away_score,raw_provider_data,synced_at,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
     ON CONFLICT(external_id) DO UPDATE SET competition_id=EXCLUDED.competition_id,home_team_id=EXCLUDED.home_team_id,
     away_team_id=EXCLUDED.away_team_id,kickoff=EXCLUDED.kickoff,status=EXCLUDED.status,
     home_score=EXCLUDED.home_score,away_score=EXCLUDED.away_score,raw_provider_data=EXCLUDED.raw_provider_data,
     synced_at=NOW(),updated_at=NOW()`,
    [f.external_id,c.rows[0].id,h.rows[0].id,a.rows[0].id,f.kickoff,f.status,f.home_score,f.away_score,f.raw]
  );
}

async function logSync(task, status, count, message, started) {
  try {
    await pool.query(
      `INSERT INTO api_sync_logs(provider,task_name,status,records_count,message,started_at,finished_at)
       VALUES($1,$2,$3,$4,$5,$6,NOW())`,
      ["API-Football", task, status, count, message || null, started]
    );
  } catch (e) { console.error("Unable to save sync log:", e.message); }
}

async function syncFixtures() {
  const started = new Date();
  let count = 0;
  try {
    const from = new Date();
    const to = new Date(Date.now() + 7 * 86400000);
    const date = d => d.toISOString().slice(0, 10);
    // Provider quota and coverage depend on the account. Limit this request to a short window.
    const data = await providerGet(`/fixtures?from=${date(from)}&to=${date(to)}`);
    for (const raw of (data.response || [])) {
      const f = normalizeFixture(raw);
      if (!f.external_id || !f.league_external_id || !f.home_external_id || !f.away_external_id) continue;
      await upsertFixture(f);
      count++;
    }
    await logSync("fixture-sync", "success", count, "Synchronisation terminée", started);
    return { count };
  } catch (e) {
    await logSync("fixture-sync", "error", count, e.message, started);
    console.error("Fixture sync failed:", e.message);
    throw e;
  }
}

function probabilitiesFor(match) {
  // Baseline placeholder: intentionally neutral until a validated statistical model is implemented.
  // Do not market these defaults as trained predictions.
  return { home_probability: 0.34, draw_probability: 0.33, away_probability: 0.33 };
}

app.get("/api/matches", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || "100", 10) || 100, 1), 250);
    const result = await pool.query(
      `SELECT m.id,m.external_id,m.kickoff,m.status,m.home_score,m.away_score,
       ht.name AS home_name,at.name AS away_name,c.name AS league_name,c.country,
       EXTRACT(EPOCH FROM m.kickoff)*1000 AS kickoff_ms
       FROM matches m JOIN teams ht ON ht.id=m.home_team_id JOIN teams at ON at.id=m.away_team_id
       LEFT JOIN competitions c ON c.id=m.competition_id
       WHERE m.kickoff >= NOW()-INTERVAL '2 days'
       ORDER BY m.kickoff ASC LIMIT $1`, [limit]);
    const data = result.rows.map(m => ({
      ...m,
      kickoff: m.kickoff,
      date_group: new Date(m.kickoff).toDateString() === new Date().toDateString() ? "Aujourd'hui" : "Demain",
      status: ["FT","AET","PEN"].includes(m.status) ? "Terminé" : ["1H","2H","HT","LIVE","ET"].includes(m.status) ? "En direct" : "À venir",
      ...probabilitiesFor(m),
      predicted_score: "—",
      exact_scores: []
    }));
    res.json({ data, source: "database", updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: "Impossible de lire les matchs. Vérifiez DATABASE_URL et exécutez le schéma SQL." });
  }
});

app.get("/api/matches/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const r = await pool.query(
      `SELECT m.*,ht.name AS home_name,at.name AS away_name,c.name AS league_name,c.country
       FROM matches m JOIN teams ht ON ht.id=m.home_team_id JOIN teams at ON at.id=m.away_team_id
       LEFT JOIN competitions c ON c.id=m.competition_id WHERE m.id=$1 OR m.external_id=$1 LIMIT 1`, [id]);
    if (!r.rowCount) return res.status(404).json({ error: "Match introuvable" });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(503).json({ error: "Erreur de lecture du match" }); }
});

app.get("/api/admin/jobs", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id,provider,task_name,status,records_count,message,started_at,finished_at FROM api_sync_logs ORDER BY started_at DESC LIMIT 50");
    res.json({ data: r.rows });
  } catch (e) { res.status(503).json({ error: "Impossible de lire les journaux de synchronisation" }); }
});

// Avoid overlapping scheduled runs. Provider quotas must be checked before increasing frequency.
let syncRunning = false;
const schedule = process.env.FIXTURE_SYNC_CRON || "15 3 * * *";
if (cron.validate(schedule)) {
  cron.schedule(schedule, async () => {
    if (syncRunning) return;
    syncRunning = true;
    try { await syncFixtures(); } finally { syncRunning = false; }
  }, { timezone: "Africa/Abidjan" });
} else {
  console.error("FIXTURE_SYNC_CRON invalide; la tâche planifiée n'a pas été activée.");
}

app.post("/api/admin/sync", async (_req, res) => {
  // Protect this route before exposing it publicly. Disabled by default.
  if (process.env.ENABLE_MANUAL_SYNC !== "true") return res.status(403).json({ error: "Synchronisation manuelle désactivée." });
  try { res.json({ ok: true, ...(await syncFixtures()) }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Euro Football Intelligence API listening on port ${port}`));
