'use strict';

const { importSnapshot } = require('./importer');
const { sha256 } = require('./security');

const DEFAULT_PAGE_SIZE = 250;
let activeSync = null;

function syncConfig(env = process.env) {
  const webAppUrl = String(env.GAS_WEB_APP_URL || '').trim();
  const secret = String(env.GAS_SYNC_SECRET || '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(webAppUrl)) {
    throw new Error('GAS_WEB_APP_URL harus berupa URL deployment Apps Script /exec.');
  }
  if (secret.length < 32) throw new Error('GAS_SYNC_SECRET minimal 32 karakter.');
  return { webAppUrl, secret };
}

async function gasRequest(webAppUrl, action, data, fetchImpl = fetch) {
  const response = await fetchImpl(webAppUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data }),
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) throw new Error(`GAS merespons HTTP ${response.status}.`);
  const contentType = String(response.headers.get('content-type') || '');
  if (!contentType.includes('application/json')) throw new Error('Respons GAS bukan JSON. Pastikan URL deployment /exec benar.');
  const result = await response.json();
  if (!result || result.status !== 'ok') throw new Error(String(result && result.message || 'Sinkronisasi GAS ditolak.'));
  return result;
}

async function fetchGasSnapshot(options = {}) {
  const { webAppUrl, secret } = options.webAppUrl && options.secret
    ? options
    : syncConfig(options.env);
  const fetchImpl = options.fetchImpl || fetch;
  const pageSize = Math.min(500, Math.max(1, Number(options.pageSize) || DEFAULT_PAGE_SIZE));
  const manifest = await gasRequest(webAppUrl, 'RAILWAY_SYNC_MANIFEST', { secret }, fetchImpl);
  const sheets = [];
  for (const sheetInfo of manifest.sheets || []) {
    const expectedRows = Math.max(0, Number(sheetInfo.rowCount) || 0);
    const rows = [];
    while (rows.length < expectedRows) {
      const page = await gasRequest(webAppUrl, 'RAILWAY_SYNC_SHEET', {
        secret,
        sheet: sheetInfo.name,
        offset: rows.length,
        limit: pageSize
      }, fetchImpl);
      if (!Array.isArray(page.rows) || page.rows.length === 0) {
        throw new Error(`GAS mengembalikan halaman kosong sebelum sheet ${sheetInfo.name} selesai.`);
      }
      rows.push(...page.rows);
      if (rows.length > expectedRows) throw new Error(`Jumlah baris sheet ${sheetInfo.name} melebihi manifest.`);
    }
    const actualChecksum = sha256(JSON.stringify([sheetInfo.headers || [], rows]));
    if (sheetInfo.checksum && actualChecksum !== sheetInfo.checksum) {
      throw new Error(`Sheet ${sheetInfo.name} berubah saat sinkronisasi. Jalankan ulang.`);
    }
    sheets.push({ name: sheetInfo.name, headers: sheetInfo.headers || [], rows });
  }
  return {
    format: manifest.format || 'sisku-sheet-snapshot/v1',
    spreadsheetId: manifest.spreadsheetId,
    spreadsheetTitle: manifest.spreadsheetTitle,
    exportedAt: manifest.exportedAt,
    sheets
  };
}

async function syncFromGas(options = {}) {
  const snapshot = await fetchGasSnapshot(options);
  return importSnapshot(snapshot, {
    apply: Boolean(options.apply),
    sourceType: 'google_sheets',
    sourceRef: snapshot.spreadsheetId,
    pool: options.pool
  });
}

function syncFromGasOnce(options = {}) {
  if (!activeSync) {
    activeSync = syncFromGas(options).finally(() => { activeSync = null; });
  }
  return activeSync;
}

module.exports = { DEFAULT_PAGE_SIZE, syncConfig, gasRequest, fetchGasSnapshot, syncFromGas, syncFromGasOnce };
