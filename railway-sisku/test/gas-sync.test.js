'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { syncConfig, fetchGasSnapshot } = require('../src/gas-sync');
const { sha256 } = require('../src/security');

const URL = 'https://script.google.com/macros/s/example-deployment_123/exec';
const SECRET = 'x'.repeat(32);

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: async () => body
  };
}

test('syncConfig menolak URL dan secret yang lemah', () => {
  assert.throws(() => syncConfig({ GAS_WEB_APP_URL: 'http://example.com', GAS_SYNC_SECRET: SECRET }), /GAS_WEB_APP_URL/);
  assert.throws(() => syncConfig({ GAS_WEB_APP_URL: URL, GAS_SYNC_SECRET: 'pendek' }), /minimal 32/);
  assert.deepEqual(syncConfig({ GAS_WEB_APP_URL: URL, GAS_SYNC_SECRET: SECRET }), { webAppUrl: URL, secret: SECRET });
});

test('fetchGasSnapshot mengambil sheet bertahap sesuai manifest', async () => {
  const calls = [];
  const fetchImpl = async (_url, request) => {
    const payload = JSON.parse(request.body);
    calls.push(payload);
    if (payload.action === 'RAILWAY_SYNC_MANIFEST') {
      return jsonResponse({
        status: 'ok', format: 'sisku-sheet-snapshot/v1', spreadsheetId: 'sheet-id',
        spreadsheetTitle: 'SISKU', exportedAt: '2026-11-26T00:00:00.000Z',
        sheets: [{ name: 'Users', headers: ['Username'], rowCount: 3, checksum: sha256(JSON.stringify([['Username'], [['a'], ['b'], ['c']]])) }]
      });
    }
    const offset = payload.data.offset;
    return jsonResponse({ status: 'ok', rows: offset === 0 ? [['a'], ['b']] : [['c']] });
  };
  const snapshot = await fetchGasSnapshot({ webAppUrl: URL, secret: SECRET, pageSize: 2, fetchImpl });
  assert.equal(calls.length, 3);
  assert.deepEqual(snapshot.sheets[0].rows, [['a'], ['b'], ['c']]);
});

test('fetchGasSnapshot berhenti bila halaman kosong sebelum selesai', async () => {
  const fetchImpl = async (_url, request) => {
    const payload = JSON.parse(request.body);
    if (payload.action === 'RAILWAY_SYNC_MANIFEST') {
      return jsonResponse({ status: 'ok', sheets: [{ name: 'Users', headers: [], rowCount: 1 }] });
    }
    return jsonResponse({ status: 'ok', rows: [] });
  };
  await assert.rejects(
    fetchGasSnapshot({ webAppUrl: URL, secret: SECRET, fetchImpl }),
    /halaman kosong/
  );
});
