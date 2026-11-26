'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { getConfig } = require('./config');
const { getPool, closePool } = require('./db');
const { verifyPin, hashPin, createSessionToken, parseCookies, sha256 } = require('./security');
const { syncFromGasOnce } = require('./gas-sync');
const { actionAllowed, runNativeAction } = require('./native-actions');
const {
  normalized, normalizeKey, latestImport, loadSheet, value, schoolDate,
  todayJakarta, visibleAnnouncement
} = require('./snapshot');

const config = getConfig();
const app = express();
const publicDir = path.join(__dirname, 'public');
const logoPath = fs.existsSync(path.join(publicDir, 'logo.png'))
  ? path.join(publicDir, 'logo.png')
  : path.resolve(__dirname, '..', '..', 'logo-128.png');
const cookieName = config.production ? '__Host-sisku_session' : 'sisku_session';

function db() {
  return getPool();
}

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
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
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
  const result = await db().query(
    `SELECT u.id, u.username, u.role, u.full_name, u.class_code, u.student_nis,
            s.id AS session_id
       FROM user_sessions s
       JOIN app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.active = true
      LIMIT 1`,
    [sha256(token)]
  );
  if (!result.rowCount) return null;
  db().query('UPDATE user_sessions SET last_seen_at = now() WHERE id = $1', [result.rows[0].session_id]).catch(() => {});
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

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Akun Anda tidak memiliki akses ke data ini.' });
    }
    next();
  };
}

function number(valueToParse) {
  const parsed = Number(String(valueToParse == null ? '' : valueToParse).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function httpError(status, message) {
  const error = new Error(message); error.status = status; return error;
}

function byNewest(rows, fieldNames) {
  return rows.slice().sort((left, right) => {
    const leftValue = fieldNames.map(name => value(left, name)).find(Boolean) || '';
    const rightValue = fieldNames.map(name => value(right, name)).find(Boolean) || '';
    return String(rightValue).localeCompare(String(leftValue));
  });
}

app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (req, res) => {
  try {
    await db().query('SELECT code FROM school_subjects LIMIT 0');
    res.json({ status: 'ready' });
  } catch (_) {
    res.status(503).json({ status: 'not_ready' });
  }
});

app.get('/api/v1/form-options', requireAuth, requireRoles('superadmin', 'guru', 'kepsek'), async (req, res, next) => {
  try {
    const [subjectResult, classResult, teacherResult] = await Promise.all([
      db().query('SELECT code, name FROM school_subjects WHERE active = true ORDER BY name'),
      db().query('SELECT code, name FROM school_classes WHERE active = true ORDER BY code'),
      db().query(`SELECT p.nip, u.full_name AS name FROM teacher_profiles p JOIN app_users u ON u.id = p.user_id WHERE p.active = true AND u.active = true ORDER BY u.full_name`)
    ]);
    let subjects = subjectResult.rows;
    if (req.user.role === 'guru') {
      const profile = await db().query('SELECT subjects FROM teacher_profiles WHERE user_id = $1 AND active = true', [req.user.id]);
      const assignments = normalized(profile.rows[0] && profile.rows[0].subjects).split(/[;,|\n]+/).map(normalizeKey).filter(Boolean);
      subjects = subjects.filter(item => assignments.includes(normalizeKey(item.code)) || assignments.includes(normalizeKey(item.name)));
    }
    res.json({
      status: 'ok',
      subjects,
      classes: classResult.rows,
      teachers: req.user.role === 'superadmin' ? teacherResult.rows : []
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/login', sameOrigin, loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body && req.body.username || '').trim().toLowerCase();
    const pin = String(req.body && req.body.pin || '').trim();
    if (!username || username.length > 120 || !pin || pin.length > 64) {
      return res.status(400).json({ status: 'error', message: 'NIS / Username dan PIN wajib diisi.' });
    }
    const result = await db().query(
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
      await db().query(
        'UPDATE app_users SET pin_hash = $1, pin_upgraded_at = now(), native_managed = true, updated_at = now() WHERE id = $2',
        [upgraded, user.id]
      );
    }
    const session = createSessionToken();
    const expiresAt = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
    await db().query(
      'INSERT INTO user_sessions(id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
      [crypto.randomUUID(), user.id, session.tokenHash, expiresAt]
    );
    await db().query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id)
       VALUES ($1, 'LOGIN', 'user', $2)`,
      [user.id, user.id]
    );
    setSessionCookie(res, session.token);
    res.json({
      status: 'ok',
      user: {
        username: user.username, role: user.role, name: user.full_name,
        classCode: user.class_code, nis: user.student_nis
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/auth/me', async (req, res, next) => {
  try {
    const user = await sessionUser(req);
    if (!user) return res.json({ status: 'ok', authenticated: false });
    res.json({
      status: 'ok',
      authenticated: true,
      user: {
        username: user.username,
        role: user.role,
        name: user.full_name,
        classCode: user.class_code,
        nis: user.student_nis
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/native/action', sameOrigin, requireAuth, async (req, res) => {
  const action = String(req.body && req.body.action || '').trim().toUpperCase();
  const data = req.body && req.body.data;
  if (!actionAllowed(req.user.role, action)) {
    return res.status(403).json({ status: 'error', message: 'Aksi ini tidak diizinkan untuk peran akun Anda.' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ status: 'error', message: 'Data formulir tidak valid.' });
  }
  try {
    const result = await runNativeAction(db(), req.user, action, data);
    res.json(result);
  } catch (error) {
    console.warn('NATIVE_ACTION_FAILED', { requestId: req.requestId, action, username: req.user.username, message: error.message });
    res.status(error.status || 422).json({ status: 'error', message: String(error.message || 'Perubahan belum dapat disimpan.').slice(0, 300) });
  }
});

app.post('/api/v1/auth/logout', sameOrigin, requireAuth, async (req, res, next) => {
  try {
    await db().query('UPDATE user_sessions SET revoked_at = now() WHERE id = $1', [req.user.session_id]);
    await db().query(
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

app.post('/api/v1/auth/change-pin', sameOrigin, requireAuth, async (req, res, next) => {
  try {
    const currentPin = String(req.body && req.body.currentPin || '').trim();
    const newPin = String(req.body && req.body.newPin || '').trim();
    if (!/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ status: 'error', message: 'PIN baru harus terdiri tepat dari 6 digit angka.' });
    }
    if (currentPin === newPin) {
      return res.status(400).json({ status: 'error', message: 'PIN baru harus berbeda dari PIN saat ini.' });
    }
    const result = await db().query('SELECT pin_hash FROM app_users WHERE id = $1 AND active = true', [req.user.id]);
    const verification = result.rowCount ? await verifyPin(currentPin, result.rows[0].pin_hash) : { valid: false };
    if (!verification.valid) {
      return res.status(400).json({ status: 'error', message: 'PIN saat ini tidak sesuai.' });
    }
    const nextHash = await hashPin(newPin);
    const client = await db().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE app_users SET pin_hash = $1, pin_upgraded_at = now(), native_managed = true, updated_at = now() WHERE id = $2',
        [nextHash, req.user.id]
      );
      await client.query(
        'UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL',
        [req.user.id, req.user.session_id]
      );
      await client.query(
        `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id)
         VALUES ($1, 'CHANGE_PIN', 'user', $2)`,
        [req.user.id, req.user.id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.json({ status: 'ok', message: 'PIN berhasil diperbarui.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/overview', requireAuth, async (req, res, next) => {
  try {
    const activeImport = await latestImport(db());
    if (!activeImport) return res.json({ status: 'ok', empty: true });
    const [classes, teachers, subjects, attendance, yaumiah, grades, tasks, attempts, questions, announcements, achievements, examSessions] = await Promise.all([
      db().query('SELECT code, name, homeroom_name, capacity FROM school_classes WHERE active = true').then(result => result.rows.map(row => ({ Kode_Kelas: row.code, Nama_Kelas: row.name, Wali_Kelas: row.homeroom_name, Jumlah_Siswa: row.capacity }))),
      db().query(`SELECT p.nip, p.subjects, p.homeroom_class, u.username, u.full_name FROM teacher_profiles p JOIN app_users u ON u.id = p.user_id WHERE p.active = true AND u.active = true`).then(result => result.rows.map(row => ({ NIP: row.nip, Username: row.username, Nama_Guru: row.full_name, Mata_Pelajaran: row.subjects, Wali_Kelas: row.homeroom_class }))),
      db().query('SELECT code, name, subject_group FROM school_subjects WHERE active = true').then(result => result.rows.map(row => ({ Kode_Mapel: row.code, Nama_Mapel: row.name, Kelompok: row.subject_group }))),
      loadSheet(db(), 'Presensi', activeImport.id),
      loadSheet(db(), 'Yaumiah_Log', activeImport.id),
      loadSheet(db(), 'Nilai_UAS', activeImport.id),
      loadSheet(db(), 'Tugas_Kelas', activeImport.id),
      loadSheet(db(), 'Exam_Attempts', activeImport.id),
      db().query(`SELECT id, subject, class_code, approval_status, creator_username FROM school_questions WHERE active = true`).then(result => result.rows.map(row => ({ ID_Soal: row.id, Mapel: row.subject, Kelas: row.class_code, Status_Approval: row.approval_status, Pembuat_Username: row.creator_username }))),
      loadSheet(db(), 'Announcements', activeImport.id),
      loadSheet(db(), 'Tugas_Prestasi', activeImport.id),
      loadSheet(db(), 'Sesi_Ujian', activeImport.id)
    ]);
    const [nativeAttendance, nativeYaumiah, nativeTasks, nativeAnnouncements, nativeAttempts, nativeSessions] = await Promise.all([
      db().query('SELECT school_date, student_nis, student_name, status, check_in_at FROM native_attendance ORDER BY school_date DESC, check_in_at DESC LIMIT 1000'),
      db().query('SELECT school_date, student_nis, student_name, class_code, achievement, reading, parent_note, updated_at FROM native_yaumiah ORDER BY school_date DESC LIMIT 1000'),
      db().query('SELECT id, subject, class_code, title, description, deadline, status, created_at FROM native_tasks WHERE active = true ORDER BY created_at DESC LIMIT 500'),
      db().query('SELECT id, title, message, targets, creator_name, created_at FROM native_announcements WHERE active = true ORDER BY created_at DESC LIMIT 200'),
      db().query("SELECT id, submitted_at, student_nis, student_name, class_code, subject, correct_count, total_questions, score, status FROM native_exam_attempts WHERE status = 'SUBMITTED' ORDER BY submitted_at DESC LIMIT 1000"),
      db().query('SELECT id, status, subject, class_code, note, updated_at FROM native_exam_sessions ORDER BY updated_at DESC LIMIT 100')
    ]);
    nativeAttendance.rows.forEach(row => attendance.push({ Timestamp: row.check_in_at, Tanggal: row.school_date, NIS: row.student_nis, Nama: row.student_name, Status: row.status, Jam_Masuk: row.check_in_at }));
    nativeYaumiah.rows.forEach(row => yaumiah.push({ Timestamp: row.updated_at, Tanggal: row.school_date, NIS: row.student_nis, Nama: row.student_name, Kelas: row.class_code, Capaian_Persen: row.achievement, Tilawah_Murajaah: row.reading, Paraf_Ortu: row.parent_note }));
    nativeTasks.rows.forEach(row => tasks.push({ Timestamp: row.created_at, ID_Tugas: row.id, Mapel: row.subject, Kelas: row.class_code, Judul: row.title, Deskripsi: row.description, Deadline: row.deadline, Status: row.status }));
    nativeAnnouncements.rows.forEach(row => announcements.push({ ID_Pengumuman: row.id, Timestamp: row.created_at, Actor_Nama: row.creator_name, Target_Accounts: (row.targets || []).join(','), Judul: row.title, Pesan: row.message }));
    nativeAttempts.rows.forEach(row => {
      attempts.push({ Attempt_ID: row.id, Submitted_At: row.submitted_at, NIS: row.student_nis, Nama: row.student_name, Kelas: row.class_code, Mapel: row.subject, Status: row.status, Benar: row.correct_count, Total: row.total_questions, Skor: row.score });
      grades.push({ Timestamp: row.submitted_at, Tanggal: row.submitted_at, NIS: row.student_nis, Nama: row.student_name, Kelas: row.class_code, Mapel: row.subject, Benar: row.correct_count, Total_Soal: row.total_questions, Skor_Akhir: row.score, Status_Penilaian: 'FINAL' });
    });
    nativeSessions.rows.forEach(row => examSessions.push({ ID_Sesi: row.id, Status_Ujian: row.status, Mapel_Aktif: row.subject, Kelas_Aktif: row.class_code, Catatan: row.note, Updated_At: row.updated_at }));
    const role = req.user.role;
    const isAdmin = role === 'superadmin';
    const isLeadership = isAdmin || role === 'kepsek';
    const isTeacher = role === 'guru';
    const isFamily = role === 'siswa' || role === 'ortu';
    const nis = normalized(req.user.student_nis || (role === 'siswa' ? req.user.username : ''));
    const classCode = normalized(req.user.class_code);
    const today = todayJakarta();
    const teacherRow = isTeacher
      ? teachers.find(row => normalizeKey(value(row, 'Username')) === normalizeKey(req.user.username))
      : null;
    const assignedSubjectTokens = normalized(value(teacherRow, 'Mata_Pelajaran'))
      .split(/[;,|\n]+/).map(normalizeKey).filter(Boolean);
    const allowedSubjects = new Set(assignedSubjectTokens);
    subjects.forEach(subject => {
      const code = normalizeKey(value(subject, 'Kode_Mapel'));
      const name = normalizeKey(value(subject, 'Nama_Mapel'));
      if (allowedSubjects.has(code) || allowedSubjects.has(name)) {
        if (code) allowedSubjects.add(code);
        if (name) allowedSubjects.add(name);
      }
    });

    const studentResult = await db().query(
      `SELECT username, full_name, class_code, student_nis
         FROM app_users WHERE active = true AND role = 'siswa'
        ORDER BY class_code, full_name`
    );
    let visibleStudents = studentResult.rows;
    if (isFamily) visibleStudents = visibleStudents.filter(student => student.student_nis === nis);
    if (isTeacher) {
      visibleStudents = classCode && classCode !== '-'
        ? visibleStudents.filter(student => student.class_code === classCode)
        : [];
    }

    const allowedNis = new Set(visibleStudents.map(student => normalized(student.student_nis)));
    const visibleAttendance = attendance.filter(row => isLeadership || allowedNis.has(normalized(value(row, 'NIS'))));
    const visibleYaumiah = yaumiah.filter(row => isLeadership || allowedNis.has(normalized(value(row, 'NIS'))));
    const visibleGrades = grades.filter(row => {
      if (isLeadership) return true;
      if (isFamily) return allowedNis.has(normalized(value(row, 'NIS')));
      return allowedNis.has(normalized(value(row, 'NIS'))) || allowedSubjects.has(normalizeKey(value(row, 'Mapel')));
    });
    const visibleTasks = tasks.filter(row => {
      if (isLeadership) return true;
      const targetClass = normalized(value(row, 'Kelas'));
      const subjectAllowed = isTeacher && allowedSubjects.has(normalizeKey(value(row, 'Mapel')));
      return !targetClass || targetClass === 'SEMUA' || targetClass === classCode || subjectAllowed;
    });
    const visibleAttempts = attempts.filter(row => {
      if (isLeadership) return true;
      if (isFamily) return normalized(value(row, 'NIS')) === nis;
      return (classCode && classCode !== '-' && normalized(value(row, 'Kelas')) === classCode)
        || allowedSubjects.has(normalizeKey(value(row, 'Mapel')));
    });
    const visibleAnnouncements = announcements.filter(row => visibleAnnouncement(row, req.user));

    const visibleAchievements = achievements.filter(row => isLeadership || allowedNis.has(normalized(value(row, 'NIS'))));
    const recentAttendance = byNewest(visibleAttendance, ['Timestamp', 'Tanggal']).slice(0, 100).map(row => ({
      date: schoolDate(value(row, 'Tanggal', 'Timestamp')),
      nis: normalized(value(row, 'NIS')),
      name: normalized(value(row, 'Nama')),
      status: normalized(value(row, 'Status')) || 'Hadir',
      time: normalized(value(row, 'Jam_Masuk')) || '-'
    }));
    const recentGrades = byNewest(visibleGrades, ['Timestamp', 'Tanggal']).slice(0, 100).map(row => ({
      date: schoolDate(value(row, 'Tanggal', 'Timestamp')),
      nis: normalized(value(row, 'NIS')),
      name: normalized(value(row, 'Nama')),
      subject: normalized(value(row, 'Mapel')),
      score: number(value(row, 'Skor_Akhir')),
      status: normalized(value(row, 'Status_Penilaian')) || 'FINAL'
    }));
    const recentYaumiah = byNewest(visibleYaumiah, ['Timestamp', 'Tanggal']).slice(0, 100).map(row => ({
      date: schoolDate(value(row, 'Tanggal', 'Timestamp')),
      nis: normalized(value(row, 'NIS')),
      name: normalized(value(row, 'Nama')),
      achievement: number(value(row, 'Capaian_Persen')),
      reading: normalized(value(row, 'Tilawah_Murajaah', 'Tilawah'))
    }));
    const taskList = byNewest(visibleTasks, ['Timestamp', 'Deadline']).slice(0, 100).map(row => ({
      id: normalized(value(row, 'ID_Tugas')),
      title: normalized(value(row, 'Judul')),
      subject: normalized(value(row, 'Mapel')),
      classCode: normalized(value(row, 'Kelas')),
      deadline: normalized(value(row, 'Deadline')),
      status: normalized(value(row, 'Status')) || 'Aktif'
    }));
    const achievementList = byNewest(visibleAchievements, ['Timestamp']).slice(0, 100).map(row => ({
      date: schoolDate(value(row, 'Timestamp')),
      nis: normalized(value(row, 'NIS')),
      name: normalized(value(row, 'Nama')),
      category: normalized(value(row, 'Kategori')),
      title: normalized(value(row, 'Judul')),
      level: normalized(value(row, 'Tingkat_Nilai')),
      status: normalized(value(row, 'Status'))
    }));
    const announcementList = byNewest(visibleAnnouncements, ['Timestamp']).slice(0, 20).map(row => ({
      id: normalized(value(row, 'ID_Pengumuman')),
      title: normalized(value(row, 'Judul')),
      message: normalized(value(row, 'Pesan')).slice(0, 500),
      actor: normalized(value(row, 'Actor_Nama')),
      timestamp: normalized(value(row, 'Timestamp'))
    }));

    const attendanceToday = visibleAttendance.filter(row => schoolDate(value(row, 'Tanggal', 'Timestamp')) === today);
    const yaumiahToday = visibleYaumiah.filter(row => schoolDate(value(row, 'Tanggal', 'Timestamp')) === today);
    const submittedAttempts = visibleAttempts.filter(row => normalizeKey(value(row, 'Status')) === 'submitted');
    const approvedQuestions = questions.filter(row => {
      if (!/approved|disetujui/i.test(normalized(value(row, 'Status_Approval', 'Status_Approval_Kepsek')))) return false;
      if (isLeadership) return true;
      return allowedSubjects.has(normalizeKey(value(row, 'Mapel')))
        || normalizeKey(value(row, 'Pembuat_Username')) === normalizeKey(req.user.username);
    });

    const questionStatsMap = new Map();
    questions.forEach(row => {
      const subject = normalized(value(row, 'Mapel')) || 'Tanpa mapel';
      const owner = normalizeKey(value(row, 'Pembuat_Username'));
      if (!isLeadership && isTeacher && !allowedSubjects.has(normalizeKey(subject)) && owner !== normalizeKey(req.user.username)) return;
      if (!isLeadership && !isTeacher) return;
      const current = questionStatsMap.get(subject) || { subject, total: 0, approved: 0, pending: 0 };
      current.total++;
      if (/approved|disetujui/i.test(normalized(value(row, 'Status_Approval', 'Status_Approval_Kepsek')))) current.approved++;
      else current.pending++;
      questionStatsMap.set(subject, current);
    });
    const visibleExamSessions = isLeadership ? examSessions : (isTeacher ? examSessions.filter(row => {
      const subject = normalizeKey(value(row, 'Mapel_Aktif'));
      const targetClass = normalized(value(row, 'Kelas_Aktif'));
      const subjectAllowed = !subject || subject === 'semua' || allowedSubjects.has(subject);
      const classAllowed = !targetClass || targetClass === 'SEMUA' || targetClass === classCode;
      return subjectAllowed && classAllowed;
    }) : []);
    const safeExamSessions = visibleExamSessions.map(row => ({
      status: normalized(value(row, 'Status_Ujian')) || 'CLOSED',
      subject: normalized(value(row, 'Mapel_Aktif')) || 'SEMUA',
      classCode: normalized(value(row, 'Kelas_Aktif')) || 'SEMUA',
      note: normalized(value(row, 'Catatan')),
      updatedAt: normalized(value(row, 'Updated_At'))
    }));

    res.json({
      status: 'ok',
      role,
      scope: { classCode, nis, today },
      metrics: {
        students: visibleStudents.length,
        classes: isLeadership ? classes.length : (classCode && classCode !== '-' ? 1 : 0),
        teachers: isLeadership ? teachers.length : (isTeacher ? 1 : 0),
        subjects: isAdmin ? subjects.length : subjects.length,
        attendanceToday: attendanceToday.length,
        yaumiahToday: yaumiahToday.length,
        grades: visibleGrades.length,
        examAttempts: submittedAttempts.length,
        tasks: visibleTasks.length,
        achievements: visibleAchievements.length,
        approvedQuestions: isLeadership || isTeacher ? approvedQuestions.length : undefined
      },
      recentAttendance,
      recentGrades,
      recentYaumiah,
      tasks: taskList,
      achievements: achievementList,
      announcements: announcementList,
      questionStats: Array.from(questionStatsMap.values()).sort((left, right) => left.subject.localeCompare(right.subject)),
      examSessions: safeExamSessions,
      accessMode: 'native-postgresql-with-legacy-snapshot',
      sourceImportedAt: activeImport.imported_at
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/master/:resource', requireAuth, requireRoles('superadmin', 'kepsek', 'guru'), async (req, res, next) => {
  try {
    const resource = String(req.params.resource || '').toLowerCase();
    const search = String(req.query.search || '').trim().toLowerCase().slice(0, 80);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    let items = [];
    if (resource === 'student_accounts') {
      if (req.user.role !== 'superadmin') return res.status(403).json({ status: 'error', message: 'Data akun siswa hanya tersedia untuk superadmin.' });
      const result = await db().query(
        `SELECT student.username, student.full_name, student.class_code, student.student_nis,
                parent.username AS parent_username, parent.full_name AS parent_name
           FROM app_users student
           LEFT JOIN LATERAL (
             SELECT p.username, p.full_name
               FROM app_users p
              WHERE p.active = true AND p.role = 'ortu' AND p.student_nis = student.student_nis
              ORDER BY p.full_name, p.username LIMIT 1
           ) parent ON true
          WHERE student.active = true AND student.role = 'siswa'
          ORDER BY student.class_code, student.full_name`
      );
      items = result.rows.map(row => ({
        nis: row.student_nis, name: row.full_name, classCode: row.class_code,
        username: row.username, parentUsername: row.parent_username || '', parentName: row.parent_name || ''
      }));
    } else if (resource === 'students') {
      const result = await db().query(
        `SELECT username, full_name, class_code, student_nis
           FROM app_users WHERE active = true AND role = 'siswa'
          ORDER BY class_code, full_name`
      );
      items = result.rows.map(row => ({ username: row.username, name: row.full_name, classCode: row.class_code, nis: row.student_nis }));
      if (req.user.role === 'guru') {
        items = req.user.class_code && req.user.class_code !== '-'
          ? items.filter(item => item.classCode === req.user.class_code)
          : [];
      }
    } else {
      if (req.user.role === 'guru') return res.status(403).json({ status: 'error', message: 'Data ini hanya tersedia untuk pimpinan sekolah.' });
      if (resource === 'accounts') {
        if (req.user.role !== 'superadmin') return res.status(403).json({ status: 'error', message: 'Direktori akun hanya tersedia untuk superadmin.' });
        const accountResult = await db().query(
          `SELECT username, full_name, role, class_code, student_nis, active
             FROM app_users ORDER BY role, full_name`
        );
        items = accountResult.rows.map(row => ({ username: row.username, name: row.full_name, role: row.role, classCode: row.class_code, nis: row.student_nis, active: row.active }));
      } else if (resource === 'classes') {
        const result = await db().query('SELECT code, name, homeroom_name, capacity FROM school_classes WHERE active = true ORDER BY code');
        items = result.rows.map(row => ({ code: row.code, name: row.name, homeroom: row.homeroom_name, capacity: row.capacity }));
      } else if (resource === 'teachers') {
        const result = await db().query(`SELECT p.nip, p.subjects, p.homeroom_class, u.username, u.full_name FROM teacher_profiles p JOIN app_users u ON u.id = p.user_id WHERE p.active = true AND u.active = true ORDER BY u.full_name`);
        items = result.rows.map(row => ({ nip: row.nip, username: row.username, name: row.full_name, subjects: row.subjects, classCode: row.homeroom_class }));
      } else if (resource === 'subjects') {
        const result = await db().query('SELECT code, name, subject_group FROM school_subjects WHERE active = true ORDER BY name');
        items = result.rows.map(row => ({ code: row.code, name: row.name, group: row.subject_group }));
      } else return res.status(404).json({ status: 'error', message: 'Data master tidak ditemukan.' });
    }
    if (search) items = items.filter(item => Object.values(item).some(itemValue => String(itemValue).toLowerCase().includes(search)));
    res.json({ status: 'ok', resource, total: items.length, items: items.slice(0, limit), readOnly: req.user.role !== 'superadmin' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/questions', requireAuth, requireRoles('superadmin', 'kepsek', 'guru'), async (req, res, next) => {
  try {
    const params = [];
    let ownerClause = '';
    if (req.user.role === 'guru') {
      params.push(req.user.username.toLowerCase());
      ownerClause = 'AND lower(creator_username) = $1';
    }
    const result = await db().query(
      `SELECT id, subject, class_code, cognitive_level, competency, question_text, options,
              answer_key, approval_status, question_type, revision_note, image_url,
              creator_username, created_at, updated_at
         FROM school_questions
        WHERE active = true ${ownerClause}
        ORDER BY updated_at DESC, id
        LIMIT 500`,
      params
    );
    res.json({
      status: 'ok',
      total: result.rowCount,
      items: result.rows.map(row => ({
        id: row.id, subject: row.subject, classCode: row.class_code,
        level: row.cognitive_level, competency: row.competency,
        question: row.question_text, options: row.options || {}, answerKey: row.answer_key,
        status: row.approval_status, type: row.question_type,
        revisionNote: row.revision_note, imageUrl: row.image_url,
        creator: row.creator_username, updatedAt: row.updated_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/exams', requireAuth, async (req, res, next) => {
  try {
    const params = [];
    let scope = '';
    if (req.user.role === 'siswa') {
      params.push(req.user.class_code);
      scope = "WHERE s.status = 'OPEN' AND (s.class_code = 'SEMUA' OR s.class_code = $1)";
    } else if (!['superadmin', 'kepsek', 'guru'].includes(req.user.role)) {
      return res.json({ status: 'ok', items: [] });
    }
    const result = await db().query(
      `SELECT s.id, s.subject, s.class_code, s.note, s.status, s.opened_at, s.updated_at,
              count(q.id)::int AS question_count
         FROM native_exam_sessions s
         LEFT JOIN school_questions q ON q.active = true AND q.approval_status = 'Approved'
          AND lower(q.subject) = lower(s.subject) AND (q.class_code = 'SEMUA' OR q.class_code = s.class_code)
         ${scope}
        GROUP BY s.id ORDER BY s.updated_at DESC LIMIT 100`,
      params
    );
    res.json({ status: 'ok', items: result.rows.map(row => ({ id: row.id, subject: row.subject, classCode: row.class_code, note: row.note, status: row.status, questionCount: row.question_count, openedAt: row.opened_at })) });
  } catch (error) { next(error); }
});

app.post('/api/v1/exams/:id/start', sameOrigin, requireAuth, requireRoles('siswa'), async (req, res, next) => {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const session = await client.query("SELECT * FROM native_exam_sessions WHERE id = $1 AND status = 'OPEN' FOR UPDATE", [req.params.id]);
    if (!session.rowCount) throw httpError(404, 'Sesi ujian tidak aktif.');
    const exam = session.rows[0];
    if (exam.class_code !== 'SEMUA' && exam.class_code !== req.user.class_code) throw httpError(403, 'Sesi ujian bukan untuk kelas Anda.');
    const existing = await client.query('SELECT id, status, question_manifest FROM native_exam_attempts WHERE session_id = $1 AND user_id = $2', [exam.id, req.user.id]);
    if (existing.rowCount && existing.rows[0].status === 'SUBMITTED') throw httpError(409, 'Ujian ini sudah pernah dikumpulkan.');
    let manifest = existing.rows[0] && existing.rows[0].question_manifest;
    let attemptId = existing.rows[0] && existing.rows[0].id;
    if (!manifest) {
      const questions = await client.query(
        `SELECT id FROM school_questions WHERE active = true AND approval_status = 'Approved'
          AND lower(subject) = lower($1) AND (class_code = 'SEMUA' OR class_code = $2)
          ORDER BY ${exam.shuffle_questions ? 'random()' : 'id'} LIMIT 100`,
        [exam.subject, req.user.class_code]
      );
      if (!questions.rowCount) throw httpError(422, 'Belum ada soal disetujui untuk sesi ini.');
      manifest = questions.rows.map(row => row.id); attemptId = crypto.randomUUID();
      await client.query(
        `INSERT INTO native_exam_attempts(id,session_id,user_id,student_nis,student_name,class_code,subject,question_manifest,total_questions)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
        [attemptId, exam.id, req.user.id, req.user.student_nis || req.user.username, req.user.full_name, req.user.class_code, exam.subject, JSON.stringify(manifest), manifest.length]
      );
    }
    const questionResult = await client.query(
      `SELECT id, question_text, options, question_type, image_url FROM school_questions WHERE id = ANY($1::text[])`,
      [manifest]
    );
    const lookup = new Map(questionResult.rows.map(row => [row.id, row]));
    const questions = manifest.map(id => lookup.get(id)).filter(Boolean).map(row => ({ id: row.id, question: row.question_text, options: row.options || {}, type: row.question_type, imageUrl: row.image_url }));
    await client.query('COMMIT');
    res.json({ status: 'ok', attemptId, session: { id: exam.id, subject: exam.subject, classCode: exam.class_code, note: exam.note }, questions });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) return res.status(error.status).json({ status: 'error', message: error.message });
    next(error);
  } finally { client.release(); }
});

app.post('/api/v1/exams/:id/submit', sameOrigin, requireAuth, requireRoles('siswa'), async (req, res, next) => {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const attempt = await client.query("SELECT * FROM native_exam_attempts WHERE session_id = $1 AND user_id = $2 FOR UPDATE", [req.params.id, req.user.id]);
    if (!attempt.rowCount) throw httpError(404, 'Attempt ujian tidak ditemukan.');
    if (attempt.rows[0].status === 'SUBMITTED') throw httpError(409, 'Jawaban sudah pernah dikumpulkan.');
    const manifest = attempt.rows[0].question_manifest || [];
    const answers = req.body && req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const questions = await client.query('SELECT id, answer_key, question_type FROM school_questions WHERE id = ANY($1::text[])', [manifest]);
    const canonical = valueToNormalize => String(valueToNormalize || '').toUpperCase().split(/[,;|\s]+/).filter(Boolean).sort().join(',');
    let correct = 0; let objectiveTotal = 0; let hasEssay = false;
    questions.rows.forEach(question => {
      if (String(question.question_type).toUpperCase() === 'ESAI') { hasEssay = true; return; }
      objectiveTotal++;
      if (canonical(answers[question.id]) === canonical(question.answer_key)) correct++;
    });
    const score = objectiveTotal ? Math.round((correct / objectiveTotal) * 10000) / 100 : 0;
    await client.query(
      `UPDATE native_exam_attempts SET answers = $1::jsonb, correct_count = $2, total_questions = $3,
              score = $4, status = 'SUBMITTED', submitted_at = now() WHERE id = $5`,
      [JSON.stringify(answers), correct, manifest.length, score, attempt.rows[0].id]
    );
    await client.query('COMMIT');
    res.json({ status: 'ok', message: hasEssay ? 'Jawaban terkirim. Nilai objektif tersimpan; esai menunggu penilaian guru.' : 'Jawaban berhasil dikumpulkan.', result: { correct, total: manifest.length, score, hasEssay } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) return res.status(error.status).json({ status: 'error', message: error.message });
    next(error);
  } finally { client.release(); }
});

app.get('/api/v1/messages', requireAuth, requireRoles('superadmin'), async (req, res, next) => {
  try {
    const result = await db().query('SELECT id, sender_username, sender_name, sender_role, subject, message, status, created_at FROM native_messages ORDER BY created_at DESC LIMIT 500');
    res.json({ status: 'ok', items: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/v1/dashboard', requireAuth, async (req, res, next) => {
  try {
    const latest = await db().query(
      `SELECT id, source_exported_at, imported_at, sheet_count, row_count, snapshot_checksum
         FROM import_batches WHERE status = 'completed' ORDER BY imported_at DESC LIMIT 1`
    );
    let sheets = [];
    let roles = [];
    let organization = {};
    if (latest.rowCount) {
      const importId = latest.rows[0].id;
      const [sheetResult, roleResult, orgResult] = await Promise.all([
        db().query(
          'SELECT sheet_name AS name, row_count AS count FROM import_sheets WHERE import_id = $1 ORDER BY sheet_name',
          [importId]
        ),
        db().query('SELECT role, count(*)::int AS count FROM app_users WHERE active = true GROUP BY role ORDER BY role'),
        db().query(
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
        { id: 'master', label: 'Data master & akun', status: 'native', detail: 'CRUD native PostgreSQL tersedia' },
        { id: 'questions', label: 'Bank soal', status: 'native', detail: 'Pembuatan soal native tersedia' },
        { id: 'presensi', label: 'Presensi & yaumiah', status: 'migration', detail: 'Riwayat sudah di PostgreSQL; input berikutnya' },
        { id: 'tugas', label: 'Tugas & komunikasi', status: 'migration', detail: 'Tahap migrasi selanjutnya' }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/admin/sync-gas', sameOrigin, requireAuth, requireRoles('superadmin'), async (req, res) => {
  try {
    const result = await syncFromGasOnce({ apply: true });
    await db().query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'GAS_SNAPSHOT_SYNC', 'import_batch', $2, $3::jsonb)`,
      [req.user.id, result.importId || result.id || null, JSON.stringify({ mode: result.mode, checksum: result.checksum, rowCount: result.rowCount })]
    );
    res.json({
      status: 'ok',
      message: result.mode === 'already-imported' ? 'Data Railway sudah sama dengan GAS.' : 'Snapshot terbaru berhasil disinkronkan.',
      sync: { mode: result.mode, sheetCount: result.sheetCount, rowCount: result.rowCount, importedAt: result.imported_at || new Date().toISOString() }
    });
  } catch (error) {
    console.error('GAS_SYNC_REQUEST_FAILED', { requestId: req.requestId, message: error.message });
    res.status(503).json({ status: 'error', message: 'Sinkronisasi belum dapat dijalankan. Periksa konfigurasi GAS lalu coba lagi.' });
  }
});

app.get('/assets/logo.png', (req, res, next) => res.sendFile(logoPath, error => error ? next(error) : undefined));
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
