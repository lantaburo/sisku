'use strict';

function normalized(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeKey(value) {
  return normalized(value).toLowerCase().replace(/[\s_-]+/g, '');
}

function rowObject(headers, values) {
  const result = {};
  headers.forEach((header, index) => {
    result[normalized(header) || `Kolom_${index + 1}`] = values[index] == null ? '' : values[index];
  });
  return result;
}

async function latestImport(pool) {
  const result = await pool.query(
    `SELECT id, source_exported_at, imported_at, sheet_count, row_count, snapshot_checksum
       FROM import_batches
      WHERE status = 'completed'
      ORDER BY imported_at DESC
      LIMIT 1`
  );
  return result.rows[0] || null;
}

async function loadSheet(pool, sheetName, importId) {
  const activeImportId = importId || (await latestImport(pool))?.id;
  if (!activeImportId) return [];
  const result = await pool.query(
    `SELECT s.headers, r.row_values
       FROM import_sheets s
       LEFT JOIN legacy_sheet_rows r
         ON r.import_id = s.import_id AND r.sheet_name = s.sheet_name
      WHERE s.import_id = $1 AND lower(s.sheet_name) = lower($2)
      ORDER BY r.source_row_number`,
    [activeImportId, sheetName]
  );
  if (!result.rowCount) return [];
  const headers = Array.isArray(result.rows[0].headers) ? result.rows[0].headers : [];
  return result.rows.filter(row => Array.isArray(row.row_values)).map(row => rowObject(headers, row.row_values));
}

function value(record, ...names) {
  for (const name of names) {
    if (record && record[name] != null && String(record[name]) !== '') return record[name];
  }
  return '';
}

function schoolDate(valueToFormat) {
  const raw = normalized(valueToFormat);
  if (!raw) return '';
  const direct = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const id = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (id) return `${id[3]}-${id[2].padStart(2, '0')}-${id[1].padStart(2, '0')}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return formatJakartaDate(date);
}

function formatJakartaDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function todayJakarta() {
  return formatJakartaDate(new Date());
}

function visibleAnnouncement(row, user) {
  const target = normalized(value(row, 'Target_Accounts')).toLowerCase();
  if (!target || ['semua', 'all', '*'].includes(target)) return true;
  const tokens = target.replace(/[\[\]"']/g, '').split(/[,;|\n]+/).map(item => normalizeKey(item));
  return tokens.includes(normalizeKey(user.username)) || tokens.includes(normalizeKey(user.role));
}

module.exports = {
  normalized,
  normalizeKey,
  latestImport,
  loadSheet,
  value,
  schoolDate,
  formatJakartaDate,
  todayJakarta,
  visibleAnnouncement
};
