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
