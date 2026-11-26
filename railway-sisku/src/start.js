'use strict';

const { migrate } = require('./migrate');
const { syncFromGasOnce } = require('./gas-sync');

function startGasSyncSchedule() {
  if (!process.env.GAS_WEB_APP_URL || !process.env.GAS_SYNC_SECRET) return;
  const intervalMinutes = Math.max(60, Number(process.env.GAS_SYNC_INTERVAL_MINUTES) || 360);
  const run = () => syncFromGasOnce({ apply: true })
    .then(result => console.log('GAS sync complete.', { mode: result.mode, sheets: result.sheetCount, rows: result.rowCount }))
    .catch(error => console.error('GAS_SYNC_SCHEDULE_FAILED', error.message));
  setTimeout(run, 90_000).unref();
  setInterval(run, intervalMinutes * 60_000).unref();
  console.log(`GAS read-only sync scheduled every ${intervalMinutes} minutes.`);
}

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
  startGasSyncSchedule();
}

start().catch(error => {
  console.error('STARTUP_FAILED', error.message);
  process.exit(1);
});
