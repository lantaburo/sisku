'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256, hashPin, verifyPin, createSessionToken, parseCookies } = require('../src/security');

test('memverifikasi hash PIN GAS v1 dan meminta upgrade', async () => {
  const salt = 'abc123';
  const stored = `v1$${salt}$${sha256(`${salt}:654321`)}`;
  assert.deepEqual(await verifyPin('654321', stored), { valid: true, needsUpgrade: true });
  assert.equal((await verifyPin('000000', stored)).valid, false);
});

test('hash scrypt Railway dapat diverifikasi tanpa upgrade ulang', async () => {
  const stored = await hashPin('123456');
  assert.match(stored, /^s2\$/);
  assert.deepEqual(await verifyPin('123456', stored), { valid: true, needsUpgrade: false });
  assert.equal((await verifyPin('654321', stored)).valid, false);
});

test('session token acak hanya disimpan sebagai hash', () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, sha256(first.token));
  assert.notEqual(first.token, first.tokenHash);
});

test('cookie parser menangani nilai URL encoded', () => {
  assert.deepEqual(parseCookies('a=1; session=abc%20def'), { a: '1', session: 'abc def' });
});
