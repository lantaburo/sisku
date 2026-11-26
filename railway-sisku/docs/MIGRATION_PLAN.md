# Rencana migrasi tanpa kehilangan data

## Prinsip

1. GAS dan Spreadsheet tetap menjadi sumber utama selama masa transisi.
2. Railway hanya membaca data sumber sampai rekonsiliasi lolos.
3. Setiap import menghasilkan snapshot baru; snapshot lama tidak ditimpa.
4. Pemindahan write dilakukan per modul, bukan sekaligus.
5. Cutover wajib memiliki backup Spreadsheet dan titik rollback.

## Tahapan

### 0 — Fondasi (folder ini)

- PostgreSQL persisten, migrasi skema, healthcheck, session server-side.
- Import Google Sheets read-only dan pemeriksaan checksum.
- Login kompatibel dengan akun GAS.
- UI responsif untuk ringkasan kesiapan migrasi.

### 1 — Data master

- Proyeksikan mapel, kelas, guru, siswa, orang tua, dan pengaturan organisasi.
- Bandingkan jumlah serta checksum antara Spreadsheet dan PostgreSQL.
- Tambahkan CRUD dengan audit log dan soft delete.

### 2 — Presensi dan yaumiah

- Pindahkan write presensi/yaumiah ke API transaksi PostgreSQL.
- Jalankan dual-write terbatas dan rekonsiliasi harian.
- Uji GPS, QR, zona waktu Asia/Jakarta, serta akses siswa/orang tua.

### 3 — Tugas dan komunikasi

- Migrasikan tugas, pengumpulan, pengumuman, dan pesan internal.
- Uji otorisasi per kelas/peran dan notifikasi.

### 4 — Ujian dan nilai

- Pindahkan paling akhir karena risikonya tertinggi.
- Bekukan manifest soal per attempt, idempotensi submit, retry aman, dan audit nilai.
- Lakukan simulasi beban serta gelombang kecil sebelum nilai resmi.

### 5 — Cutover

- Hentikan write pada GAS dalam jendela terjadwal.
- Ambil snapshot final dan cocokkan seluruh jumlah/checksum.
- Arahkan domain ke Railway; pertahankan GAS sebagai read-only rollback.

## Gerbang GO tiap modul

- Jumlah record sumber dan tujuan cocok.
- Sampel data dan checksum lolos.
- Hak akses semua peran diuji.
- Backup berhasil dipulihkan di lingkungan uji.
- Log audit tersedia untuk create/update/delete.
- Tidak ada error kritis selama masa pilot.
- Rollback telah diuji, bukan hanya didokumentasikan.
