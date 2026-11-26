# SISKU Railway — fondasi migrasi aman

Folder ini adalah aplikasi baru dan terisolasi. `Code.gs`, `Index.html`, dan folder `app/` lama tidak dibaca, ditulis, atau dihapus oleh aplikasi ini.

Migrasi dilakukan bertahap dengan snapshot Google Sheets yang tetap **read-only**:

- seluruh sheet disalin ke PostgreSQL sebagai snapshot append-only;
- setiap baris dan snapshot memiliki checksum SHA-256;
- import ulang tidak menghapus data dan snapshot identik tidak digandakan;
- akun diproyeksikan ke tabel login tanpa mengubah sheet sumber;
- hash PIN `v1$...` milik GAS tetap dapat dipakai, lalu ditingkatkan di Railway setelah login berhasil;
- mapel, kelas, akun guru/siswa/orang tua, dan bank soal sudah memiliki tabel serta write native PostgreSQL;
- data yang sudah dikelola native ditandai sehingga sinkronisasi transisi tidak dapat menimpanya;
- modul lain tetap memakai snapshot atau aplikasi lama sampai dipindahkan satu per satu.

## Menjalankan lokal

Prasyarat: Node.js 22 dan PostgreSQL 15+.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm start
```

Buka `http://localhost:3000`. Endpoint kesiapan database tersedia di `/health/ready`.

## Import tanpa menyimpan snapshot di disk

### Jalur yang dipakai produksi: endpoint GAS read-only

1. Tambahkan Script Property `RAILWAY_SYNC_SECRET` dengan nilai acak minimal 32 karakter.
2. Isi `GAS_WEB_APP_URL` dengan URL deployment `/exec` dan `GAS_SYNC_SECRET` dengan nilai yang sama di Railway.
3. Opsional: isi `GAS_SYNC_INTERVAL_MINUTES` (minimal 60; default 360 menit).
4. Validasi tanpa menulis database:

```bash
npm run sync:gas
```

5. Terapkan snapshot append-only:

```bash
npm run sync:gas -- --apply
```

Endpoint GAS hanya membuka sheet yang ada di allowlist, memerlukan secret, dan mengirim maksimal 500 baris per permintaan. Railway juga menyediakan tombol sinkronisasi manual khusus superadmin. Snapshot otomatis dijalankan setelah startup dan sesuai interval selama ketiga variable tersebut tersedia.

### Alternatif: Google Sheets API

1. Buat service account Google dengan akses **Viewer**.
2. Bagikan Spreadsheet SISKU hanya sebagai Viewer kepada email service account.
3. Isi `GOOGLE_SHEET_ID` dan `GOOGLE_SERVICE_ACCOUNT_JSON` di environment lokal/Railway.
4. Validasi lebih dahulu (tidak menulis database):

```bash
npm run sync:google
```

5. Setelah jumlah sheet/baris sesuai, terapkan snapshot:

```bash
npm run sync:google -- --apply
```

Perintah tanpa `--apply` selalu dry-run. Service account tidak memerlukan hak Editor.

Alternatif untuk berkas snapshot yang sudah ada:

```bash
npm run import -- --file ./snapshot.json
npm run import -- --file ./snapshot.json --apply
```

## Deployment Railway

1. Buat project Railway dan tambahkan service PostgreSQL.
2. Repository ini sudah menyediakan `Dockerfile` adapter di root; Railway dapat memakai root repository langsung.
3. Pastikan `DATABASE_URL` direferensikan dari service PostgreSQL.
4. Biarkan start command memakai `Dockerfile`; migrasi dijalankan aman oleh `src/start.js` sebelum server aktif.
5. Set **Healthcheck path** (bukan command) ke `/health/ready` dan timeout 120 detik bila ingin pemeriksaan Railway eksplisit.
6. Deploy dulu tanpa memindahkan domain produksi GAS.
7. Jalankan dry-run lalu import awal dari terminal/job yang memiliki variabel Google.

Railway menjalankan pre-deploy sebelum aplikasi baru aktif; kegagalan migrasi akan menghentikan deployment. Healthcheck hanya mengembalikan sukses jika PostgreSQL dan skema siap.

## Batas tahap ini

CRUD data master/akun dan pembuatan bank soal sudah native. Presensi, yaumiah, tugas, komunikasi, pelaksanaan CBT, approval, dan penilaian masih dipindahkan bertahap. Jangan menonaktifkan GAS sebelum checklist cutover di [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) selesai.
