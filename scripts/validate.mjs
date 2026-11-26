import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const fail = message => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const gas = read('Code.gs');
const html = read('Index.html');
const localServer = read('app/server.js');
const localSetup = localServer.slice(localServer.indexOf('function setupDatabase()'), localServer.indexOf('// Handler POST'));
const internalHelperCalls = new Set([...gas.matchAll(/\b([A-Za-z][A-Za-z0-9]*_)\s*\(/g)].map(match => match[1]));
const internalHelperDefinitions = new Set([...gas.matchAll(/function\s+([A-Za-z][A-Za-z0-9]*_)\s*\(/g)].map(match => match[1]));
const missingInternalHelpers = [...internalHelperCalls].filter(name => !internalHelperDefinitions.has(name));
if (missingInternalHelpers.length) fail(`Helper internal belum didefinisikan: ${missingInternalHelpers.join(', ')}`);

try { new vm.Script(gas, { filename: 'Code.gs' }); } catch (error) { fail(error.message); }
try { new vm.Script(localServer, { filename: 'app/server.js' }); } catch (error) { fail(error.message); }

const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (!inlineScripts.length) fail('Script inline Index.html tidak ditemukan.');
inlineScripts.forEach((source, index) => {
  try { new vm.Script(source, { filename: `Index.inline.${index + 1}.js` }); } catch (error) { fail(error.message); }
});

const requiredGasPatterns = [
  [/if \(!allowedRoles\) throw new Error/, 'otorisasi harus deny-by-default'],
  [/function startExam_\(/, 'START_EXAM server-side wajib tersedia'],
  [/function submitExam_\(/, 'SUBMIT_EXAM server-side wajib tersedia'],
  [/function hashPin_\(/, 'hash PIN wajib tersedia'],
  [/function getCachedSheet_\(/, 'helper cache sheet generik wajib tersedia'],
  [/Question_Manifest_JSON/, 'manifest naskah ujian wajib disimpan'],
  [/manifest\.forEach\(item =>/, 'penilaian wajib memakai manifest percobaan'],
  [/LockService\.getScriptLock\(\)/, 'locking transaksi wajib tersedia']
];
requiredGasPatterns.forEach(([pattern, description]) => { if (!pattern.test(gas)) fail(description); });

try {
  const gasContext = vm.createContext({
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: (_algorithm, value) => [...crypto.createHash('sha256').update(String(value)).digest()],
      getUuid: () => crypto.randomUUID()
    },
    console
  });
  new vm.Script(gas, { filename: 'Code.gs' }).runInContext(gasContext);
  const row = ['', 'Q-1', 'Matematika', 'VII-A', 'L1', '', '2+2?', '3', '4', '5', '6', '', 'B', 'Approved', 'PG', '', '', 'guru', 'Guru', 'PKT'];
  const publicQuestion = gasContext.questionFromRow_(row, false);
  if (Object.prototype.hasOwnProperty.call(publicQuestion, 'kunci')) fail('Serializer soal siswa masih membocorkan kunci.');
  const hashed = gasContext.hashPin_('731904');
  if (!gasContext.verifyPin_('731904', hashed) || gasContext.verifyPin_('000000', hashed)) fail('Hash/verifikasi PIN tidak konsisten.');
  const cacheValues = new Map();
  gasContext.CacheService = { getScriptCache: () => ({ get: key => cacheValues.get(key) || null, put: (key, value) => cacheValues.set(key, value) }) };
  gasContext.readSheetRows = (_ss, sheetName) => sheetName === 'Master_Yaumiah' ? [['YM-1', 'Tilawah']] : [];
  const cachedSheetRows = gasContext.getCachedSheet_({}, 'Master_Yaumiah', 'test-master-yaumiah', 60);
  if (!Array.isArray(cachedSheetRows) || cachedSheetRows.length !== 1 || !cacheValues.has('test-master-yaumiah')) fail('Helper cache sheet generik tidak bekerja.');
  const schemaSheets = new Map();
  const createMockSheet = name => {
    const rows = [];
    return {
      name,
      getLastRow: () => rows.length,
      getLastColumn: () => rows.reduce((max, row) => Math.max(max, row.length), 0),
      appendRow: row => rows.push(row.slice()),
      getRange: (_row, column, _rowCount, columnCount) => ({
        setValues: values => {
          if (!rows.length) rows.push([]);
          for (let index = 0; index < columnCount; index++) rows[0][column - 1 + index] = values[0][index];
        }
      })
    };
  };
  const schemaSpreadsheet = {
    getSheetByName: name => schemaSheets.get(name) || null,
    insertSheet: name => { const sheet = createMockSheet(name); schemaSheets.set(name, sheet); return sheet; }
  };
  cacheValues.delete('sisku-schema-ready-v1');
  gasContext.ensureSchemaReady_(schemaSpreadsheet);
  ['Bank_Soal_UAS', 'Nilai_UAS', 'Sesi_Ujian', 'Exam_Attempts', 'Grade_Complaints', 'Task_Submissions'].forEach(name => {
    if (!schemaSheets.has(name) || schemaSheets.get(name).getLastRow() !== 1) fail(`Schema ujian tidak menyiapkan sheet ${name}.`);
  });
  gasContext.readSheetRows = (_ss, sheetName) => sheetName === 'Master_Guru'
    ? [['NIP-1', 'guru.satu', 'Guru Satu', 'Matematika', '-']]
    : (sheetName === 'Master_Mapel' ? [['MTK', 'Matematika', 'Umum']] : []);
  if (!gasContext.guruDapatMelihatSoal_({}, ' Guru.Satu ', { mapel: 'MTK', pembuatUsername: 'guru.satu ' })) {
    fail('Soal milik guru harus tetap terlihat setelah normalisasi username.');
  }
  if (!gasContext.guruDapatMelihatSoal_({}, 'guru.satu', { mapel: 'Mapel Lama', pembuatUsername: 'guru.satu' })) {
    fail('Soal milik sendiri harus tetap terlihat setelah penugasan mapel guru berubah.');
  }
  if (gasContext.guruDapatMelihatSoal_({}, 'guru.satu', { mapel: 'MTK', pembuatUsername: 'guru.lain' })) {
    fail('Soal milik guru lain tidak boleh terlihat pada dashboard guru.');
  }
  let denied = false;
  try { gasContext.authorizeClientAction_({ action: 'UNKNOWN_ACTION' }); } catch (error) { denied = true; }
  if (!denied) fail('Aksi tak dikenal tidak ditolak.');
  const appendedComplaints = [];
  const nilaiStatusUpdates = [];
  const nilaiSheet = { getRange: () => ({ setValue: value => nilaiStatusUpdates.push(value) }) };
  gasContext.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: name => name === 'Nilai_UAS' ? nilaiSheet : null }) };
  gasContext.findRowByValue = () => 2;
  gasContext.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  gasContext.ensureSecuritySheets_ = () => ({ complaints: { appendRow: row => appendedComplaints.push(row), getRange: () => ({ setValues: () => {} }) } });
  gasContext.readSheetRows = (_ss, sheetName) => {
    if (sheetName === 'Nilai_UAS') return [[new Date(), '2026-11-25', 'NIS-1', 'Siswa Satu', 'VIII-A', 'Matematika', 8, 10, 80, 'ATT-1', 'FINAL', 80, '', '', '']];
    if (sheetName === 'Master_Guru') return [['NIP-1', 'guru.satu', 'Guru Satu', 'Matematika', '-']];
    if (sheetName === 'Master_Mapel') return [['MTK', 'Matematika', 'Umum']];
    if (sheetName === 'Bank_Soal_UAS') return [];
    if (sheetName === 'Grade_Complaints') return [];
    return [];
  };
  const complaintResult = gasContext.submitGradeComplaint_({ data: { attemptId: 'ATT-1', argument: 'Jawaban nomor dua mohon diperiksa kembali.' }, authenticatedNis: 'NIS-1', authenticatedUsername: 'siswa.satu', authenticatedName: 'Siswa Satu', role: 'siswa' });
  if (!complaintResult || appendedComplaints.length !== 1 || !String(appendedComplaints[0][12]).includes('guru.satu') || nilaiStatusUpdates[0] !== 'KOMPLAIN') fail('Komplain nilai tidak diteruskan ke guru mata pelajaran.');
  let foreignComplaintDenied = false;
  try { gasContext.submitGradeComplaint_({ data: { attemptId: 'ATT-1', argument: 'Nilai ini mohon diperiksa kembali oleh guru.' }, authenticatedNis: 'NIS-LAIN', authenticatedUsername: 'siswa.lain', authenticatedName: 'Siswa Lain', role: 'siswa' }); } catch (error) { foreignComplaintDenied = true; }
  if (!foreignComplaintDenied) fail('Siswa tidak boleh mengajukan komplain untuk nilai milik siswa lain.');
} catch (error) {
  fail(`Self-test keamanan backend gagal: ${error.stack || error.message}`);
}

if (/kirimKeSpreadsheet\(['"]NILAI_UAS['"]/.test(html)) fail('Frontend tidak boleh mengirim skor NILAI_UAS secara langsung.');
if (/sessionToken=['"]?\s*\+\s*encodeURIComponent/.test(html)) fail('Session token tidak boleh dikirim melalui URL query.');
if (/function verifikasiLoginLokal[\s\S]{0,250}9999/.test(html)) fail('Fallback admin lokal masih aktif.');
if (/setXFrameOptionsMode\(HtmlService\.XFrameOptionsMode\.ALLOWALL\)/.test(gas)) fail('X-Frame Apps Script masih ALLOWALL.');
if (/XFrameOptionsMode\.ALLOWALL/.test(html)) fail('Frontend masih memuat contoh backend lama yang tidak aman.');
if (/function getRawGasCodeLegacy_\(/.test(html)) fail('Frontend masih memuat generator Code.gs lama.');
if (!/function encodeEventArg\(/.test(html)) fail('Encoding argumen event frontend wajib tersedia.');
if (!/id="cetak-filter-kelas"/.test(html)) fail('Cetak naskah wajib mendukung filter kelas.');
['pg', 'isian', 'esai'].forEach(type => {
  if (!new RegExp(`id="cetak-tipe-${type}"`).test(html)) fail(`Cetak naskah wajib mendukung pilihan jenis ${type}.`);
});
if (!/function bersihkanNomorAwalSoal\(/.test(html) || !/sk\.nomorCetak/.test(html)) fail('Nomor naskah dan kunci cetak harus memakai urutan kanonik yang sama.');
if (!/window\.unduhNaskahWord = function/.test(html) || !/application\/msword/.test(html)) fail('Ekspor dokumen Word wajib tersedia.');
if (!/state\.bankSoalUAS = savedQuestions\.concat/.test(html)) fail('Urutan hasil impor bulk tidak boleh dibalik oleh unshift.');
if (!/if \(!raw\.length && state\.role === 'guru'\)/.test(html)) fail('Filter mapel guru wajib memiliki fallback aman untuk sesi impersonasi lama.');
if (/return matchStatus && matchMapel && matchKelas && \(!isGuru \|\| guruMengampuMapel/.test(html)) fail('Daftar soal guru tidak boleh disaring ulang setelah pemeriksaan kepemilikan.');
if (!/examResults:\s*\[\]/.test(html) || !/function renderExamMonitoringPanel\(/.test(html) || !/Rekap Pengerjaan & Nilai Ujian/.test(html)) fail('Menu Monitoring guru wajib menampilkan rekap nilai ujian siswa.');
if (!/label: 'Monitoring Siswa'/.test(html) || /Monitoring & Siswa/.test(html)) fail('Nama menu guru harus konsisten sebagai Monitoring Siswa.');
if (!/canViewResultRow = r => canViewResultMapel\(r\[5\]\) \|\| \(role === 'guru' && teacherWaliKelas && String\(r\[4\]/.test(gas)) fail('Wali kelas wajib dapat melihat seluruh rekap nilai kelas binaannya.');
if (!/const canViewResultMapel = mapel => role !== 'guru'/.test(gas)) fail('Kepala sekolah dan staf berwenang wajib dapat melihat rekap nilai sekolah.');
if (!/GRADE_ESSAY: \['superadmin', 'guru'\]/.test(gas) || !/function gradeEssaySubmission_\(/.test(gas)) fail('Backend penilaian esai guru wajib tersedia dan dibatasi peran.');
if (!/Essay_Grading_JSON/.test(gas) || !/Skor_Esai/.test(gas) || !/Dinilai_Oleh/.test(gas)) fail('Audit dan rincian penilaian esai wajib tersimpan.');
if (!/essaySubmissions:\s*\[\]/.test(html) || !/window\.bukaPenilaianEsai = function/.test(html) || !/window\.simpanPenilaianEsai = async function/.test(html)) fail('Dashboard guru wajib memiliki form koreksi esai.');
if (!/objectiveWeight \+ essayWeight !== 100/.test(gas) || !/Total bobot objektif dan esai harus tepat 100%/.test(html)) fail('Bobot nilai objektif dan esai wajib divalidasi menjadi 100%.');
if (!/Grade_Complaints/.test(gas) || !/SUBMIT_GRADE_COMPLAINT: \['siswa', 'ortu'\]/.test(gas) || !/function submitGradeComplaint_\(/.test(gas)) fail('Komplain nilai harus tersimpan dan hanya dapat dikirim siswa atau orang tua.');
if (!/function renderStudentExamScores\(/.test(html) || !/window\.bukaKomplainNilai = function/.test(html) || !/SUBMIT_GRADE_COMPLAINT/.test(html)) fail('Dashboard siswa dan orang tua wajib menampilkan nilai serta opsi komplain.');
if (!/gradeComplaints: gradeComplaints/.test(gas) || !/Komplain Nilai Masuk/.test(html) || !/Komplain Nilai Ujian/.test(html)) fail('Komplain nilai wajib diteruskan ke tampilan guru dan Superadmin.');
const bankQuestionStart = html.indexOf('function renderPembuatanSoalUAS()');
const bankQuestionEnd = html.indexOf('window.bukaPenilaianEsai = function', bankQuestionStart);
if (bankQuestionStart < 0 || bankQuestionEnd < 0 || html.slice(bankQuestionStart, bankQuestionEnd).includes('Rekap Pengerjaan & Nilai Ujian')) fail('Rekap nilai tidak boleh tetap berada di menu Buat Soal UAS.');
const tokenRequiredBranch = html.indexOf('sesiMapel.isOpen && sesiMapel.requiresToken');
const tokenlessOpenBranch = html.indexOf('countApproved > 0 && sesiMapel.isOpen)', tokenRequiredBranch + 1);
if (tokenRequiredBranch < 0 || tokenlessOpenBranch < 0 || tokenRequiredBranch > tokenlessOpenBranch) fail('Kolom token siswa wajib diprioritaskan sebelum tombol masuk langsung.');
if (!/result\.questions = bulkRows\.map/.test(gas)) fail('Simpan bulk harus mengembalikan data soal kanonik.');
if (!/const creatorUser = payload\.authenticatedUsername/.test(gas)) fail('Pemilik soal bulk harus memakai akun terautentikasi.');
if (!/mapelList: splitGuruMapel\(guruMapel\)/.test(gas)) fail('Sesi impersonasi guru wajib membawa metadata mata pelajaran.');
if (!/if \(!session\.isOpen\) throw new Error\('Ujian belum dibuka oleh pengawas\.'\)/.test(gas) || !/if \(session\.token && suppliedToken !== session\.token\.toUpperCase\(\)\)/.test(gas)) fail('START_EXAM wajib memeriksa status OPEN dan token secara terpisah.');
if (!/examResults: examResults/.test(gas)) fail('Backend wajib mengirim rekap nilai yang sudah dibatasi per guru.');
if (/PIN_Akses:\s*['"](?:9999|3333|2222|1111)['"]/.test(localServer)) fail('Server lokal masih memiliki PIN bawaan tetap.');
if (/Username:\s*['"]admin['"]/.test(localServer)) fail('Server lokal masih membuat akun admin bawaan.');
if (!/function segarkanRingkasanDashboardSiswa_\(/.test(html) || !/state\.initialDataLoaded = true/.test(html)) fail('Dashboard siswa wajib dihidrasi dari respons Spreadsheet sebelum ditampilkan.');
if (!/function getMasterData_\(/.test(gas) || !/GET_MASTER_DATA: \['superadmin'\]/.test(gas)) fail('Sinkronisasi khusus data master wajib tersedia dan dibatasi untuk Superadmin.');
if (!/window\.sinkronkanDataMaster = async function/.test(html) || !/Sinkronkan dari Spreadsheet/.test(html)) fail('Menu data master wajib dapat menyinkronkan ulang data Spreadsheet secara langsung.');
if (!/tugasList:\s*\[\]/.test(html) || !/bankSoalUAS:\s*\[\]/.test(html) || /status:\s*['"]Hadir Tepat Waktu['"]/.test(html)) fail('Frontend produksi masih memuat data dashboard dummy.');
if (/const seedKelas\s*=/.test(gas)) fail('setupDatabase tidak boleh menyisipkan kelas dummy.');
if (!/deletedDemoClassCount/.test(gas)) fail('Pembersihan data demo wajib mencakup kelas contoh lama.');
if (/database\.Master_Kelas\.push\(/.test(localSetup) || /database\.Master_Guru\.push\(/.test(localSetup)) fail('Server lokal tidak boleh otomatis memuat data sekolah dummy.');

const publicCopy = read('app/public/index.html');
if (crypto.createHash('sha256').update(html).digest('hex') !== crypto.createHash('sha256').update(publicCopy).digest('hex')) {
  fail('app/public/index.html belum sinkron dengan Index.html.');
}

if (!process.exitCode) console.log('OK: sintaks, invariant keamanan, dan sinkronisasi frontend valid.');
