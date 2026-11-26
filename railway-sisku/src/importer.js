'use strict';

const crypto = require('node:crypto');
const { getPool } = require('./db');
const { sha256 } = require('./security');

const MAX_SHEETS = 200;
const MAX_ROWS = 2_000_000;

function cleanCell(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function normalizeSheet(input, fallbackName) {
  const name = String(input.name || fallbackName || '').trim();
  if (!name || name.length > 160) throw new Error('Nama sheet kosong atau terlalu panjang.');
  const rawHeaders = Array.isArray(input.headers) ? input.headers : [];
  const rawRows = Array.isArray(input.rows) ? input.rows : [];
  const inferredWidth = rawRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  const width = Math.max(rawHeaders.length, inferredWidth);
  const headers = Array.from({ length: width }, (_, index) => String(rawHeaders[index] || `Kolom_${index + 1}`).trim() || `Kolom_${index + 1}`);
  const rows = rawRows
    .filter(Array.isArray)
    .map(row => Array.from({ length: width }, (_, index) => cleanCell(row[index])));
  return { name, headers, rows };
}

function normalizeSnapshot(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Snapshot harus berupa object JSON.');
  let rawSheets;
  if (Array.isArray(input.sheets)) {
    rawSheets = input.sheets;
  } else if (input.sheets && typeof input.sheets === 'object') {
    rawSheets = Object.entries(input.sheets).map(([name, sheet]) => ({ name, ...(sheet || {}) }));
  } else {
    throw new Error('Snapshot tidak memiliki daftar sheets.');
  }
  if (rawSheets.length > MAX_SHEETS) throw new Error(`Snapshot melebihi batas ${MAX_SHEETS} sheet.`);
  const sheets = rawSheets.map(sheet => normalizeSheet(sheet));
  const loweredNames = sheets.map(sheet => sheet.name.toLowerCase());
  if (new Set(loweredNames).size !== loweredNames.length) throw new Error('Nama sheet harus unik (tidak peka huruf besar/kecil).');
  const rowCount = sheets.reduce((total, sheet) => total + sheet.rows.length, 0);
  if (rowCount > MAX_ROWS) throw new Error(`Snapshot melebihi batas ${MAX_ROWS} baris.`);
  return {
    format: String(input.format || 'sisku-sheet-snapshot/v1'),
    spreadsheetId: String(input.spreadsheetId || input.sourceRef || 'unknown'),
    spreadsheetTitle: String(input.spreadsheetTitle || ''),
    exportedAt: input.exportedAt ? new Date(input.exportedAt).toISOString() : new Date().toISOString(),
    sheets
  };
}

function summarizeSnapshot(snapshot) {
  const sheetSummaries = snapshot.sheets.map(sheet => ({
    name: sheet.name,
    headers: sheet.headers,
    rowCount: sheet.rows.length,
    checksum: sha256(JSON.stringify([sheet.headers, sheet.rows]))
  }));
  return {
    sheetCount: snapshot.sheets.length,
    rowCount: sheetSummaries.reduce((total, sheet) => total + sheet.rowCount, 0),
    checksum: sha256(JSON.stringify(snapshot)),
    sheets: sheetSummaries
  };
}

function headerIndex(headers, target) {
  const wanted = String(target).trim().toLowerCase();
  return headers.findIndex(header => String(header).trim().toLowerCase() === wanted);
}

function getCell(row, headers, name) {
  const index = headerIndex(headers, name);
  return index < 0 ? '' : String(row[index] ?? '').trim();
}

function usersFromSnapshot(snapshot) {
  const sheet = snapshot.sheets.find(item => item.name.toLowerCase() === 'users');
  if (!sheet) return [];
  const required = ['ID_User', 'Username', 'PIN_Akses', 'Role', 'Nama_Lengkap', 'Kelas', 'NIS_Terkait'];
  const missing = required.filter(name => headerIndex(sheet.headers, name) < 0);
  if (missing.length) throw new Error(`Sheet Users tidak memiliki kolom: ${missing.join(', ')}.`);
  return sheet.rows.map((row, index) => ({
    rowNumber: index + 2,
    sourceUserId: getCell(row, sheet.headers, 'ID_User'),
    username: getCell(row, sheet.headers, 'Username'),
    pinHash: getCell(row, sheet.headers, 'PIN_Akses'),
    role: getCell(row, sheet.headers, 'Role').toLowerCase().replace(/[\s_-]+/g, ''),
    fullName: getCell(row, sheet.headers, 'Nama_Lengkap'),
    classCode: getCell(row, sheet.headers, 'Kelas'),
    studentNis: getCell(row, sheet.headers, 'NIS_Terkait')
  })).filter(user => user.username && user.pinHash && user.role);
}

async function insertRows(client, importId, sheet) {
  const chunkSize = 400;
  for (let start = 0; start < sheet.rows.length; start += chunkSize) {
    const rows = sheet.rows.slice(start, start + chunkSize);
    const params = [];
    const values = rows.map((row, offset) => {
      const base = params.length;
      params.push(importId, sheet.name, start + offset + 2, JSON.stringify(row), sha256(JSON.stringify(row)));
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::jsonb, $${base + 5})`;
    });
    await client.query(
      `INSERT INTO legacy_sheet_rows(import_id, sheet_name, source_row_number, row_values, row_checksum)
       VALUES ${values.join(', ')}`,
      params
    );
  }
}

async function projectUsers(client, importId, users) {
  let imported = 0;
  for (const user of users) {
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO app_users(
         id, source_user_id, username, pin_hash, role, full_name, class_code, student_nis, source_import_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (lower(username)) DO UPDATE SET
         source_user_id = EXCLUDED.source_user_id,
         pin_hash = CASE WHEN app_users.pin_upgraded_at IS NULL THEN EXCLUDED.pin_hash ELSE app_users.pin_hash END,
         role = EXCLUDED.role,
         full_name = EXCLUDED.full_name,
         class_code = EXCLUDED.class_code,
         student_nis = EXCLUDED.student_nis,
         active = true,
         source_import_id = EXCLUDED.source_import_id,
         updated_at = now()
       WHERE app_users.native_managed = false`,
      [id, user.sourceUserId, user.username, user.pinHash, user.role, user.fullName, user.classCode, user.studentNis, importId]
    );
    imported++;
  }
  return imported;
}

async function importSnapshot(rawSnapshot, options = {}) {
  const snapshot = normalizeSnapshot(rawSnapshot);
  const summary = summarizeSnapshot(snapshot);
  const sourceType = options.sourceType === 'google_sheets' ? 'google_sheets' : 'json_file';
  const sourceRef = String(options.sourceRef || snapshot.spreadsheetId || 'unknown');
  const users = usersFromSnapshot(snapshot);

  if (!options.apply) {
    return { mode: 'dry-run', ...summary, projectedUsers: users.length };
  }

  const pool = options.pool || getPool();
  const importId = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [summary.checksum]);
    const existing = await client.query(
      `SELECT id, imported_at, sheet_count, row_count
         FROM import_batches WHERE snapshot_checksum = $1 AND status = 'completed'`,
      [summary.checksum]
    );
    if (existing.rowCount) {
      await client.query('COMMIT');
      return { mode: 'already-imported', checksum: summary.checksum, ...existing.rows[0], projectedUsers: users.length };
    }
    await client.query(
      `INSERT INTO import_batches(
         id, source_type, source_ref, source_exported_at, snapshot_checksum, status, sheet_count, row_count
       ) VALUES ($1,$2,$3,$4,$5,'completed',$6,$7)`,
      [importId, sourceType, sourceRef, snapshot.exportedAt, summary.checksum, summary.sheetCount, summary.rowCount]
    );
    for (let index = 0; index < snapshot.sheets.length; index++) {
      const sheet = snapshot.sheets[index];
      const sheetSummary = summary.sheets[index];
      await client.query(
        `INSERT INTO import_sheets(import_id, sheet_name, headers, row_count, sheet_checksum)
         VALUES ($1,$2,$3::jsonb,$4,$5)`,
        [importId, sheet.name, JSON.stringify(sheet.headers), sheet.rows.length, sheetSummary.checksum]
      );
      await insertRows(client, importId, sheet);
    }
    const projectedUsers = await projectUsers(client, importId, users);
    const activeUsernames = users.map(user => user.username.toLowerCase());
    if (activeUsernames.length) {
      await client.query(
        `UPDATE app_users
            SET active = false, updated_at = now()
          WHERE source_import_id IS NOT NULL
            AND native_managed = false
            AND NOT (lower(username) = ANY($1::text[]))`,
        [activeUsernames]
      );
    }
    await client.query(
      `INSERT INTO audit_log(action, entity_type, entity_id, details)
       VALUES ('SNAPSHOT_IMPORTED', 'import_batch', $1, $2::jsonb)`,
      [importId, JSON.stringify({ checksum: summary.checksum, sheetCount: summary.sheetCount, rowCount: summary.rowCount, projectedUsers })]
    );
    await client.query('COMMIT');
    return { mode: 'imported', importId, ...summary, projectedUsers };
  } catch (error) {
    await client.query('ROLLBACK');
    try {
      await pool.query(
        `INSERT INTO import_batches(
           id, source_type, source_ref, source_exported_at, snapshot_checksum, status, error_message
         ) VALUES ($1,$2,$3,$4,$5,'failed',$6)`,
        [importId, sourceType, sourceRef, snapshot.exportedAt, summary.checksum, String(error.message).slice(0, 1000)]
      );
    } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { normalizeSnapshot, summarizeSnapshot, usersFromSnapshot, importSnapshot };
