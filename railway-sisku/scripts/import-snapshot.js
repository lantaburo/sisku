'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { importSnapshot } = require('../src/importer');
const { closePool } = require('../src/db');

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

async function main() {
  const filename = argument('--file');
  const apply = process.argv.includes('--apply');
  if (!filename) throw new Error('Gunakan --file <snapshot.json>.');
  const resolved = path.resolve(process.cwd(), filename);
  const stats = await fs.stat(resolved);
  if (stats.size > 300 * 1024 * 1024) throw new Error('Snapshot melebihi batas 300 MB.');
  const snapshot = JSON.parse(await fs.readFile(resolved, 'utf8'));
  const result = await importSnapshot(snapshot, { apply, sourceType: 'json_file', sourceRef: path.basename(resolved) });
  console.log(JSON.stringify(result, null, 2));
  if (!apply) console.log('\nDRY-RUN: tambahkan --apply setelah jumlah dan checksum diverifikasi.');
}

main()
  .catch(error => {
    console.error('IMPORT_FAILED', error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
