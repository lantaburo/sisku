// ============================================================================
// GOOGLE APPS SCRIPT (Code.gs) - SISKU REAL PRODUCTION (2-WAY SYNC)
// VERSI: v2.35 (27 November 2026) - Sesi aktif diperpanjang otomatis
// ============================================================================
const APP_VERSION = 'v2.35';
const FOLDER_PENDUKUNG_ID = '12TiJ3oT3WjJaksD7UfjlU2U18YpkA0bS';
const FOLDER_SOAL_UAS_ID  = '1_aUdLO6f2Ka5N8jlPAuED_O0K_01x__2';
const DOC_ACUAN_ID        = '1SvMI5RH3OlsVjRiHZteaMvjWD2TJANdO';
const RAILWAY_SYNC_SHEETS = [
  'Sheet1', 'Grade_Complaints', 'Announcements', 'Exam_Attempts',
  'Task_Submissions', 'Internal_Messages', 'Activity_Log',
  'Pengaturan_Organisasi', 'Yaumiah_Detail', 'Tugas_Kelas', 'Sesi_Ujian',
  'Users', 'Master_Kelas', 'Master_Guru', 'Presensi', 'Yaumiah_Log',
  'Tugas_Prestasi', 'Bank_Soal_UAS', 'Master_Mapel', 'Master_Yaumiah',
  'Target_Tahfidz', 'Nilai_UAS'
];

// Fungsi maintenance sementara untuk memicu dialog otorisasi pemilik.
// Tidak membaca atau mengembalikan data sekolah dan dihapus setelah dipakai.
function authorizeProductionServices() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet induk SISKU tidak tersedia.');
  ss.getName();
  DriveApp.getFolderById(FOLDER_PENDUKUNG_ID).getName();
  DriveApp.getFolderById(FOLDER_SOAL_UAS_ID).getName();
  PropertiesService.getScriptProperties().getKeys();
  return 'OK: layanan Spreadsheet, Drive, dan Script Properties telah diotorisasi.';
}

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    'Users': ['ID_User', 'Username', 'PIN_Akses', 'Role', 'Nama_Lengkap', 'Kelas', 'NIS_Terkait'],
    'Activity_Log': ['Timestamp', 'Actor_Username', 'Actor_Nama', 'Target_Username', 'Target_Nama', 'Action', 'Detail'],
    'Announcements': ['ID_Pengumuman', 'Timestamp', 'Actor_Username', 'Actor_Nama', 'Target_Accounts', 'Judul', 'Pesan'],
    'Internal_Messages': ['ID_Pesan', 'Timestamp', 'Sender_Username', 'Sender_Nama', 'Sender_Role', 'Judul', 'Pesan', 'Status', 'Read_At', 'Read_By'],
    'Master_Mapel': ['Kode_Mapel', 'Nama_Mapel', 'Kelompok'],
    'Master_Kelas': ['Kode_Kelas', 'Nama_Kelas', 'Wali_Kelas', 'Jumlah_Siswa'],
    'Master_Guru': ['NIP', 'Username', 'Nama_Guru', 'Mata_Pelajaran', 'Wali_Kelas'],
    'Master_Yaumiah': ['ID_Amal', 'Nama_Aktivitas', 'Kategori', 'Bobot_Poin', 'Target_Kelas'],
    'Target_Tahfidz': ['Kelas', 'Guru_Pengampu', 'Target_Tilawah', 'Target_Murajaah', 'Target_Ziyadah', 'Catatan_Pembinaan', 'Updated_At'],
    'Presensi': ['Timestamp', 'Tanggal', 'NIS', 'Nama', 'Status', 'Jam_Masuk', 'Latitude', 'Longitude', 'Jarak_Meter', 'Token_QR'],
    'Yaumiah_Log': ['Timestamp', 'Tanggal', 'NIS', 'Nama', 'Kelas', 'Capaian_Persen', 'Tilawah_Murajaah', 'Paraf_Ortu'],
    'Yaumiah_Detail': ['Tanggal', 'NIS', 'ID_Amal', 'Dikerjakan', 'Updated_At'],
    'Bank_Soal_UAS': ['Timestamp', 'ID_Soal', 'Mapel', 'Kelas', 'Level_Kognitif', 'KD', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci', 'Status_Approval', 'Tipe_Soal', 'Catatan_Revisi', 'Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket'],
    'Nilai_UAS': ['Timestamp', 'Tanggal', 'NIS', 'Nama', 'Kelas', 'Mapel', 'Benar', 'Total_Soal', 'Skor_Akhir', 'Attempt_ID', 'Status_Penilaian', 'Skor_Objektif', 'Skor_Esai', 'Dinilai_Oleh', 'Dinilai_At'],
    'Exam_Attempts': ['Attempt_ID', 'Started_At', 'Submitted_At', 'Username', 'NIS', 'Nama', 'Kelas', 'Mapel', 'Status', 'Benar', 'Total', 'Skor', 'Answers_JSON', 'Attempt_Token', 'Has_Essay', 'Question_Manifest_JSON', 'Essay_Grading_JSON', 'Objective_Score', 'Essay_Score', 'Final_Score', 'Graded_By', 'Graded_At'],
    'Grade_Complaints': ['ID_Komplain', 'Timestamp', 'Attempt_ID', 'NIS', 'Nama_Siswa', 'Kelas', 'Mapel', 'Skor', 'Pengirim_Username', 'Pengirim_Nama', 'Pengirim_Role', 'Argumentasi', 'Guru_Tujuan_JSON', 'Status', 'Updated_At', 'Updated_By', 'Nilai_Lama', 'Nilai_Baru', 'Tanggapan_Guru', 'Resolved_At', 'Resolved_By'],
    'Tugas_Kelas': ['Timestamp', 'ID_Tugas', 'Mapel', 'Kelas', 'Judul', 'Deskripsi', 'Deadline', 'Dibuat_Oleh', 'Status'],
    'Task_Submissions': ['Timestamp', 'ID_Tugas', 'Username', 'NIS', 'Status', 'Submitted_At'],
    'Sesi_Ujian': ['Status_Ujian', 'Token_Ujian', 'Mapel_Aktif', 'Catatan', 'Updated_At', 'Kelas_Aktif', 'Acak_Soal', 'Acak_Opsi'],
    'Pengaturan_Organisasi': ['Kunci', 'Nilai']
  };
  Object.keys(sheets).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(sheets[name]);
      sh.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
    }
  });

  // ISI DATA AWAL OTOMATIS (SEED) JIKA SHEET MASIH KOSONG
  const shUsers = ss.getSheetByName('Users');
  if (shUsers) {
    const existing = shUsers.getLastRow() > 1 ? shUsers.getRange(2, 2, shUsers.getLastRow() - 1, 1).getValues().map(r => String(r[0]).toLowerCase()) : [];
    // Hanya akun Superadmin yang di-seed otomatis; akun lain berasal dari data sekolah.
    // Akun superadmin tidak pernah dibuat dengan kredensial baku. Gunakan
    // bootstrapSuperadmin() sekali dari editor Apps Script bila database baru.
    const seedUsers = [];
    seedUsers.forEach(uRow => {
      if (!existing.includes(uRow[1].toLowerCase())) {
        shUsers.appendRow(uRow);
      }
    });
  }

  // Master kelas adalah data sekolah, bukan data contoh. setupDatabase hanya
  // memastikan struktur sheet dan tidak boleh menyisipkan rombel/wali dummy.

  const shGuru = ss.getSheetByName('Master_Guru');
  if (shGuru) {
    const existingGuru = shGuru.getLastRow() > 1 ? shGuru.getRange(2, 2, shGuru.getLastRow() - 1, 1).getValues().map(r => String(r[0]).toLowerCase()) : [];
    const seedGuru = [];
    seedGuru.forEach(gRow => {
      if (!existingGuru.includes(gRow[1].toLowerCase())) shGuru.appendRow(gRow);
    });
  }

  const shMapel = ss.getSheetByName('Master_Mapel');
  if (shMapel.getLastRow() === 1) {
    shMapel.appendRow(['PAI', 'Pendidikan Agama Islam & Budi Pekerti', 'Keagamaan']);
    shMapel.appendRow(['THFZ', 'Tahfidz & Tilawah Al-Qur\'an', 'Keagamaan']);
    shMapel.appendRow(['BARAB', 'Bahasa Arab', 'Keagamaan']);
    shMapel.appendRow(['MTK', 'Matematika', 'Umum']);
    shMapel.appendRow(['IPA', 'Ilmu Pengetahuan Alam (IPA)', 'Umum']);
    shMapel.appendRow(['BINDO', 'Bahasa Indonesia', 'Umum']);
    shMapel.appendRow(['BING', 'Bahasa Inggris', 'Umum']);
  }
  const shSoal = ss.getSheetByName('Bank_Soal_UAS');
  if (shSoal && shSoal.getLastColumn() < 20) shSoal.getRange(1, 17, 1, 4).setValues([['Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']]);
  const shNilai = ss.getSheetByName('Nilai_UAS');
  if (shNilai && shNilai.getLastColumn() < 15) shNilai.getRange(1, 10, 1, 6).setValues([['Attempt_ID', 'Status_Penilaian', 'Skor_Objektif', 'Skor_Esai', 'Dinilai_Oleh', 'Dinilai_At']]);
  const shAttempts = ss.getSheetByName('Exam_Attempts');
  if (shAttempts && shAttempts.getLastColumn() < 22) shAttempts.getRange(1, 16, 1, 7).setValues([['Question_Manifest_JSON', 'Essay_Grading_JSON', 'Objective_Score', 'Essay_Score', 'Final_Score', 'Graded_By', 'Graded_At']]);
  const shSesi = ss.getSheetByName('Sesi_Ujian');
  if (shSesi) {
    if (shSesi.getLastColumn() < 6) shSesi.getRange(1, 6).setValue('Kelas_Aktif');
    if (shSesi.getLastColumn() < 8) shSesi.getRange(1, 7, 1, 2).setValues([['Acak_Soal', 'Acak_Opsi']]);
  }
  seedDefaultYaumiah_(ss);
  ensureYaumiahDetailSheet_(ss);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('QR_TOKEN_MASUK')) props.setProperty('QR_TOKEN_MASUK', 'IN-' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase());
  if (!props.getProperty('QR_TOKEN_PULANG')) props.setProperty('QR_TOKEN_PULANG', 'OUT-' + Utilities.getUuid().replace(/-/g, '').slice(0, 18).toUpperCase());
}

function seedDefaultYaumiah_(ss) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('sisku_default_yaumiah_seeded') === '1') return;
  let sh = ss.getSheetByName('Master_Yaumiah');
  if (!sh) { sh = ss.insertSheet('Master_Yaumiah'); sh.appendRow(['ID_Amal', 'Nama_Aktivitas', 'Kategori', 'Bobot_Poin', 'Target_Kelas']); }
  if (sh.getLastRow() > 1) { props.setProperty('sisku_default_yaumiah_seeded', '1'); return; }
  [
    ['sholat_subuh', 'Sholat Subuh Berjamaah', 'Wajib', 15, 'SEMUA'],
    ['dzikir_pagi', 'Dzikir Pagi (Al-Ma’tsurat)', 'Sunnah', 10, 'SEMUA'],
    ['sholat_dhuha', 'Sholat Sunnah Dhuha', 'Sunnah', 10, 'SEMUA'],
    ['sholat_dzuhur', 'Sholat Dzuhur Berjamaah', 'Wajib', 15, 'SEMUA'],
    ['sholat_ashar', 'Sholat Ashar Berjamaah', 'Wajib', 15, 'SEMUA'],
    ['tilawah_quran', 'Tilawah & Murajaah Al-Qur’an', 'Qur’an', 15, 'SEMUA'],
    ['sholat_maghrib', 'Sholat Maghrib Berjamaah', 'Wajib', 15, 'SEMUA'],
    ['sholat_isya', 'Sholat Isya Berjamaah', 'Wajib', 15, 'SEMUA'],
    ['qiyamul_lail', 'Qiyamul Lail / Tahajud & Witir', 'Sunnah', 15, 'SEMUA'],
    ['birrul_walidain', 'Birrul Walidain & Bantu Orang Tua', 'Adab', 10, 'SEMUA']
  ].forEach(row => sh.appendRow(row));
  props.setProperty('sisku_default_yaumiah_seeded', '1');
}

function splitGuruMapel(value) {
  return String(value || '').split(/[;,|\n]+/).map(v => v.trim()).filter(Boolean);
}

function guruMengampuMapel_(ss, username, mapel) {
  const guru = readSheetRows(ss, 'Master_Guru').find(r => String(r[1] || '').trim().toLowerCase() === String(username || '').trim().toLowerCase());
  const assigned = splitGuruMapel(guru && guru[3]).map(v => v.toLowerCase());
  const target = String(mapel || '').trim().toLowerCase();
  const subject = readSheetRows(ss, 'Master_Mapel').find(r => String(r[0] || '').trim().toLowerCase() === target || String(r[1] || '').trim().toLowerCase() === target);
  return assigned.includes(target) || (subject && (assigned.includes(String(subject[0] || '').trim().toLowerCase()) || assigned.includes(String(subject[1] || '').trim().toLowerCase())));
}

function normalizeAccountKey_(value) {
  return String(value || '').trim().toLowerCase();
}

function guruDapatMelihatSoal_(ss, username, question) {
  const owner = normalizeAccountKey_(question && question.pembuatUsername);
  const viewer = normalizeAccountKey_(username);
  // Soal milik sendiri selalu dapat dilihat kembali oleh pembuatnya, meskipun
  // konfigurasi mapel guru berubah. Soal admin/legacy tetap dibatasi ke mapel
  // yang saat ini diampu oleh guru.
  if (owner && owner === viewer) return true;
  return (!owner || owner === 'admin') && guruMengampuMapel_(ss, username, question && question.mapel);
}

function validateGuruMapel_(ss, value) {
  const assigned = splitGuruMapel(value);
  const subjects = readSheetRows(ss, 'Master_Mapel').flatMap(r => [String(r[0] || '').trim().toLowerCase(), String(r[1] || '').trim().toLowerCase()]);
  if (!assigned.length || assigned.some(v => !subjects.includes(v.toLowerCase()))) throw new Error('Pilih setidaknya satu mata pelajaran yang terdaftar untuk guru.');
}

function ensureYaumiahDetailSheet_(ss) {
  let sh = ss.getSheetByName('Yaumiah_Detail');
  if (!sh) { sh = ss.insertSheet('Yaumiah_Detail'); sh.appendRow(['Tanggal', 'NIS', 'ID_Amal', 'Dikerjakan', 'Updated_At', 'Status']); }
  else if (sh.getLastColumn() < 6) sh.getRange(1, 6).setValue('Status');
  return sh;
}

function normalizeSchoolDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value || '').slice(0, 10);
}

function uploadImageAsset(imageData, prefix) {
  if (!imageData || !imageData.dataUrl) return '';
  if (String(imageData.dataUrl).length > 7 * 1024 * 1024) throw new Error('Ukuran gambar melebihi batas 5 MB.');
  const match = String(imageData.dataUrl).match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Format gambar tidak didukung. Gunakan PNG, JPG, GIF, atau WebP.');
  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const ext = mime.split('/')[1].replace('jpeg', 'jpg');
  const name = String(imageData.name || (prefix + '-' + Date.now() + '.' + ext)).replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), mime, prefix + '-' + name);
  const file = DriveApp.getFolderById(FOLDER_SOAL_UAS_ID).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function hapusAkunDemoYangDikenal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Users');
  if (!sh) throw new Error('Sheet Users tidak ditemukan.');

  // Hanya hapus kecocokan tepat username + PIN + role + nama dari seed demo.
  const demoUsers = [
    ['20260801', '1111', 'siswa', 'Ahmad Fauzi'], ['20260802', '1111', 'siswa', 'Budi Santoso'],
    ['20260803', '1111', 'siswa', 'Citra Lestari'], ['20260804', '1111', 'siswa', 'Daffa Pratama'],
    ['20260805', '1111', 'siswa', 'Eka Nurhaliza'], ['20260806', '1111', 'siswa', 'Fajar Maulana'],
    ['20260807', '1111', 'siswa', 'Ghina Almira'], ['20260808', '1111', 'siswa', 'Hafidz Ridwan'],
    ['ortu.20260801', '2222', 'ortu', 'Bpk. Salman Al-Farisi'], ['ortu.20260802', '2222', 'ortu', 'Bpk. Hartono'],
    ['ortu.20260803', '2222', 'ortu', 'Ibu Dewi'], ['ortu.20260804', '2222', 'ortu', 'Bpk. Rahmat'],
    ['ortu.20260805', '2222', 'ortu', 'Ibu Siti Aminah'], ['ortu.20260806', '2222', 'ortu', 'Bpk. Gunawan'],
    ['ortu.20260807', '2222', 'ortu', 'Bpk. Subarkah'], ['ortu.20260808', '2222', 'ortu', 'Ibu Nurhasanah'],
    ['ust.hendra', '3333', 'guru', 'Ust. Hendra, S.Pd'], ['ustzh.aisyah', '3333', 'guru', 'Ustzh. Aisyah, M.Pd'],
    ['ust.farhan', '3333', 'guru', 'Ust. Farhan Maulana, Lc'], ['ustzh.maryam', '3333', 'guru', 'Ustzh. Maryam Ulfah, S.Si'],
    ['kepsek', '4444', 'kepsek', 'Dr. H. Ridwan, M.Pd']
  ];
  const demoKeys = new Set(demoUsers.map(user => [user[0], user[1], user[2], user[3]].join('|').toLowerCase()));

  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 4).getDisplayValues() : [];
  let deletedCount = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    const username = String(rows[i][0] || '').trim().toLowerCase();
    const pin = String(rows[i][1] || '').trim();
    const role = String(rows[i][2] || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    const name = String(rows[i][3] || '').trim().toLowerCase();
    if (demoKeys.has([username, pin, role, name].join('|'))) {
      sh.deleteRow(i + 2);
      deletedCount++;
    }
  }
  let deletedDemoGuruCount = 0;
  const shGuru = ss.getSheetByName('Master_Guru');
  const demoGuru = [
    ['19880112', 'ust.hendra', 'Ust. Hendra, S.Pd', 'Pendidikan Agama Islam & Budi Pekerti', 'VIII-A'],
    ['19910420', 'ustzh.aisyah', 'Ustzh. Aisyah, M.Pd', 'Matematika', 'VIII-B'],
    ['19850615', 'ust.farhan', 'Ust. Farhan Maulana, Lc', 'Bahasa Arab', 'IX-A'],
    ['19930811', 'ustzh.maryam', 'Ustzh. Maryam Ulfah, S.Si', 'Ilmu Pengetahuan Alam (IPA)', 'IX-B']
  ];
  const demoGuruKeys = new Set(demoGuru.map(row => row.map(value => String(value).trim().toLowerCase()).join('|')));
  if (shGuru && shGuru.getLastRow() > 1) {
    const guruRows = shGuru.getRange(2, 1, shGuru.getLastRow() - 1, 5).getDisplayValues();
    for (let i = guruRows.length - 1; i >= 0; i--) {
      const key = guruRows[i].map(value => String(value).trim().toLowerCase()).join('|');
      if (demoGuruKeys.has(key)) {
        shGuru.deleteRow(i + 2);
        deletedDemoGuruCount++;
      }
    }
  }
  let deletedDemoClassCount = 0;
  const shKelas = ss.getSheetByName('Master_Kelas');
  const demoClasses = [
    ['VIII-A', 'Kelas VIII-A (Unggulan Tahfidz)', 'Ust. Hendra, S.Pd', '28'],
    ['VIII-B', 'Kelas VIII-B (Reguler)', 'Ustzh. Aisyah, M.Pd', '30'],
    ['IX-A', 'Kelas IX-A (Tahfidz Lanjutan)', 'Ust. Farhan Maulana, Lc', '28'],
    ['IX-B', 'Kelas IX-B (Reguler)', 'Ustzh. Maryam Ulfah, S.Si', '30']
  ];
  const demoClassKeys = new Set(demoClasses.map(row => row.map(value => String(value).trim().toLowerCase()).join('|')));
  if (shKelas && shKelas.getLastRow() > 1) {
    const classRows = shKelas.getRange(2, 1, shKelas.getLastRow() - 1, 4).getDisplayValues();
    for (let i = classRows.length - 1; i >= 0; i--) {
      const key = classRows[i].map(value => String(value).trim().toLowerCase()).join('|');
      if (demoClassKeys.has(key)) {
        shKelas.deleteRow(i + 2);
        deletedDemoClassCount++;
      }
    }
  }
  return { status: 'ok', deletedCount: deletedCount, deletedDemoGuruCount: deletedDemoGuruCount, deletedDemoClassCount: deletedDemoClassCount, superadminCreated: false };
}

function readSheetRows(ss, sheetName) {
  if (!ss) return [];
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

// ── Cache helpers ──────────────────────────────────────────────────────────
const CACHE_TTL_SOAL = 90;  // detik
const CACHE_TTL_SESI = 20;  // detik
const CACHE_KEY_SOAL = 'sisku-bank-soal-v1';
const CACHE_KEY_SESI = 'sisku-sesi-ujian-v1';

function getCachedSheet_(ss, sheetName, cacheKey, ttlSeconds) {
  const key = String(cacheKey || ('sisku-sheet-' + sheetName));
  const ttl = Math.max(1, Number(ttlSeconds) || 60);
  try {
    const hit = CacheService.getScriptCache().get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {}
  const rows = readSheetRows(ss, sheetName);
  try { CacheService.getScriptCache().put(key, JSON.stringify(rows), ttl); } catch (e) {}
  return rows;
}

function getCachedBankSoal_(ss) {
  const cache = CacheService.getScriptCache();
  try { const hit = cache.get(CACHE_KEY_SOAL); if (hit) return JSON.parse(hit); } catch (e) {}
  const rows = readSheetRows(ss, 'Bank_Soal_UAS');
  try { cache.put(CACHE_KEY_SOAL, JSON.stringify(rows), CACHE_TTL_SOAL); } catch (e) {}
  return rows;
}

function invalidateBankSoalCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY_SOAL); } catch (e) {}
}

function getCachedSesiUjian_(ss) {
  const cache = CacheService.getScriptCache();
  try { const hit = cache.get(CACHE_KEY_SESI); if (hit) return JSON.parse(hit); } catch (e) {}
  const rows = readSheetRows(ss, 'Sesi_Ujian');
  try { cache.put(CACHE_KEY_SESI, JSON.stringify(rows), CACHE_TTL_SESI); } catch (e) {}
  return rows;
}

function invalidateSesiUjianCache_() {
  try { CacheService.getScriptCache().remove(CACHE_KEY_SESI); } catch (e) {}
}
// ── End cache helpers ──────────────────────────────────────────────────────

function findRowByValue(sh, column, value) {
  if (!sh || sh.getLastRow() < 2) return -1;
  const target = String(value || '').trim().toLowerCase();
  const values = sh.getRange(2, column, sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toLowerCase() === target) return i + 2;
  }
  return -1;
}

function requireFields(data, fields) {
  const missing = fields.filter(field => !String(data[field] == null ? '' : data[field]).trim());
  if (missing.length) throw new Error('Data wajib belum lengkap: ' + missing.join(', '));
}

function replaceColumnValue(sh, column, oldValue, newValue) {
  if (!sh || sh.getLastRow() < 2 || String(oldValue) === String(newValue)) return;
  const values = sh.getRange(2, column, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(oldValue || '').trim()) sh.getRange(i + 2, column).setValue(newValue);
  }
}

function findUserRowByRoleAndNis(sh, role, nis) {
  if (!sh || sh.getLastRow() < 2) return -1;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][3] || '').trim().toLowerCase() === String(role).toLowerCase() && String(rows[i][6] || '').trim() === String(nis).trim()) return i + 2;
  }
  return -1;
}

function normalizeRole_(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function digestPin_(pin, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + ':' + String(pin));
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function hashPin_(pin) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  return 'v1$' + salt + '$' + digestPin_(pin, salt);
}

function verifyPin_(pin, storedValue) {
  const stored = String(storedValue || '');
  if (stored.indexOf('v1$') === 0) {
    const parts = stored.split('$');
    return parts.length === 3 && digestPin_(pin, parts[1]) === parts[2];
  }
  return stored === String(pin || '');
}

function bootstrapSuperadmin(username, initialPin, name) {
  const user = String(username || '').trim().toLowerCase();
  const pin = String(initialPin || '').trim();
  if (!/^[0-9]{6,12}$/.test(pin)) throw new Error('PIN awal harus terdiri dari 6-12 digit.');
  if (!user) throw new Error('Username wajib diisi.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDatabase();
  const sh = ss.getSheetByName('Users');
  if (findRowByValue(sh, 2, user) > 0) throw new Error('Username sudah digunakan.');
  const existingAdmin = readSheetRows(ss, 'Users').some(r => normalizeRole_(r[3]) === 'superadmin');
  if (existingAdmin) throw new Error('Superadmin sudah tersedia. Bootstrap dibatalkan.');
  sh.appendRow(['USR-SUPERADMIN-' + Date.now(), user, hashPin_(pin), 'superadmin', String(name || 'Administrator'), '-', '']);
  return 'Superadmin berhasil dibuat. Segera hapus nilai PIN dari riwayat eksekusi bila tercatat.';
}

function bootstrapSuperadminFromProperties() {
  const props = PropertiesService.getScriptProperties();
  const username = props.getProperty('BOOTSTRAP_ADMIN_USERNAME');
  const pin = props.getProperty('BOOTSTRAP_ADMIN_PIN');
  const name = props.getProperty('BOOTSTRAP_ADMIN_NAME') || 'Administrator';
  if (!username || !pin) throw new Error('Set BOOTSTRAP_ADMIN_USERNAME dan BOOTSTRAP_ADMIN_PIN di Script Properties terlebih dahulu.');
  try {
    return bootstrapSuperadmin(username, pin, name);
  } finally {
    props.deleteProperty('BOOTSTRAP_ADMIN_PIN');
  }
}

function ensureSheetWithHeaders_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else if (sheet.getLastColumn() < headers.length) {
    const startColumn = sheet.getLastColumn() + 1;
    sheet.getRange(1, startColumn, 1, headers.length - startColumn + 1).setValues([headers.slice(startColumn - 1)]);
  }
  return sheet;
}

function ensureSecuritySheets_(ss) {
  const attempts = ensureSheetWithHeaders_(ss, 'Exam_Attempts', ['Attempt_ID', 'Started_At', 'Submitted_At', 'Username', 'NIS', 'Nama', 'Kelas', 'Mapel', 'Status', 'Benar', 'Total', 'Skor', 'Answers_JSON', 'Attempt_Token', 'Has_Essay', 'Question_Manifest_JSON', 'Essay_Grading_JSON', 'Objective_Score', 'Essay_Score', 'Final_Score', 'Graded_By', 'Graded_At']);
  const complaints = ensureSheetWithHeaders_(ss, 'Grade_Complaints', ['ID_Komplain', 'Timestamp', 'Attempt_ID', 'NIS', 'Nama_Siswa', 'Kelas', 'Mapel', 'Skor', 'Pengirim_Username', 'Pengirim_Nama', 'Pengirim_Role', 'Argumentasi', 'Guru_Tujuan_JSON', 'Status', 'Updated_At', 'Updated_By', 'Nilai_Lama', 'Nilai_Baru', 'Tanggapan_Guru', 'Resolved_At', 'Resolved_By']);
  const submissions = ensureSheetWithHeaders_(ss, 'Task_Submissions', ['Timestamp', 'ID_Tugas', 'Username', 'NIS', 'Status', 'Submitted_At']);
  return { attempts: attempts, submissions: submissions, complaints: complaints };
}

function ensureSchemaReady_(ss) {
  if (!ss) throw new Error('Spreadsheet induk SISKU tidak tersedia.');
  try {
    if (CacheService.getScriptCache().get('sisku-schema-ready-v1') === '1') return;
  } catch (e) {}
  ensureSheetWithHeaders_(ss, 'Bank_Soal_UAS', ['Timestamp', 'ID_Soal', 'Mapel', 'Kelas', 'Level_Kognitif', 'KD', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci', 'Status_Approval', 'Tipe_Soal', 'Catatan_Revisi', 'Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']);
  ensureSheetWithHeaders_(ss, 'Nilai_UAS', ['Timestamp', 'Tanggal', 'NIS', 'Nama', 'Kelas', 'Mapel', 'Benar', 'Total_Soal', 'Skor_Akhir', 'Attempt_ID', 'Status_Penilaian', 'Skor_Objektif', 'Skor_Esai', 'Dinilai_Oleh', 'Dinilai_At']);
  ensureSheetWithHeaders_(ss, 'Sesi_Ujian', ['Status_Ujian', 'Token_Ujian', 'Mapel_Aktif', 'Catatan', 'Updated_At', 'Kelas_Aktif', 'Acak_Soal', 'Acak_Opsi']);
  ensureSecuritySheets_(ss);
  try { CacheService.getScriptCache().put('sisku-schema-ready-v1', '1', 300); } catch (e) {}
}

function questionFromRow_(r, includeKey) {
  const q = {
    id: String(r[1] || ''), mapel: String(r[2] || ''), kelas: String(r[3] || ''),
    level: String(r[4] || ''), kd: String(r[5] || ''), pertanyaan: String(r[6] || ''),
    opsiA: String(r[7] || ''), opsiB: String(r[8] || ''), opsiC: String(r[9] || ''),
    opsiD: String(r[10] || ''), opsiE: String(r[11] || ''),
    statusApproval: String(r[13] || 'Menunggu Approval Kepsek'), tipeSoal: String(r[14] || 'PG'),
    catatanRevisi: includeKey ? String(r[15] || '') : '', jawabanSiswa: null,
    gambarUrl: String(r[16] || ''), pembuatUsername: includeKey ? String(r[17] || '') : '',
    pembuatNama: includeKey ? String(r[18] || '') : '', paketId: String(r[19] || '')
  };
  if (includeKey) q.kunci = String(r[12] || '');
  return q;
}

function getExamSessionFor_(ss, mapel, kelas, includeToken) {
  const rows = readSheetRows(ss, 'Sesi_Ujian');
  const subject = String(mapel || 'SEMUA');
  const classCode = String(kelas || 'SEMUA');
  const candidates = [
    rows.find(r => String(r[2] || 'SEMUA') === subject && String(r[5] || 'SEMUA') === classCode),
    rows.find(r => String(r[2] || 'SEMUA') === subject && String(r[5] || 'SEMUA') === 'SEMUA'),
    rows.find(r => String(r[2] || 'SEMUA') === 'SEMUA' && String(r[5] || 'SEMUA') === classCode),
    rows.find(r => String(r[2] || 'SEMUA') === 'SEMUA' && String(r[5] || 'SEMUA') === 'SEMUA')
  ];
  const row = candidates.find(Boolean);
  const token = row ? String(row[1] || '') : '';
  return {
    isOpen: row ? String(row[0] || '').toUpperCase() === 'OPEN' : false,
    token: includeToken ? token : '', requiresToken: !!token,
    mapel: row ? String(row[2] || subject) : subject,
    kelas: row ? String(row[5] || classCode) : classCode,
    catatan: row ? String(row[3] || '') : '',
    randomizeQuestions: row ? String(row[6] || '').toUpperCase() === 'TRUE' : false,
    randomizeOptions: row ? String(row[7] || '').toUpperCase() === 'TRUE' : false
  };
}

function getInitialDataLegacy_(requestedUsername, sessionToken) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existingQuestionSheet = ss.getSheetByName('Bank_Soal_UAS');
  if (existingQuestionSheet && existingQuestionSheet.getLastColumn() < 20) existingQuestionSheet.getRange(1, 17, 1, 4).setValues([['Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']]);
  let masterMapel = readSheetRows(ss, 'Master_Mapel').map(r => ({ kode: String(r[0]), nama: String(r[1]), kelompok: String(r[2] || 'Umum') }));
  seedDefaultYaumiah_(ss);
  ensureYaumiahDetailSheet_(ss);
  const masterKelas = readSheetRows(ss, 'Master_Kelas').map(r => ({ kode: String(r[0]), nama: String(r[1]), wali: String(r[2]), kapasitas: Number(r[3] || 30) }));
  const masterYaumiah = readSheetRows(ss, 'Master_Yaumiah').map(r => ({ id: String(r[0]), nama: String(r[1]), kategori: String(r[2]), target: 'Target Harian', done: false, poin: Number(r[3] || 10), kelas: String(r[4] || 'SEMUA') }));
  const yaumiahProgress = readSheetRows(ss, 'Yaumiah_Detail').map(r => ({ tanggal: normalizeSchoolDate_(r[0]), nis: String(r[1]), id: String(r[2]), done: String(r[3]).toLowerCase() === 'true', status: String(r[5] || '') }));
  const presensiLog = readSheetRows(ss, 'Presensi').map(r => ({ timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''), tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2] || ''), nama: String(r[3] || ''), status: String(r[4] || ''), jam: String(r[5] || ''), jarak: String(r[8] || '') }));
  const yaumiahLog = readSheetRows(ss, 'Yaumiah_Log').map(r => ({ timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''), tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2] || ''), nama: String(r[3] || ''), kelas: String(r[4] || ''), persen: Number(r[5] || 0), tilawahMurajaah: String(r[6] || ''), parafOrtu: String(r[7] || '').toLowerCase() === 'true' || r[7] === true }));
  const demoGuruNames = new Set(['Ust. Hendra, S.Pd', 'Ustzh. Aisyah, M.Pd', 'Ust. Farhan Maulana, Lc', 'Ustzh. Maryam Ulfah, S.Si'].map(name => name.toLowerCase()));
  const targetTahfidz = readSheetRows(ss, 'Target_Tahfidz')
    .filter(r => !demoGuruNames.has(String(r[1] || '').trim().toLowerCase()))
    .map(r => ({ kelas: String(r[0]), guru: String(r[1]), targetTilawah: String(r[2]), targetMurajaah: String(r[3]), targetZiyadah: String(r[4]), catatanGuru: String(r[5]), updatedAt: String(r[6]) }));
  const bankSoal = readSheetRows(ss, 'Bank_Soal_UAS').map(r => ({
    id: String(r[1]),
    mapel: String(r[2]),
    kelas: String(r[3]),
    level: String(r[4]),
    kd: String(r[5] || ''),
    pertanyaan: String(r[6] || ''),
    opsiA: String(r[7] || ''),
    opsiB: String(r[8] || ''),
    opsiC: String(r[9] || ''),
    opsiD: String(r[10] || ''),
    opsiE: String(r[11] || ''),
    kunci: String(r[12] || ''),
    statusApproval: String(r[13] || 'Menunggu Approval Kepsek'),
    tipeSoal: String(r[14] || 'PG'),
    catatanRevisi: String(r[15] || ''),
    jawabanSiswa: null,
    gambarUrl: String(r[16] || ''),
    pembuatUsername: String(r[17] || ''),
    pembuatNama: String(r[18] || ''),
    paketId: String(r[19] || '')
  }));
  const tugasList = readSheetRows(ss, 'Tugas_Kelas').map(r => ({ id: String(r[1]), mapel: String(r[2]), kelas: String(r[3]), judul: String(r[4]), deskripsi: String(r[5] || ''), deadline: String(r[6] || ''), guru: String(r[7] || ''), status: String(r[8] || 'Belum Dikumpulkan') }));

  const masterGuru = readSheetRows(ss, 'Master_Guru').map(r => ({
    nip: String(r[0]),
    username: String(r[1]),
    nama: String(r[2]),
    mapel: String(r[3]),
    mapelList: splitGuruMapel(r[3]),
    waliKelas: String(r[4] || '-'),
    pin: '3333'
  }));

  const userRows = readSheetRows(ss, 'Users');
  const viewer = userRows.find(r => String(r[1] || '').trim().toLowerCase() === String(requestedUsername || '').trim().toLowerCase());
  const viewerRole = viewer ? String(viewer[3] || '').trim().toLowerCase().replace(/[\s_-]+/g, '') : '';
  let announcements = [];
  if (sessionToken) {
    try {
      const authenticatedViewer = getAuthenticatedUser_(sessionToken);
      if (authenticatedViewer.username.trim().toLowerCase() === String(requestedUsername || '').trim().toLowerCase()) {
        announcements = getAnnouncementsForUser_(ss, authenticatedViewer.username);
      }
    } catch (e) { announcements = []; }
  }
  const canViewStudentActivity = ['guru', 'kepsek', 'superadmin'].includes(viewerRole);
  let teacherWaliKelas = '';
  if (viewerRole === 'guru') {
    const guruRow = readSheetRows(ss, 'Master_Guru').find(r => String(r[1] || '').trim().toLowerCase() === String(requestedUsername || '').trim().toLowerCase() || String(r[0] || '').trim().toLowerCase() === String(requestedUsername || '').trim().toLowerCase());
    const configuredClass = String((guruRow && guruRow[4]) || (viewer && viewer[5]) || '').trim();
    if (configuredClass && !['-', 'bukan wali kelas'].includes(configuredClass.toLowerCase())) teacherWaliKelas = configuredClass;
  }
  if (viewerRole === 'guru') masterMapel = masterMapel.filter(m => guruMengampuMapel_(ss, requestedUsername, m.nama));
  let visibleBankSoal = ['kepsek', 'superadmin'].includes(viewerRole)
    ? bankSoal
    : (viewerRole === 'guru' ? bankSoal.filter(q => !q.pembuatUsername || String(q.pembuatUsername || '').toLowerCase() === String(requestedUsername || '').trim().toLowerCase() || String(q.pembuatUsername || '').toLowerCase() === 'admin') : []);
  if (viewerRole === 'guru') {
    visibleBankSoal = visibleBankSoal.filter(q => guruMengampuMapel_(ss, requestedUsername, q.mapel));
  }
  const siswaUsers = userRows.filter(r => String(r[3]).toLowerCase() === 'siswa');
  const ortuUsers = userRows.filter(r => String(r[3]).toLowerCase() === 'ortu');

  const rekapSiswa = siswaUsers.map(r => {
    const nis = String(r[6] || r[1]);
    const ortuMatch = ortuUsers.find(o => String(o[6] || '').trim() === nis || String(o[1] || '').trim().toLowerCase() === ('ortu.' + nis).toLowerCase());
    return {
      nis: nis,
      akunSiswa: String(r[1]),
      nama: String(r[4]),
      kelas: String(r[5]),
      hadir: 'Belum Presensi',
      jarak: '-',
      yaumiah: 0,
      tilawah: '-',
      murajaah: '-',
      parafOrtu: false,
      namaOrtu: ortuMatch ? String(ortuMatch[4]) : 'Orang Tua Siswa',
      akunOrtu: ortuMatch ? String(ortuMatch[1]) : ('ortu.' + nis),
    };
  });

  const sesiUASByMapel = {};
  const sesiRows = readSheetRows(ss, 'Sesi_Ujian');
  sesiRows.forEach(row => {
    const mapel = String(row[2] || 'SEMUA');
    const kelas = String(row[5] || 'SEMUA');
    sesiUASByMapel[mapel + '|' + kelas] = {
      isOpen: String(row[0]).toUpperCase() === 'OPEN',
      token: String(row[1] || ''),
      mapel: mapel,
      kelas: kelas,
      catatan: String(row[3] || ''),
      randomizeQuestions: String(row[6] || '').toUpperCase() === 'TRUE',
      randomizeOptions: String(row[7] || '').toUpperCase() === 'TRUE'
    };
    if (mapel === 'SEMUA' && kelas === 'SEMUA') sesiUASByMapel.SEMUA = sesiUASByMapel[mapel + '|' + kelas];
  });
  const sesiUAS = sesiUASByMapel.SEMUA || { isOpen: false, token: '', mapel: 'SEMUA', catatan: '' };
  const orgSettings = { namaYayasan: 'YAYASAN PENDIDIKAN ISLAM TERPADU', namaSekolah: 'SEKOLAH ISLAM TERPADU (SIT) SISKU', alamat: 'Kampus Pendidikan SIT SISKU, Jl. Pendidikan No. 01', telepon: '(021) 7890-1234', email: 'info@sisku.sch.id', logoUrl: '' };
  readSheetRows(ss, 'Pengaturan_Organisasi').forEach(row => { if (row[0]) orgSettings[row[0]] = String(row[1] || ''); });
  return { status: 'ok', masterMapel, masterKelas, masterGuru, rekapSiswa, masterYaumiah, yaumiahProgress, presensiLog: canViewStudentActivity ? presensiLog : [], yaumiahLog: canViewStudentActivity ? yaumiahLog : [], teacherWaliKelas, targetTahfidz, announcements, bankSoal: visibleBankSoal, tugasList, sesiUAS, sesiUASByMapel, orgSettings };
}

function getInitialData(requestedUsername, sessionToken) {
  const actor = getAuthenticatedUser_(sessionToken);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSecuritySheets_(ss);
  const role = actor.role;
  const actorRow = actor.row;
  const username = actor.username;
  const actorNis = String(actorRow[6] || actorRow[1] || '');
  const actorClass = String(actorRow[5] || '');
  const isStaff = ['guru', 'kepsek', 'superadmin'].includes(role);
  const isAdmin = role === 'superadmin';
  const includeExamSecrets = ['guru', 'kepsek', 'superadmin'].includes(role);

  const existingQuestionSheet = ss.getSheetByName('Bank_Soal_UAS');
  if (existingQuestionSheet && existingQuestionSheet.getLastColumn() < 20) existingQuestionSheet.getRange(1, 17, 1, 4).setValues([['Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']]);
  seedDefaultYaumiah_(ss);
  ensureYaumiahDetailSheet_(ss);

  let teacherWaliKelas = '';
  if (role === 'guru') {
    const guruRow = readSheetRows(ss, 'Master_Guru').find(r => String(r[1] || '').trim().toLowerCase() === username.trim().toLowerCase());
    const configuredClass = String((guruRow && guruRow[4]) || actorClass || '').trim();
    if (configuredClass && !['-', 'bukan wali kelas'].includes(configuredClass.toLowerCase())) teacherWaliKelas = configuredClass;
  }

  let masterMapel = readSheetRows(ss, 'Master_Mapel').map(r => ({ kode: String(r[0]), nama: String(r[1]), kelompok: String(r[2] || 'Umum') }));
  if (role === 'guru') masterMapel = masterMapel.filter(m => guruMengampuMapel_(ss, username, m.nama));
  let masterKelas = readSheetRows(ss, 'Master_Kelas').map(r => ({ kode: String(r[0]), nama: String(r[1]), wali: String(r[2]), kapasitas: Number(r[3] || 30) }));
  if (!isStaff) masterKelas = masterKelas.filter(k => k.kode === actorClass);
  if (role === 'guru') masterKelas = masterKelas.filter(k => !teacherWaliKelas || k.kode === teacherWaliKelas);

  let masterGuru = [];
  if (isStaff) {
    masterGuru = readSheetRows(ss, 'Master_Guru').map(r => ({
      nip: String(r[0]), username: String(r[1]), nama: String(r[2]), mapel: String(r[3]),
      mapelList: splitGuruMapel(r[3]), waliKelas: String(r[4] || '-')
    }));
    if (role === 'guru') masterGuru = masterGuru.filter(g => g.username.toLowerCase() === username.toLowerCase());
  }

  const userRows = readSheetRows(ss, 'Users');
  let allowedNis = null;
  if (!isStaff) allowedNis = new Set([actorNis]);
  if (role === 'guru') {
    allowedNis = new Set(userRows.filter(r => normalizeRole_(r[3]) === 'siswa' && teacherWaliKelas && String(r[5] || '') === teacherWaliKelas).map(r => String(r[6] || r[1])));
  }
  const siswaUsers = userRows.filter(r => normalizeRole_(r[3]) === 'siswa' && (!allowedNis || allowedNis.has(String(r[6] || r[1]))));
  const ortuUsers = userRows.filter(r => normalizeRole_(r[3]) === 'ortu');
  const rekapSiswa = siswaUsers.map(r => {
    const nis = String(r[6] || r[1]);
    const ortuMatch = ortuUsers.find(o => String(o[6] || '').trim() === nis);
    return {
      nis: nis, akunSiswa: String(r[1]), nama: String(r[4]), kelas: String(r[5]),
      hadir: 'Belum Presensi', jarak: '-', yaumiah: 0, tilawah: '-', murajaah: '-', parafOrtu: false,
      namaOrtu: ortuMatch ? String(ortuMatch[4]) : 'Orang Tua Siswa',
      akunOrtu: isStaff && ortuMatch ? String(ortuMatch[1]) : ''
    };
  });

  const allowedActivityNis = allowedNis || new Set(siswaUsers.map(r => String(r[6] || r[1])));
  const hasAllowedActivity = allowedActivityNis.size > 0;
  const presensiLog = hasAllowedActivity
    ? readSheetRows(ss, 'Presensi')
        .filter(r => allowedActivityNis.has(String(r[2] || '')))
        .map(r => ({ timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''), tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2] || ''), nama: String(r[3] || ''), status: String(r[4] || ''), jam: String(r[5] || ''), jarak: String(r[8] || '') }))
    : [];
  const yaumiahLog = hasAllowedActivity
    ? readSheetRows(ss, 'Yaumiah_Log')
        .filter(r => allowedActivityNis.has(String(r[2] || '')))
        .map(r => ({ timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''), tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2] || ''), nama: String(r[3] || ''), kelas: String(r[4] || ''), persen: Number(r[5] || 0), tilawahMurajaah: String(r[6] || ''), parafOrtu: String(r[7] || '').toLowerCase() === 'true' || r[7] === true }))
    : [];
  const yaumiahProgress = hasAllowedActivity
    ? readSheetRows(ss, 'Yaumiah_Detail')
        .filter(r => allowedActivityNis.has(String(r[1] || '')))
        .map(r => ({ tanggal: normalizeSchoolDate_(r[0]), nis: String(r[1]), id: String(r[2]), done: String(r[3]).toLowerCase() === 'true', status: String(r[5] || '') }))
    : [];

  const masterYaumiah = getCachedSheet_(ss, 'Master_Yaumiah', 'sisku-master-yaumiah-v1', 60)
    .filter(r => String(r[4] || 'SEMUA') === 'SEMUA' || isStaff || String(r[4] || '') === actorClass)
    .map(r => ({ id: String(r[0]), nama: String(r[1]), kategori: String(r[2]), target: 'Target Harian', done: false, poin: Number(r[3] || 10), kelas: String(r[4] || 'SEMUA') }));
  const needTargetTahfidz = isAdmin || role === 'kepsek' || role === 'siswa' || role === 'ortu' || (role === 'guru' && !!teacherWaliKelas);
  const targetTahfidz = needTargetTahfidz
    ? readSheetRows(ss, 'Target_Tahfidz')
        .filter(r => isAdmin || role === 'kepsek' || String(r[0] || '') === (role === 'guru' ? teacherWaliKelas : actorClass))
        .map(r => ({ kelas: String(r[0]), guru: String(r[1]), targetTilawah: String(r[2]), targetMurajaah: String(r[3]), targetZiyadah: String(r[4]), catatanGuru: String(r[5]), updatedAt: String(r[6]) }))
    : [];

  const questionRows = readSheetRows(ss, 'Bank_Soal_UAS');
  let bankSoal = [];
  if (includeExamSecrets) {
    bankSoal = questionRows.map(r => questionFromRow_(r, true));
    if (role === 'guru') bankSoal = bankSoal.filter(q => guruDapatMelihatSoal_(ss, username, q));
  }

  const taskSubmissions = readSheetRows(ss, 'Task_Submissions').filter(r => String(r[3] || '') === actorNis);
  const completedTaskIds = new Set(taskSubmissions.filter(r => String(r[4] || '').toUpperCase() === 'SELESAI').map(r => String(r[1] || '')));
  const tugasList = readSheetRows(ss, 'Tugas_Kelas')
    .filter(r => isStaff || !r[3] || String(r[3]) === 'SEMUA' || String(r[3]) === actorClass)
    .map(r => ({ id: String(r[1]), mapel: String(r[2]), kelas: String(r[3]), judul: String(r[4]), deskripsi: String(r[5] || ''), deadline: String(r[6] || ''), guru: String(r[7] || ''), status: !isStaff && completedTaskIds.has(String(r[1])) ? 'Selesai' : String(r[8] || 'Aktif') }));

  const sessionMap = {};
  masterMapel.forEach(m => {
    const session = getExamSessionFor_(ss, m.nama, actorClass || 'SEMUA', includeExamSecrets);
    sessionMap[m.nama + '|' + (actorClass || 'SEMUA')] = session;
  });
  const examCatalog = [];
  if (role === 'siswa') {
    masterMapel.forEach(m => {
      const count = questionRows.filter(r => String(r[13] || '') === 'Approved' && String(r[2] || '') === m.nama && (!r[3] || String(r[3]) === 'SEMUA' || String(r[3]) === actorClass)).length;
      const session = getExamSessionFor_(ss, m.nama, actorClass, false);
      examCatalog.push({ mapel: m.nama, kode: m.kode, count: count, isOpen: session.isOpen, requiresToken: session.requiresToken, randomizeQuestions: session.randomizeQuestions, randomizeOptions: session.randomizeOptions });
    });
  }

  const nilaiRows = readSheetRows(ss, 'Nilai_UAS').filter(r => String(r[2] || '') === actorNis);
  const riwayatNilaiUAS = nilaiRows.map(r => ({
    tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2]), nama: String(r[3]), kelas: String(r[4]),
    mapel: String(r[5]), benar: Number(r[6] || 0), total: Number(r[7] || 0), skor: Number(r[8] || 0),
    attemptId: String(r[9] || ''), status: String(r[10] || 'FINAL'),
    objectiveScore: Number(r[11] !== '' && r[11] != null ? r[11] : r[8] || 0),
    essayScore: r[12] === '' || r[12] == null ? null : Number(r[12])
  }));
  let examResults = [];
  let essaySubmissions = [];
  if (isStaff) {
    const ownedMapels = new Set(role === 'guru'
      ? questionRows.filter(r => normalizeAccountKey_(r[17]) === normalizeAccountKey_(username)).map(r => String(r[2] || ''))
      : []);
    const canViewResultMapel = mapel => role !== 'guru' || ownedMapels.has(String(mapel || '')) || guruMengampuMapel_(ss, username, mapel);
    const canViewResultRow = r => canViewResultMapel(r[5]) || (role === 'guru' && teacherWaliKelas && String(r[4] || '') === teacherWaliKelas);
    examResults = readSheetRows(ss, 'Nilai_UAS')
      .filter(canViewResultRow)
      .map(r => ({
        tanggal: normalizeSchoolDate_(r[1]), nis: String(r[2] || ''), nama: String(r[3] || ''),
        kelas: String(r[4] || ''), mapel: String(r[5] || ''), benar: Number(r[6] || 0),
        total: Number(r[7] || 0), skor: Number(r[8] || 0), attemptId: String(r[9] || ''),
        status: String(r[10] || 'FINAL'), objectiveScore: Number(r[11] !== '' && r[11] != null ? r[11] : r[8] || 0),
        essayScore: r[12] === '' || r[12] == null ? null : Number(r[12])
      }));
    const questionById = new Map(questionRows.map(r => [String(r[1] || ''), questionFromRow_(r, true)]));
    essaySubmissions = readSheetRows(ss, 'Exam_Attempts')
      .filter(r => String(r[8] || '') === 'SUBMITTED' && (r[14] === true || String(r[14] || '').toLowerCase() === 'true') && canViewResultMapel(r[7]))
      .map(r => {
        let manifest = [], answers = {}, grading = {};
        try { manifest = JSON.parse(String(r[15] || '')); } catch (e) {}
        try { answers = JSON.parse(String(r[12] || '')); } catch (e) {}
        try { grading = JSON.parse(String(r[16] || '')); } catch (e) {}
        const savedScores = grading && grading.scores || {};
        const questions = (Array.isArray(manifest) ? manifest : []).filter(item => String(item.type || '').toUpperCase() === 'ESAI').map(item => {
          const id = String(item.id || '');
          const bankQuestion = questionById.get(id) || {};
          const saved = savedScores[id] || {};
          return { id: id, pertanyaan: String(bankQuestion.pertanyaan || ''), rubrik: String(item.key || bankQuestion.kunci || ''), jawaban: String(answers[id] || ''), score: saved.score == null ? null : Number(saved.score), feedback: String(saved.feedback || '') };
        });
        return {
          attemptId: String(r[0] || ''), submittedAt: r[2] instanceof Date ? r[2].toISOString() : String(r[2] || ''),
          username: String(r[3] || ''), nis: String(r[4] || ''), nama: String(r[5] || ''),
          kelas: String(r[6] || ''), mapel: String(r[7] || ''), objectiveTotal: Number(r[10] || 0),
          objectiveScore: Number(r[17] !== '' && r[17] != null ? r[17] : r[11] || 0),
          essayScore: r[18] === '' || r[18] == null ? null : Number(r[18]),
          finalScore: r[19] === '' || r[19] == null ? null : Number(r[19]),
          objectiveWeight: grading.objectiveWeight == null ? (Number(r[10] || 0) > 0 ? 60 : 0) : Number(grading.objectiveWeight),
          essayWeight: grading.essayWeight == null ? (Number(r[10] || 0) > 0 ? 40 : 100) : Number(grading.essayWeight),
          questions: questions
        };
      });
  }
  const complaintRows = readSheetRows(ss, 'Grade_Complaints');
  let visibleComplaintRows = [];
  if (role === 'siswa' || role === 'ortu') {
    visibleComplaintRows = complaintRows.filter(r => String(r[3] || '') === actorNis);
  } else if (role === 'guru') {
    visibleComplaintRows = complaintRows.filter(r => {
      let targets = [];
      try { targets = JSON.parse(String(r[12] || '[]')); } catch (e) {}
      return targets.map(normalizeAccountKey_).includes(normalizeAccountKey_(username)) || guruDapatMenilaiMapel_(ss, username, r[6]);
    });
  } else if (role === 'superadmin') {
    visibleComplaintRows = complaintRows;
  }
  const gradeComplaints = visibleComplaintRows.slice().reverse().map(r => ({
    id: String(r[0] || ''), timestamp: r[1] instanceof Date ? r[1].toISOString() : String(r[1] || ''),
    attemptId: String(r[2] || ''), nis: String(r[3] || ''), nama: String(r[4] || ''),
    kelas: String(r[5] || ''), mapel: String(r[6] || ''), skor: Number(r[7] || 0),
    senderUsername: String(r[8] || ''), senderName: String(r[9] || ''), senderRole: String(r[10] || ''),
    argument: String(r[11] || ''), status: String(r[13] || 'BARU'),
    updatedAt: r[14] instanceof Date ? r[14].toISOString() : String(r[14] || ''), updatedBy: String(r[15] || ''),
    oldScore: r[16] === '' || r[16] == null ? Number(r[7] || 0) : Number(r[16]),
    newScore: r[17] === '' || r[17] == null ? null : Number(r[17]), teacherResponse: String(r[18] || ''),
    resolvedAt: r[19] instanceof Date ? r[19].toISOString() : String(r[19] || ''), resolvedBy: String(r[20] || '')
  }));
  const announcements = getAnnouncementsForUser_(ss, username);
  const orgSettings = { namaYayasan: 'YAYASAN PENDIDIKAN ISLAM TERPADU', namaSekolah: 'SEKOLAH ISLAM TERPADU (SIT) SISKU', alamat: '', telepon: '', email: '', logoUrl: '' };
  readSheetRows(ss, 'Pengaturan_Organisasi').forEach(row => { if (row[0]) orgSettings[row[0]] = String(row[1] || ''); });

  let attendanceConfig = { namaLokasi: 'Sekolah', lat: Number(PropertiesService.getScriptProperties().getProperty('SCHOOL_LAT') || -6.2), lng: Number(PropertiesService.getScriptProperties().getProperty('SCHOOL_LNG') || 106.816666), maxRadiusMeter: Number(PropertiesService.getScriptProperties().getProperty('SCHOOL_RADIUS_M') || 100) };
  if (isStaff) {
    attendanceConfig.qrTokenMasuk = PropertiesService.getScriptProperties().getProperty('QR_TOKEN_MASUK') || '';
    attendanceConfig.qrTokenPulang = PropertiesService.getScriptProperties().getProperty('QR_TOKEN_PULANG') || '';
  }
  return { status: 'ok', masterMapel: masterMapel, masterKelas: masterKelas, masterGuru: masterGuru, rekapSiswa: rekapSiswa, masterYaumiah: masterYaumiah, yaumiahProgress: yaumiahProgress, presensiLog: presensiLog, yaumiahLog: yaumiahLog, teacherWaliKelas: teacherWaliKelas, targetTahfidz: targetTahfidz, announcements: announcements, bankSoal: bankSoal, tugasList: tugasList, sesiUAS: { isOpen: false, token: '', mapel: 'SEMUA', catatan: '' }, sesiUASByMapel: sessionMap, examCatalog: examCatalog, riwayatNilaiUAS: riwayatNilaiUAS, examResults: examResults, essaySubmissions: essaySubmissions, gradeComplaints: gradeComplaints, orgSettings: orgSettings, attendanceConfig: attendanceConfig };
}

function getMasterData_(sessionToken) {
  requireSuperadmin_(sessionToken);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet induk SISKU tidak tersedia.');

  const masterMapel = readSheetRows(ss, 'Master_Mapel')
    .filter(r => String(r[0] || '').trim() || String(r[1] || '').trim())
    .map(r => ({ kode: String(r[0] || ''), nama: String(r[1] || ''), kelompok: String(r[2] || 'Umum') }));
  const masterKelas = readSheetRows(ss, 'Master_Kelas')
    .filter(r => String(r[0] || '').trim() || String(r[1] || '').trim())
    .map(r => ({ kode: String(r[0] || ''), nama: String(r[1] || ''), wali: String(r[2] || '-'), kapasitas: Number(r[3] || 30) }));
  const masterGuru = readSheetRows(ss, 'Master_Guru')
    .filter(r => String(r[0] || '').trim() || String(r[2] || '').trim())
    .map(r => ({
      nip: String(r[0] || ''), username: String(r[1] || ''), nama: String(r[2] || ''), mapel: String(r[3] || ''),
      mapelList: splitGuruMapel(r[3]), waliKelas: String(r[4] || '-')
    }));

  const userRows = readSheetRows(ss, 'Users');
  const parentByNis = new Map();
  userRows.filter(r => normalizeRole_(r[3]) === 'ortu').forEach(r => {
    const nis = String(r[6] || '').trim();
    if (nis && !parentByNis.has(nis)) parentByNis.set(nis, r);
  });
  const rekapSiswa = userRows
    .filter(r => normalizeRole_(r[3]) === 'siswa')
    .map(r => {
      const nis = String(r[6] || r[1] || '');
      const parent = parentByNis.get(nis);
      return {
        nis: nis, akunSiswa: String(r[1] || ''), nama: String(r[4] || ''), kelas: String(r[5] || ''),
        hadir: 'Belum Presensi', jarak: '-', yaumiah: 0, tilawah: '-', murajaah: '-', parafOrtu: false,
        namaOrtu: parent ? String(parent[4] || '') : 'Orang Tua Siswa',
        akunOrtu: parent ? String(parent[1] || '') : ''
      };
    });

  return {
    status: 'ok', masterMapel: masterMapel, masterKelas: masterKelas,
    masterGuru: masterGuru, rekapSiswa: rekapSiswa,
    counts: { mapel: masterMapel.length, kelas: masterKelas.length, guru: masterGuru.length, siswa: rekapSiswa.length }
  };
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function railwaySyncSecretValid_(providedSecret) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('RAILWAY_SYNC_SECRET') || '');
  const provided = String(providedSecret || '');
  if (expected.length < 32 || provided.length < 32) return false;
  const expectedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected, Utilities.Charset.UTF_8);
  const providedDigest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, provided, Utilities.Charset.UTF_8);
  let different = expectedDigest.length ^ providedDigest.length;
  const length = Math.max(expectedDigest.length, providedDigest.length);
  for (let index = 0; index < length; index++) {
    different |= (expectedDigest[index % expectedDigest.length] ^ providedDigest[index % providedDigest.length]);
  }
  return different === 0;
}

function requireRailwaySyncSecret_(providedSecret) {
  if (!railwaySyncSecretValid_(providedSecret)) throw new Error('Kredensial sinkronisasi tidak valid.');
}

function railwaySyncCell_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

function railwaySyncSha256_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(byte => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function getRailwaySyncManifest_(providedSecret) {
  requireRailwaySyncSecret_(providedSecret);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = RAILWAY_SYNC_SHEETS.map(name => ss.getSheetByName(name)).filter(Boolean).map(sheet => {
    const rowCount = Math.max(0, sheet.getLastRow() - 1);
    const columnCount = sheet.getLastColumn();
    const values = columnCount > 0 ? sheet.getRange(1, 1, rowCount + 1, columnCount).getValues().map(row => row.map(railwaySyncCell_)) : [[]];
    const headers = values[0] || [];
    const rows = values.slice(1);
    return {
      name: sheet.getName(), headers: headers, rowCount: rowCount,
      checksum: railwaySyncSha256_(JSON.stringify([headers, rows]))
    };
  });
  return {
    status: 'ok',
    format: 'sisku-sheet-snapshot/v1',
    spreadsheetId: ss.getId(),
    spreadsheetTitle: ss.getName(),
    exportedAt: new Date().toISOString(),
    sheets: sheets
  };
}

function getRailwaySyncSheet_(providedSecret, sheetName, offset, requestedLimit) {
  requireRailwaySyncSecret_(providedSecret);
  const name = String(sheetName || '');
  if (RAILWAY_SYNC_SHEETS.indexOf(name) < 0) throw new Error('Sheet tidak tersedia untuk sinkronisasi.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet tidak ditemukan.');
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const limit = Math.min(500, Math.max(1, Math.floor(Number(requestedLimit) || 250)));
  const rowCount = Math.max(0, sheet.getLastRow() - 1);
  const count = Math.max(0, Math.min(limit, rowCount - start));
  const columnCount = sheet.getLastColumn();
  const rows = count > 0 && columnCount > 0
    ? sheet.getRange(start + 2, 1, count, columnCount).getValues().map(row => row.map(railwaySyncCell_))
    : [];
  return { status: 'ok', name: name, offset: start, rowCount: rowCount, rows: rows, nextOffset: start + rows.length };
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SISKU | Monitoring Yaumiah & Akademik')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function loginUser(username, pin) {
  let ss = null;
  let sh = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) sh = ss.getSheetByName('Users');
  } catch (error) {
    console.error('LOGIN_STORAGE_UNAVAILABLE', error);
    return { status: 'error', code: 'STORAGE_UNAVAILABLE', message: 'Data akun belum dapat diakses oleh layanan. Hubungi admin untuk memeriksa izin deployment.' };
  }
  if (!ss || !sh) {
    console.error('LOGIN_STORAGE_MISSING', { hasSpreadsheet: Boolean(ss), hasUsersSheet: Boolean(sh) });
    return { status: 'error', code: 'STORAGE_UNAVAILABLE', message: 'Data akun belum tersedia pada layanan. Hubungi admin sekolah.' };
  }
  const u = String(username || '').trim().toLowerCase();
  const p = String(pin || '').trim();
  if (!u || u.length > 120 || !p || p.length > 32) return { status: 'error', message: 'NIS / Username atau PIN tidak sesuai.' };
  const loginCache = CacheService.getScriptCache();
  const attemptKey = 'sis-login-fail-' + u.replace(/[^a-z0-9._-]/g, '_').slice(0, 120);
  const failedAttempts = Number(loginCache.get(attemptKey) || 0);
  if (failedAttempts >= 5) return { status: 'error', message: 'Terlalu banyak percobaan login. Tunggu 15 menit lalu coba kembali.' };

  if (sh && sh.getLastRow() > 1) {
    const data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowUser = String(row[1] || '').trim().toLowerCase();
      const rowPin = String(row[2] || '').trim();
      const rowRole = String(row[3] || 'siswa').trim().toLowerCase().replace(/[\s_-]+/g, '');
      const rowNama = String(row[4] || '');
      const rowKelas = String(row[5] || '');
      const rowNis = String(row[6] || '');

      const isOrtuMatch = (rowRole === 'ortu') && (rowUser === 'ortu.' + u || rowNis === u);
      if ((rowUser === u || isOrtuMatch) && verifyPin_(p, rowPin)) {
        const mustChangePin = rowPin.indexOf('v1$') !== 0 || p.length < 6;
        loginCache.remove(attemptKey);
        if (rowPin.indexOf('v1$') !== 0) sh.getRange(i + 2, 3).setValue(hashPin_(p));
        let guruMapel = '';
        if (rowRole === 'guru') {
          const shG = ss.getSheetByName('Master_Guru');
          if (shG && shG.getLastRow() > 1) {
            const gData = shG.getRange(2, 1, shG.getLastRow() - 1, 5).getValues();
            for (let g = 0; g < gData.length; g++) {
              if (String(gData[g][1]).toLowerCase() === rowUser || String(gData[g][0]).toLowerCase() === rowUser) {
                guruMapel = String(gData[g][3] || '');
                break;
              }
            }
          }
        }
        return {
          status: 'ok',
          user: issueSessionToken_({
            username: String(row[1]),
          idUser: String(row[0] || ''),
            role: rowRole,
            nama: rowNama,
            kelas: rowKelas,
            nis: rowNis || rowUser,
            mapel: guruMapel,
            mapelList: splitGuruMapel(guruMapel),
            mustChangePin: mustChangePin
          })
        };
      }
    }
  }

  loginCache.put(attemptKey, String(failedAttempts + 1), 900);
  return { status: 'error', message: 'NIS / Username atau PIN tidak sesuai.' };
}

function ensureSuperadminAccount_(ss, user) {
  if (!ss) return false;
  let sh = ss.getSheetByName('Users');
  if (!sh) {
    sh = ss.insertSheet('Users');
    sh.appendRow(['ID_User', 'Username', 'PIN_Akses', 'Role', 'Nama_Lengkap', 'Kelas', 'NIS_Terkait']);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(['ID_User', 'Username', 'PIN_Akses', 'Role', 'Nama_Lengkap', 'Kelas', 'NIS_Terkait']);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
  }

  const usernameRow = findRowByValue(sh, 2, user.username);
  if (usernameRow > 0) return false;
  sh.appendRow(['USR-SUPERADMIN', user.username, hashPin_(user.pin), user.role, user.nama, user.kelas, user.nis]);
  return true;
}

function issueSessionToken_(user) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('sis-session-' + token, JSON.stringify({ username: String(user.username || ''), idUser: String(user.idUser || '') }), 21600);
  user.sessionToken = token;
  return user;
}

function getAuthenticatedUser_(sessionToken) {
  const token = String(sessionToken || '');
  const raw = token ? CacheService.getScriptCache().get('sis-session-' + token) : '';
  if (!raw) throw new Error('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.');
  let session;
  try { session = JSON.parse(raw); } catch (e) { session = { username: raw }; }
  const rows = readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Users');
  const user = session.idUser
    ? rows.find(r => String(r[0] || '').trim() === String(session.idUser).trim())
    : rows.find(r => String(r[1] || '').trim().toLowerCase() === String(session.username || '').trim().toLowerCase());
  if (!user) throw new Error('Akun pada sesi ini tidak ditemukan. Silakan login kembali.');
  return { row: user, username: String(user[1] || ''), name: String(user[4] || ''), role: String(user[3] || '').trim().toLowerCase().replace(/[\s_-]+/g, '') };
}

function requireSuperadmin_(sessionToken) {
  const actor = getAuthenticatedUser_(sessionToken);
  if (actor.role !== 'superadmin') throw new Error('Fitur ini hanya dapat diakses oleh Superadmin.');
  return actor;
}

function recordActivity_(actor, target, action, detail) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Activity_Log');
  if (!sh) {
    sh = ss.insertSheet('Activity_Log');
    sh.appendRow(['Timestamp', 'Actor_Username', 'Actor_Nama', 'Target_Username', 'Target_Nama', 'Action', 'Detail']);
  }
  sh.appendRow([new Date(), actor.username || '', actor.name || '', target.username || '', target.name || '', String(action || ''), String(detail || '').slice(0, 500)]);
}

function ensureAnnouncementsSheet_(ss) {
  let sh = ss.getSheetByName('Announcements');
  if (!sh) {
    sh = ss.insertSheet('Announcements');
    sh.appendRow(['ID_Pengumuman', 'Timestamp', 'Actor_Username', 'Actor_Nama', 'Target_Accounts', 'Judul', 'Pesan']);
  }
  return sh;
}

function getAnnouncementsForUser_(ss, username) {
  const sh = ss.getSheetByName('Announcements');
  if (!sh || sh.getLastRow() <= 1) return [];
  const normalizedUsername = String(username || '').trim().toLowerCase();
  return sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().filter(row => {
    const target = String(row[4] || '');
    if (target === '*') return true;
    try { return JSON.parse(target).some(name => String(name).trim().toLowerCase() === normalizedUsername); } catch (e) { return false; }
  }).slice(-100).reverse().map(row => ({
    id: String(row[0] || ''),
    timestamp: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ''),
    sender: String(row[3] || row[2] || 'Superadmin'),
    title: String(row[5] || ''),
    message: String(row[6] || '')
  }));
}

function sendAnnouncement_(payload) {
  const data = payload.data || {};
  const title = String(data.title || '').trim();
  const message = String(data.message || '').trim();
  if (!title || title.length > 120) throw new Error('Judul wajib diisi dan maksimal 120 karakter.');
  if (!message || message.length > 3000) throw new Error('Isi pengumuman wajib diisi dan maksimal 3.000 karakter.');
  const users = readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Users');
  const sendToAll = data.sendToAll === true;
  let targets = ['*'];
  let sentCount = users.length;
  if (!sendToAll) {
    const requested = Array.isArray(data.targetUsernames) ? Array.from(new Set(data.targetUsernames.map(name => String(name || '').trim()).filter(Boolean))) : [];
    const validUsers = new Set(users.map(row => String(row[1] || '').trim().toLowerCase()));
    if (!requested.length) throw new Error('Pilih setidaknya satu akun penerima.');
    const invalid = requested.filter(name => !validUsers.has(name.toLowerCase()));
    if (invalid.length) throw new Error('Ada akun penerima yang tidak ditemukan. Muat ulang daftar akun.');
    targets = requested;
    sentCount = requested.length;
  }
  ensureAnnouncementsSheet_(SpreadsheetApp.getActiveSpreadsheet()).appendRow([
    Utilities.getUuid(), new Date(), payload.actorUsername || '', payload.actorName || '', sendToAll ? '*' : JSON.stringify(targets), title, message
  ]);
  return { status: 'ok', sentCount: sentCount };
}

function ensureInternalMessagesSheet_(ss) {
  let sh = ss.getSheetByName('Internal_Messages');
  if (!sh) {
    sh = ss.insertSheet('Internal_Messages');
    sh.appendRow(['ID_Pesan', 'Timestamp', 'Sender_Username', 'Sender_Nama', 'Sender_Role', 'Judul', 'Pesan', 'Status', 'Read_At', 'Read_By']);
  }
  return sh;
}

function sendAdminMessage_(payload) {
  const subject = String((payload.data || {}).subject || '').trim();
  const message = String((payload.data || {}).message || '').trim();
  if (!subject || subject.length > 120) throw new Error('Judul wajib diisi dan maksimal 120 karakter.');
  if (!message || message.length > 5000) throw new Error('Pesan wajib diisi dan maksimal 5.000 karakter.');
  const admins = readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Users').filter(row => String(row[3] || '').trim().toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin');
  if (!admins.length) throw new Error('Akun Superadmin belum tersedia.');
  ensureInternalMessagesSheet_(SpreadsheetApp.getActiveSpreadsheet()).appendRow([
    Utilities.getUuid(), new Date(), payload.actorUsername || '', payload.actorName || '', payload.role || '', subject, message, 'BELUM DIBACA', '', ''
  ]);
  return { status: 'ok' };
}

function getSuperadminMessages(sessionToken) {
  requireSuperadmin_(sessionToken);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Internal_Messages');
  if (!sh || sh.getLastRow() <= 1) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues().reverse().slice(0, 500).map(row => ({
    id: String(row[0] || ''),
    timestamp: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ''),
    senderUsername: String(row[2] || ''),
    senderName: String(row[3] || ''),
    senderRole: String(row[4] || ''),
    subject: String(row[5] || ''),
    message: String(row[6] || ''),
    status: String(row[7] || 'BELUM DIBACA'),
    readAt: row[8] instanceof Date ? row[8].toISOString() : String(row[8] || ''),
    readBy: String(row[9] || '')
  }));
}

function markAdminMessageRead_(payload) {
  const actor = requireSuperadmin_(payload.sessionToken);
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Internal_Messages');
  const row = sh ? findRowByValue(sh, 1, (payload.data || {}).id) : -1;
  if (row < 2) throw new Error('Pesan tidak ditemukan. Muat ulang inbox.');
  sh.getRange(row, 8, 1, 3).setValues([['SUDAH DIBACA', new Date(), actor.username]]);
  return { status: 'ok' };
}

function getSuperadminAccounts(sessionToken) {
  requireSuperadmin_(sessionToken);
  return readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Users').map(r => ({
    idUser: String(r[0] || ''), username: String(r[1] || ''), role: String(r[3] || 'siswa'),
    nama: String(r[4] || ''), kelas: String(r[5] || ''), nis: String(r[6] || '')
  }));
}

function getSuperadminAccountActivity(sessionToken, username) {
  const actor = requireSuperadmin_(sessionToken);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetRow = readSheetRows(ss, 'Users').find(r => String(r[1] || '').trim().toLowerCase() === String(username || '').trim().toLowerCase());
  if (!targetRow) throw new Error('Akun tidak ditemukan.');
  const target = { username: String(targetRow[1] || ''), name: String(targetRow[4] || '') };
  recordActivity_(actor, target, 'LIHAT_ACTIVITY_LOG', 'Superadmin membuka activity log akun.');
  const sh = ss.getSheetByName('Activity_Log');
  const entries = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues() : [];
  const activity = entries.filter(r => String(r[3] || '').trim().toLowerCase() === target.username.toLowerCase() || String(r[1] || '').trim().toLowerCase() === target.username.toLowerCase())
    .map(r => ({ timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0] || ''), actor: String(r[1] || ''), actorName: String(r[2] || ''), target: String(r[3] || ''), action: String(r[5] || ''), detail: String(r[6] || '') }));
  const nis = String(targetRow[6] || target.username);
  const addSheetEvents = (sheetName, predicate, describe) => {
    readSheetRows(ss, sheetName).forEach(row => {
      if (predicate(row)) activity.push({ timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || row[1] || ''), actor: '', actorName: '', target: target.username, action: sheetName, detail: describe(row) });
    });
  };
  addSheetEvents('Presensi', r => String(r[2] || '').trim() === nis, r => 'Tanggal ' + String(r[1] || '') + ' • ' + String(r[4] || '') + (r[5] ? ' • ' + String(r[5]) : ''));
  addSheetEvents('Yaumiah_Log', r => String(r[2] || '').trim() === nis, r => 'Tanggal ' + String(r[1] || '') + ' • capaian ' + String(r[5] || '') + '%' + (r[6] ? ' • ' + String(r[6]) : ''));
  addSheetEvents('Yaumiah_Detail', r => String(r[1] || '').trim() === nis, r => 'Tanggal ' + String(r[0] || '') + ' • aktivitas ' + String(r[2] || '') + ' • ' + (String(r[3]).toLowerCase() === 'true' ? 'selesai' : 'belum selesai'));
  addSheetEvents('Nilai_UAS', r => String(r[2] || '').trim() === nis, r => 'Tanggal ' + String(r[1] || '') + ' • ' + String(r[5] || '') + ' • nilai ' + String(r[8] || ''));
  return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 300);
}

function startSuperadminImpersonation(sessionToken, username) {
  const actor = requireSuperadmin_(sessionToken);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetRow = readSheetRows(ss, 'Users').find(r => String(r[1] || '').trim().toLowerCase() === String(username || '').trim().toLowerCase());
  if (!targetRow) throw new Error('Akun tidak ditemukan.');
  const target = { username: String(targetRow[1] || ''), name: String(targetRow[4] || '') };
  const targetRole = String(targetRow[3] || 'siswa').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (targetRole === 'superadmin') throw new Error('Akun Superadmin tidak dapat diimpersonasi.');
  let guruMapel = '';
  let targetClass = String(targetRow[5] || '');
  if (targetRole === 'guru') {
    const guruRow = readSheetRows(ss, 'Master_Guru').find(r =>
      normalizeAccountKey_(r[1]) === normalizeAccountKey_(target.username) ||
      normalizeAccountKey_(r[0]) === normalizeAccountKey_(target.username)
    );
    guruMapel = String(guruRow && guruRow[3] || '');
    const waliKelas = String(guruRow && guruRow[4] || '').trim();
    if (waliKelas && waliKelas !== '-') targetClass = waliKelas;
  }
  recordActivity_(actor, target, 'IMPERSONATE_START', 'Superadmin mulai melihat aplikasi sebagai akun ini.');
  const impersonatedUser = issueSessionToken_({ idUser: String(targetRow[0] || ''), username: target.username, role: targetRole, nama: target.name, kelas: targetClass, nis: String(targetRow[6] || target.username), mapel: guruMapel, mapelList: splitGuruMapel(guruMapel), isImpersonating: true });
  CacheService.getScriptCache().put('sis-session-' + impersonatedUser.sessionToken, JSON.stringify({ username: target.username, idUser: String(targetRow[0] || ''), impersonatorUsername: actor.username, impersonatorName: actor.name }), 21600);
  return impersonatedUser;
}

function authorizeClientAction_(payload) {
  const policies = {
    GET_INITIAL_DATA: ['superadmin', 'kepsek', 'guru', 'siswa', 'ortu'],
    GET_MASTER_DATA: ['superadmin'],
    ADMIN_LIST_ACCOUNTS: ['superadmin'], ADMIN_ACCOUNT_ACTIVITY: ['superadmin'],
    ADMIN_IMPERSONATE: ['superadmin'], ADMIN_MESSAGES: ['superadmin'],
    PING: ['superadmin', 'kepsek', 'guru', 'siswa', 'ortu'],
    LOGOUT: ['superadmin', 'kepsek', 'guru', 'siswa', 'ortu'],
    CLEAN_DEMO_ACCOUNTS: ['superadmin'],
    REGISTER_MAPEL: ['superadmin'], UPDATE_MAPEL: ['superadmin'], DELETE_MAPEL: ['superadmin'],
    REGISTER_KELAS: ['superadmin'], UPDATE_KELAS: ['superadmin'], DELETE_KELAS: ['superadmin'],
    REGISTER_GURU: ['superadmin'], UPDATE_GURU: ['superadmin'], DELETE_GURU: ['superadmin'],
    REGISTER_SISWA: ['superadmin'], UPDATE_SISWA: ['superadmin'], DELETE_SISWA: ['superadmin'],
    SOAL_UAS: ['superadmin', 'guru'], SOAL_UAS_BULK: ['superadmin', 'guru'],
    UPDATE_SOAL: ['superadmin', 'guru'], DELETE_SOAL: ['superadmin', 'guru', 'kepsek'],
    UPLOAD_SOAL_IMAGES_BATCH: ['superadmin', 'guru'],
    BULK_UPDATE_GAMBAR_SOAL: ['superadmin', 'guru'],
    DELETE_SOAL_PACKAGE: ['superadmin', 'guru', 'kepsek'], UPDATE_APPROVAL_SOAL: ['superadmin', 'kepsek'],
    BULK_DELETE_SOAL: ['superadmin', 'guru', 'kepsek'], BULK_APPROVE_SOAL: ['superadmin', 'kepsek'],
    SESI_UAS: ['superadmin', 'guru', 'kepsek'], CHANGE_OWN_PIN: ['superadmin', 'kepsek', 'guru', 'siswa', 'ortu'],
    TUGAS: ['superadmin', 'guru'], UPDATE_TUGAS: ['superadmin', 'guru'], SEND_ANNOUNCEMENT: ['superadmin'],
    DELETE_TUGAS: ['superadmin', 'guru'], UPDATE_TUGAS_STATUS: ['siswa'],
    PRESENSI: ['siswa', 'guru'], YAUMIAH: ['siswa', 'ortu'],
    TARGET_TAHFIDZ: ['superadmin', 'guru'], MASTER_YAUMIAH: ['superadmin', 'guru'],
    UPDATE_YAUMIAH: ['superadmin', 'guru'], DELETE_YAUMIAH: ['superadmin', 'guru'],
    SAVE_ORG_SETTINGS: ['superadmin'], START_EXAM: ['siswa'], SUBMIT_EXAM: ['siswa'],
    GRADE_ESSAY: ['superadmin', 'guru'], SUBMIT_GRADE_COMPLAINT: ['siswa', 'ortu'], RESOLVE_GRADE_COMPLAINT: ['guru'],
    UPDATE_EXAM_GRADE: ['superadmin', 'guru'],
    SEND_ADMIN_MESSAGE: ['guru', 'siswa', 'ortu', 'kepsek'], MARK_ADMIN_MESSAGE_READ: ['superadmin']
  };
  const allowedRoles = policies[payload.action];
  if (!allowedRoles) throw new Error('Aksi tidak dikenali atau tidak diizinkan.');

  const token = String(payload.sessionToken || '');
  const sessionRaw = token ? CacheService.getScriptCache().get('sis-session-' + token) : '';
  if (!sessionRaw) throw new Error('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.');
  let session;
  try { session = JSON.parse(sessionRaw); } catch (e) { session = { username: sessionRaw }; }
  const username = String(session.username || '');
  if (!username) throw new Error('Sesi login tidak valid atau sudah berakhir. Silakan login kembali.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rows = readSheetRows(ss, 'Users');
  let userRow = session.idUser
    ? rows.find(r => String(r[0] || '').trim() === String(session.idUser).trim())
    : rows.find(r => String(r[1] || '').trim().toLowerCase() === username.trim().toLowerCase());
  const role = userRow ? String(userRow[3] || '').trim().toLowerCase().replace(/[\s_-]+/g, '') : '';
  if (!userRow || !allowedRoles.includes(role)) throw new Error('Aksi ini tidak diizinkan untuk akun Anda.');

  // CacheService membatasi masa token maksimal enam jam. Perpanjang kembali
  // token setiap ada aktivitas valid agar guru yang bekerja lama di satu tab
  // tidak kehilangan sesi tepat ketika menyimpan pekerjaan besar.
  CacheService.getScriptCache().put('sis-session-' + token, sessionRaw, 21600);

  // Jangan percaya role atau nama pengguna yang dikirim dari browser.
  payload.actorUsername = String(session.impersonatorUsername || userRow[1]);
  payload.actorName = String(session.impersonatorName || userRow[4] || '');
  payload.impersonatedUsername = session.impersonatorUsername ? String(userRow[1] || '') : '';
  payload.role = role;
  payload.authenticatedUsername = String(userRow[1] || '');
  payload.authenticatedName = String(userRow[4] || '');
  payload.authenticatedClass = String(userRow[5] || '');
  payload.authenticatedNis = String(userRow[6] || userRow[1] || '');
  if (session.impersonatorUsername && ['PRESENSI', 'START_EXAM', 'SUBMIT_EXAM', 'UPDATE_TUGAS_STATUS', 'CHANGE_OWN_PIN'].includes(payload.action)) throw new Error('Aksi ini tidak tersedia dalam mode impersonasi.');
  if (payload.action === 'CHANGE_OWN_PIN') payload.actorRow = userRow;
  if (role === 'guru' && ['SOAL_UAS', 'SOAL_UAS_BULK', 'UPDATE_SOAL'].includes(payload.action)) {
    const questions = payload.action === 'SOAL_UAS_BULK' ? (payload.data.soalList || []) : [payload.data];
    if (questions.some(q => !guruMengampuMapel_(ss, username, q.mapel))) throw new Error('Anda hanya dapat membuat atau mengubah soal pada mata pelajaran yang diampu.');
    if (payload.action === 'UPDATE_SOAL') {
      const sh = ss.getSheetByName('Bank_Soal_UAS');
      const row = sh ? findRowByValue(sh, 2, payload.data.id) : -1;
      const pembuat = sh && row > 0 ? String(sh.getRange(row, 18).getValue() || '').trim().toLowerCase() : '';
      if (row < 0 || (pembuat && pembuat !== username.toLowerCase() && pembuat !== 'admin')) throw new Error('Anda hanya dapat mengubah soal yang dibuat oleh akun Anda.');
    }
  }
  if (role === 'guru' && payload.action === 'SESI_UAS') {
    if (!guruMengampuMapel_(ss, username, payload.data.mapel)) throw new Error('Guru hanya dapat membuka atau menutup ujian untuk mata pelajaran yang diampu.');
  }
  if (role === 'guru' && ['TUGAS', 'UPDATE_TUGAS'].includes(payload.action)) {
    if (!guruMengampuMapel_(ss, username, payload.data.mapel)) throw new Error('Guru hanya dapat membuat tugas untuk mata pelajaran yang diampu.');
  }
  if (role === 'guru' && ['DELETE_TUGAS', 'UPDATE_TUGAS'].includes(payload.action)) {
    const sh = ss.getSheetByName('Tugas_Kelas');
    const taskId = payload.action === 'UPDATE_TUGAS' ? payload.data.oldId : payload.data.id;
    const row = sh ? findRowByValue(sh, 2, taskId) : -1;
    const creator = row > 0 ? String(sh.getRange(row, 8).getValue() || '').trim().toLowerCase() : '';
    if (row < 0 || (creator && creator !== username.toLowerCase() && creator !== String(userRow[4] || '').trim().toLowerCase())) throw new Error('Guru hanya dapat mengubah tugas yang dibuat sendiri.');
  }
  if (role === 'guru' && ['MASTER_YAUMIAH', 'UPDATE_YAUMIAH', 'DELETE_YAUMIAH', 'TARGET_TAHFIDZ'].includes(payload.action)) {
    const guruRow = readSheetRows(ss, 'Master_Guru').find(r => String(r[1] || '').trim().toLowerCase() === username.toLowerCase());
    const waliKelas = String((guruRow && guruRow[4]) || userRow[5] || '').trim();
    let targetClass = String(payload.data.kelas || '').trim();
    if (payload.action === 'DELETE_YAUMIAH' || payload.action === 'UPDATE_YAUMIAH') {
      const sh = ss.getSheetByName('Master_Yaumiah');
      const row = sh ? findRowByValue(sh, 1, payload.action === 'UPDATE_YAUMIAH' ? payload.data.oldId : payload.data.id) : -1;
      const existingClass = row > 0 ? String(sh.getRange(row, 5).getValue() || 'SEMUA') : '';
      if (existingClass !== waliKelas) throw new Error('Guru hanya dapat mengubah aktivitas kelas binaannya.');
    }
    if (!waliKelas || waliKelas === '-' || (payload.action !== 'DELETE_YAUMIAH' && targetClass !== waliKelas)) throw new Error('Guru hanya dapat mengatur Yaumiah/Tahfidz untuk kelas binaannya.');
  }
  if (role === 'guru' && payload.action === 'BULK_UPDATE_GAMBAR_SOAL') {
    const sh = ss.getSheetByName('Bank_Soal_UAS');
    const ids = new Set(((payload.data || {}).updates || []).map(item => String(item.id || '')));
    const targets = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(20, sh.getLastColumn())).getValues().filter(r => ids.has(String(r[1] || ''))) : [];
    if (targets.length !== ids.size || targets.some(r => String(r[17] || '').toLowerCase() !== username.toLowerCase() || !guruMengampuMapel_(ss, username, r[2]))) throw new Error('Guru hanya dapat memperbarui gambar soal milik sendiri.');
  }
  if (role === 'guru' && ['DELETE_SOAL', 'DELETE_SOAL_PACKAGE', 'BULK_DELETE_SOAL'].includes(payload.action)) {
    const sh = ss.getSheetByName('Bank_Soal_UAS');
    const rows = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(20, sh.getLastColumn())).getValues() : [];
    const ids = payload.action === 'DELETE_SOAL' ? [String(payload.data.id || '')] : payload.action === 'BULK_DELETE_SOAL' ? (payload.data.ids || []).map(String) : [];
    const idsSet = new Set(ids);
    const targets = rows.filter(r => {
      if (payload.action === 'DELETE_SOAL_PACKAGE') {
        return payload.data.paketId ? String(r[19] || '') === String(payload.data.paketId) : String(r[2] || '') === String(payload.data.mapel || '') && String(r[3] || '') === String(payload.data.kelas || '');
      }
      return idsSet.has(String(r[1] || ''));
    });
    if (targets.some(r => String(r[17] || '').toLowerCase() !== username.toLowerCase() || !guruMengampuMapel_(ss, username, r[2]))) throw new Error('Guru hanya dapat menghapus soal milik sendiri pada mata pelajaran yang diampu.');
  }
}

function shuffleArray_(items) {
  const result = items.slice();
  const seed = Utilities.getUuid();
  let hash = 0;
  for (let c = 0; c < seed.length; c++) hash = ((hash << 5) - hash + seed.charCodeAt(c)) | 0;
  let state = Math.abs(hash) || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = Math.abs((1664525 * state + 1013904223) & 0xffffffff) || 1;
    const j = Math.floor((state / 0x100000000) * (i + 1));
    const tmp = result[i]; result[i] = result[j]; result[j] = tmp;
  }
  return result;
}

function startExam_(payload) {
  const d = payload.data || {};
  const mapel = String(d.mapel || '').trim();
  if (!mapel) throw new Error('Mata pelajaran wajib dipilih.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSchemaReady_(ss);
  // Validasi sesi & bank soal dari cache SEBELUM mengambil ScriptLock agar tidak menahan antrean siswa lain
  const session = getExamSessionFor_(ss, mapel, payload.authenticatedClass, true);
  const suppliedToken = String(d.token || '').trim().toUpperCase();
  if (!session.isOpen) throw new Error('Ujian belum dibuka oleh pengawas.');
  if (session.token && suppliedToken !== session.token.toUpperCase()) throw new Error('Token ujian tidak sesuai.');
  const questionRows = getCachedBankSoal_(ss).filter(r =>
    String(r[13] || '') === 'Approved' && String(r[2] || '') === mapel &&
    (!r[3] || String(r[3]) === 'SEMUA' || String(r[3]) === payload.authenticatedClass)
  );
  if (!questionRows.length) throw new Error('Belum ada soal Approved untuk mata pelajaran dan kelas ini.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Sistem sedang sibuk. Coba kembali beberapa detik lagi.');
  let attemptId;
  let attemptToken;
  let orderedRows = questionRows.slice();
  try {
    const existingGrade = readSheetRows(ss, 'Nilai_UAS').find(r => String(r[2] || '') === payload.authenticatedNis && String(r[5] || '') === mapel);
    if (existingGrade) throw new Error('Ujian mata pelajaran ini sudah pernah dikumpulkan. Hubungi pengawas untuk ujian ulang.');

    const attempts = ss.getSheetByName('Exam_Attempts') || ensureSecuritySheets_(ss).attempts;
    const attemptRows = readSheetRows(ss, 'Exam_Attempts');
    const existingIndex = attemptRows.findIndex(r => String(r[4] || '') === payload.authenticatedNis && String(r[7] || '') === mapel && String(r[8] || '') === 'STARTED');
    attemptToken = Utilities.getUuid() + Utilities.getUuid();
    let manifest;
    if (existingIndex >= 0) {
      const rowNumber = existingIndex + 2;
      attemptId = String(attemptRows[existingIndex][0] || 'ATT-' + Utilities.getUuid());
      attempts.getRange(rowNumber, 14).setValue(attemptToken);
      try { manifest = JSON.parse(String(attemptRows[existingIndex][15] || '')); } catch (e) { manifest = null; }
    } else {
      attemptId = 'ATT-' + Utilities.getUuid();
    }
    if (!Array.isArray(manifest) || !manifest.length) {
      if (session.randomizeQuestions) orderedRows = shuffleArray_(orderedRows);
      manifest = orderedRows.map(r => ({ id: String(r[1] || ''), type: String(r[14] || 'PG').toUpperCase(), key: String(r[12] || '') }));
      const manifestJson = JSON.stringify(manifest);
      if (manifestJson.length > 45000) throw new Error('Manifest ujian terlalu besar. Kurangi jumlah soal per sesi.');
      if (existingIndex >= 0) attempts.getRange(existingIndex + 2, 16).setValue(manifestJson);
      else attempts.appendRow([attemptId, new Date(), '', payload.authenticatedUsername, payload.authenticatedNis, payload.authenticatedName, payload.authenticatedClass, mapel, 'STARTED', '', '', '', '', attemptToken, false, manifestJson]);
    } else {
      const rowById = new Map(questionRows.map(r => [String(r[1] || ''), r]));
      orderedRows = manifest.map(item => rowById.get(String(item.id || ''))).filter(Boolean);
      if (orderedRows.length !== manifest.length) throw new Error('Naskah ujian berubah setelah percobaan dimulai. Hubungi pengawas.');
    }
  } finally {
    lock.releaseLock();
  }
  const questions = orderedRows.map(r => questionFromRow_(r, false));
  return { status: 'ok', attemptId: attemptId, attemptToken: attemptToken, mapel: mapel, questions: questions, session: { isOpen: true, token: '', requiresToken: false, mapel: mapel, kelas: payload.authenticatedClass, randomizeQuestions: session.randomizeQuestions, randomizeOptions: session.randomizeOptions } };
}

function normalizeAnswer_(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function submitExam_(payload) {
  const d = payload.data || {};
  const token = String(d.attemptToken || '').trim();
  const answers = d.answers && typeof d.answers === 'object' && !Array.isArray(d.answers) ? d.answers : {};
  const encodedAnswers = JSON.stringify(answers);
  if (!token || token.length > 200) throw new Error('Sesi ujian tidak valid.');
  if (encodedAnswers.length > 100000) throw new Error('Jawaban ujian terlalu besar.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSchemaReady_(ss);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Sistem sedang memproses jawaban lain. Coba kembali.');
  try {
    const attempts = ss.getSheetByName('Exam_Attempts') || ensureSecuritySheets_(ss).attempts;
    const rows = readSheetRows(ss, 'Exam_Attempts');
    const index = rows.findIndex(r => String(r[13] || '') === token);
    if (index < 0) throw new Error('Sesi ujian tidak ditemukan atau sudah berakhir.');
    const attempt = rows[index];
    if (String(attempt[3] || '').toLowerCase() !== payload.authenticatedUsername.toLowerCase() || String(attempt[4] || '') !== payload.authenticatedNis) throw new Error('Sesi ujian bukan milik akun ini.');
    if (String(attempt[8] || '') !== 'STARTED') throw new Error('Ujian ini sudah dikumpulkan.');
    const mapel = String(attempt[7] || '');
    let manifest;
    try { manifest = JSON.parse(String(attempt[15] || '')); } catch (e) { manifest = null; }
    if (!Array.isArray(manifest) || !manifest.length) throw new Error('Manifest naskah ujian tidak ditemukan. Hubungi pengawas.');
    let correct = 0;
    let objectiveTotal = 0;
    let hasEssay = false;
    manifest.forEach(item => {
      const id = String(item.id || '');
      const type = String(item.type || 'PG').toUpperCase();
      const answer = answers[id];
      if (type === 'ESAI') {
        hasEssay = true;
        return;
      }
      objectiveTotal++;
      if (type === 'PG' || type === 'PGK') {
        const expected = String(item.key || '').split(',').map(v => v.trim().toUpperCase()).filter(Boolean).sort().join(',');
        const actual = String(answer || '').split(',').map(v => v.trim().toUpperCase()).filter(Boolean).sort().join(',');
        if (actual && actual === expected) correct++;
      } else if (type === 'ISIAN' && normalizeAnswer_(answer) && normalizeAnswer_(answer) === normalizeAnswer_(item.key)) {
        correct++;
      }
    });
    const score = objectiveTotal ? Math.round(correct / objectiveTotal * 100) : 0;
    const assessmentStatus = hasEssay ? 'MENUNGGU_PENILAIAN_ESAI' : 'FINAL';
    const submittedAt = new Date();
    const rowNumber = index + 2;
    attempts.getRange(rowNumber, 3).setValue(submittedAt);
    attempts.getRange(rowNumber, 9, 1, 12).setValues([[
      'SUBMITTED', correct, objectiveTotal, score, encodedAnswers, '', hasEssay,
      attempt[15] || '', attempt[16] || '', score, '', hasEssay ? '' : score
    ]]);
    const nilai = ss.getSheetByName('Nilai_UAS');
    nilai.appendRow([submittedAt, Utilities.formatDate(submittedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd'), payload.authenticatedNis, payload.authenticatedName, payload.authenticatedClass, mapel, correct, objectiveTotal, score, String(attempt[0] || ''), assessmentStatus, score, '', '', '']);
    return { status: 'ok', attemptId: String(attempt[0] || ''), mapel: mapel, benar: correct, total: objectiveTotal, skor: score, assessmentStatus: assessmentStatus, pendingEssay: hasEssay };
  } finally {
    lock.releaseLock();
  }
}

function guruDapatMenilaiMapel_(ss, username, mapel) {
  if (guruMengampuMapel_(ss, username, mapel)) return true;
  return readSheetRows(ss, 'Bank_Soal_UAS').some(r =>
    String(r[2] || '') === String(mapel || '') &&
    normalizeAccountKey_(r[17]) === normalizeAccountKey_(username)
  );
}

function gradeEssaySubmission_(payload) {
  const d = payload.data || {};
  const attemptId = String(d.attemptId || '').trim();
  if (!attemptId) throw new Error('Attempt ID wajib diisi.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Penilaian lain sedang diproses. Coba kembali.');
  try {
    const attempts = ensureSecuritySheets_(ss).attempts;
    const rows = readSheetRows(ss, 'Exam_Attempts');
    const index = rows.findIndex(r => String(r[0] || '') === attemptId);
    if (index < 0) throw new Error('Percobaan ujian tidak ditemukan.');
    const attempt = rows[index];
    if (String(attempt[8] || '') !== 'SUBMITTED') throw new Error('Jawaban siswa belum dikumpulkan.');
    const mapel = String(attempt[7] || '');
    if (payload.role === 'guru' && !guruDapatMenilaiMapel_(ss, payload.authenticatedUsername, mapel)) {
      throw new Error('Guru hanya dapat menilai esai pada mata pelajaran yang diampu atau dimilikinya.');
    }
    let manifest;
    try { manifest = JSON.parse(String(attempt[15] || '')); } catch (e) { manifest = null; }
    if (!Array.isArray(manifest)) throw new Error('Manifest soal tidak tersedia.');
    const essayItems = manifest.filter(item => String(item.type || '').toUpperCase() === 'ESAI');
    if (!essayItems.length) throw new Error('Percobaan ini tidak memiliki soal esai.');
    const submittedScores = d.scores && typeof d.scores === 'object' && !Array.isArray(d.scores) ? d.scores : {};
    const scores = {};
    let essayTotal = 0;
    essayItems.forEach(item => {
      const id = String(item.id || '');
      const entry = submittedScores[id] || {};
      const score = Number(entry.score);
      if (!isFinite(score) || score < 0 || score > 100) throw new Error('Skor esai ' + id + ' harus antara 0–100.');
      scores[id] = { score: Math.round(score * 100) / 100, feedback: String(entry.feedback || '').slice(0, 1000) };
      essayTotal += score;
    });
    const essayScore = Math.round((essayTotal / essayItems.length) * 100) / 100;
    const objectiveTotal = Number(attempt[10] || 0);
    const objectiveScore = Number(attempt[17] !== '' && attempt[17] != null ? attempt[17] : attempt[11] || 0);
    let objectiveWeight = objectiveTotal > 0 ? Number(d.objectiveWeight) : 0;
    let essayWeight = objectiveTotal > 0 ? Number(d.essayWeight) : 100;
    if (!isFinite(objectiveWeight) || !isFinite(essayWeight) || objectiveWeight < 0 || essayWeight < 0 || objectiveWeight + essayWeight !== 100) {
      throw new Error('Total bobot objektif dan esai harus tepat 100%.');
    }
    const finalScore = Math.round((objectiveScore * objectiveWeight / 100 + essayScore * essayWeight / 100) * 100) / 100;
    const gradedAt = new Date();
    const grading = { scores: scores, objectiveWeight: objectiveWeight, essayWeight: essayWeight };
    const rowNumber = index + 2;
    attempts.getRange(rowNumber, 12).setValue(finalScore);
    attempts.getRange(rowNumber, 17, 1, 6).setValues([[JSON.stringify(grading), objectiveScore, essayScore, finalScore, payload.authenticatedUsername, gradedAt]]);
    const nilai = ss.getSheetByName('Nilai_UAS');
    if (!nilai) throw new Error('Sheet Nilai_UAS tidak ditemukan.');
    if (nilai.getLastColumn() < 15) nilai.getRange(1, 10, 1, 6).setValues([['Attempt_ID', 'Status_Penilaian', 'Skor_Objektif', 'Skor_Esai', 'Dinilai_Oleh', 'Dinilai_At']]);
    const gradeRow = findRowByValue(nilai, 10, attemptId);
    if (gradeRow < 2) throw new Error('Baris nilai siswa tidak ditemukan.');
    nilai.getRange(gradeRow, 9).setValue(finalScore);
    nilai.getRange(gradeRow, 11, 1, 5).setValues([['FINAL', objectiveScore, essayScore, payload.authenticatedUsername, gradedAt]]);
    return { status: 'ok', attemptId: attemptId, mapel: mapel, objectiveScore: objectiveScore, essayScore: essayScore, finalScore: finalScore, assessmentStatus: 'FINAL' };
  } finally {
    lock.releaseLock();
  }
}

function submitGradeComplaint_(payload) {
  const d = payload.data || {};
  const attemptId = String(d.attemptId || '').trim();
  const argument = String(d.argument || '').trim();
  if (!attemptId) throw new Error('Attempt ID nilai wajib diisi.');
  if (argument.length < 20 || argument.length > 2000) throw new Error('Argumentasi komplain harus berisi 20–2.000 karakter.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Sistem sedang memproses komplain lain. Coba kembali.');
  try {
    const nilaiRows = readSheetRows(ss, 'Nilai_UAS');
    const grade = nilaiRows.find(r => String(r[9] || '') === attemptId);
    if (!grade) throw new Error('Nilai ujian tidak ditemukan.');
    if (String(grade[2] || '') !== String(payload.authenticatedNis || '')) throw new Error('Nilai ini bukan milik siswa yang terhubung dengan akun Anda.');
    const gradeStatus = String(grade[10] || 'FINAL').toUpperCase();
    if (!['FINAL', 'KOMPLAIN'].includes(gradeStatus)) throw new Error('Komplain dapat diajukan setelah nilai ujian difinalkan.');
    const mapel = String(grade[5] || '');
    const teacherTargets = [];
    readSheetRows(ss, 'Master_Guru').forEach(r => {
      const teacherUsername = String(r[1] || '').trim();
      if (teacherUsername && guruMengampuMapel_(ss, teacherUsername, mapel)) teacherTargets.push(teacherUsername);
    });
    readSheetRows(ss, 'Bank_Soal_UAS').forEach(r => {
      if (String(r[2] || '') === mapel && String(r[17] || '').trim()) teacherTargets.push(String(r[17]).trim());
    });
    const targets = Array.from(new Set(teacherTargets.map(normalizeAccountKey_).filter(Boolean)));
    const complaints = ensureSecuritySheets_(ss).complaints;
    const complaintRows = readSheetRows(ss, 'Grade_Complaints');
    const existingIndex = complaintRows.findIndex(r => String(r[2] || '') === attemptId && String(r[3] || '') === String(payload.authenticatedNis || ''));
    const now = new Date();
    const complaintId = existingIndex >= 0 ? String(complaintRows[existingIndex][0] || '') : 'KOM-' + Utilities.getUuid();
    const oldScore = Number(grade[8] || 0);
    const values = [complaintId, now, attemptId, String(grade[2] || ''), String(grade[3] || ''), String(grade[4] || ''), mapel, Number(grade[8] || 0), payload.authenticatedUsername, payload.authenticatedName, payload.role, argument, JSON.stringify(targets), 'KOMPLAIN', now, payload.authenticatedUsername, oldScore, '', '', '', ''];
    if (existingIndex >= 0) complaints.getRange(existingIndex + 2, 1, 1, values.length).setValues([values]);
    else complaints.appendRow(values);
    const nilai = ss.getSheetByName('Nilai_UAS');
    const gradeRow = findRowByValue(nilai, 10, attemptId);
    if (gradeRow < 2) throw new Error('Baris nilai siswa tidak ditemukan.');
    nilai.getRange(gradeRow, 11).setValue('KOMPLAIN');
    return { status: 'ok', complaintId: complaintId, attemptId: attemptId, recipients: targets.length, complaintStatus: 'KOMPLAIN' };
  } finally {
    lock.releaseLock();
  }
}

function resolveGradeComplaint_(payload) {
  const d = payload.data || {};
  const complaintId = String(d.complaintId || '').trim();
  const newScore = Number(d.newScore);
  const teacherResponse = String(d.teacherResponse || '').trim();
  if (!complaintId) throw new Error('ID komplain wajib diisi.');
  if (!isFinite(newScore) || newScore < 0 || newScore > 100) throw new Error('Nilai revisi harus antara 0–100.');
  if (teacherResponse.length < 10 || teacherResponse.length > 2000) throw new Error('Tanggapan guru harus berisi 10–2.000 karakter.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Sistem sedang memproses revisi nilai lain. Coba kembali.');
  try {
    const complaints = ensureSecuritySheets_(ss).complaints;
    const complaintRows = readSheetRows(ss, 'Grade_Complaints');
    const index = complaintRows.findIndex(r => String(r[0] || '') === complaintId);
    if (index < 0) throw new Error('Komplain nilai tidak ditemukan.');
    const complaint = complaintRows[index];
    if (String(complaint[13] || '').toUpperCase() !== 'KOMPLAIN') throw new Error('Komplain ini sudah diselesaikan atau tidak aktif.');
    const mapel = String(complaint[6] || '');
    let targets = [];
    try { targets = JSON.parse(String(complaint[12] || '[]')); } catch (e) {}
    const normalizedTargets = targets.map(normalizeAccountKey_);
    if (!normalizedTargets.includes(normalizeAccountKey_(payload.authenticatedUsername)) && !guruDapatMenilaiMapel_(ss, payload.authenticatedUsername, mapel)) {
      throw new Error('Hanya guru mata pelajaran terkait yang dapat mengubah nilai komplain ini.');
    }
    const attemptId = String(complaint[2] || '');
    const nilai = ss.getSheetByName('Nilai_UAS');
    const gradeRow = findRowByValue(nilai, 10, attemptId);
    if (gradeRow < 2) throw new Error('Baris nilai siswa tidak ditemukan.');
    const oldScore = Number(nilai.getRange(gradeRow, 9).getValue() || 0);
    const now = new Date();
    nilai.getRange(gradeRow, 9).setValue(Math.round(newScore * 100) / 100);
    nilai.getRange(gradeRow, 11).setValue('FINAL');
    nilai.getRange(gradeRow, 14, 1, 2).setValues([[payload.authenticatedUsername, now]]);
    const attempts = ss.getSheetByName('Exam_Attempts');
    const attemptRow = attempts ? findRowByValue(attempts, 1, attemptId) : -1;
    if (attemptRow >= 2) {
      attempts.getRange(attemptRow, 12).setValue(Math.round(newScore * 100) / 100);
      attempts.getRange(attemptRow, 20, 1, 3).setValues([[Math.round(newScore * 100) / 100, payload.authenticatedUsername, now]]);
    }
    complaints.getRange(index + 2, 14, 1, 8).setValues([['SELESAI', now, payload.authenticatedUsername, oldScore, Math.round(newScore * 100) / 100, teacherResponse, now, payload.authenticatedUsername]]);
    return { status: 'ok', complaintId: complaintId, attemptId: attemptId, oldScore: oldScore, newScore: Math.round(newScore * 100) / 100, assessmentStatus: 'FINAL' };
  } finally {
    lock.releaseLock();
  }
}

function updateExamGrade_(payload) {
  const d = payload.data || {};
  const attemptId = String(d.attemptId || '').trim();
  const newScore = Number(d.newScore);
  const status = String(d.status || 'FINAL').trim().toUpperCase();
  const teacherResponse = String(d.teacherResponse || '').trim().slice(0, 2000);
  if (!attemptId) throw new Error('Attempt ID wajib diisi.');
  if (!isFinite(newScore) || newScore < 0 || newScore > 100) throw new Error('Nilai harus antara 0–100.');
  if (!['FINAL', 'KOMPLAIN'].includes(status)) throw new Error('Status nilai harus FINAL atau KOMPLAIN.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Sistem sedang memproses perubahan nilai lain. Coba kembali.');
  try {
    const nilai = ss.getSheetByName('Nilai_UAS');
    if (!nilai) throw new Error('Sheet Nilai_UAS tidak ditemukan.');
    if (nilai.getLastColumn() < 15) nilai.getRange(1, 10, 1, 6).setValues([['Attempt_ID', 'Status_Penilaian', 'Skor_Objektif', 'Skor_Esai', 'Dinilai_Oleh', 'Dinilai_At']]);
    const gradeRow = findRowByValue(nilai, 10, attemptId);
    if (gradeRow < 2) throw new Error('Baris nilai siswa tidak ditemukan.');
    const mapel = String(nilai.getRange(gradeRow, 6).getValue() || '');
    if (payload.role === 'guru' && !guruDapatMenilaiMapel_(ss, payload.authenticatedUsername, mapel)) {
      throw new Error('Hanya guru mata pelajaran terkait yang dapat mengubah nilai ini.');
    }
    const oldScore = Number(nilai.getRange(gradeRow, 9).getValue() || 0);
    const roundedScore = Math.round(newScore * 100) / 100;
    const now = new Date();
    nilai.getRange(gradeRow, 9).setValue(roundedScore);
    nilai.getRange(gradeRow, 11).setValue(status);
    nilai.getRange(gradeRow, 14, 1, 2).setValues([[payload.authenticatedUsername, now]]);

    const attempts = ss.getSheetByName('Exam_Attempts');
    const attemptRow = attempts ? findRowByValue(attempts, 1, attemptId) : -1;
    if (attemptRow >= 2) {
      attempts.getRange(attemptRow, 12).setValue(roundedScore);
      attempts.getRange(attemptRow, 20, 1, 3).setValues([[roundedScore, payload.authenticatedUsername, now]]);
    }

    if (status === 'FINAL') {
      const complaints = ensureSecuritySheets_(ss).complaints;
      const complaintRows = readSheetRows(ss, 'Grade_Complaints');
      complaintRows.forEach((r, idx) => {
        if (String(r[2] || '') === attemptId && String(r[13] || '').toUpperCase() === 'KOMPLAIN') {
          complaints.getRange(idx + 2, 14, 1, 8).setValues([[
            'SELESAI', now, payload.authenticatedUsername, oldScore, roundedScore,
            teacherResponse || 'Nilai diperbarui dan difinalkan oleh guru.', now, payload.authenticatedUsername
          ]]);
        }
      });
    }

    return { status: 'ok', attemptId: attemptId, mapel: mapel, oldScore: oldScore, newScore: roundedScore, assessmentStatus: status };
  } finally {
    lock.releaseLock();
  }
}

function distanceMeters_(lat1, lng1, lat2, lng2) {
  const toRad = value => Number(value) * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function saveAttendance_(payload) {
  const d = payload.data || {};
  const props = PropertiesService.getScriptProperties();
  const schoolLat = Number(props.getProperty('SCHOOL_LAT') || -6.2);
  const schoolLng = Number(props.getProperty('SCHOOL_LNG') || 106.816666);
  const radius = Number(props.getProperty('SCHOOL_RADIUS_M') || 100);
  const lat = Number(d.lat);
  const lng = Number(d.lng);
  if (!isFinite(lat) || !isFinite(lng)) throw new Error('Koordinat GPS tidak valid.');
  const distance = distanceMeters_(lat, lng, schoolLat, schoolLng);
  if (distance > radius) throw new Error('Presensi ditolak karena berada di luar radius sekolah.');
  const qr = String(d.qrToken || '').trim();
  const inToken = String(props.getProperty('QR_TOKEN_MASUK') || '');
  const outToken = String(props.getProperty('QR_TOKEN_PULANG') || '');
  let nis = payload.authenticatedNis;
  let name = payload.authenticatedName;
  let status;
  if (payload.role === 'guru') {
    const match = qr.match(/^SISWA-(.+)$/i);
    if (!match) throw new Error('Guru harus memindai kartu QR siswa yang valid.');
    const student = readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Users').find(r => normalizeRole_(r[3]) === 'siswa' && String(r[6] || r[1]) === String(match[1]));
    if (!student) throw new Error('QR siswa tidak terdaftar.');
    nis = String(student[6] || student[1]);
    name = String(student[4] || '');
    status = 'Hadir Diverifikasi Guru';
  } else if (qr && qr === outToken) {
    status = 'Hadir & Sudah Pulang';
  } else if (qr && qr === inToken) {
    status = 'Hadir Terverifikasi QR+GPS';
  } else {
    throw new Error('Token QR presensi tidak valid.');
  }
  const now = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm') + ' WIB';
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Presensi');
  const duplicate = readSheetRows(SpreadsheetApp.getActiveSpreadsheet(), 'Presensi').some(r => normalizeSchoolDate_(r[1]) === date && String(r[2] || '') === nis && String(r[4] || '') === status);
  if (duplicate) throw new Error('Presensi dengan status yang sama sudah tercatat hari ini.');
  sh.appendRow([now, date, nis, name, status, time, lat, lng, distance, qr]);
  return { status: 'ok', tanggal: date, nis: nis, nama: name, attendanceStatus: status, jam: time, jarak: distance };
}

function processClientAction(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const d = payload.data || {};
  let result = { status: 'ok' };
  if (payload.action === 'RAILWAY_SYNC_MANIFEST') return getRailwaySyncManifest_(d.secret);
  if (payload.action === 'RAILWAY_SYNC_SHEET') return getRailwaySyncSheet_(d.secret, d.sheet, d.offset, d.limit);
  if (payload.action === 'LOGIN') {
    const loginResult = loginUser(d.username, d.pin);
    if (loginResult && loginResult.status === 'ok' && loginResult.user) {
      try { recordActivity_({ username: loginResult.user.username, name: loginResult.user.nama }, { username: loginResult.user.username, name: loginResult.user.nama }, 'LOGIN', 'Login berhasil.'); } catch (e) {}
    }
    return loginResult;
  }
  authorizeClientAction_(payload);
  if (payload.action === 'GET_INITIAL_DATA') return getInitialData('', payload.sessionToken);
  if (payload.action === 'GET_MASTER_DATA') return getMasterData_(payload.sessionToken);
  if (payload.action === 'ADMIN_LIST_ACCOUNTS') return { status: 'ok', accounts: getSuperadminAccounts(payload.sessionToken) };
  if (payload.action === 'ADMIN_ACCOUNT_ACTIVITY') return { status: 'ok', activity: getSuperadminAccountActivity(payload.sessionToken, d.username) };
  if (payload.action === 'ADMIN_IMPERSONATE') return { status: 'ok', user: startSuperadminImpersonation(payload.sessionToken, d.username) };
  if (payload.action === 'ADMIN_MESSAGES') return { status: 'ok', messages: getSuperadminMessages(payload.sessionToken) };
  if (payload.action === 'PING') return { status: 'ok', serverTime: new Date().toISOString(), version: APP_VERSION };
  if (payload.action === 'LOGOUT') {
    CacheService.getScriptCache().remove('sis-session-' + String(payload.sessionToken || ''));
    return { status: 'ok' };
  }
  if (payload.action === 'START_EXAM') return startExam_(payload);
  if (payload.action === 'SUBMIT_EXAM') return submitExam_(payload);
  if (payload.action === 'GRADE_ESSAY') return gradeEssaySubmission_(payload);
  if (payload.action === 'SUBMIT_GRADE_COMPLAINT') return submitGradeComplaint_(payload);
  if (payload.action === 'RESOLVE_GRADE_COMPLAINT') return resolveGradeComplaint_(payload);
  if (payload.action === 'UPDATE_EXAM_GRADE') return updateExamGrade_(payload);
  try {
    if (payload.action !== 'CHANGE_OWN_PIN') {
      const actor = { username: payload.actorUsername || '', name: payload.actorName || '' };
      const targetUser = String(d.username || d.akunOrtu || d.nis || d.id || payload.impersonatedUsername || '');
      const userRow = targetUser ? readSheetRows(ss, 'Users').find(r => String(r[1] || '').trim().toLowerCase() === targetUser.toLowerCase() || String(r[6] || '').trim().toLowerCase() === targetUser.toLowerCase()) : null;
      const target = userRow ? { username: String(userRow[1] || ''), name: String(userRow[4] || '') } : { username: targetUser, name: String(d.nama || '') };
      recordActivity_(actor, target, payload.action, 'Permintaan aksi diterima.');
    }
  } catch (e) {}
  if (payload.action === 'CLEAN_DEMO_ACCOUNTS') {
    return hapusAkunDemoYangDikenal_();
  } else if (payload.action === 'SEND_ANNOUNCEMENT') {
    return sendAnnouncement_(payload);
  } else if (payload.action === 'SEND_ADMIN_MESSAGE') {
    return sendAdminMessage_(payload);
  } else if (payload.action === 'MARK_ADMIN_MESSAGE_READ') {
    return markAdminMessageRead_(payload);
  } else if (payload.action === 'PRESENSI') {
    return saveAttendance_(payload);
  } else if (payload.action === 'YAUMIAH') {
    const schoolDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const masterItems = new Set(readSheetRows(ss, 'Master_Yaumiah').map(r => String(r[0] || '')));
    const submittedItems = Array.isArray(d.items) ? d.items.filter(item => masterItems.has(String(item.id || ''))) : [];
    const percent = masterItems.size ? Math.round(submittedItems.filter(item => !!item.done).length / masterItems.size * 100) : 0;
    const shLog = ss.getSheetByName('Yaumiah_Log');
    const existingRows = readSheetRows(ss, 'Yaumiah_Log');
    const existingIndex = existingRows.findIndex(r => normalizeSchoolDate_(r[1]) === schoolDate && String(r[2] || '') === payload.authenticatedNis);
    const logValues = [new Date(), schoolDate, payload.authenticatedNis, payload.authenticatedName, payload.authenticatedClass, percent, String(d.tilawah || '') + ' | ' + String(d.murajaah || ''), payload.role === 'ortu'];
    if (existingIndex >= 0) shLog.getRange(existingIndex + 2, 1, 1, logValues.length).setValues([logValues]); else shLog.appendRow(logValues);
    const shDetail = ensureYaumiahDetailSheet_(ss);
    submittedItems.forEach(item => {
      const all = shDetail.getLastRow() > 1 ? shDetail.getRange(2, 1, shDetail.getLastRow() - 1, 3).getValues() : [];
      let row = -1;
      for (let i = 0; i < all.length; i++) if (normalizeSchoolDate_(all[i][0]) === schoolDate && String(all[i][1]) === payload.authenticatedNis && String(all[i][2]) === String(item.id)) { row = i + 2; break; }
      const values = [schoolDate, payload.authenticatedNis, item.id, !!item.done, new Date(), String(item.status || '')];
      if (row > 0) shDetail.getRange(row, 1, 1, values.length).setValues([values]); else shDetail.appendRow(values);
    });
    result.persen = percent;
  } else if (payload.action === 'CHANGE_OWN_PIN') {
    const row = payload.actorRow;
    const sh = ss.getSheetByName('Users');
    const rowNumber = row ? findRowByValue(sh, 2, payload.actorUsername) : -1;
    const currentPin = String(row && row[2] || '');
    const newPin = String(d.newPin || '').trim();
    if (rowNumber < 2 || !verifyPin_(String(d.currentPin || '').trim(), currentPin)) throw new Error('PIN saat ini tidak sesuai.');
    if (!/^\d{6}$/.test(newPin)) throw new Error('PIN baru harus terdiri tepat dari 6 digit angka.');
    sh.getRange(rowNumber, 3).setValue(hashPin_(newPin));
  } else if (payload.action === 'TARGET_TAHFIDZ') {
    const sh = ss.getSheetByName('Target_Tahfidz');
    const row = findRowByValue(sh, 1, d.kelas);
    const values = [d.kelas, d.guru, d.targetTilawah, d.targetMurajaah, d.targetZiyadah, d.catatanGuru, new Date()];
    if (row > 0) sh.getRange(row, 1, 1, values.length).setValues([values]); else sh.appendRow(values);
  } else if (payload.action === 'MASTER_YAUMIAH') {
    ss.getSheetByName('Master_Yaumiah').appendRow([d.id, d.nama, d.kategori, d.poin, d.kelas]);
  } else if (payload.action === 'UPDATE_YAUMIAH') {
    const sh = ss.getSheetByName('Master_Yaumiah');
    const row = findRowByValue(sh, 1, d.oldId);
    if (row < 0) throw new Error('Aktivitas yaumiah tidak ditemukan.');
    const duplicate = findRowByValue(sh, 1, d.id);
    if (duplicate > 0 && duplicate !== row) throw new Error('ID aktivitas sudah digunakan.');
    sh.getRange(row, 1, 1, 5).setValues([[d.id, d.nama, d.kategori, Number(d.poin) || 10, d.kelas || 'SEMUA']]);
  } else if (payload.action === 'DELETE_YAUMIAH') {
    const sh = ss.getSheetByName('Master_Yaumiah');
    const row = findRowByValue(sh, 1, d.id);
    if (row > 0) sh.deleteRow(row);
  } else if (payload.action === 'SOAL_UAS') {
    requireFields(d, ['id', 'mapel', 'kelas', 'pertanyaan']);
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    if (!sh) {
      sh = ss.insertSheet('Bank_Soal_UAS');
      sh.appendRow(['Timestamp', 'ID_Soal', 'Mapel', 'Kelas', 'Level_Kognitif', 'KD', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci', 'Status_Approval', 'Tipe_Soal', 'Catatan_Revisi', 'Gambar_URL']);
    }
    if (sh.getLastColumn() < 20) sh.getRange(1, 17, 1, 4).setValues([['Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']]);
    if (findRowByValue(sh, 2, d.id) > 0) throw new Error('ID soal sudah digunakan.');
    const questionImageUrl = d.gambarData ? uploadImageAsset(d.gambarData, 'soal') : String(d.gambarUrl || '');
    const questionRow = [
      new Date(),
      d.id,
      d.mapel,
      d.kelas,
      d.level,
      d.kd || '',
      d.pertanyaan,
      d.opsiA || '',
      d.opsiB || '',
      d.opsiC || '',
      d.opsiD || '',
      d.opsiE || '',
      d.kunci || '',
      payload.role === 'guru' ? 'Menunggu Approval Kepsek' : (d.statusApproval || 'Menunggu Approval Kepsek'),
      d.tipeSoal || 'PG',
      d.catatanRevisi || '',
      questionImageUrl,
      payload.authenticatedUsername || payload.actorUsername || '',
      payload.authenticatedName || payload.actorName || '',
      d.paketId || ''
    ];
    sh.appendRow(questionRow);
    result.gambarUrl = questionImageUrl;
    result.question = questionFromRow_(questionRow, true);
  } else if (payload.action === 'SOAL_UAS_BULK') {
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    if (!sh) {
      sh = ss.insertSheet('Bank_Soal_UAS');
      sh.appendRow(['Timestamp', 'ID_Soal', 'Mapel', 'Kelas', 'Level_Kognitif', 'KD', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci', 'Status_Approval', 'Tipe_Soal', 'Catatan_Revisi', 'Gambar_URL']);
    }
    if (sh.getLastColumn() < 20) sh.getRange(1, 17, 1, 4).setValues([['Gambar_URL', 'Pembuat_Username', 'Pembuat_Nama', 'ID_Paket']]);
    const list = Array.isArray(d.soalList) ? d.soalList : [];
    if (!list.length || list.length > 200) throw new Error('Impor soal harus berisi 1-200 butir per permintaan.');
    const existingIds = new Set(readSheetRows(ss, 'Bank_Soal_UAS').map(r => String(r[1] || '')));
    const incomingIds = new Set();
    list.forEach(item => {
      requireFields(item, ['id', 'mapel', 'kelas', 'pertanyaan']);
      if (existingIds.has(String(item.id)) || incomingIds.has(String(item.id))) throw new Error('ID soal duplikat: ' + item.id);
      incomingIds.add(String(item.id));
    });
    // Selalu pakai akun yang sedang terautentikasi. actorUsername dapat berisi
    // akun superadmin ketika sedang melihat aplikasi melalui impersonasi.
    const creatorUser = payload.authenticatedUsername || payload.impersonatedUsername || payload.actorUsername || '';
    const creatorName = payload.authenticatedName || payload.actorName || '';
    const bulkRows = list.map(it => {
      let qImg = it.gambarUrl || '';
      if (!qImg && it.gambarData) {
        try { qImg = uploadImageAsset(it.gambarData, 'soal'); } catch (e) { qImg = ''; }
      }
      return [
        new Date(),
        it.id,
        it.mapel,
        it.kelas,
        it.level,
        it.kd || '',
        it.pertanyaan,
        it.opsiA || '',
        it.opsiB || '',
        it.opsiC || '',
        it.opsiD || '',
        it.opsiE || '',
        it.kunci || '',
        payload.role === 'guru' ? 'Menunggu Approval Kepsek' : (it.statusApproval || 'Menunggu Approval Kepsek'),
        it.tipeSoal || 'PG',
        it.catatanRevisi || '',
        qImg,
        creatorUser || '',
        creatorName || '',
        it.paketId || d.paketId || ''
      ];
    });
    if (bulkRows.length) sh.getRange(sh.getLastRow() + 1, 1, bulkRows.length, 20).setValues(bulkRows);
    result.savedCount = bulkRows.length;
    result.questions = bulkRows.map(row => questionFromRow_(row, true));
  } else if (payload.action === 'UPLOAD_SOAL_IMAGES_BATCH') {
    const images = Array.isArray(d.images) ? d.images : [];
    if (images.length > 20) throw new Error('Maksimal 20 gambar per unggahan.');
    const uploaded = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const url = uploadImageAsset(img, 'soal');
        uploaded.push({ name: img.name, url: url, success: true });
      } catch (err) {
        uploaded.push({ name: img.name, url: '', success: false, error: err.message });
      }
    }
    result.uploaded = uploaded;
  } else if (payload.action === 'BULK_UPDATE_GAMBAR_SOAL') {
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    let updatedCount = 0;
    const updates = d.updates || [];
    if (sh && sh.getLastRow() > 1 && updates.length > 0) {
      const lastRow = sh.getLastRow();
      const ids = sh.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]));
      for (let u = 0; u < updates.length; u++) {
        const item = updates[u];
        const idx = ids.indexOf(String(item.id));
        if (idx >= 0) {
          const row = idx + 2;
          if (item.gambarUrl) {
            sh.getRange(row, 17).setValue(item.gambarUrl);
            updatedCount++;
          }
        }
      }
    }
    result.updatedCount = updatedCount;
  } else if (payload.action === 'UPDATE_SOAL') {
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    if (sh && sh.getLastRow() > 1) {
      let values = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(d.id)) {
          let row = i + 2;
          if (d.mapel) sh.getRange(row, 3).setValue(d.mapel);
          if (d.kelas) sh.getRange(row, 4).setValue(d.kelas);
          if (d.level) sh.getRange(row, 5).setValue(d.level);
          if (d.kd) sh.getRange(row, 6).setValue(d.kd);
          if (d.pertanyaan) sh.getRange(row, 7).setValue(d.pertanyaan);
          sh.getRange(row, 8).setValue(d.opsiA || '');
          sh.getRange(row, 9).setValue(d.opsiB || '');
          sh.getRange(row, 10).setValue(d.opsiC || '');
          sh.getRange(row, 11).setValue(d.opsiD || '');
          sh.getRange(row, 12).setValue(d.opsiE || '');
          if (d.kunci) sh.getRange(row, 13).setValue(d.kunci);
          if (d.statusApproval) sh.getRange(row, 14).setValue(d.statusApproval);
          if (d.tipeSoal) sh.getRange(row, 15).setValue(d.tipeSoal);
          if (d.catatanRevisi !== undefined) sh.getRange(row, 16).setValue(d.catatanRevisi || '');
          if (d.gambarData) {
            result.gambarUrl = uploadImageAsset(d.gambarData, 'soal');
            sh.getRange(row, 17).setValue(result.gambarUrl);
          } else if (d.gambarUrl !== undefined) {
            result.gambarUrl = d.gambarUrl || '';
            sh.getRange(row, 17).setValue(result.gambarUrl);
          }
          const existingPembuat = String(sh.getRange(row, 18).getValue() || '').trim();
          if (!existingPembuat && payload.actorUsername) {
            sh.getRange(row, 18).setValue(payload.impersonatedUsername || payload.actorUsername);
            sh.getRange(row, 19).setValue(payload.actorName || '');
          }
          break;
        }
      }
    }
  } else if (payload.action === 'UPDATE_APPROVAL_SOAL') {
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    if (sh && sh.getLastRow() > 1) {
      let values = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(d.id)) {
          let row = i + 2;
          sh.getRange(row, 14).setValue(d.statusApproval);
          sh.getRange(row, 16).setValue(d.catatanRevisi || '');
          break;
        }
      }
    }
  } else if (payload.action === 'DELETE_SOAL') {
    let sh = ss.getSheetByName('Bank_Soal_UAS');
    if (sh && sh.getLastRow() > 1) {
      let values = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(d.id)) {
          const creator = String(sh.getRange(i + 2, 18).getValue() || '');
          const canDeleteAny = ['kepsek', 'superadmin'].includes(String(payload.role || '').toLowerCase());
          if (!canDeleteAny && creator !== String(payload.actorUsername || '')) throw new Error('Anda hanya dapat menghapus soal yang Anda buat.');
          sh.deleteRow(i + 2);
          break;
        }
      }
    }
  } else if (payload.action === 'BULK_APPROVE_SOAL' || payload.action === 'BULK_DELETE_SOAL') {
    const sh = ss.getSheetByName('Bank_Soal_UAS');
    const ids = new Set((d.ids || []).map(id => String(id)));
    if (!ids.size) throw new Error('Pilih setidaknya satu soal.');
    let changedCount = 0;
    if (sh && sh.getLastRow() > 1) {
      const idRows = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
      for (let i = idRows.length - 1; i >= 0; i--) {
        if (!ids.has(String(idRows[i][0]))) continue;
        const rowNumber = i + 2;
        if (payload.action === 'BULK_APPROVE_SOAL') {
          sh.getRange(rowNumber, 14).setValue('Approved');
          sh.getRange(rowNumber, 16).clearContent();
        } else {
          const creator = String(sh.getRange(rowNumber, 18).getValue() || '');
          if (payload.role === 'guru' && creator.toLowerCase() !== String(payload.actorUsername || '').toLowerCase()) continue;
          sh.deleteRow(rowNumber);
        }
        changedCount++;
      }
    }
    result.changedCount = changedCount;
  } else if (payload.action === 'DELETE_SOAL_PACKAGE') {
    const sh = ss.getSheetByName('Bank_Soal_UAS');
    if (!sh || sh.getLastRow() <= 1) return { status: 'ok', deletedCount: 0 };
    const canDeleteAny = ['kepsek', 'superadmin'].includes(String(payload.role || '').toLowerCase());
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(20, sh.getLastColumn())).getValues();
    const keep = rows.filter(r => {
      const samePackage = d.paketId ? String(r[19] || '') === String(d.paketId) : (String(r[2] || '') === String(d.mapel || '') && String(r[3] || '') === String(d.kelas || ''));
      const own = !canDeleteAny && String(r[17] || '') === String(payload.actorUsername || '');
      return !(samePackage && (canDeleteAny || own));
    });
    const deletedCount = rows.length - keep.length;
    if (deletedCount) {
      sh.getRange(2, 1, rows.length, Math.max(20, sh.getLastColumn())).clearContent();
      if (keep.length) sh.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
    }
    result.deletedCount = deletedCount;
  } else if (payload.action === 'DELETE_MAPEL') {
    let sh = ss.getSheetByName('Master_Mapel');
    if (sh && sh.getLastRow() > 1) {
      let values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).toLowerCase() === String(d.kode).toLowerCase()) {
          sh.deleteRow(i + 2);
          break;
        }
      }
    }
  } else if (payload.action === 'DELETE_KELAS') {
    let sh = ss.getSheetByName('Master_Kelas');
    if (sh && sh.getLastRow() > 1) {
      let values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).toLowerCase() === String(d.kode).toLowerCase()) {
          sh.deleteRow(i + 2);
          break;
        }
      }
    }
  } else if (payload.action === 'DELETE_GURU') {
    let shG = ss.getSheetByName('Master_Guru');
    let username = '';
    if (shG && shG.getLastRow() > 1) {
      let values = shG.getRange(2, 1, shG.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]) === String(d.nip)) {
          username = String(values[i][1] || '');
          shG.deleteRow(i + 2);
          break;
        }
      }
    }
    let shU = ss.getSheetByName('Users');
    if (shU && shU.getLastRow() > 1) {
      let uVals = shU.getRange(2, 1, shU.getLastRow() - 1, 1).getValues();
      for (let j = 0; j < uVals.length; j++) {
        const userName = String(shU.getRange(j + 2, 2).getValue() || '');
        if (String(uVals[j][0]) === 'USR-' + String(d.nip) || (username && userName.toLowerCase() === username.toLowerCase())) {
          shU.deleteRow(j + 2);
          break;
        }
      }
    }
  } else if (payload.action === 'REGISTER_MAPEL') {
    requireFields(d, ['kode', 'nama']);
    const sh = ss.getSheetByName('Master_Mapel');
    if (findRowByValue(sh, 1, d.kode) > 0) throw new Error('Kode mata pelajaran sudah digunakan.');
    sh.appendRow([d.kode, d.nama, d.kelompok || 'Umum']);
  } else if (payload.action === 'UPDATE_MAPEL') {
    requireFields(d, ['oldKode', 'kode', 'nama']);
    const sh = ss.getSheetByName('Master_Mapel');
    const row = findRowByValue(sh, 1, d.oldKode);
    if (row < 0) throw new Error('Mata pelajaran tidak ditemukan.');
    const duplicate = findRowByValue(sh, 1, d.kode);
    if (duplicate > 0 && duplicate !== row) throw new Error('Kode mata pelajaran sudah digunakan.');
    const oldName = String(sh.getRange(row, 2).getValue() || '');
    sh.getRange(row, 1, 1, 3).setValues([[d.kode, d.nama, d.kelompok || 'Umum']]);
    replaceColumnValue(ss.getSheetByName('Master_Guru'), 4, oldName, d.nama);
    replaceColumnValue(ss.getSheetByName('Bank_Soal_UAS'), 3, oldName, d.nama);
    replaceColumnValue(ss.getSheetByName('Tugas_Kelas'), 3, oldName, d.nama);
  } else if (payload.action === 'REGISTER_KELAS') {
    requireFields(d, ['kode', 'nama']);
    const sh = ss.getSheetByName('Master_Kelas');
    if (findRowByValue(sh, 1, d.kode) > 0) throw new Error('Kode kelas sudah digunakan.');
    sh.appendRow([d.kode, d.nama, d.wali || '-', Number(d.kapasitas) || 30]);
  } else if (payload.action === 'UPDATE_KELAS') {
    requireFields(d, ['oldKode', 'kode', 'nama']);
    const sh = ss.getSheetByName('Master_Kelas');
    const row = findRowByValue(sh, 1, d.oldKode);
    if (row < 0) throw new Error('Kelas tidak ditemukan.');
    const duplicate = findRowByValue(sh, 1, d.kode);
    if (duplicate > 0 && duplicate !== row) throw new Error('Kode kelas sudah digunakan.');
    sh.getRange(row, 1, 1, 4).setValues([[d.kode, d.nama, d.wali || '-', Number(d.kapasitas) || 30]]);
    replaceColumnValue(ss.getSheetByName('Users'), 6, d.oldKode, d.kode);
    replaceColumnValue(ss.getSheetByName('Master_Guru'), 5, d.oldKode, d.kode);
    replaceColumnValue(ss.getSheetByName('Target_Tahfidz'), 1, d.oldKode, d.kode);
    replaceColumnValue(ss.getSheetByName('Bank_Soal_UAS'), 4, d.oldKode, d.kode);
    replaceColumnValue(ss.getSheetByName('Tugas_Kelas'), 4, d.oldKode, d.kode);
    replaceColumnValue(ss.getSheetByName('Master_Yaumiah'), 5, d.oldKode, d.kode);
  } else if (payload.action === 'REGISTER_GURU') {
    requireFields(d, ['nip', 'username', 'nama']);
    if (!/^[0-9]{6,12}$/.test(String(d.pin || ''))) throw new Error('PIN guru wajib terdiri dari 6-12 digit.');
    validateGuruMapel_(ss, d.mapel);
    const shGuru = ss.getSheetByName('Master_Guru');
    const shUsers = ss.getSheetByName('Users');
    if (findRowByValue(shGuru, 1, d.nip) > 0 || findRowByValue(shUsers, 2, d.username) > 0) throw new Error('NIP atau username guru sudah digunakan.');
    shGuru.appendRow([d.nip, d.username, d.nama, d.mapel || '', d.waliKelas || '-']);
    shUsers.appendRow(['USR-' + d.nip, d.username, hashPin_(d.pin), 'guru', d.nama, d.waliKelas || '-', '']);
  } else if (payload.action === 'UPDATE_GURU') {
    requireFields(d, ['oldNip', 'nip', 'username', 'nama']);
    validateGuruMapel_(ss, d.mapel);
    const shGuru = ss.getSheetByName('Master_Guru');
    const shUsers = ss.getSheetByName('Users');
    const row = findRowByValue(shGuru, 1, d.oldNip);
    if (row < 0) throw new Error('Guru tidak ditemukan.');
    const duplicateNip = findRowByValue(shGuru, 1, d.nip);
    if (duplicateNip > 0 && duplicateNip !== row) throw new Error('NIP sudah digunakan guru lain.');
    const oldUsername = String(shGuru.getRange(row, 2).getValue() || '');
    const oldName = String(shGuru.getRange(row, 3).getValue() || '');
    const duplicateUsernameRow = findRowByValue(shUsers, 2, d.username);
    const accountRow = findRowByValue(shUsers, 1, 'USR-' + d.oldNip) > 0 ? findRowByValue(shUsers, 1, 'USR-' + d.oldNip) : findRowByValue(shUsers, 2, oldUsername);
    if (duplicateUsernameRow > 0 && duplicateUsernameRow !== accountRow) throw new Error('Username sudah digunakan akun lain.');
    shGuru.getRange(row, 1, 1, 5).setValues([[d.nip, d.username, d.nama, d.mapel || '-', d.waliKelas || '-']]);
    if (d.pin && !/^[0-9]{6,12}$/.test(String(d.pin))) throw new Error('PIN guru wajib terdiri dari 6-12 digit.');
    if (accountRow > 0) shUsers.getRange(accountRow, 1, 1, 6).setValues([['USR-' + d.nip, d.username, d.pin ? hashPin_(d.pin) : shUsers.getRange(accountRow, 3).getValue(), 'guru', d.nama, d.waliKelas || '-']]);
    replaceColumnValue(ss.getSheetByName('Master_Kelas'), 3, oldName, d.nama);
    replaceColumnValue(ss.getSheetByName('Target_Tahfidz'), 2, oldName, d.nama);
  } else if (payload.action === 'REGISTER_SISWA') {
    requireFields(d, ['nis', 'nama', 'kelas']);
    if (!/^[0-9]{6,12}$/.test(String(d.pinSiswa || '')) || !/^[0-9]{6,12}$/.test(String(d.pinOrtu || ''))) throw new Error('PIN siswa dan orang tua wajib terdiri dari 6-12 digit.');
    const shUsers = ss.getSheetByName('Users');
    const akunSiswa = String(d.akunSiswa || d.nis).trim();
    if (findRowByValue(shUsers, 7, d.nis) > 0 || findRowByValue(shUsers, 2, akunSiswa) > 0) throw new Error('NIS atau username siswa sudah terdaftar.');
    const akunOrtu = String(d.akunOrtu || ('ortu.' + d.nis)).trim();
    if (findRowByValue(shUsers, 2, akunOrtu) > 0 || akunOrtu.toLowerCase() === akunSiswa.toLowerCase()) throw new Error('Username orang tua sudah digunakan.');
    shUsers.appendRow(['USR-' + d.nis, akunSiswa, hashPin_(d.pinSiswa), 'siswa', d.nama, d.kelas, d.nis]);
    shUsers.appendRow(['ORTU-' + d.nis, akunOrtu, hashPin_(d.pinOrtu), 'ortu', d.namaOrtu || ('Wali ' + d.nama), d.kelas, d.nis]);
  } else if (payload.action === 'UPDATE_SISWA') {
    requireFields(d, ['oldNis', 'nis', 'akunSiswa', 'nama', 'kelas', 'akunOrtu', 'namaOrtu']);
    const shUsers = ss.getSheetByName('Users');
    const row = findUserRowByRoleAndNis(shUsers, 'siswa', d.oldNis);
    if (row < 0) throw new Error('Siswa tidak ditemukan.');
    const duplicateNis = findUserRowByRoleAndNis(shUsers, 'siswa', d.nis);
    if (duplicateNis > 0 && duplicateNis !== row) throw new Error('NIS sudah digunakan siswa lain.');
    const parentRow = findUserRowByRoleAndNis(shUsers, 'ortu', d.oldNis);
    const parentIsValid = parentRow > 0 && String(shUsers.getRange(parentRow, 4).getValue()).toLowerCase() === 'ortu';
    const studentUsernameRow = findRowByValue(shUsers, 2, d.akunSiswa);
    const parentUsernameRow = findRowByValue(shUsers, 2, d.akunOrtu);
    if (studentUsernameRow > 0 && studentUsernameRow !== row) throw new Error('Username siswa sudah digunakan.');
    if (parentUsernameRow > 0 && (!parentIsValid || parentUsernameRow !== parentRow)) throw new Error('Username orang tua sudah digunakan.');
    if (d.pinSiswa && !/^[0-9]{6,12}$/.test(String(d.pinSiswa))) throw new Error('PIN siswa wajib terdiri dari 6-12 digit.');
    if (d.pinOrtu && !/^[0-9]{6,12}$/.test(String(d.pinOrtu))) throw new Error('PIN orang tua wajib terdiri dari 6-12 digit.');
    shUsers.getRange(row, 1, 1, 7).setValues([['USR-' + d.nis, d.akunSiswa, d.pinSiswa ? hashPin_(d.pinSiswa) : shUsers.getRange(row, 3).getValue(), 'siswa', d.nama, d.kelas, d.nis]]);
    if (parentIsValid) shUsers.getRange(parentRow, 1, 1, 7).setValues([['ORTU-' + d.nis, d.akunOrtu, d.pinOrtu ? hashPin_(d.pinOrtu) : shUsers.getRange(parentRow, 3).getValue(), 'ortu', d.namaOrtu, d.kelas, d.nis]]);
    else {
      if (!d.pinOrtu) throw new Error('PIN orang tua wajib diisi untuk akun baru.');
      shUsers.appendRow(['ORTU-' + d.nis, d.akunOrtu, hashPin_(d.pinOrtu), 'ortu', d.namaOrtu, d.kelas, d.nis]);
    }
    replaceColumnValue(ss.getSheetByName('Presensi'), 3, d.oldNis, d.nis);
    replaceColumnValue(ss.getSheetByName('Yaumiah_Log'), 3, d.oldNis, d.nis);
    replaceColumnValue(ss.getSheetByName('Nilai_UAS'), 3, d.oldNis, d.nis);
  } else if (payload.action === 'DELETE_SISWA') {
    const shUsers = ss.getSheetByName('Users');
    for (let i = shUsers.getLastRow(); i >= 2; i--) {
      const row = shUsers.getRange(i, 1, 1, 7).getValues()[0];
      if (String(row[6]) === String(d.nis) && ['siswa', 'ortu'].includes(String(row[3]).toLowerCase())) shUsers.deleteRow(i);
    }
  } else if (payload.action === 'TUGAS') {
    let shTugas = ss.getSheetByName('Tugas_Kelas');
    if (!shTugas) {
      shTugas = ss.insertSheet('Tugas_Kelas');
      shTugas.appendRow(['Timestamp', 'ID_Tugas', 'Mapel', 'Kelas', 'Judul', 'Deskripsi', 'Deadline', 'Dibuat_Oleh', 'Status']);
    }
    shTugas.appendRow([new Date(), d.id, d.mapel, d.kelas, d.judul, d.deskripsi || '', d.deadline, payload.authenticatedUsername, 'Aktif']);
  } else if (payload.action === 'SESI_UAS') {
    let shSesi = ss.getSheetByName('Sesi_Ujian');
    if (!shSesi) {
      shSesi = ss.insertSheet('Sesi_Ujian');
      shSesi.appendRow(['Status_Ujian', 'Token_Ujian', 'Mapel_Aktif', 'Catatan', 'Updated_At', 'Kelas_Aktif', 'Acak_Soal', 'Acak_Opsi']);
    }
    if (shSesi.getLastColumn() < 6) shSesi.getRange(1, 6).setValue('Kelas_Aktif');
    if (shSesi.getLastColumn() < 8) shSesi.getRange(1, 7, 1, 2).setValues([['Acak_Soal', 'Acak_Opsi']]);
    const kelas = d.kelas || 'SEMUA';
    let targetRow = -1;
    if (shSesi.getLastRow() > 1) {
      const rows = shSesi.getRange(2, 1, shSesi.getLastRow() - 1, 8).getValues();
      for (let i = rows.length - 1; i >= 0; i--) if (String(rows[i][2] || 'SEMUA') === String(d.mapel || 'SEMUA') && String(rows[i][5] || 'SEMUA') === String(kelas)) { targetRow = i + 2; break; }
    }
    const values = [d.isOpen ? 'OPEN' : 'LOCKED', d.token || '', d.mapel || 'SEMUA', d.catatan || '', new Date(), kelas, !!d.randomizeQuestions, !!d.randomizeOptions];
    if (targetRow > 0) shSesi.getRange(targetRow, 1, 1, 8).setValues([values]); else shSesi.appendRow(values);
  } else if (payload.action === 'DELETE_TUGAS') {
    const sh = ss.getSheetByName('Tugas_Kelas');
    const row = findRowByValue(sh, 2, d.id);
    if (row > 0) sh.deleteRow(row);
  } else if (payload.action === 'UPDATE_TUGAS_STATUS') {
    const sh = ss.getSheetByName('Tugas_Kelas');
    const row = findRowByValue(sh, 2, d.id);
    if (row < 0) throw new Error('Tugas tidak ditemukan.');
    const taskClass = String(sh.getRange(row, 4).getValue() || 'SEMUA');
    if (taskClass !== 'SEMUA' && taskClass !== payload.authenticatedClass) throw new Error('Tugas ini bukan untuk kelas Anda.');
    const submissions = ensureSecuritySheets_(ss).submissions;
    const submissionRows = readSheetRows(ss, 'Task_Submissions');
    const existingIndex = submissionRows.findIndex(r => String(r[1] || '') === String(d.id) && String(r[3] || '') === payload.authenticatedNis);
    const values = [new Date(), d.id, payload.authenticatedUsername, payload.authenticatedNis, 'SELESAI', new Date()];
    if (existingIndex >= 0) submissions.getRange(existingIndex + 2, 1, 1, values.length).setValues([values]); else submissions.appendRow(values);
  } else if (payload.action === 'UPDATE_TUGAS') {
    const sh = ss.getSheetByName('Tugas_Kelas');
    const row = findRowByValue(sh, 2, d.oldId);
    if (row < 0) throw new Error('Tugas tidak ditemukan.');
    const duplicate = findRowByValue(sh, 2, d.id);
    if (duplicate > 0 && duplicate !== row) throw new Error('ID tugas sudah digunakan.');
    sh.getRange(row, 2, 1, 8).setValues([[d.id, d.mapel, d.kelas, d.judul, d.deskripsi || '', d.deadline || '', payload.authenticatedUsername, d.status || 'Aktif']]);
  } else if (payload.action === 'SAVE_ORG_SETTINGS') {
    const sh = ss.getSheetByName('Pengaturan_Organisasi') || ss.insertSheet('Pengaturan_Organisasi');
    if (sh.getLastRow() === 0) sh.appendRow(['Kunci', 'Nilai']);
    const submittedSettings = d.settings || {};
    const values = {};
    ['namaYayasan', 'namaSekolah', 'alamat', 'telepon', 'email'].forEach(key => { if (submittedSettings[key] !== undefined) values[key] = String(submittedSettings[key]).slice(0, 500); });
    if (d.logoData) values.logoUrl = uploadImageAsset(d.logoData, 'logo-organisasi');
    Object.keys(values).forEach(key => {
      const row = findRowByValue(sh, 1, key);
      if (row > 0) sh.getRange(row, 2).setValue(values[key]); else sh.appendRow([key, values[key]]);
    });
    result.orgSettings = values;
  }
  // Invalidasi cache untuk action yang mengubah soal atau sesi ujian
  if (['SOAL_UAS','SOAL_UAS_BULK','UPDATE_SOAL','DELETE_SOAL','BULK_DELETE_SOAL',
       'BULK_APPROVE_SOAL','DELETE_SOAL_PACKAGE','UPDATE_APPROVAL_SOAL'].includes(payload.action)) {
    invalidateBankSoalCache_();
  }
  if (payload.action === 'SESI_UAS') {
    invalidateSesiUjianCache_();
  }
  return result;
}

function doPost(e) {
  try {
    const raw = e && e.postData ? String(e.postData.contents || '') : '';
    if (!raw || raw.length > 8 * 1024 * 1024) throw new Error('Payload kosong atau terlalu besar.');
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !String(payload.action || '')) throw new Error('Format permintaan tidak valid.');
    return jsonResponse_(processClientAction(payload));
  } catch (error) {
    return jsonResponse_({ status: 'error', message: error && error.message ? error.message : 'Permintaan tidak dapat diproses.' });
  }
}
