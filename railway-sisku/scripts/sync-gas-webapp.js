'use strict';

const { syncFromGas } = require('../src/gas-sync');
const { closePool } = require('../src/db');

async function main() {
  const apply = process.argv.includes('--apply');
  const result = await syncFromGas({ apply });
  console.log(JSON.stringify(result, null, 2));
  if (!apply) console.log('\nDRY-RUN: GAS hanya dibaca. Tambahkan --apply setelah jumlah dan checksum diverifikasi.');
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('GAS_SYNC_FAILED', error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { main };
