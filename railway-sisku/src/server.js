'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { getConfig } = require('./config');
const { getPool, closePool } = require('./db');
const { verifyPin, hashPin, createSessionToken, parseCookies, sha256 } = require('./security');

const config = getConfig();
const pool = getPool();
const app = express();
const publicDir = path.join(__dirname, 'public');
const cookieName = config.production ? '__Host-sisku_session' : 'sisku_session';

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '32kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 'error', message: 'Terlalu banyak percobaan. Coba kembali 15 menit lagi.' }
});

function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.get('host')) return next();
  } catch (_) {}
  return res.status(403).json({ status: 'error', message: 'Origin permintaan tidak diizinkan.' });
}

function setSessionCookie(res, token) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict',
    path: '/',
    maxAge: config.sessionHours * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict',
    path: '/'
  });
}

async function sessionUser(req) {
  const token = parseCookies(req.headers.cookie)[cookieName];
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.username, u.role, u.full_name, u.class_code, u.student_nis, s.id AS session_id
       FROM user_sessions s
       JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.active = true
      LIMIT 1`,
    [sha256(token)]
  );
  if (!result.rowCount) return null;
  pool.query('UPDATE user_sessions SET last_seen_at = now() WHERE id = $1', [result.rows[0].session_id]).catch(() => {});
  return result.rows[0];
}

async function requireAuth(req, res, next) {
  try {
    req.user = await sessionUser(req);
    if (!req.user) return res.status(401).json({ status: 'error', message: 'Sesi telah berakhir. Silakan masuk kembali.' });
    next();
  } catch (error) {
    next(error);
  }
}

app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (req, res) => {
  try {
    await pool.query("SELECT 1 FROM schema_migrations WHERE version = '001_initial.sql'");
    res.json({ status: 'ready' });
  } catch (_) {
    res.status(503).json({ status: 'not_ready' });
  }
});

app.post('/api/v1/auth/login', sameOrigin, loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body && req.body.username || '').trim().toLowerCase();
    const pin = String(req.body && req.body.pin || '').trim();
    if (!username || username.length > 120 || !pin || pin.length > 64) {
      return res.status(400).json({ status: 'error', message: 'NIS / Username dan PIN wajib diisi.' });
    }
    const result = await pool.query(
      `SELECT id, username, pin_hash, role, full_name, class_code, student_nis
         FROM app_users
        WHERE active = true
          AND (lower(username) = $1 OR (role = 'ortu' AND student_nis = $1))
        ORDER BY CASE WHEN lower(username) = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [username]
    );
    const user = result.rows[0];
    const verification = user ? await verifyPin(pin, user.pin_hash) : { valid: false };
    if (!user || !verification.valid) {
      return res.status(401).json({ status: 'error', message: 'NIS / Username atau PIN tidak sesuai.' });
    }

    if (verification.needsUpgrade) {
      const upgraded = await hashPin(pin);
      await pool.query(
        'UPDATE app_users SET pin_hash = $1, pin_upgraded_at = now(), updated_at = now() WHERE id = $2',
        [upgraded, user.id]
      );
    }
    const session = createSessionToken();
    const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO user_sessions(id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
      [crypto.randomUUID(), user.id, session.tokenHash, expiresAt]
    );
    await pool.query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id)
       VALUES ($1, 'LOGIN', 'user', $2)`,
      [user.id, user.id]
    );
    setSessionCookie(res, session.token);
    res.json({
      status: 'ok',
      user: { username: user.username, role: user.role, name: user.full_name, classCode: user.class_code }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/auth/me', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    user: {
      username: req.user.username,
      role: req.user.role,
      name: req.user.full_name,
      classCode: req.user.class_code,
      nis: req.user.student_nis
    }
  });
});

app.post('/api/v1/auth/logout', sameOrigin, requireAuth, async (req, res, next) => {
  try {
    await pool.query('UPDATE user_sessions SET revoked_at = now() WHERE id = $1', [req.user.session_id]);
    await pool.query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id)
       VALUES ($1, 'LOGOUT', 'user', $2)`,
      [req.user.id, req.user.id]
    );
    clearSessionCookie(res);
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/dashboard', requireAuth, async (req, res, next) => {
  try {
    const latest = await pool.query(
      `SELECT id, source_exported_at, imported_at, sheet_count, row_count, snapshot_checksum
         FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1`
    );
    let sheets = [];
    let roles = [];
    let organization = {};
    if (latest.rowCount) {
      const importId = latest.rows[0].id;
      const [sheetResult, roleResult, orgResult] = await Promise.all([
        pool.query(
          'SELECT sheet_name AS name, row_count AS count FROM import_sheets WHERE import_id = $1 ORDER BY sheet_name',
          [importId]
        ),
        pool.query('SELECT role, count(*)::int AS count FROM app_users WHERE active = true GROUP BY role ORDER BY role'),
        pool.query(
          `SELECT row_values ->> 0 AS key, row_values ->> 1 AS value
             FROM legacy_sheet_rows
            WHERE import_id = $1 AND lower(sheet_name) = lower('Pengaturan_Organisasi')`,
          [importId]
        )
      ]);
      sheets = sheetResult.rows;
      roles = roleResult.rows;
      orgResult.rows.forEach(row => { if (row.key) organization[row.key] = row.value || ''; });
    }
    res.json({
      status: 'ok',
      appName: organization.namaSekolah || config.appName,
      organization,
      migration: latest.rows[0] || null,
      sheets,
      roles,
      modules: [
        { id: 'master', label: 'Data master', status: 'next', detail: 'Tahap berikutnya' },
        { id: 'presensi', label: 'Presensi & yaumiah', status: 'gas', detail: 'Tetap berjalan di GAS' },
        { id: 'tugas', label: 'Tugas & komunikasi', status: 'gas', detail: 'Tetap berjalan di GAS' },
        { id: 'ujian', label: 'Ujian & nilai', status: 'gas', detail: 'Dipindahkan paling akhir' }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.use('/assets', express.static(publicDir, {
  index: false,
  maxAge: config.production ? '1h' : 0,
  etag: true
}));
app.get('*splat', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/health/')) {
    return res.status(404).json({ status: 'error', message: 'Endpoint tidak ditemukan.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error('REQUEST_ERROR', { requestId: req.requestId, message: error.message });
  if (res.headersSent) return next(error);
  res.status(500).json({ status: 'error', message: 'Terjadi gangguan layanan. Coba kembali.', requestId: req.requestId });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`SISKU Railway listening on 0.0.0.0:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app };
