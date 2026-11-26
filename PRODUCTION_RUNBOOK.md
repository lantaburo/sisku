# SISKU v2.22 — Runbook Uji Coba Ujian

Dokumen ini dipakai untuk uji terbatas. Jangan menjadikan hasil uji sebagai nilai resmi sebelum seluruh pemeriksaan GO lulus.

## 1. Persiapan sebelum deployment

1. Buat salinan penuh Spreadsheet produksi dan beri nama dengan tanggal/jam.
2. Catat deployment aktif dari `clasp deployments` agar versi sebelumnya dapat dipulihkan.
3. Jalankan `npm test`. Deployment dilarang bila validasi gagal.
4. Pastikan akun siswa uji memakai PIN unik 6 digit, bukan PIN bersama.
5. Batasi peserta gelombang pertama maksimal 5 akun.

## 2. Inisialisasi backend

Sesudah `Code.gs` dikirim, buka editor Apps Script dan jalankan `setupDatabase()` satu kali. Fungsi ini membuat atau memperbarui sheet berikut tanpa menghapus data lama:

- `Exam_Attempts`
- kolom `Question_Manifest_JSON` pada `Exam_Attempts` untuk mengunci naskah dan kunci saat ujian dimulai
- `Task_Submissions`
- kolom `Attempt_ID` dan `Status_Penilaian` pada `Nilai_UAS`
- token QR acak pada Script Properties

Atur Script Properties berikut sesuai lokasi sekolah:

- `SCHOOL_LAT`
- `SCHOOL_LNG`
- `SCHOOL_RADIUS_M`

Jika database benar-benar baru dan belum mempunyai superadmin, set sementara:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PIN` — 6–12 digit unik
- `BOOTSTRAP_ADMIN_NAME`

Lalu jalankan `bootstrapSuperadminFromProperties()`. PIN bootstrap otomatis dihapus dari Script Properties setelah fungsi selesai.

## 3. Deployment

1. Jalankan `npm run push`.
2. Periksa perubahan di editor Apps Script.
3. Jalankan `npm run deploy` hanya setelah backup dan pemeriksaan selesai.
4. Buka URL `/exec` pada jendela incognito dan pastikan versi `v2.22` tampil.
5. Jangan mengubah deployment saat ujian sedang berlangsung.

## 4. Checklist GO

- Request tanpa session token ditolak.
- Siswa A tidak dapat melihat NIS, aktivitas, atau nilai siswa B.
- Network/DevTools siswa tidak memuat field `kunci` atau token pembanding ujian.
- Token salah ditolak oleh server.
- Submit kedua untuk percobaan yang sama ditolak.
- Perubahan kunci di bank soal setelah ujian dimulai tidak mengubah hasil koreksi attempt yang sedang berjalan.
- Skor di `Nilai_UAS` sama dengan jawaban objektif yang tersimpan di `Exam_Attempts`.
- Ujian yang berisi esai berstatus `MENUNGGU_PENILAIAN_ESAI`.
- Logout lalu refresh meminta login ulang.
- Pengujian berhasil untuk siswa, guru, kepala sekolah, dan superadmin.

## 5. Pelaksanaan uji

1. Gunakan soal latihan dan nilai non-final.
2. Mulai dengan 5 siswa, lanjut 10–20 siswa setelah gelombang pertama berhasil.
3. Buka satu mapel dan satu kelas per gelombang.
4. Pengawas mencatat waktu mulai, submit, Attempt ID, dan kendala tiap peserta.
5. Sediakan Google Form atau lembar soal sebagai fallback.

## 6. Rollback

Jika login, pemuatan soal, atau submit gagal secara massal:

1. Hentikan sesi ujian dari panel guru.
2. Jangan menghapus baris `Exam_Attempts` atau `Nilai_UAS`.
3. Alihkan peserta ke fallback.
4. Pulihkan deployment ke versi yang dicatat sebelum rilis melalui Apps Script Deployments.
5. Simpan salinan Spreadsheet setelah insiden untuk investigasi.
