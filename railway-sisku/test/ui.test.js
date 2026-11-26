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
  for (const panel of ['summary', 'attendance', 'yaumiah', 'tasks', 'grades', 'questions', 'master', 'integration', 'security']) {
    assert.match(html, new RegExp(`id="${panel}-panel"`));
  }
  assert.doesNotMatch(html, /class="nav-button"[^>]*disabled/);
});

test('aksi operasional diarahkan ke GAS dan data dirender tanpa innerHTML', () => {
  assert.match(js, /const GAS_URL = 'https:\/\/script\.google\.com\/macros\/s\//);
  assert.match(html, /class="gas-button operational-link"/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
});
