'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(crypto.scrypt);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

async function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scryptAsync(String(pin), salt, 32);
  return `s2$${salt}$${key.toString('hex')}`;
}

async function verifyPin(pin, storedValue) {
  const stored = String(storedValue || '');
  if (stored.startsWith('s2$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const key = await scryptAsync(String(pin), parts[1], 32);
    return { valid: safeEqualHex(key.toString('hex'), parts[2]), needsUpgrade: false };
  }
  if (stored.startsWith('v1$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const digest = sha256(`${parts[1]}:${String(pin)}`);
    return { valid: safeEqualHex(digest, parts[2]), needsUpgrade: true };
  }
  const left = Buffer.from(stored);
  const right = Buffer.from(String(pin || ''));
  const valid = left.length === right.length && crypto.timingSafeEqual(left, right);
  return { valid, needsUpgrade: valid };
}

function createSessionToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: sha256(token) };
}

function parseCookies(header) {
  const result = {};
  String(header || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 1) return;
    try {
      result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    } catch (_) {}
  });
  return result;
}

module.exports = { sha256, hashPin, verifyPin, createSessionToken, parseCookies };
