CREATE TABLE IF NOT EXISTS competitions (
  id BIGSERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  season INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  external_id INTEGER UNIQUE,
  competition_id BIGINT REFERENCES competitions(id),
  home_team_id BIGINT REFERENCES teams(id),
  away_team_id BIGINT REFERENCES teams(id),
  kickoff TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  raw_provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS matches_kickoff_idx ON matches(kickoff);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches(status);

CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id),
  model_version TEXT NOT NULL DEFAULT 'baseline-v1',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_before_kickoff BOOLEAN NOT NULL DEFAULT FALSE,
  home_probability NUMERIC(6,5) NOT NULL,
  draw_probability NUMERIC(6,5) NOT NULL,
  away_probability NUMERIC(6,5) NOT NULL,
  home_xg NUMERIC(6,3),
  away_xg NUMERIC(6,3),
  predicted_home_goals INTEGER,
  predicted_away_goals INTEGER,
  explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_probability >= 0 AND draw_probability >= 0 AND away_probability >= 0),
  CHECK (ABS(home_probability + draw_probability + away_probability - 1) < 0.01)
);
CREATE INDEX IF NOT EXISTS predictions_match_generated_idx ON predictions(match_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS prediction_settlements (
  id BIGSERIAL PRIMARY KEY,
  prediction_id BIGINT NOT NULL UNIQUE REFERENCES predictions(id),
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_outcome TEXT NOT NULL,
  predicted_outcome TEXT NOT NULL,
  brier_score NUMERIC(8,6),
  log_loss NUMERIC(8,6)
);

CREATE TABLE IF NOT EXISTS api_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
