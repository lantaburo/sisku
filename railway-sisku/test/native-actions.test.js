'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { actionAllowed } = require('../src/native-actions');

test('aksi native master hanya tersedia untuk superadmin', () => {
  assert.equal(actionAllowed('superadmin', 'REGISTER_MAPEL'), true);
  assert.equal(actionAllowed('superadmin', 'REGISTER_SISWA'), true);
  assert.equal(actionAllowed('guru', 'REGISTER_MAPEL'), false);
  assert.equal(actionAllowed('kepsek', 'REGISTER_GURU'), false);
});

test('pembuatan soal native tersedia untuk guru dan superadmin', () => {
  assert.equal(actionAllowed('guru', 'SOAL_UAS'), true);
  assert.equal(actionAllowed('superadmin', 'SOAL_UAS'), true);
  assert.equal(actionAllowed('siswa', 'SOAL_UAS'), false);
  assert.equal(actionAllowed('ortu', 'SOAL_UAS'), false);
  assert.equal(actionAllowed('kepsek', 'UPDATE_APPROVAL_SOAL'), true);
  assert.equal(actionAllowed('guru', 'UPDATE_APPROVAL_SOAL'), false);
});

test('layanan operasional native mengikuti peran', () => {
  assert.equal(actionAllowed('siswa', 'PRESENSI'), true);
  assert.equal(actionAllowed('siswa', 'YAUMIAH'), true);
  assert.equal(actionAllowed('guru', 'TUGAS'), true);
  assert.equal(actionAllowed('guru', 'SESI_UAS'), true);
  assert.equal(actionAllowed('superadmin', 'SEND_ANNOUNCEMENT'), true);
  assert.equal(actionAllowed('ortu', 'SEND_ADMIN_MESSAGE'), true);
  assert.equal(actionAllowed('siswa', 'SEND_ANNOUNCEMENT'), false);
});

test('alur paritas GAS dibatasi sesuai peran', () => {
  assert.equal(actionAllowed('guru', 'SOAL_UAS_BULK'), true);
  assert.equal(actionAllowed('kepsek', 'BULK_APPROVE_SOAL'), true);
  assert.equal(actionAllowed('siswa', 'UPDATE_TUGAS_STATUS'), true);
  assert.equal(actionAllowed('siswa', 'SUBMIT_GRADE_COMPLAINT'), true);
  assert.equal(actionAllowed('ortu', 'SUBMIT_GRADE_COMPLAINT'), true);
  assert.equal(actionAllowed('guru', 'RESOLVE_GRADE_COMPLAINT'), true);
  assert.equal(actionAllowed('guru', 'GRADE_ESSAY'), true);
  assert.equal(actionAllowed('superadmin', 'SAVE_ATTENDANCE_SETTINGS'), true);
  assert.equal(actionAllowed('siswa', 'RESOLVE_GRADE_COMPLAINT'), false);
});
