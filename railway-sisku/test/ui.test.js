'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const publicDir = path.join(__dirname, '..', 'src', 'public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');

test('UI memakai Plus Jakarta Sans dan pola visual SISKU emerald', () => {
  assert.match(html, /family=Plus\+Jakarta\+Sans/);
  assert.match(css, /"Plus Jakarta Sans"/);
  assert.match(css, /--emerald-800:\s*#065f46/);
  assert.match(html, /id="top-navigation"/);
  assert.match(html, /id="bottom-navigation"/);
});

test('navigasi didefinisikan khusus untuk kelima peran', () => {
  for (const role of ['siswa', 'ortu', 'guru', 'kepsek', 'superadmin']) {
    assert.match(js, new RegExp(`\\b${role}: \\[`, 'm'));
  }
  assert.match(js, /Data Siswa/);
  assert.match(js, /Dashboard Eksekutif/);
  assert.match(js, /GAS & Railway/);
});

test('semua panel navigasi utama tersedia dan tidak memakai tombol menu disabled', () => {
  for (const panel of ['summary', 'attendance', 'yaumiah', 'tasks', 'grades', 'questions', 'management', 'services', 'master', 'integration', 'security']) {
    assert.match(html, new RegExp(`id="${panel}-panel"`));
  }
  assert.doesNotMatch(html, /class="nav-button"[^>]*disabled/);
});

test('Railway menyediakan pembuatan soal dan CRUD master native PostgreSQL', () => {
  assert.match(html, /id="question-form"/);
  assert.match(html, /id="native-question-table"/);
  assert.match(html, /id="management-form"/);
  for (const action of ['REGISTER_MAPEL', 'UPDATE_MAPEL', 'DELETE_MAPEL', 'REGISTER_KELAS', 'REGISTER_GURU', 'REGISTER_SISWA', 'SOAL_UAS', 'UPDATE_APPROVAL_SOAL']) {
    assert.match(js, new RegExp(action));
  }
  assert.match(js, /\/api\/v1\/native\/action/);
  assert.doesNotMatch(js, /GAS_SESSION_REQUIRED/);
});

test('aksi operasional berjalan native tanpa tautan kerja ke GAS', () => {
  assert.doesNotMatch(js, /const GAS_URL/);
  assert.doesNotMatch(html, /operational-link/);
  assert.match(html, /id="native-exam-surface"/);
  assert.match(html, /id="attendance-form"/);
  assert.match(html, /id="yaumiah-form"/);
  assert.match(html, /id="task-form"/);
  assert.match(html, /id="communication-form"/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
});

test('UI menyediakan flow token, impersonasi, komplain, bulk, dan penilaian', () => {
  for (const id of ['impersonation-banner', 'exam-token', 'attempt-list', 'bulk-question-form', 'bulk-master-form', 'yaumiah-master-form', 'attendance-settings-form']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const flow of ['admin/impersonate', 'SUBMIT_GRADE_COMPLAINT', 'RESOLVE_GRADE_COMPLAINT', 'SOAL_UAS_BULK', 'GRADE_ESSAY', 'UPDATE_TUGAS_STATUS']) {
    assert.match(js, new RegExp(flow));
  }
});
