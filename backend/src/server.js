// Variables directement fournies par Render
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const cron = require('node-cron');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Sécurité & Parsing ────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS — Autorise uniquement ton frontend
const allowedOrigins = [
  'https://kajystats.github.io',
  'https://kajystats.github.io/efoot',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(new Error('Origine non autorisée'), false);
    }
  },
  credentials: true
}));

// ── Connexion PostgreSQL ───────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000
});

pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connecté'))
  .catch(err => console.error('❌ Erreur BDD :', err.message));

// ── Routes ─────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      mode: process.env.NODE_ENV || 'development',
      database: 'connected',
      demo: !process.env.API_FOOTBALL_KEY,
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, fixture_id, home_team, away_team,
             match_date, competition, status,
             prediction_home, prediction_draw, prediction_away
      FROM matches ORDER BY match_date DESC LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur /api/matches :', err);
    res.status(500).json({ error: 'Impossible de récupérer les matchs' });
  }
});

// ── Synchronisation API-Football ───────────────
async function syncMatches() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    console.log('⚠️  Clé API-Football absente — synchronisation ignorée');
    return;
  }
  try {
    const res = await fetch(
      'https://v3.football.api-sports.io/fixtures?next=10',
      { headers: { 'x-apisports-key': key } }
    );
    const data = await res.json();
    console.log(`📥 ${data?.response?.length || 0} match(s) récupéré(s)`);
  } catch (err) {
    console.error('Erreur synchro API :', err.message);
  }
}

const cronSchedule = process.env.CRON_SYNC_MATCHES || '0 */6 * * *';
if (cron.validate(cronSchedule)) {
  cron.schedule(cronSchedule, syncMatches);
  console.log(`⏰ Tâche cron activée : ${cronSchedule}`);
} else {
  console.warn('⚠️  Format CRON invalide — tâche désactivée');
}

// ── Démarrage ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 EFOOT Backend : port ${PORT}`);
  console.log(`🔗 Healthcheck : /api/health`);
  if (!process.env.API_FOOTBALL_KEY) {
    console.log('ℹ️  Mode démo — données exemples');
  }
});

module.exports = { pool };
