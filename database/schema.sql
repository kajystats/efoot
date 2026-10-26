-- Schéma EFOOT — EURO FOOTBALL INTELLIGENCE
-- Exécuter dans PostgreSQL (Supabase, local, etc.)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Compétitions ───────────────────────────────
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  nom VARCHAR(100) NOT NULL,
  pays VARCHAR(50),
  logo_url TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Équipes ────────────────────────────────────
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  nom VARCHAR(100) NOT NULL,
  nom_abr VARCHAR(20),
  logo_url TEXT,
  pays VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Matchs ─────────────────────────────────────
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER UNIQUE NOT NULL,
  competition_id INTEGER REFERENCES competitions(id),
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  match_date TIMESTAMP NOT NULL,
  competition VARCHAR(100),
  statut VARCHAR(30) DEFAULT 'scheduled',
  score_home INTEGER,
  score_away INTEGER,
  -- Prédictions probabilistes (0–100 %)
  prediction_home NUMERIC(5,2),
  prediction_draw NUMERIC(5,2),
  prediction_away NUMERIC(5,2),
  confiance NUMERIC(5,2),
  -- Métadonnées
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Historique des résultats ──────────────────
CREATE TABLE predictions_log (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  pred_home NUMERIC(5,2),
  pred_draw NUMERIC(5,2),
  pred_away NUMERIC(5,2),
  resultat_verifie VARCHAR(20),
  est_correct BOOLEAN,
  evalue_le TIMESTAMP DEFAULT NOW()
);

-- ── Index pour performances ───────────────────
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_statut ON matches(statut);
CREATE INDEX idx_matches_fixture ON matches(fixture_id);

-- ── Vue pour l'interface ──────────────────────
CREATE VIEW vw_matches_liste AS
SELECT
  id, fixture_id,
  home_team, away_team, match_date, competition, statut,
  score_home, score_away,
  prediction_home, prediction_draw, prediction_away, confiance
FROM matches
ORDER BY match_date ASC;
