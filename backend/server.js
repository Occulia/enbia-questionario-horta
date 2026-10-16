// Questionário de Levantamento de Processos — Município da Horta (Enbia)
// Servidor Express: serve o formulário público, sincroniza com PostgreSQL (CT 106) e expõe /admin protegido.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { migrate } = require('./migrate');
const { pool } = require('./db');
const {
  str,
  computeStats,
  plainText,
  levantamentosJson,
  buildFilledHtml,
} = require('./questions');
const {
  getState,
  saveState,
  createSubmission,
  listSubmissions,
  getSubmissionById,
} = require('./store');

process.on('unhandledRejection', (e) => console.error('[server] unhandledRejection:', e && e.message));

const app = express();
const PORT = parseInt(process.env.PORT || '4400', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Credenciais da área de administração
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Enb_516571516';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(ADMIN_USER + ':' + ADMIN_PASS + ':enbia-horta-secret').digest('hex');

const FRONTEND_DIR = process.env.FRONTEND_DIR
  || [path.join(__dirname, 'frontend'), path.join(__dirname, '..', 'frontend')]
       .find((p) => fs.existsSync(path.join(p, 'index.html')))
  || path.join(__dirname, 'frontend');

const PRISTINE_PATH = path.join(FRONTEND_DIR, 'pristine-template.html');

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ---------- Helpers de autenticação Admin ----------
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAdminToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 dias
  const payload = `${ADMIN_USER}.${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [user, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!exp || Date.now() > exp) return false;
  if (!safeEqual(user, ADMIN_USER)) return false;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(`${user}.${expStr}`).digest('hex');
  return safeEqual(sig, expected);
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  if (verifyAdminToken(cookies.enbia_admin_token)) return true;

  // Suporte também a HTTP Basic Auth (ex.: curl -u admin:Enb_516571516)
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep >= 0) {
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (safeEqual(u, ADMIN_USER) && safeEqual(p, ADMIN_PASS)) return true;
    }
  }
  return false;
}

function requireAdminApi(req, res, next) {
  if (isAdminAuthenticated(req)) return next();
  return res.status(401).json({ ok: false, error: 'Não autenticado' });
}

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

// ---------- Healthchecks ----------
app.get('/health', (_req, res) => res.json({ ok: true, service: 'enbia-questionario-horta' }));

app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'up' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', error: e.message });
  }
});

// ---------- API Pública do Questionário ----------
app.get('/api/questionnaire', async (_req, res) => {
  try {
    const st = await getState('horta');
    const stats = computeStats(st.answers);
    res.json({
      ok: true,
      slug: st.slug,
      status: st.status,
      answers: st.answers,
      answeredCount: stats.answeredCount,
      totalCount: stats.totalCount,
      updatedAt: st.updatedAt,
      submittedAt: st.submittedAt,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/api/questionnaire', async (req, res) => {
  try {
    const answers = req.body && req.body.answers ? req.body.answers : req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ ok: false, error: 'Payload inválido' });
    }
    const saved = await saveState(answers, { slug: 'horta', markSubmitted: false });
    res.json({
      ok: true,
      status: saved.status,
      updatedAt: saved.updatedAt,
      submittedAt: saved.submittedAt,
      answeredCount: saved.answeredCount,
      totalCount: saved.totalCount,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Suporte a navigator.sendBeacon / keepalive quando o utilizador fecha o separador
app.post('/api/questionnaire/beacon', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
  try {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const answers = parsed && parsed.answers ? parsed.answers : parsed;
    if (answers && typeof answers === 'object') {
      await saveState(answers, { slug: 'horta', markSubmitted: false });
    }
    res.status(204).end();
  } catch (_e) {
    res.status(204).end();
  }
});

app.post('/api/questionnaire/submit', async (req, res) => {
  try {
    const answers = req.body && req.body.answers ? req.body.answers : req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ ok: false, error: 'Payload inválido' });
    }
    if (!str(answers.id_nome)) {
      return res.status(400).json({
        ok: false,
        error: 'Indique o seu nome em Identificação antes de submeter.',
      });
    }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 300);

    const sub = await createSubmission(answers, {
      slug: 'horta',
      kind: 'submit',
      ip,
      userAgent,
    });

    res.json({
      ok: true,
      submissionId: sub.submissionId,
      submittedAt: sub.createdAt,
      answeredCount: sub.answeredCount,
      totalCount: sub.totalCount,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- API & Páginas Admin ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASS)) {
    const token = createAdminToken();
    res.setHeader(
      'Set-Cookie',
      `enbia_admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Utilizador ou palavra-passe incorretos.' });
});

app.post('/api/admin/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'enbia_admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/admin/overview', requireAdminApi, async (_req, res) => {
  try {
    const st = await getState('horta');
    const stats = computeStats(st.answers);
    const submissions = await listSubmissions('horta');
    res.json({
      ok: true,
      state: {
        slug: st.slug,
        status: st.status,
        updatedAt: st.updatedAt,
        submittedAt: st.submittedAt,
        source: st.source,
        coordinator: {
          nome: str(st.answers.id_nome),
          cargo: str(st.answers.id_cargo),
          servico: str(st.answers.id_servico),
          email: str(st.answers.id_email),
          tel: str(st.answers.id_tel),
        },
        sectionResponders: {
          r1: str(st.answers.r1),
          r2: str(st.answers.r2),
          r3: str(st.answers.r3),
        },
        prioridade: str(st.answers['4.1']),
        answeredCount: stats.answeredCount,
        totalCount: stats.totalCount,
        sections: stats.sections,
        answers: st.answers,
      },
      submissions,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function resolveTargetAnswers(req) {
  const subId = req.query.submissionId;
  if (subId) {
    const sub = await getSubmissionById(subId);
    if (sub && sub.answers) return sub.answers;
  }
  const st = await getState('horta');
  return st.answers;
}

app.get('/api/admin/download/html', requireAdminApi, async (req, res) => {
  try {
    const A = await resolveTargetAnswers(req);
    const templatePath = fs.existsSync(PRISTINE_PATH) ? PRISTINE_PATH : path.join(FRONTEND_DIR, 'index.html');
    const pristine = fs.readFileSync(templatePath, 'utf8');
    const html = buildFilledHtml(A, pristine);
    const filename = `Questionario_Horta_respostas_${stamp()}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (e) {
    res.status(500).send('Erro ao gerar ficheiro HTML: ' + e.message);
  }
});

app.get('/api/admin/download/levantamentos', requireAdminApi, async (req, res) => {
  try {
    const A = await resolveTargetAnswers(req);
    const data = levantamentosJson(A);
    const filename = `Levantamento_Horta_questionario_${stamp()}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (e) {
    res.status(500).send('Erro ao gerar JSON Levantamentos: ' + e.message);
  }
});

app.get('/api/admin/download/txt', requireAdminApi, async (req, res) => {
  try {
    const A = await resolveTargetAnswers(req);
    const txt = plainText(A);
    const filename = `Questionario_Horta_respostas_${stamp()}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(txt);
  } catch (e) {
    res.status(500).send('Erro ao gerar ficheiro de texto: ' + e.message);
  }
});

app.get('/api/admin/download/raw', requireAdminApi, async (req, res) => {
  try {
    const A = await resolveTargetAnswers(req);
    const filename = `Questionario_Horta_raw_${stamp()}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(A, null, 2));
  } catch (e) {
    res.status(500).send('Erro ao gerar JSON: ' + e.message);
  }
});

// Página /admin (entrega admin.html, que apresenta login se não autenticado ou o painel completo)
app.get(['/admin', '/admin/'], (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

// Ficheiros estáticos e página principal do questionário
app.use(express.static(FRONTEND_DIR, { index: false }));
app.get('/', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

async function start() {
  try {
    await migrate();
  } catch (e) {
    console.warn('[server] migrate Postgres falhou (a correr com persistência local em /data):', e.message);
  }
  app.listen(PORT, HOST, () => {
    console.log(`[server] Enbia Questionário Horta ativo em http://${HOST}:${PORT}`);
  });
}

start();
