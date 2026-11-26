# Matriks paritas GAS → Railway

Audit terakhir: 27 November 2026. Acuan audit adalah menu per peran di `Index.html` dan policy aksi di `Code.gs`.

## Alur pengguna

| Peran | Alur lama | Implementasi Railway |
|---|---|---|
| Siswa | Beranda dan presensi QR + GPS | Native PostgreSQL; verifikasi radius dan token dapat diatur superadmin |
| Siswa | Lembar Yaumiah terstruktur | Native, termasuk butir aktivitas, persentase, dan tilawah |
| Siswa | Tugas dan status selesai | Native, status tersimpan per siswa |
| Siswa | CBT memakai token | Native, resume attempt, draft lokal, acak soal/opsi, dan submit satu kali |
| Siswa/Ortu | Nilai dan komplain | Native, komplain dapat diperbarui hingga diselesaikan guru |
| Ortu | Monitoring anak dan paraf Yaumiah | Native, dibatasi menurut NIS terkait |
| Semua pengguna | Ganti PIN dan pesan ke admin | Native; mutasi dikunci saat impersonasi |
| Guru | Monitoring kelas | Native, dibatasi kelas binaan dan mapel yang diampu |
| Guru | Master Yaumiah dan target Tahfidz | Native CRUD dengan pembatasan kelas binaan |
| Guru | Tugas kelas | Native tambah, ubah, nonaktifkan, dan pantau status |
| Guru | Bank soal | Native tambah, ubah, gambar, impor bulk format lama/TSV/JSON, paket, dan aksi massal |
| Guru | Sesi ujian | Native token, kelas, acak soal, acak opsi, buka/tutup sesi |
| Guru | Nilai esai, koreksi nilai, komplain | Native dan diaudit |
| Kepsek | Dashboard eksekutif | Native dengan cakupan seluruh sekolah |
| Kepsek | Approval/revisi/massal bank soal | Native |
| Superadmin | CRUD mapel, kelas, guru, siswa, orang tua | Native, termasuk impor CSV/TSV |
| Superadmin | Direktori akun dan impersonasi | Native; impersonasi bersifat baca-saja dan memiliki banner keluar |
| Superadmin | Log aktivitas akun | Native dan dapat difilter per username |
| Superadmin | Pengumuman bertarget dan inbox | Native |
| Superadmin | Identitas organisasi, berkas, QR/GPS | Native melalui `runtime_settings` |
| Superadmin | Cetak dan Word naskah soal | Dibuat langsung dari bank soal native |

## Perlindungan data

- Snapshot GAS tetap append-only di `legacy_sheet_rows` dan tidak pernah menjadi target update/delete.
- Migrasi `004_parity_workflows.sql` menyalin data operasional lama ke tabel native tanpa menghapus sumber.
- Akun, soal, tugas, attempt, komplain, pesan, pengumuman, master Yaumiah, target Tahfidz, dan pengaturan organisasi lama dipertahankan.
- Penghapusan operasional memakai status `active=false` bila riwayat harus tetap utuh.
- Semua mutasi native ditulis ke `audit_log`.

## Perbedaan yang disengaja

- GAS dan Google Sheet bukan lagi jalur tulis. Menu integrasi hanya untuk snapshot migrasi baca-saja selama masa transisi.
- Impersonasi Railway lebih aman daripada GAS: seluruh aksi perubahan diblokir sampai superadmin kembali ke akun asal.
- Upload gambar disimpan bersama soal sebagai data image atau URL HTTPS, sehingga CBT tidak bergantung pada Apps Script/Drive.
- Kontrol lama yang hanya bersifat tampilan (toast, changelog, filter, modal) disesuaikan dengan UI Plus Jakarta Sans tanpa mengubah hasil proses bisnis.
