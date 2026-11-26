'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeKey, value, schoolDate, formatJakartaDate, visibleAnnouncement
} = require('../src/snapshot');

test('normalisasi role dan akun konsisten dengan GAS', () => {
  assert.equal(normalizeKey('Super Admin'), 'superadmin');
  assert.equal(normalizeKey('wali_kelas'), 'walikelas');
});

test('mengambil nama kolom alternatif pertama yang terisi', () => {
  assert.equal(value({ Lama: '', Baru: 'isi' }, 'Lama', 'Baru'), 'isi');
});

test('tanggal sekolah dinormalisasi ke yyyy-mm-dd', () => {
  assert.equal(schoolDate('26/11/2026'), '2026-11-26');
  assert.equal(schoolDate('2026-11-26T02:00:00.000Z'), '2026-11-26');
  assert.equal(formatJakartaDate(new Date('2026-11-25T18:30:00.000Z')), '2026-11-26');
});

test('pengumuman hanya terlihat untuk target yang sesuai', () => {
  const user = { username: 'guru.ali', role: 'guru' };
  assert.equal(visibleAnnouncement({ Target_Accounts: 'SEMUA' }, user), true);
  assert.equal(visibleAnnouncement({ Target_Accounts: 'siswa;ortu' }, user), false);
  assert.equal(visibleAnnouncement({ Target_Accounts: 'guru.ali' }, user), true);
});
