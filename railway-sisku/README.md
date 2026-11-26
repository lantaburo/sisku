# SISKU Railway — fondasi migrasi aman

Folder ini adalah aplikasi baru dan terisolasi. `Code.gs`, `Index.html`, dan folder `app/` lama tidak dibaca, ditulis, atau dihapus oleh aplikasi ini.

Tahap pertama sengaja dibuat **read-only terhadap Google Sheets**:

- seluruh sheet disalin ke PostgreSQL sebagai snapshot append-only;
- setiap baris dan snapshot memiliki checksum SHA-256;
- import ulang tidak menghapus data dan snapshot identik tidak digandakan;
- akun diproyeksikan ke tabel login tanpa mengubah sheet sumber;
- hash PIN `v1$...` milik GAS tetap dapat dipakai, lalu ditingkatkan di Railway setelah login berhasil;
- dashboard baru menampilkan status dan ringkasan migrasi, sementara operasional tetap memakai GAS sampai modul dipindahkan satu per satu.

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
2. Buat service aplikasi dari repository ini dan atur **Root Directory** ke `/railway-sisku`.
3. Pastikan `DATABASE_URL` direferensikan dari service PostgreSQL.
4. Set **Pre-deploy command**: `npm run db:migrate`.
5. Set **Healthcheck path**: `/health/ready` dan timeout 120 detik.
6. Deploy dulu tanpa memindahkan domain produksi GAS.
7. Jalankan dry-run lalu import awal dari terminal/job yang memiliki variabel Google.

Railway menjalankan pre-deploy sebelum aplikasi baru aktif; kegagalan migrasi akan menghentikan deployment. Healthcheck hanya mengembalikan sukses jika PostgreSQL dan skema siap.

## Batas tahap ini

UI ini belum menggantikan alur presensi, yaumiah, tugas, ujian, dan administrasi pada GAS. Tahap berikutnya memindahkan modul per modul dengan rekonsiliasi jumlah record dan masa dual-run. Jangan mengalihkan seluruh pengguna sebelum checklist di [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) selesai.
