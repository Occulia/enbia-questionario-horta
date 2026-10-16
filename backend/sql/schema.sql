-- Schema idempotente para o Questionário de Processos do Município da Horta (Enbia)
-- Corre automaticamente no arranque da aplicação (migrate.js) na BD da CT 106 (192.168.1.3:5432).

CREATE TABLE IF NOT EXISTS questionnaire_state (
  slug             TEXT PRIMARY KEY DEFAULT 'horta',
  status           TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'submitted'
  id_nome          TEXT,
  id_cargo         TEXT,
  id_servico       TEXT,
  id_email         TEXT,
  id_tel           TEXT,
  r1_responsavel   TEXT,
  r2_responsavel   TEXT,
  r3_responsavel   TEXT,
  prioridade       TEXT,
  answered_count   INTEGER NOT NULL DEFAULT 0,
  total_count      INTEGER NOT NULL DEFAULT 52,
  answers          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS questionnaire_submissions (
  id                  BIGSERIAL PRIMARY KEY,
  slug               TEXT NOT NULL DEFAULT 'horta',
  kind               TEXT NOT NULL DEFAULT 'submit', -- 'submit' | 'snapshot'
  id_nome            TEXT,
  id_cargo           TEXT,
  id_servico         TEXT,
  id_email           TEXT,
  id_tel             TEXT,
  r1_responsavel     TEXT,
  r2_responsavel     TEXT,
  r3_responsavel     TEXT,
  prioridade         TEXT,
  answered_count     INTEGER NOT NULL DEFAULT 0,
  total_count        INTEGER NOT NULL DEFAULT 52,
  answers            JSONB NOT NULL DEFAULT '{}'::jsonb,
  plain_text         TEXT,
  levantamentos_json JSONB,
  ip_address         TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_q_submissions_slug_created
  ON questionnaire_submissions (slug, created_at DESC);
