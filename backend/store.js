// Camada de persistência: escreve no PostgreSQL (CT 106) e mantém espelho/fallback em /app/data/
// para garantir zero perda de dados mesmo se a BD reiniciar ou em desenvolvimento local.
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const { defaults, str, computeStats, plainText, levantamentosJson } = require('./questions');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state-horta.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions-horta.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLocalFallback() {
  try {
    ensureDataDir();
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[store] erro ao ler state local:', e.message);
  }
  return null;
}

function writeLocalFallback(stateRecord) {
  try {
    ensureDataDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(stateRecord, null, 2), 'utf8');
  } catch (e) {
    console.error('[store] erro ao gravar state local:', e.message);
  }
}

function appendLocalSubmission(subRecord) {
  try {
    ensureDataDir();
    let list = [];
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      list = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8')) || [];
    }
    list.unshift(subRecord);
    if (list.length > 200) list = list.slice(0, 200);
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('[store] erro ao gravar submissão local:', e.message);
  }
}

function readLocalSubmissions() {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8')) || [];
    }
  } catch (e) {
    console.error('[store] erro ao ler submissões locais:', e.message);
  }
  return [];
}

async function getState(slug = 'horta') {
  try {
    const { rows } = await pool.query(
      `SELECT slug, status, id_nome, id_cargo, id_servico, id_email, id_tel,
              r1_responsavel, r2_responsavel, r3_responsavel, prioridade,
              answered_count, total_count, answers, updated_at, submitted_at
         FROM questionnaire_state
        WHERE slug = $1`,
      [slug]
    );
    if (rows.length > 0) {
      const r = rows[0];
      return {
        slug: r.slug,
        status: r.status,
        answers: r.answers || defaults(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
        source: 'postgres',
      };
    }
  } catch (e) {
    console.warn('[store] getState Postgres indisponível, a usar fallback local:', e.message);
  }

  const local = readLocalFallback();
  if (local && local.answers) {
    return {
      slug,
      status: local.status || 'draft',
      answers: local.answers,
      updatedAt: local.updatedAt || null,
      submittedAt: local.submittedAt || null,
      source: 'local',
    };
  }

  const initial = defaults();
  return {
    slug,
    status: 'draft',
    answers: initial,
    updatedAt: null,
    submittedAt: null,
    source: 'defaults',
  };
}

async function saveState(answers, { slug = 'horta', markSubmitted = false } = {}) {
  const clean = Object.assign({}, defaults(), answers || {}, { _upd: Date.now() });
  if (markSubmitted) clean._exp = Date.now();
  const stats = computeStats(clean);
  const nowIso = new Date().toISOString();

  const existingLocal = readLocalFallback();
  const status = markSubmitted ? 'submitted' : (existingLocal?.status || 'draft');
  const submittedAt = markSubmitted ? nowIso : (existingLocal?.submittedAt || null);

  writeLocalFallback({
    slug,
    status,
    answeredCount: stats.answeredCount,
    totalCount: stats.totalCount,
    answers: clean,
    updatedAt: nowIso,
    submittedAt,
  });

  try {
    const { rows } = await pool.query(
      `INSERT INTO questionnaire_state (
         slug, status, id_nome, id_cargo, id_servico, id_email, id_tel,
         r1_responsavel, r2_responsavel, r3_responsavel, prioridade,
         answered_count, total_count, answers, updated_at, submitted_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $13, $14::jsonb, NOW(), CASE WHEN $15 THEN NOW() ELSE NULL END
       )
       ON CONFLICT (slug) DO UPDATE SET
         status         = CASE WHEN $15 THEN 'submitted' ELSE questionnaire_state.status END,
         id_nome        = EXCLUDED.id_nome,
         id_cargo       = EXCLUDED.id_cargo,
         id_servico     = EXCLUDED.id_servico,
         id_email       = EXCLUDED.id_email,
         id_tel         = EXCLUDED.id_tel,
         r1_responsavel = EXCLUDED.r1_responsavel,
         r2_responsavel = EXCLUDED.r2_responsavel,
         r3_responsavel = EXCLUDED.r3_responsavel,
         prioridade     = EXCLUDED.prioridade,
         answered_count = EXCLUDED.answered_count,
         total_count    = EXCLUDED.total_count,
         answers        = EXCLUDED.answers,
         updated_at     = NOW(),
         submitted_at   = CASE WHEN $15 THEN NOW() ELSE questionnaire_state.submitted_at END
       RETURNING status, updated_at, submitted_at`,
      [
        slug,
        markSubmitted ? 'submitted' : 'draft',
        str(clean.id_nome) || null,
        str(clean.id_cargo) || null,
        str(clean.id_servico) || null,
        str(clean.id_email) || null,
        str(clean.id_tel) || null,
        str(clean.r1) || null,
        str(clean.r2) || null,
        str(clean.r3) || null,
        str(clean['4.1']) || null,
        stats.answeredCount,
        stats.totalCount,
        JSON.stringify(clean),
        !!markSubmitted,
      ]
    );
    return {
      ok: true,
      status: rows[0].status,
      updatedAt: rows[0].updated_at,
      submittedAt: rows[0].submitted_at,
      answeredCount: stats.answeredCount,
      totalCount: stats.totalCount,
      answers: clean,
    };
  } catch (e) {
    console.warn('[store] saveState Postgres falhou, guardado localmente:', e.message);
    return {
      ok: true,
      status,
      updatedAt: nowIso,
      submittedAt,
      answeredCount: stats.answeredCount,
      totalCount: stats.totalCount,
      answers: clean,
    };
  }
}

async function createSubmission(answers, { slug = 'horta', kind = 'submit', ip = '', userAgent = '' } = {}) {
  const saved = await saveState(answers, { slug, markSubmitted: kind === 'submit' });
  const clean = saved.answers;
  const stats = computeStats(clean);
  const txt = plainText(clean);
  const lev = levantamentosJson(clean);
  const nowIso = new Date().toISOString();

  const localSub = {
    id: Date.now(),
    slug,
    kind,
    id_nome: str(clean.id_nome) || null,
    id_cargo: str(clean.id_cargo) || null,
    id_servico: str(clean.id_servico) || null,
    id_email: str(clean.id_email) || null,
    id_tel: str(clean.id_tel) || null,
    r1_responsavel: str(clean.r1) || null,
    r2_responsavel: str(clean.r2) || null,
    r3_responsavel: str(clean.r3) || null,
    prioridade: str(clean['4.1']) || null,
    answered_count: stats.answeredCount,
    total_count: stats.totalCount,
    answers: clean,
    created_at: nowIso,
  };
  appendLocalSubmission(localSub);

  try {
    const { rows } = await pool.query(
      `INSERT INTO questionnaire_submissions (
         slug, kind, id_nome, id_cargo, id_servico, id_email, id_tel,
         r1_responsavel, r2_responsavel, r3_responsavel, prioridade,
         answered_count, total_count, answers, plain_text, levantamentos_json,
         ip_address, user_agent
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11,
         $12, $13, $14::jsonb, $15, $16::jsonb,
         $17, $18
       ) RETURNING id, created_at`,
      [
        slug,
        kind,
        str(clean.id_nome) || null,
        str(clean.id_cargo) || null,
        str(clean.id_servico) || null,
        str(clean.id_email) || null,
        str(clean.id_tel) || null,
        str(clean.r1) || null,
        str(clean.r2) || null,
        str(clean.r3) || null,
        str(clean['4.1']) || null,
        stats.answeredCount,
        stats.totalCount,
        JSON.stringify(clean),
        txt,
        JSON.stringify(lev),
        ip || null,
        userAgent || null,
      ]
    );
    return {
      ok: true,
      submissionId: rows[0].id,
      createdAt: rows[0].created_at,
      answeredCount: stats.answeredCount,
      totalCount: stats.totalCount,
    };
  } catch (e) {
    console.warn('[store] createSubmission Postgres falhou, guardado localmente:', e.message);
    return {
      ok: true,
      submissionId: localSub.id,
      createdAt: nowIso,
      answeredCount: stats.answeredCount,
      totalCount: stats.totalCount,
    };
  }
}

async function listSubmissions(slug = 'horta') {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, kind, id_nome, id_cargo, id_servico, id_email, id_tel,
              r1_responsavel, r2_responsavel, r3_responsavel, prioridade,
              answered_count, total_count, created_at
         FROM questionnaire_submissions
        WHERE slug = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [slug]
    );
    return rows;
  } catch (e) {
    return readLocalSubmissions();
  }
}

async function getSubmissionById(id) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM questionnaire_submissions WHERE id = $1`,
      [id]
    );
    if (rows.length > 0) return rows[0];
  } catch (_e) {
    // ignore and check local
  }
  const list = readLocalSubmissions();
  return list.find(x => String(x.id) === String(id)) || null;
}

module.exports = {
  getState,
  saveState,
  createSubmission,
  listSubmissions,
  getSubmissionById,
};
