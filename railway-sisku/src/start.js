'use strict';

const { migrate } = require('./migrate');

async function start() {
  if (process.env.DATABASE_URL) {
    await migrate();
    console.log('Database migration check complete.');
  } else {
    // Server tetap hidup agar halaman dan /health/live dapat menjelaskan bahwa
    // konfigurasi belum lengkap. /health/ready tetap mengembalikan 503.
    console.warn('DATABASE_URL is not configured; starting in setup mode.');
  }
  require('./server');
}

start().catch(error => {
  console.error('STARTUP_FAILED', error.message);
  process.exit(1);
});
