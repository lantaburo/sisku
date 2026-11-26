'use strict';

const crypto = require('node:crypto');
const { hashPin } = require('./security');

const ROLE_ACTIONS = Object.freeze({
  superadmin: new Set([
    'REGISTER_MAPEL', 'UPDATE_MAPEL', 'DELETE_MAPEL',
    'REGISTER_KELAS', 'UPDATE_KELAS', 'DELETE_KELAS',
    'REGISTER_GURU', 'UPDATE_GURU', 'DELETE_GURU',
    'REGISTER_SISWA', 'UPDATE_SISWA', 'DELETE_SISWA',
    'SOAL_UAS', 'SOAL_UAS_BULK', 'UPDATE_SOAL', 'DELETE_SOAL', 'DELETE_SOAL_PACKAGE',
    'BULK_DELETE_SOAL', 'BULK_APPROVE_SOAL', 'BULK_UPDATE_GAMBAR_SOAL', 'UPDATE_APPROVAL_SOAL',
    'TUGAS', 'UPDATE_TUGAS', 'DELETE_TUGAS', 'SESI_UAS', 'SEND_ANNOUNCEMENT',
    'MARK_ADMIN_MESSAGE_READ', 'PRESENSI', 'TARGET_TAHFIDZ', 'MASTER_YAUMIAH',
    'UPDATE_YAUMIAH', 'DELETE_YAUMIAH', 'SAVE_ORG_SETTINGS', 'GRADE_ESSAY', 'UPDATE_EXAM_GRADE',
    'RESOLVE_GRADE_COMPLAINT', 'SAVE_ATTENDANCE_SETTINGS'
  ]),
  guru: new Set([
    'SOAL_UAS', 'SOAL_UAS_BULK', 'UPDATE_SOAL', 'DELETE_SOAL', 'DELETE_SOAL_PACKAGE',
    'BULK_DELETE_SOAL', 'BULK_UPDATE_GAMBAR_SOAL', 'TUGAS', 'UPDATE_TUGAS', 'DELETE_TUGAS',
    'SESI_UAS', 'PRESENSI', 'SEND_ADMIN_MESSAGE', 'TARGET_TAHFIDZ', 'MASTER_YAUMIAH',
    'UPDATE_YAUMIAH', 'DELETE_YAUMIAH', 'GRADE_ESSAY', 'UPDATE_EXAM_GRADE', 'RESOLVE_GRADE_COMPLAINT'
  ]),
  kepsek: new Set(['UPDATE_APPROVAL_SOAL', 'DELETE_SOAL', 'DELETE_SOAL_PACKAGE', 'BULK_DELETE_SOAL', 'BULK_APPROVE_SOAL', 'SESI_UAS', 'SEND_ADMIN_MESSAGE']),
  siswa: new Set(['PRESENSI', 'YAUMIAH', 'UPDATE_TUGAS_STATUS', 'SUBMIT_GRADE_COMPLAINT', 'SEND_ADMIN_MESSAGE']),
  ortu: new Set(['YAUMIAH', 'SUBMIT_GRADE_COMPLAINT', 'SEND_ADMIN_MESSAGE'])
});

function actionAllowed(role, action) {
  return Boolean(ROLE_ACTIONS[String(role || '')] && ROLE_ACTIONS[String(role || '')].has(String(action || '')));
}

function clean(value, max = 300) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function required(data, names) {
  for (const name of names) {
    if (!clean(data[name], 10_000)) throw new Error(`${name} wajib diisi.`);
  }
}

function validPin(value, optional = false) {
  const pin = clean(value, 20);
  if (optional && !pin) return '';
  if (!/^\d{6,12}$/.test(pin)) throw new Error('PIN wajib terdiri dari 6–12 digit angka.');
  return pin;
}

function jakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

async function assertClass(client, code) {
  const result = await client.query('SELECT 1 FROM school_classes WHERE code = $1 AND active = true', [code]);
  if (!result.rowCount) throw new Error('Kelas tidak ditemukan atau sudah tidak aktif.');
}

async function assertSubject(client, subject) {
  const result = await client.query(
    'SELECT code, name FROM school_subjects WHERE active = true AND (lower(code) = lower($1) OR lower(name) = lower($1))',
    [subject]
  );
  if (!result.rowCount) throw new Error('Mata pelajaran tidak ditemukan atau sudah tidak aktif.');
  return result.rows[0];
}

async function assertTeacherSubject(client, user, subject) {
  if (user.role !== 'guru') return;
  const result = await client.query('SELECT subjects FROM teacher_profiles WHERE user_id = $1 AND active = true', [user.id]);
  const tokens = clean(result.rows[0] && result.rows[0].subjects, 1000).split(/[;,|\n]+/).map(item => item.trim().toLowerCase()).filter(Boolean);
  const matched = tokens.includes(subject.toLowerCase());
  if (!matched) {
    const lookup = await client.query('SELECT code, name FROM school_subjects WHERE active = true AND (lower(code) = lower($1) OR lower(name) = lower($1))', [subject]);
    const item = lookup.rows[0];
    if (!item || (!tokens.includes(String(item.code).toLowerCase()) && !tokens.includes(String(item.name).toLowerCase()))) {
      throw new Error('Guru hanya dapat membuat soal untuk mata pelajaran yang diampu.');
    }
  }
}

async function normalizeQuestion(client, user, data) {
  required(data, ['id', 'mapel', 'kelas', 'pertanyaan']);
  const subject = clean(data.mapel, 160);
  await assertSubject(client, subject);
  await assertTeacherSubject(client, user, subject);
  const classCode = clean(data.kelas, 40);
  if (classCode.toUpperCase() !== 'SEMUA') await assertClass(client, classCode);
  const type = clean(data.tipeSoal, 30).toUpperCase() || 'PG';
  const options = {
    A: clean(data.opsiA, 2000), B: clean(data.opsiB, 2000), C: clean(data.opsiC, 2000),
    D: clean(data.opsiD, 2000), E: clean(data.opsiE, 2000)
  };
  if (['PG', 'PGK'].includes(type) && (!options.A || !options.B || !options.C || !options.D || !clean(data.kunci, 2000))) {
    throw new Error('Pilihan ganda memerlukan opsi A–D dan kunci jawaban.');
  }
  return {
    id: clean(data.id, 80), subject, classCode, type, options,
    level: clean(data.level, 40) || 'C3', competency: clean(data.kd, 300),
    question: clean(data.pertanyaan, 10_000), answerKey: clean(data.kunci, 2000),
    status: user.role === 'guru' ? 'Menunggu Approval Kepsek' : clean(data.statusApproval, 80) || 'Menunggu Approval Kepsek',
    revisionNote: clean(data.catatanRevisi, 2000), imageUrl: clean(data.gambarUrl, 1_500_000),
    packageId: clean(data.paketId, 100)
  };
}

async function assertOwnedQuestion(client, user, id) {
  const question = await client.query('SELECT * FROM school_questions WHERE id = $1 AND active = true FOR UPDATE', [id]);
  if (!question.rowCount) throw new Error('Soal tidak ditemukan.');
  if (user.role === 'guru' && String(question.rows[0].creator_username).toLowerCase() !== String(user.username).toLowerCase()) {
    const denied = new Error('Guru hanya dapat mengubah soal yang dibuat sendiri.'); denied.status = 403; throw denied;
  }
  return question.rows[0];
}

async function runNativeAction(pool, user, action, data) {
  if (!actionAllowed(user.role, action)) {
    const error = new Error('Aksi ini tidak diizinkan untuk peran akun Anda.'); error.status = 403; throw error;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let message = 'Perubahan berhasil disimpan.';
    let resultData = null;

    if (action === 'REGISTER_MAPEL') {
      required(data, ['kode', 'nama']);
      await client.query(
        `INSERT INTO school_subjects(code, name, subject_group, active, source_import_id)
         VALUES ($1,$2,$3,true,NULL)`,
        [clean(data.kode, 40), clean(data.nama, 160), clean(data.kelompok, 80) || 'Umum']
      );
      message = 'Mata pelajaran berhasil ditambahkan.';
    } else if (action === 'UPDATE_MAPEL') {
      required(data, ['oldKode', 'kode', 'nama']);
      const oldCode = clean(data.oldKode, 40); const nextCode = clean(data.kode, 40); const nextName = clean(data.nama, 160);
      const current = await client.query('SELECT name FROM school_subjects WHERE code = $1 AND active = true FOR UPDATE', [oldCode]);
      if (!current.rowCount) throw new Error('Mata pelajaran tidak ditemukan.');
      await client.query(
        `UPDATE school_subjects SET code = $1, name = $2, subject_group = $3, source_import_id = NULL, updated_at = now()
          WHERE code = $4`,
        [nextCode, nextName, clean(data.kelompok, 80) || 'Umum', oldCode]
      );
      await client.query('UPDATE school_questions SET subject = $1, updated_at = now() WHERE lower(subject) IN (lower($2), lower($3))', [nextName, oldCode, current.rows[0].name]);
      await client.query('UPDATE teacher_profiles SET subjects = replace(subjects, $1, $2), updated_at = now() WHERE subjects LIKE $3', [current.rows[0].name, nextName, `%${current.rows[0].name}%`]);
      message = 'Mata pelajaran berhasil diperbarui.';
    } else if (action === 'DELETE_MAPEL') {
      required(data, ['kode']);
      const result = await client.query('UPDATE school_subjects SET active = false, source_import_id = NULL, updated_at = now() WHERE code = $1 AND active = true', [clean(data.kode, 40)]);
      if (!result.rowCount) throw new Error('Mata pelajaran tidak ditemukan.');
      message = 'Mata pelajaran dinonaktifkan tanpa menghapus riwayat.';
    } else if (action === 'REGISTER_KELAS') {
      required(data, ['kode', 'nama']);
      await client.query(
        `INSERT INTO school_classes(code, name, homeroom_name, capacity, active, source_import_id)
         VALUES ($1,$2,$3,$4,true,NULL)`,
        [clean(data.kode, 40), clean(data.nama, 160), clean(data.wali, 160) || '-', Math.max(1, Math.min(200, Number(data.kapasitas) || 30))]
      );
      message = 'Kelas berhasil ditambahkan.';
    } else if (action === 'UPDATE_KELAS') {
      required(data, ['oldKode', 'kode', 'nama']);
      const oldCode = clean(data.oldKode, 40); const nextCode = clean(data.kode, 40);
      const result = await client.query(
        `UPDATE school_classes SET code = $1, name = $2, homeroom_name = $3, capacity = $4,
                source_import_id = NULL, updated_at = now()
          WHERE code = $5 AND active = true`,
        [nextCode, clean(data.nama, 160), clean(data.wali, 160) || '-', Math.max(1, Math.min(200, Number(data.kapasitas) || 30)), oldCode]
      );
      if (!result.rowCount) throw new Error('Kelas tidak ditemukan.');
      await client.query('UPDATE app_users SET class_code = $1, native_managed = true, updated_at = now() WHERE class_code = $2', [nextCode, oldCode]);
      await client.query('UPDATE teacher_profiles SET homeroom_class = $1, updated_at = now() WHERE homeroom_class = $2', [nextCode, oldCode]);
      await client.query('UPDATE school_questions SET class_code = $1, updated_at = now() WHERE class_code = $2', [nextCode, oldCode]);
      message = 'Kelas berhasil diperbarui.';
    } else if (action === 'DELETE_KELAS') {
      required(data, ['kode']);
      const result = await client.query('UPDATE school_classes SET active = false, source_import_id = NULL, updated_at = now() WHERE code = $1 AND active = true', [clean(data.kode, 40)]);
      if (!result.rowCount) throw new Error('Kelas tidak ditemukan.');
      message = 'Kelas dinonaktifkan tanpa menghapus riwayat siswa.';
    } else if (action === 'REGISTER_GURU') {
      required(data, ['nip', 'username', 'nama']);
      const pinHash = await hashPin(validPin(data.pin));
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO app_users(id, source_user_id, username, pin_hash, role, full_name, class_code, student_nis, active, source_import_id, native_managed)
         VALUES ($1,$2,$3,$4,'guru',$5,$6,'',true,NULL,true)`,
        [id, `USR-${clean(data.nip, 40)}`, clean(data.username, 120).toLowerCase(), pinHash, clean(data.nama, 160), clean(data.waliKelas, 40) || '-']
      );
      await client.query(
        `INSERT INTO teacher_profiles(user_id, nip, subjects, homeroom_class, active, source_import_id)
         VALUES ($1,$2,$3,$4,true,NULL)`,
        [id, clean(data.nip, 40), clean(data.mapel, 500), clean(data.waliKelas, 40) || '-']
      );
      message = 'Akun guru berhasil ditambahkan.';
    } else if (action === 'UPDATE_GURU') {
      required(data, ['oldNip', 'nip', 'username', 'nama']);
      const profile = await client.query('SELECT user_id FROM teacher_profiles WHERE nip = $1 AND active = true FOR UPDATE', [clean(data.oldNip, 40)]);
      if (!profile.rowCount) throw new Error('Guru tidak ditemukan.');
      const pin = validPin(data.pin, true);
      const pinHash = pin ? await hashPin(pin) : null;
      await client.query(
        `UPDATE app_users SET source_user_id = $1, username = $2, full_name = $3, class_code = $4,
                pin_hash = coalesce($5, pin_hash), pin_upgraded_at = CASE WHEN $5 IS NULL THEN pin_upgraded_at ELSE now() END,
                active = true, source_import_id = NULL, native_managed = true, updated_at = now()
          WHERE id = $6`,
        [`USR-${clean(data.nip, 40)}`, clean(data.username, 120).toLowerCase(), clean(data.nama, 160), clean(data.waliKelas, 40) || '-', pinHash, profile.rows[0].user_id]
      );
      await client.query(
        `UPDATE teacher_profiles SET nip = $1, subjects = $2, homeroom_class = $3, source_import_id = NULL, updated_at = now()
          WHERE user_id = $4`,
        [clean(data.nip, 40), clean(data.mapel, 500), clean(data.waliKelas, 40) || '-', profile.rows[0].user_id]
      );
      message = 'Akun guru berhasil diperbarui.';
    } else if (action === 'DELETE_GURU') {
      required(data, ['nip']);
      const profile = await client.query('UPDATE teacher_profiles SET active = false, source_import_id = NULL, updated_at = now() WHERE nip = $1 AND active = true RETURNING user_id', [clean(data.nip, 40)]);
      if (!profile.rowCount) throw new Error('Guru tidak ditemukan.');
      await client.query('UPDATE app_users SET active = false, source_import_id = NULL, native_managed = true, updated_at = now() WHERE id = $1', [profile.rows[0].user_id]);
      await client.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [profile.rows[0].user_id]);
      message = 'Akun guru dinonaktifkan tanpa menghapus riwayat.';
    } else if (action === 'REGISTER_SISWA') {
      required(data, ['nis', 'nama', 'kelas']); await assertClass(client, clean(data.kelas, 40));
      const studentPinHash = await hashPin(validPin(data.pinSiswa)); const parentPinHash = await hashPin(validPin(data.pinOrtu));
      const nis = clean(data.nis, 40); const studentId = crypto.randomUUID(); const parentId = crypto.randomUUID();
      const duplicateNis = await client.query("SELECT 1 FROM app_users WHERE role = 'siswa' AND student_nis = $1 AND active = true", [nis]);
      if (duplicateNis.rowCount) throw new Error('NIS siswa sudah terdaftar.');
      const studentUsername = clean(data.akunSiswa, 120).toLowerCase() || nis.toLowerCase();
      const parentUsername = clean(data.akunOrtu, 120).toLowerCase() || `ortu.${nis}`.toLowerCase();
      if (studentUsername === parentUsername) throw new Error('Username siswa dan orang tua harus berbeda.');
      await client.query(
        `INSERT INTO app_users(id, source_user_id, username, pin_hash, role, full_name, class_code, student_nis, active, source_import_id, native_managed)
         VALUES ($1,$2,$3,$4,'siswa',$5,$6,$7,true,NULL,true), ($8,$9,$10,$11,'ortu',$12,$6,$7,true,NULL,true)`,
        [studentId, `USR-${nis}`, studentUsername, studentPinHash, clean(data.nama, 160), clean(data.kelas, 40), nis,
          parentId, `ORTU-${nis}`, parentUsername, parentPinHash, clean(data.namaOrtu, 160) || `Wali ${clean(data.nama, 160)}`]
      );
      message = 'Akun siswa dan orang tua berhasil ditambahkan.';
    } else if (action === 'UPDATE_SISWA') {
      required(data, ['oldNis', 'nis', 'akunSiswa', 'nama', 'kelas', 'akunOrtu', 'namaOrtu']); await assertClass(client, clean(data.kelas, 40));
      const student = await client.query("SELECT id FROM app_users WHERE role = 'siswa' AND student_nis = $1 AND active = true FOR UPDATE", [clean(data.oldNis, 40)]);
      if (!student.rowCount) throw new Error('Siswa tidak ditemukan.');
      const parent = await client.query("SELECT id FROM app_users WHERE role = 'ortu' AND student_nis = $1 AND active = true ORDER BY created_at LIMIT 1 FOR UPDATE", [clean(data.oldNis, 40)]);
      if (!parent.rowCount) throw new Error('Akun orang tua tidak ditemukan.');
      const studentPin = validPin(data.pinSiswa, true); const parentPin = validPin(data.pinOrtu, true);
      const studentHash = studentPin ? await hashPin(studentPin) : null; const parentHash = parentPin ? await hashPin(parentPin) : null;
      const nis = clean(data.nis, 40); const classCode = clean(data.kelas, 40);
      await client.query(
        `UPDATE app_users SET source_user_id = $1, username = $2, full_name = $3, class_code = $4, student_nis = $5,
                pin_hash = coalesce($6, pin_hash), pin_upgraded_at = CASE WHEN $6 IS NULL THEN pin_upgraded_at ELSE now() END,
                source_import_id = NULL, native_managed = true, updated_at = now() WHERE id = $7`,
        [`USR-${nis}`, clean(data.akunSiswa, 120).toLowerCase(), clean(data.nama, 160), classCode, nis, studentHash, student.rows[0].id]
      );
      await client.query(
        `UPDATE app_users SET source_user_id = $1, username = $2, full_name = $3, class_code = $4, student_nis = $5,
                pin_hash = coalesce($6, pin_hash), pin_upgraded_at = CASE WHEN $6 IS NULL THEN pin_upgraded_at ELSE now() END,
                source_import_id = NULL, native_managed = true, updated_at = now() WHERE id = $7`,
        [`ORTU-${nis}`, clean(data.akunOrtu, 120).toLowerCase(), clean(data.namaOrtu, 160), classCode, nis, parentHash, parent.rows[0].id]
      );
      message = 'Akun siswa dan orang tua berhasil diperbarui.';
    } else if (action === 'DELETE_SISWA') {
      required(data, ['nis']);
      const users = await client.query("UPDATE app_users SET active = false, source_import_id = NULL, native_managed = true, updated_at = now() WHERE student_nis = $1 AND role IN ('siswa','ortu') AND active = true RETURNING id", [clean(data.nis, 40)]);
      if (!users.rowCount) throw new Error('Siswa tidak ditemukan.');
      await client.query('UPDATE user_sessions SET revoked_at = now() WHERE user_id = ANY($1::uuid[]) AND revoked_at IS NULL', [users.rows.map(row => row.id)]);
      message = 'Akun siswa dan orang tua dinonaktifkan tanpa menghapus riwayat.';
    } else if (action === 'PRESENSI') {
      let nis = user.student_nis || user.username;
      if (['guru', 'superadmin'].includes(user.role)) nis = clean(data.nis, 40);
      if (!nis) throw new Error('NIS siswa wajib diisi.');
      const student = await client.query("SELECT full_name, class_code FROM app_users WHERE role = 'siswa' AND student_nis = $1 AND active = true", [nis]);
      if (!student.rowCount) throw new Error('Siswa tidak ditemukan.');
      if (user.role === 'guru' && user.class_code && user.class_code !== '-' && student.rows[0].class_code !== user.class_code) throw new Error('Guru hanya dapat mencatat siswa kelas binaan.');
      const schoolDate = clean(data.tanggal, 10) || jakartaDate();
      let status = clean(data.status, 60) || 'Hadir';
      const latitude = Number(data.latitude); const longitude = Number(data.longitude); const qrToken = clean(data.qrToken, 200);
      const setting = await client.query("SELECT setting_value FROM runtime_settings WHERE setting_key='attendance'");
      const attendance = setting.rows[0]?.setting_value || {};
      let distance = null; let verification = '';
      if (attendance.schoolLatitude != null && attendance.schoolLongitude != null && attendance.qrTokenMasuk) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Koordinat GPS wajib diambil dari perangkat.');
        distance = distanceMeters(latitude, longitude, Number(attendance.schoolLatitude), Number(attendance.schoolLongitude));
        if (distance > Number(attendance.radiusM || 100)) throw new Error('Presensi ditolak karena berada di luar radius sekolah.');
        if (user.role === 'guru') {
          const match = qrToken.match(/^SISWA-(.+)$/i);
          if (!match || match[1] !== nis) throw new Error('Guru harus memindai QR siswa yang sesuai.');
          verification = 'QR_SISWA_GPS'; status = clean(data.status, 60) || 'Hadir Terverifikasi Guru';
        } else if (qrToken === attendance.qrTokenPulang) { verification = 'QR_PULANG_GPS'; status = 'Pulang Terverifikasi QR+GPS'; }
        else if (qrToken === attendance.qrTokenMasuk) { verification = 'QR_MASUK_GPS'; status = 'Hadir Terverifikasi QR+GPS'; }
        else throw new Error('Token QR presensi tidak valid.');
      }
      await client.query(
        `INSERT INTO native_attendance(id, school_date, student_nis, student_name, status, recorded_by,latitude,longitude,distance_m,qr_token,verification_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (school_date, student_nis) DO UPDATE SET status = EXCLUDED.status, check_in_at = now(), recorded_by = EXCLUDED.recorded_by,
           latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,distance_m=EXCLUDED.distance_m,qr_token=EXCLUDED.qr_token,verification_status=EXCLUDED.verification_status,updated_at = now()`,
        [crypto.randomUUID(), schoolDate, nis, student.rows[0].full_name, status, user.id, Number.isFinite(latitude) ? latitude : null, Number.isFinite(longitude) ? longitude : null, distance, qrToken, verification]
      );
      message = 'Presensi berhasil disimpan langsung di Railway.';
    } else if (action === 'YAUMIAH') {
      const nis = user.student_nis || (user.role === 'siswa' ? user.username : '');
      if (!nis) throw new Error('Akun belum terhubung ke NIS siswa.');
      const student = await client.query("SELECT full_name, class_code FROM app_users WHERE role = 'siswa' AND student_nis = $1 AND active = true", [nis]);
      if (!student.rowCount) throw new Error('Siswa tidak ditemukan.');
      const schoolDate = clean(data.tanggal, 10) || jakartaDate();
      const achievement = Math.max(0, Math.min(100, Number(data.capaian) || 0));
      await client.query(
        `INSERT INTO native_yaumiah(id, school_date, student_nis, student_name, class_code, achievement, reading, parent_note, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (school_date, student_nis) DO UPDATE SET achievement = EXCLUDED.achievement, reading = EXCLUDED.reading,
           parent_note = CASE WHEN EXCLUDED.parent_note = '' THEN native_yaumiah.parent_note ELSE EXCLUDED.parent_note END,
           recorded_by = EXCLUDED.recorded_by, updated_at = now()`,
        [crypto.randomUUID(), schoolDate, nis, student.rows[0].full_name, student.rows[0].class_code, achievement, clean(data.bacaan, 1000), clean(data.catatanOrtu, 2000), user.id]
      );
      if (Array.isArray(data.items)) {
        for (const item of data.items.slice(0, 200)) {
          const itemId = clean(item.id, 80);
          if (!itemId) continue;
          await client.query(
            `INSERT INTO native_yaumiah_details(school_date,student_nis,item_id,done,status)
             SELECT $1,$2,id,$3,$4 FROM native_yaumiah_master WHERE id=$5 AND active=true
             ON CONFLICT(school_date,student_nis,item_id) DO UPDATE SET done=EXCLUDED.done,status=EXCLUDED.status,updated_at=now()`,
            [schoolDate, nis, Boolean(item.done), clean(item.status, 80), itemId]
          );
        }
      }
      message = 'Catatan Yaumiah berhasil disimpan langsung di Railway.';
    } else if (action === 'MASTER_YAUMIAH') {
      required(data, ['id', 'nama', 'kelas']);
      if (user.role === 'guru' && clean(data.kelas, 40) !== user.class_code) throw new Error('Guru hanya dapat mengatur aktivitas kelas binaannya.');
      await client.query(
        `INSERT INTO native_yaumiah_master(id,name,category,points,class_code,created_by)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [clean(data.id, 80), clean(data.nama, 200), clean(data.kategori, 80) || 'Ibadah', Math.max(0, Math.min(1000, Number(data.poin) || 10)), clean(data.kelas, 40), user.id]
      );
      message = 'Aktivitas Yaumiah berhasil ditambahkan.';
    } else if (action === 'UPDATE_YAUMIAH') {
      required(data, ['oldId', 'id', 'nama', 'kelas']);
      const current = await client.query('SELECT class_code FROM native_yaumiah_master WHERE id=$1 AND active=true FOR UPDATE', [clean(data.oldId, 80)]);
      if (!current.rowCount) throw new Error('Aktivitas Yaumiah tidak ditemukan.');
      if (user.role === 'guru' && (current.rows[0].class_code !== user.class_code || clean(data.kelas, 40) !== user.class_code)) throw new Error('Guru hanya dapat mengatur aktivitas kelas binaannya.');
      await client.query(
        `UPDATE native_yaumiah_master SET id=$1,name=$2,category=$3,points=$4,class_code=$5,updated_at=now() WHERE id=$6`,
        [clean(data.id, 80), clean(data.nama, 200), clean(data.kategori, 80) || 'Ibadah', Math.max(0, Math.min(1000, Number(data.poin) || 10)), clean(data.kelas, 40), clean(data.oldId, 80)]
      );
      message = 'Aktivitas Yaumiah berhasil diperbarui.';
    } else if (action === 'DELETE_YAUMIAH') {
      required(data, ['id']);
      const current = await client.query('SELECT class_code FROM native_yaumiah_master WHERE id=$1 AND active=true FOR UPDATE', [clean(data.id, 80)]);
      if (!current.rowCount) throw new Error('Aktivitas Yaumiah tidak ditemukan.');
      if (user.role === 'guru' && current.rows[0].class_code !== user.class_code) throw new Error('Guru hanya dapat mengatur aktivitas kelas binaannya.');
      await client.query('UPDATE native_yaumiah_master SET active=false,updated_at=now() WHERE id=$1', [clean(data.id, 80)]);
      message = 'Aktivitas Yaumiah dinonaktifkan.';
    } else if (action === 'TARGET_TAHFIDZ') {
      required(data, ['kelas']);
      const classCode = clean(data.kelas, 40);
      if (user.role === 'guru' && classCode !== user.class_code) throw new Error('Guru hanya dapat mengatur target kelas binaannya.');
      await client.query(
        `INSERT INTO native_tahfidz_targets(class_code,teacher_name,surah,verses,period,updated_by)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(class_code) DO UPDATE SET teacher_name=EXCLUDED.teacher_name,
         surah=EXCLUDED.surah,verses=EXCLUDED.verses,period=EXCLUDED.period,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [classCode, clean(data.guru || user.full_name, 160), clean(data.surah, 160), clean(data.ayat, 160), clean(data.periode, 160), user.id]
      );
      message = 'Target Tahfidz berhasil disimpan.';
    } else if (action === 'TUGAS') {
      required(data, ['mapel', 'kelas', 'judul']);
      await assertTeacherSubject(client, user, clean(data.mapel, 160));
      const id = clean(data.id, 80) || `TUGAS-${Date.now()}`;
      await client.query(
        `INSERT INTO native_tasks(id, subject, class_code, title, description, deadline, status, created_by, creator_username)
         VALUES ($1,$2,$3,$4,$5,$6,'Aktif',$7,$8)`,
        [id, clean(data.mapel, 160), clean(data.kelas, 40), clean(data.judul, 300), clean(data.deskripsi, 5000), data.deadline || null, user.id, user.username]
      );
      message = 'Tugas berhasil diterbitkan langsung dari Railway.';
    } else if (action === 'UPDATE_TUGAS') {
      required(data, ['oldId', 'id', 'mapel', 'kelas', 'judul']);
      const subject = clean(data.mapel, 160); await assertTeacherSubject(client, user, subject);
      const task = await client.query('SELECT creator_username FROM native_tasks WHERE id = $1 AND active = true FOR UPDATE', [clean(data.oldId, 80)]);
      if (!task.rowCount) throw new Error('Tugas tidak ditemukan.');
      if (user.role === 'guru' && task.rows[0].creator_username.toLowerCase() !== user.username.toLowerCase()) throw new Error('Guru hanya dapat mengubah tugas yang dibuat sendiri.');
      await client.query(
        `UPDATE native_tasks SET id=$1, subject=$2, class_code=$3, title=$4, description=$5,
          deadline=$6, status=$7, updated_at=now() WHERE id=$8`,
        [clean(data.id, 80), subject, clean(data.kelas, 40), clean(data.judul, 300), clean(data.deskripsi, 5000), data.deadline || null, clean(data.status, 30) || 'Aktif', clean(data.oldId, 80)]
      );
      message = 'Tugas berhasil diperbarui.';
    } else if (action === 'DELETE_TUGAS') {
      required(data, ['id']);
      const task = await client.query('SELECT creator_username FROM native_tasks WHERE id=$1 AND active=true FOR UPDATE', [clean(data.id, 80)]);
      if (!task.rowCount) throw new Error('Tugas tidak ditemukan.');
      if (user.role === 'guru' && task.rows[0].creator_username.toLowerCase() !== user.username.toLowerCase()) throw new Error('Guru hanya dapat menghapus tugas yang dibuat sendiri.');
      await client.query('UPDATE native_tasks SET active=false, updated_at=now() WHERE id=$1', [clean(data.id, 80)]);
      message = 'Tugas dinonaktifkan tanpa menghapus riwayat.';
    } else if (action === 'UPDATE_TUGAS_STATUS') {
      required(data, ['id']);
      const task = await client.query('SELECT class_code FROM native_tasks WHERE id=$1 AND active=true', [clean(data.id, 80)]);
      if (!task.rowCount) throw new Error('Tugas tidak ditemukan.');
      if (task.rows[0].class_code !== 'SEMUA' && task.rows[0].class_code !== user.class_code) throw new Error('Tugas ini bukan untuk kelas Anda.');
      await client.query(
        `INSERT INTO native_task_submissions(task_id,user_id,student_nis,status) VALUES($1,$2,$3,'SELESAI')
         ON CONFLICT(task_id,user_id) DO UPDATE SET status='SELESAI', submitted_at=now(), updated_at=now()`,
        [clean(data.id, 80), user.id, user.student_nis || user.username]
      );
      message = 'Tugas ditandai selesai.';
    } else if (action === 'SESI_UAS') {
      required(data, ['mapel', 'kelas']);
      const subject = clean(data.mapel, 160); await assertTeacherSubject(client, user, subject);
      const status = clean(data.status, 20).toUpperCase() === 'OPEN' ? 'OPEN' : 'CLOSED';
      if (status === 'OPEN') {
        const accessToken = clean(data.token, 20).toUpperCase() || String(crypto.randomInt(100000, 1000000));
        if (!/^[A-Z0-9]{4,12}$/.test(accessToken)) throw new Error('Token ujian harus 4–12 huruf atau angka.');
        const sessionId = crypto.randomUUID();
        await client.query(
          `INSERT INTO native_exam_sessions(id, subject, class_code, note, status, shuffle_questions, shuffle_options, created_by, opened_at, access_token)
           VALUES ($1,$2,$3,$4,'OPEN',$5,$6,$7,now(),$8)`,
          [sessionId, subject, clean(data.kelas, 40) || 'SEMUA', clean(data.catatan, 1000), data.acakSoal !== false, data.acakOpsi !== false, user.id, accessToken]
        );
        resultData = { id: sessionId, token: accessToken };
        message = 'Sesi ujian berhasil dibuka di Railway.';
      } else {
        const result = data.id
          ? await client.query("UPDATE native_exam_sessions SET status = 'CLOSED', closed_at = now(), updated_at = now() WHERE id = $1 AND status = 'OPEN'", [clean(data.id, 80)])
          : await client.query("UPDATE native_exam_sessions SET status = 'CLOSED', closed_at = now(), updated_at = now() WHERE subject = $1 AND class_code = $2 AND status = 'OPEN'", [subject, clean(data.kelas, 40) || 'SEMUA']);
        if (!result.rowCount) throw new Error('Sesi ujian aktif tidak ditemukan.');
        message = 'Sesi ujian berhasil ditutup.';
      }
    } else if (action === 'SEND_ANNOUNCEMENT') {
      required(data, ['judul', 'pesan']);
      const targets = Array.isArray(data.targets) && data.targets.length ? data.targets.map(item => clean(item, 120)) : ['SEMUA'];
      await client.query(
        `INSERT INTO native_announcements(id,title,message,targets,created_by,creator_name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), clean(data.judul, 120), clean(data.pesan, 3000), targets, user.id, user.full_name || user.username]
      );
      message = 'Pengumuman berhasil diterbitkan.';
    } else if (action === 'SEND_ADMIN_MESSAGE') {
      required(data, ['judul', 'pesan']);
      await client.query(
        `INSERT INTO native_messages(id,sender_id,sender_username,sender_name,sender_role,subject,message)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [crypto.randomUUID(), user.id, user.username, user.full_name || '', user.role, clean(data.judul, 120), clean(data.pesan, 5000)]
      );
      message = 'Pesan berhasil dikirim ke superadmin.';
    } else if (action === 'MARK_ADMIN_MESSAGE_READ') {
      required(data, ['id']);
      const result = await client.query("UPDATE native_messages SET status = 'SUDAH DIBACA', read_at = now(), read_by = $1 WHERE id = $2", [user.id, clean(data.id, 80)]);
      if (!result.rowCount) throw new Error('Pesan tidak ditemukan.');
      message = 'Pesan ditandai sudah dibaca.';
    } else if (action === 'SOAL_UAS') {
      const question = await normalizeQuestion(client, user, data);
      await client.query(
        `INSERT INTO school_questions(
           id, subject, class_code, cognitive_level, competency, question_text, options, answer_key,
           approval_status, question_type, revision_note, image_url, creator_username, created_by, source_import_id, package_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,NULL,$15)`,
        [question.id, question.subject, question.classCode, question.level, question.competency, question.question,
          JSON.stringify(question.options), question.answerKey, question.status, question.type, question.revisionNote,
          question.imageUrl, user.username, user.id, question.packageId]
      );
      message = 'Soal berhasil disimpan ke PostgreSQL dan diajukan untuk approval.';
    } else if (action === 'SOAL_UAS_BULK') {
      const list = Array.isArray(data.soalList) ? data.soalList : [];
      if (!list.length || list.length > 200) throw new Error('Bulk soal harus berisi 1–200 soal.');
      const ids = new Set();
      for (const raw of list) {
        const question = await normalizeQuestion(client, user, { ...raw, paketId: raw.paketId || data.paketId });
        if (ids.has(question.id)) throw new Error(`ID soal duplikat di dalam bulk: ${question.id}`);
        ids.add(question.id);
        await client.query(
          `INSERT INTO school_questions(id,subject,class_code,cognitive_level,competency,question_text,options,answer_key,
             approval_status,question_type,revision_note,image_url,creator_username,created_by,source_import_id,package_id)
           VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,NULL,$15)`,
          [question.id, question.subject, question.classCode, question.level, question.competency, question.question,
            JSON.stringify(question.options), question.answerKey, question.status, question.type, question.revisionNote,
            question.imageUrl, user.username, user.id, question.packageId]
        );
      }
      resultData = { count: list.length, packageId: clean(data.paketId, 100) };
      message = `${list.length} soal berhasil diimpor dan diajukan untuk approval.`;
    } else if (action === 'UPDATE_SOAL') {
      const id = clean(data.id, 80); await assertOwnedQuestion(client, user, id);
      const question = await normalizeQuestion(client, user, data);
      await client.query(
        `UPDATE school_questions SET subject=$1,class_code=$2,cognitive_level=$3,competency=$4,question_text=$5,
          options=$6::jsonb,answer_key=$7,approval_status=$8,question_type=$9,revision_note=$10,image_url=$11,
          package_id=coalesce(nullif($12,''),package_id),source_import_id=NULL,updated_at=now() WHERE id=$13`,
        [question.subject, question.classCode, question.level, question.competency, question.question, JSON.stringify(question.options),
          question.answerKey, question.status, question.type, question.revisionNote, question.imageUrl, question.packageId, id]
      );
      message = 'Soal berhasil diperbarui dan diajukan ulang.';
    } else if (action === 'BULK_UPDATE_GAMBAR_SOAL') {
      const updates = Array.isArray(data.updates) ? data.updates.slice(0, 200) : [];
      if (!updates.length) throw new Error('Tidak ada gambar soal yang akan diperbarui.');
      for (const update of updates) {
        const id = clean(update.id, 80); await assertOwnedQuestion(client, user, id);
        await client.query('UPDATE school_questions SET image_url=$1,updated_at=now() WHERE id=$2', [clean(update.gambarUrl || update.imageUrl, 1_500_000), id]);
      }
      resultData = { count: updates.length }; message = `${updates.length} gambar soal berhasil diperbarui.`;
    } else if (action === 'BULK_APPROVE_SOAL') {
      const ids = Array.isArray(data.ids) ? [...new Set(data.ids.map(id => clean(id, 80)).filter(Boolean))].slice(0, 500) : [];
      if (!ids.length) throw new Error('Pilih setidaknya satu soal.');
      const changed = await client.query("UPDATE school_questions SET approval_status='Approved',revision_note='',updated_at=now() WHERE id=ANY($1::text[]) AND active=true", [ids]);
      resultData = { count: changed.rowCount }; message = `${changed.rowCount} soal berhasil disetujui.`;
    } else if (action === 'BULK_DELETE_SOAL') {
      const ids = Array.isArray(data.ids) ? [...new Set(data.ids.map(id => clean(id, 80)).filter(Boolean))].slice(0, 500) : [];
      if (!ids.length) throw new Error('Pilih setidaknya satu soal.');
      if (user.role === 'guru') for (const id of ids) await assertOwnedQuestion(client, user, id);
      const params = [ids]; let owner = '';
      if (user.role === 'guru') { params.push(user.username.toLowerCase()); owner = ' AND lower(creator_username)=$2'; }
      const changed = await client.query(`UPDATE school_questions SET active=false,updated_at=now() WHERE id=ANY($1::text[]) AND active=true${owner}`, params);
      resultData = { count: changed.rowCount }; message = `${changed.rowCount} soal dinonaktifkan tanpa menghapus riwayat.`;
    } else if (action === 'DELETE_SOAL_PACKAGE') {
      const packageId = clean(data.paketId, 100); const subject = clean(data.mapel, 160); const classCode = clean(data.kelas, 40);
      if (!packageId && (!subject || !classCode)) throw new Error('Paket atau mapel dan kelas wajib dipilih.');
      const params = packageId ? [packageId] : [subject, classCode];
      let where = packageId ? 'package_id=$1' : 'subject=$1 AND class_code=$2';
      if (user.role === 'guru') { params.push(user.username.toLowerCase()); where += ` AND lower(creator_username)=$${params.length}`; }
      const changed = await client.query(`UPDATE school_questions SET active=false,updated_at=now() WHERE active=true AND ${where}`, params);
      resultData = { count: changed.rowCount }; message = `${changed.rowCount} soal dalam paket dinonaktifkan.`;
    } else if (action === 'UPDATE_APPROVAL_SOAL') {
      required(data, ['id']);
      const status = clean(data.statusApproval || data.status, 80);
      if (!['Approved', 'Perlu Revisi', 'Menunggu Approval Kepsek'].includes(status)) throw new Error('Status approval tidak valid.');
      const result = await client.query(
        `UPDATE school_questions SET approval_status = $1, revision_note = $2, updated_at = now()
          WHERE id = $3 AND active = true`,
        [status, clean(data.catatanRevisi || data.catatan, 2000), clean(data.id, 80)]
      );
      if (!result.rowCount) throw new Error('Soal tidak ditemukan.');
      message = status === 'Approved' ? 'Soal berhasil disetujui.' : 'Status soal berhasil diperbarui.';
    } else if (action === 'DELETE_SOAL') {
      required(data, ['id']);
      await assertOwnedQuestion(client, user, clean(data.id, 80));
      await client.query('UPDATE school_questions SET active = false, updated_at = now() WHERE id = $1', [clean(data.id, 80)]);
      message = 'Soal dinonaktifkan tanpa menghapus riwayat.';
    } else if (action === 'SUBMIT_GRADE_COMPLAINT') {
      required(data, ['attemptId', 'argument']);
      const argument = clean(data.argument, 5000);
      if (argument.length < 20) throw new Error('Alasan komplain minimal 20 karakter.');
      const attempt = await client.query("SELECT * FROM native_exam_attempts WHERE id=$1 AND status='SUBMITTED' FOR UPDATE", [clean(data.attemptId, 80)]);
      if (!attempt.rowCount) throw new Error('Hasil ujian tidak ditemukan.');
      const nis = user.student_nis || user.username;
      if (attempt.rows[0].student_nis !== nis) throw new Error('Hasil ujian bukan milik akun Anda.');
      await client.query(
        `INSERT INTO native_grade_complaints(id,attempt_id,student_nis,student_name,class_code,subject,score_before,
           submitted_by,submitter_username,submitter_role,argument,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'KOMPLAIN')
         ON CONFLICT(attempt_id,student_nis) DO UPDATE SET argument=EXCLUDED.argument,status='KOMPLAIN',score_before=EXCLUDED.score_before,
           score_after=NULL,teacher_response='',resolved_by=NULL,resolved_at=NULL,updated_at=now()`,
        [crypto.randomUUID(), attempt.rows[0].id, nis, attempt.rows[0].student_name, attempt.rows[0].class_code,
          attempt.rows[0].subject, attempt.rows[0].score, user.id, user.username, user.role, argument]
      );
      message = 'Komplain nilai berhasil dikirim kepada guru.';
    } else if (action === 'RESOLVE_GRADE_COMPLAINT') {
      required(data, ['complaintId', 'teacherResponse']);
      const complaint = await client.query('SELECT * FROM native_grade_complaints WHERE id=$1 FOR UPDATE', [clean(data.complaintId, 80)]);
      if (!complaint.rowCount) throw new Error('Komplain nilai tidak ditemukan.');
      await assertTeacherSubject(client, user, complaint.rows[0].subject);
      const nextScore = Math.max(0, Math.min(100, Number(data.newScore)));
      if (!Number.isFinite(nextScore)) throw new Error('Nilai baru tidak valid.');
      if (clean(data.teacherResponse, 5000).length < 10) throw new Error('Tanggapan guru minimal 10 karakter.');
      await client.query("UPDATE native_exam_attempts SET score=$1,grading_note=$2 WHERE id=$3 AND status='SUBMITTED'", [nextScore, clean(data.teacherResponse, 5000), complaint.rows[0].attempt_id]);
      await client.query(
        `UPDATE native_grade_complaints SET status='SELESAI',score_after=$1,teacher_response=$2,resolved_by=$3,resolved_at=now(),updated_at=now() WHERE id=$4`,
        [nextScore, clean(data.teacherResponse, 5000), user.id, complaint.rows[0].id]
      );
      message = 'Komplain nilai diselesaikan dan nilai diperbarui.';
    } else if (action === 'GRADE_ESSAY') {
      required(data, ['attemptId']);
      const attempt = await client.query("SELECT * FROM native_exam_attempts WHERE id=$1 AND status='SUBMITTED' FOR UPDATE", [clean(data.attemptId, 80)]);
      if (!attempt.rowCount) throw new Error('Attempt ujian tidak ditemukan.');
      await assertTeacherSubject(client, user, attempt.rows[0].subject);
      const rawScores = data.scores && typeof data.scores === 'object' ? data.scores : {};
      const essayScores = Array.isArray(rawScores)
        ? Object.fromEntries(rawScores.map(item => [clean(item.questionId || item.id, 80), Math.max(0, Math.min(100, Number(item.score) || 0))]))
        : Object.fromEntries(Object.entries(rawScores).map(([id, score]) => [clean(id, 80), Math.max(0, Math.min(100, Number(score) || 0))]));
      const essayValues = Object.values(essayScores);
      if (!essayValues.length) throw new Error('Skor esai wajib diisi.');
      const objectiveQuestions = await client.query("SELECT count(*)::int AS total FROM school_questions WHERE id=ANY($1::text[]) AND upper(question_type) <> 'ESAI'", [attempt.rows[0].question_manifest]);
      const objectiveTotal = objectiveQuestions.rows[0].total;
      const objectiveScore = objectiveTotal ? (Number(attempt.rows[0].correct_count) / objectiveTotal) * 100 : 0;
      const essayScore = essayValues.reduce((sum, score) => sum + score, 0) / essayValues.length;
      const objectiveWeight = objectiveTotal ? Number(data.objectiveWeight ?? 50) : 0;
      const essayWeight = objectiveTotal ? Number(data.essayWeight ?? 50) : 100;
      if (!Number.isFinite(objectiveWeight) || !Number.isFinite(essayWeight) || objectiveWeight < 0 || essayWeight < 0 || objectiveWeight + essayWeight !== 100) throw new Error('Total bobot objektif dan esai harus tepat 100%.');
      const finalScore = objectiveScore * objectiveWeight / 100 + essayScore * essayWeight / 100;
      await client.query('UPDATE native_exam_attempts SET essay_scores=$1::jsonb,score=$2,grading_note=$3 WHERE id=$4', [JSON.stringify(essayScores), Math.round(finalScore * 100) / 100, clean(data.note, 5000), attempt.rows[0].id]);
      resultData = { score: Math.round(finalScore * 100) / 100 }; message = 'Penilaian esai berhasil difinalkan.';
    } else if (action === 'UPDATE_EXAM_GRADE') {
      required(data, ['attemptId']);
      const attempt = await client.query("SELECT * FROM native_exam_attempts WHERE id=$1 AND status='SUBMITTED' FOR UPDATE", [clean(data.attemptId, 80)]);
      if (!attempt.rowCount) throw new Error('Attempt ujian tidak ditemukan.');
      await assertTeacherSubject(client, user, attempt.rows[0].subject);
      const nextScore = Math.max(0, Math.min(100, Number(data.score)));
      if (!Number.isFinite(nextScore)) throw new Error('Nilai tidak valid.');
      await client.query('UPDATE native_exam_attempts SET score=$1,grading_note=$2 WHERE id=$3', [nextScore, clean(data.note, 5000), attempt.rows[0].id]);
      message = 'Nilai ujian berhasil dikoreksi.';
    } else if (action === 'SAVE_ORG_SETTINGS') {
      const source = data.settings && typeof data.settings === 'object' ? data.settings : data;
      const settings = {};
      for (const key of ['namaYayasan', 'namaSekolah', 'alamat', 'telepon', 'email', 'logoUrl', 'docAcuanUrl', 'folderPendukungUrl', 'folderSoalUrl']) {
        if (source[key] != null) settings[key] = clean(source[key], key === 'logoUrl' ? 2000 : 500);
      }
      await client.query(
        `INSERT INTO runtime_settings(setting_key,setting_value) VALUES('organization',$1::jsonb)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=runtime_settings.setting_value || EXCLUDED.setting_value,updated_at=now()`,
        [JSON.stringify(settings)]
      );
      resultData = settings; message = 'Identitas organisasi berhasil disimpan.';
    } else if (action === 'SAVE_ATTENDANCE_SETTINGS') {
      const schoolLatitude = Number(data.schoolLatitude); const schoolLongitude = Number(data.schoolLongitude); const radiusM = Number(data.radiusM);
      if (!Number.isFinite(schoolLatitude) || !Number.isFinite(schoolLongitude) || !Number.isFinite(radiusM) || radiusM < 10 || radiusM > 5000) throw new Error('Koordinat sekolah atau radius tidak valid.');
      const settings = { schoolLatitude, schoolLongitude, radiusM, qrTokenMasuk: clean(data.qrTokenMasuk, 200), qrTokenPulang: clean(data.qrTokenPulang, 200) };
      if (!settings.qrTokenMasuk || !settings.qrTokenPulang) throw new Error('Token QR masuk dan pulang wajib diisi.');
      await client.query(`INSERT INTO runtime_settings(setting_key,setting_value) VALUES('attendance',$1::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()`, [JSON.stringify(settings)]);
      resultData = settings; message = 'Pengaturan QR dan radius presensi berhasil disimpan.';
    } else {
      throw new Error('Aksi native belum tersedia.');
    }

    await client.query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1,$2,'native_app',NULL,$3::jsonb)`,
      [user.id, action, JSON.stringify({ role: user.role })]
    );
    await client.query('COMMIT');
    return { status: 'ok', message, data: resultData };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflict = new Error('Kode, NIS, NIP, username, atau ID tersebut sudah digunakan.'); conflict.status = 409; throw conflict;
    }
    if (!error.status) error.status = 422;
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ROLE_ACTIONS, actionAllowed, runNativeAction };
