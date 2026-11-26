'use strict';

const { GoogleAuth } = require('google-auth-library');
const { importSnapshot } = require('../src/importer');
const { closePool } = require('../src/db');

function credentialsFromEnv() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON wajib diisi.');
  try {
    return JSON.parse(raw);
  } catch (_) {
    try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
    catch (error) { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON/base64 JSON yang valid.'); }
  }
}

async function googleGet(client, url) {
  const headers = await client.getRequestHeaders();
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Google Sheets API ${response.status}: ${await response.text()}`);
  return response.json();
}

async function fetchSnapshot(spreadsheetId) {
  const auth = new GoogleAuth({
    credentials: credentialsFromEnv(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  const metadata = await googleGet(client, `${base}?includeGridData=false&fields=properties.title,sheets.properties(title,index)`);
  const ordered = (metadata.sheets || []).sort((a, b) => a.properties.index - b.properties.index);
  const ranges = ordered.map(sheet => sheet.properties.title);
  const params = new URLSearchParams({
    majorDimension: 'ROWS',
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  });
  ranges.forEach(range => params.append('ranges', `'${range.replaceAll("'", "''")}'`));
  const values = await googleGet(client, `${base}/values:batchGet?${params.toString()}`);
  const valueRanges = values.valueRanges || [];
  const sheets = ordered.map((sheet, index) => {
    const rows = valueRanges[index] && Array.isArray(valueRanges[index].values) ? valueRanges[index].values : [];
    return {
      name: sheet.properties.title,
      headers: Array.isArray(rows[0]) ? rows[0] : [],
      rows: rows.slice(1)
    };
  });
  return {
    format: 'sisku-sheet-snapshot/v1',
    spreadsheetId,
    spreadsheetTitle: metadata.properties && metadata.properties.title || '',
    exportedAt: new Date().toISOString(),
    sheets
  };
}

async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID wajib diisi.');
  const apply = process.argv.includes('--apply');
  const snapshot = await fetchSnapshot(spreadsheetId);
  const result = await importSnapshot(snapshot, {
    apply,
    sourceType: 'google_sheets',
    sourceRef: spreadsheetId
  });
  console.log(JSON.stringify(result, null, 2));
  if (!apply) console.log('\nDRY-RUN: sumber hanya dibaca. Tambahkan --apply setelah jumlah dan checksum diverifikasi.');
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('GOOGLE_SYNC_FAILED', error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { credentialsFromEnv, fetchSnapshot };
