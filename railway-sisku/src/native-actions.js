'use strict';

const crypto = require('node:crypto');
const { hashPin } = require('./security');

const ROLE_ACTIONS = Object.freeze({
  superadmin: new Set([
    'REGISTER_MAPEL', 'UPDATE_MAPEL', 'DELETE_MAPEL',
    'REGISTER_KELAS', 'UPDATE_KELAS', 'DELETE_KELAS',
    'REGISTER_GURU', 'UPDATE_GURU', 'DELETE_GURU',
    'REGISTER_SISWA', 'UPDATE_SISWA', 'DELETE_SISWA',
    'SOAL_UAS', 'UPDATE_SOAL', 'DELETE_SOAL'
  ]),
  guru: new Set(['SOAL_UAS', 'UPDATE_SOAL', 'DELETE_SOAL']),
  kepsek: new Set([]), siswa: new Set([]), ortu: new Set([])
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

async function runNativeAction(pool, user, action, data) {
  if (!actionAllowed(user.role, action)) {
    const error = new Error('Aksi ini tidak diizinkan untuk peran akun Anda.'); error.status = 403; throw error;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let message = 'Perubahan berhasil disimpan.';

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
    } else if (action === 'SOAL_UAS') {
      required(data, ['id', 'mapel', 'kelas', 'pertanyaan']);
      const subject = clean(data.mapel, 160); await assertSubject(client, subject); await assertTeacherSubject(client, user, subject);
      const classCode = clean(data.kelas, 40);
      if (classCode.toUpperCase() !== 'SEMUA') await assertClass(client, classCode);
      const type = clean(data.tipeSoal, 30) || 'PG';
      if (['PG', 'PGK'].includes(type.toUpperCase()) && (!clean(data.opsiA, 2000) || !clean(data.opsiB, 2000) || !clean(data.opsiC, 2000) || !clean(data.opsiD, 2000) || !clean(data.kunci, 2000))) {
        throw new Error('Pilihan ganda memerlukan opsi A–D dan kunci jawaban.');
      }
      await client.query(
        `INSERT INTO school_questions(
           id, subject, class_code, cognitive_level, competency, question_text, options, answer_key,
           approval_status, question_type, revision_note, image_url, creator_username, created_by, source_import_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,NULL)`,
        [clean(data.id, 80), subject, classCode, clean(data.level, 40) || 'C3', clean(data.kd, 300), clean(data.pertanyaan, 10_000),
          JSON.stringify({ A: clean(data.opsiA, 2000), B: clean(data.opsiB, 2000), C: clean(data.opsiC, 2000), D: clean(data.opsiD, 2000), E: clean(data.opsiE, 2000) }),
          clean(data.kunci, 2000), user.role === 'guru' ? 'Menunggu Approval Kepsek' : clean(data.statusApproval, 80) || 'Menunggu Approval Kepsek',
          type, clean(data.catatanRevisi, 2000), clean(data.gambarUrl, 2000), user.username, user.id]
      );
      message = 'Soal berhasil disimpan ke PostgreSQL dan diajukan untuk approval.';
    } else {
      throw new Error('Aksi native belum tersedia.');
    }

    await client.query(
      `INSERT INTO audit_log(actor_user_id, action, entity_type, entity_id, details)
       VALUES ($1,$2,'native_app',NULL,$3::jsonb)`,
      [user.id, action, JSON.stringify({ role: user.role })]
    );
    await client.query('COMMIT');
    return { status: 'ok', message };
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
