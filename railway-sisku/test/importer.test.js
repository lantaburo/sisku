'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSnapshot, summarizeSnapshot, usersFromSnapshot, importSnapshot } = require('../src/importer');

function fixture() {
  return {
    spreadsheetId: 'sheet-test',
    exportedAt: '2026-11-26T01:00:00.000Z',
    sheets: {
      Users: {
        headers: ['ID_User', 'Username', 'PIN_Akses', 'Role', 'Nama_Lengkap', 'Kelas', 'NIS_Terkait'],
        rows: [['USR-1', 'siswa.1', 'v1$salt$hash', 'Siswa', 'Nama Siswa', 'VIII-A', '1001']]
      },
      Master_Kelas: {
        headers: ['Kode_Kelas', 'Nama_Kelas'],
        rows: [['VIII-A', 'Kelas VIII-A']]
      }
    }
  };
}

test('normalisasi mempertahankan urutan sheet, header, dan baris', () => {
  const snapshot = normalizeSnapshot(fixture());
  assert.equal(snapshot.sheets.length, 2);
  assert.equal(snapshot.sheets[0].name, 'Users');
  assert.deepEqual(snapshot.sheets[0].rows[0].slice(0, 2), ['USR-1', 'siswa.1']);
});

test('checksum stabil untuk isi snapshot yang sama', () => {
  const first = summarizeSnapshot(normalizeSnapshot(fixture()));
  const second = summarizeSnapshot(normalizeSnapshot(fixture()));
  assert.equal(first.checksum, second.checksum);
  assert.equal(first.rowCount, 2);
  assert.equal(first.sheetCount, 2);
});

test('user GAS diproyeksikan tanpa mengubah hash sumber', () => {
  const users = usersFromSnapshot(normalizeSnapshot(fixture()));
  assert.equal(users.length, 1);
  assert.equal(users[0].username, 'siswa.1');
  assert.equal(users[0].pinHash, 'v1$salt$hash');
  assert.equal(users[0].role, 'siswa');
});

test('import default selalu dry-run dan tidak membutuhkan database', async () => {
  const result = await importSnapshot(fixture());
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.projectedUsers, 1);
});

test('menolak nama sheet duplikat tanpa peka kapital', () => {
  const broken = fixture();
  broken.sheets = [
    { name: 'Users', headers: [], rows: [] },
    { name: 'users', headers: [], rows: [] }
  ];
  assert.throws(() => normalizeSnapshot(broken), /Nama sheet harus unik/);
});
