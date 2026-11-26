// ============================================================================
// SERVER.JS - SIS-Terpadu Local Web Server
// ============================================================================
// Pengganti Google Apps Script agar bisa dijalankan secara lokal.
// Menjalankan HTTP server sederhana menggunakan Node.js built-in modules.
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DEV_API_KEY = process.env.SISKU_DEV_API_KEY || '';
const ALLOWED_ORIGIN = process.env.SISKU_ALLOWED_ORIGIN || `http://${HOST}:${PORT}`;
const MAX_BODY_BYTES = 1024 * 1024;

// In-memory database (menggantikan Google Spreadsheet)
const database = {
  Users: [],
  Master_Kelas: [],
  Master_Guru: [],
  Presensi: [],
  Yaumiah_Log: [],
  Tugas_Prestasi: [],
  Bank_Soal_UAS: []
};

// Setup database dengan data awal (setara dengan setupDatabase() di Code.gs)
function setupDatabase() {
  // Server lokal dimulai dengan data kosong. Data sekolah tidak boleh diganti
  // oleh seed contoh; isi melalui endpoint pengembangan bila memang diperlukan.
  console.log('✅ Database lokal siap (kosong, tanpa data dummy).');
}

// Handler POST (menggantikan doPost() di Code.gs)
function handlePost(payload) {
  const now = new Date();

  if (payload.type === 'PRESENSI') {
    const d = payload.data;
    database.Presensi.push({
      Timestamp: now.toISOString(),
      Tanggal: now.toISOString().slice(0, 10),
      NIS: d.nis,
      Nama: d.nama,
      Status: d.status,
      Jam_Masuk: d.jam,
      Latitude: d.lat || '',
      Longitude: d.lng || '',
      Jarak_Meter: d.jarakMeter || 0,
      Token_QR: d.qrToken || ''
    });
  } else if (payload.type === 'YAUMIAH') {
    database.Yaumiah_Log.push({
      Timestamp: now.toISOString(),
      Tanggal: payload.data.tanggal,
      NIS: payload.data.nis,
      Nama: payload.data.nama,
      Kelas: payload.data.kelas,
      Capaian_Persen: payload.data.capaianPersen,
      Tilawah: payload.data.tilawah,
      Paraf_Ortu: payload.data.parafOrtu,
      Evaluasi_Guru: ''
    });
  } else if (payload.type === 'SOAL_UAS' || payload.action === 'SOAL_UAS') {
    const d = payload.data;
    database.Bank_Soal_UAS.push({
      Timestamp: now.toISOString(),
      ID_Soal: d.id,
      Mapel: d.mapel,
      Kelas: d.kelas,
      Level_Kognitif: d.level,
      KD: d.kd,
      Pertanyaan: d.pertanyaan,
      Opsi_A: d.opsiA,
      Opsi_B: d.opsiB,
      Opsi_C: d.opsiC,
      Opsi_D: d.opsiD,
      Opsi_E: d.opsiE || '',
      Kunci: d.kunci,
      Status_Approval_Kepsek: d.statusApproval || 'Menunggu Approval Kepsek',
      Gambar_URL: d.gambarUrl || '',
      Pembuat_Username: d.pembuatUsername || payload.actorUsername || '',
      Pembuat_Nama: d.pembuatNama || payload.actorName || ''
    });
  } else if (payload.type === 'SOAL_UAS_BULK' || payload.action === 'SOAL_UAS_BULK') {
    const list = (payload.data && payload.data.soalList) || [];
    list.forEach(d => {
      database.Bank_Soal_UAS.push({
        Timestamp: now.toISOString(),
        ID_Soal: d.id,
        Mapel: d.mapel,
        Kelas: d.kelas,
        Level_Kognitif: d.level,
        KD: d.kd,
        Pertanyaan: d.pertanyaan,
        Opsi_A: d.opsiA,
        Opsi_B: d.opsiB,
        Opsi_C: d.opsiC,
        Opsi_D: d.opsiD,
        Opsi_E: d.opsiE || '',
        Kunci: d.kunci,
        Status_Approval_Kepsek: d.statusApproval || 'Menunggu Approval Kepsek',
        Gambar_URL: d.gambarUrl || '',
        Pembuat_Username: d.pembuatUsername || payload.actorUsername || '',
        Pembuat_Nama: d.pembuatNama || payload.actorName || '',
        ID_Paket: d.paketId || (payload.data && payload.data.paketId) || ''
      });
    });
    return { status: 'success', savedCount: list.length };
  } else if (payload.type === 'UPLOAD_SOAL_IMAGES_BATCH' || payload.action === 'UPLOAD_SOAL_IMAGES_BATCH') {
    const images = (payload.data && payload.data.images) || [];
    const uploaded = images.map((img, idx) => ({
      name: img.name,
      url: img.dataUrl || ('https://picsum.photos/seed/' + encodeURIComponent(img.name) + '/600/400'),
      success: true
    }));
    return { status: 'success', uploaded: uploaded };
  } else if (payload.type === 'BULK_UPDATE_GAMBAR_SOAL' || payload.action === 'BULK_UPDATE_GAMBAR_SOAL') {
    const updates = (payload.data && payload.data.updates) || [];
    let updatedCount = 0;
    updates.forEach(u => {
      const item = database.Bank_Soal_UAS.find(x => x.ID_Soal === u.id);
      if (item) {
        item.Gambar_URL = u.gambarUrl;
        updatedCount++;
      }
    });
    return { status: 'success', updatedCount: updatedCount };
  } else if (payload.type === 'UPDATE_SOAL' || payload.action === 'UPDATE_SOAL') {
    const d = payload.data || {};
    const item = database.Bank_Soal_UAS.find(x => x.ID_Soal === d.id);
    if (item) {
      if (d.mapel) item.Mapel = d.mapel;
      if (d.kelas) item.Kelas = d.kelas;
      if (d.level) item.Level_Kognitif = d.level;
      if (d.kd) item.KD = d.kd;
      if (d.pertanyaan) item.Pertanyaan = d.pertanyaan;
      item.Opsi_A = d.opsiA || '';
      item.Opsi_B = d.opsiB || '';
      item.Opsi_C = d.opsiC || '';
      item.Opsi_D = d.opsiD || '';
      item.Opsi_E = d.opsiE || '';
      if (d.kunci) item.Kunci = d.kunci;
      if (d.statusApproval) item.Status_Approval_Kepsek = d.statusApproval;
      if (d.tipeSoal) item.Tipe_Soal = d.tipeSoal;
      if (d.catatanRevisi !== undefined) item.Catatan_Revisi = d.catatanRevisi;
    }
    return { status: 'success' };
  } else if (payload.type === 'DELETE_SOAL' || payload.action === 'DELETE_SOAL') {
    const id = payload.data && payload.data.id;
    const idx = database.Bank_Soal_UAS.findIndex(x => x.ID_Soal === id);
    if (idx >= 0) database.Bank_Soal_UAS.splice(idx, 1);
    return { status: 'success' };
  } else if (payload.type === 'REGISTER_KELAS') {
    database.Master_Kelas.push({
      Kode_Kelas: payload.data.kode,
      Nama_Kelas: payload.data.nama,
      Wali_Kelas: payload.data.waliKelas,
      Jumlah_Siswa: 0
    });
  } else if (payload.type === 'REGISTER_GURU') {
    if (!/^[0-9]{6,12}$/.test(String(payload.data.pin || ''))) {
      throw new Error('PIN guru wajib terdiri dari 6-12 digit.');
    }
    database.Master_Guru.push({
      NIP: payload.data.nip,
      Username: payload.data.username,
      Nama_Guru: payload.data.nama,
      Mata_Pelajaran: payload.data.mapel,
      Wali_Kelas: '-'
    });
    database.Users.push({
      ID_User: now.getTime(),
      Username: payload.data.username,
      PIN_Akses: payload.data.pin,
      Role: 'guru',
      Nama_Lengkap: payload.data.nama,
      Kelas: '-',
      NIS_Terkait: '-'
    });
  } else if (payload.type === 'REGISTER_SISWA') {
    const d = payload.data;
    if (!/^[0-9]{6,12}$/.test(String(d.pinSiswa || '')) || !/^[0-9]{6,12}$/.test(String(d.pinOrtu || ''))) {
      throw new Error('PIN siswa dan orang tua wajib terdiri dari 6-12 digit.');
    }
    database.Users.push({
      ID_User: now.getTime(),
      Username: d.nis,
      PIN_Akses: d.pinSiswa,
      Role: 'siswa',
      Nama_Lengkap: d.nama,
      Kelas: d.kelas,
      NIS_Terkait: d.nis
    });
    database.Users.push({
      ID_User: now.getTime() + 1,
      Username: 'ortu.' + d.nis,
      PIN_Akses: d.pinOrtu,
      Role: 'ortu',
      Nama_Lengkap: d.ortu,
      Kelas: d.kelas,
      NIS_Terkait: d.nis
    });
  }

  return { status: 'success' };
}

// MIME type helper
function getMimeType(ext) {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'self' https://script.google.com");
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API endpoint (menggantikan doPost)
  if (req.method === 'POST' && req.url === '/api') {
    if (!DEV_API_KEY || req.headers.authorization !== `Bearer ${DEV_API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Unauthorized' }));
      return;
    }
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) tooLarge = true;
    });
    req.on('end', () => {
      if (tooLarge) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Payload too large' }));
        return;
      }
      try {
        const payload = JSON.parse(body);
        const result = handlePost(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.toString() }));
      }
    });
    return;
  }

  // API: Get database contents
  if (req.method === 'GET' && req.url === '/api/data') {
    if (!DEV_API_KEY || req.headers.authorization !== `Bearer ${DEV_API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Unauthorized' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(database));
    return;
  }

  // Static file serving
  let requestPath;
  try {
    const decodedTarget = decodeURIComponent(String(req.url || '').split('?')[0]);
    if (decodedTarget.split('/').includes('..')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    requestPath = new URL(decodedTarget, `http://${HOST}`).pathname;
  } catch (error) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  if (requestPath === '/') requestPath = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, '.' + requestPath);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: serve index.html
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': getMimeType(ext) + '; charset=utf-8' });
      res.end(content);
    }
  });
});

// Initialize & Start
setupDatabase();

server.on('error', err => {
  console.error('Server gagal dijalankan:', err.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  🕌 ═══════════════════════════════════════════════════════');
  console.log('  ║  SIS-Terpadu — Sistem Informasi Sekolah Terpadu       ║');
  console.log('  ║  Monitoring Yaumiah, Presensi QR+GPS & Akademik       ║');
  console.log('  ═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  🌐 App berjalan di: http://${HOST}:${PORT}`);
  console.log(`  📊 API endpoint:    http://localhost:${PORT}/api`);
  console.log(`  📂 Database view:   http://localhost:${PORT}/api/data`);
  console.log('');
  console.log('  Tekan Ctrl+C untuk menghentikan server.');
  console.log('');
});

