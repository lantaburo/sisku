'use strict';

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function getConfig() {
  const production = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT tidak valid.');
  }

  return {
    production,
    port,
    databaseUrl: process.env.DATABASE_URL || '',
    databaseSsl: bool(process.env.DATABASE_SSL),
    appName: String(process.env.APP_NAME || 'SISKU').slice(0, 80),
    sessionHours: 12
  };
}

module.exports = { getConfig };
