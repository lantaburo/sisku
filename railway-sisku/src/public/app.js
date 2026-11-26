'use strict';

const $ = selector => document.querySelector(selector);
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxbagBLe6Ji9ci1kQKpD4bS61uqLgkoVgjdxHzJuy90stN6Y-zP5v5mX5746-AJDKHa2A/exec';

const ROLE_LABELS = {
  siswa: 'Siswa', ortu: 'Orang Tua', guru: 'Guru / Wali Kelas',
  kepsek: 'Kepala Sekolah', superadmin: 'Superadmin'
};

const ROLE_NAV = {
  siswa: [
    ['summary', '🏠', 'Beranda'], ['attendance', '✓', 'Presensi'], ['yaumiah', '📿', 'Yaumiah'],
    ['tasks', '🏆', 'Tugas & Prestasi'], ['grades', '📝', 'Ujian & Nilai'], ['security', '🔑', 'Keamanan']
  ],
  ortu: [
    ['summary', '👨‍👩‍👦', 'Monitoring Anak'], ['attendance', '✓', 'Presensi'], ['yaumiah', '✍️', 'Yaumiah'],
    ['tasks', '🏅', 'Tugas & Prestasi'], ['grades', '📊', 'Nilai Anak'], ['security', '🔑', 'Keamanan']
  ],
  guru: [
    ['summary', '🏠', 'Beranda'], ['attendance', '📊', 'Monitoring Siswa'], ['yaumiah', '🕌', 'Yaumiah'],
    ['tasks', '📚', 'Tugas & Prestasi'], ['grades', '📝', 'Rekap Nilai'], ['questions', '📑', 'Bank Soal'],
    ['master', '👥', 'Data Siswa'], ['security', '🔑', 'Keamanan']
  ],
  kepsek: [
    ['summary', '📈', 'Dashboard Eksekutif'], ['attendance', '✓', 'Presensi'], ['yaumiah', '🕌', 'Supervisi Yaumiah'],
    ['grades', '📊', 'Rekap Akademik'], ['questions', '✅', 'Approval Soal'], ['master', '🏛️', 'Data Sekolah'],
    ['security', '🔑', 'Keamanan']
  ],
  superadmin: [
    ['summary', '🏠', 'Dashboard'], ['attendance', '✓', 'Presensi'], ['yaumiah', '📿', 'Yaumiah'],
    ['tasks', '📚', 'Tugas & Prestasi'], ['grades', '📝', 'Ujian & Nilai'], ['master', '🏛️', 'Data Master'],
    ['integration', '⚡', 'GAS & Railway'], ['security', '🔑', 'Keamanan']
  ]
};

const ROLE_HERO = {
  siswa: ['Ruang belajar siswa', 'Assalamu’alaikum, pantau aktivitasmu hari ini.', 'Presensi, Yaumiah, tugas, dan nilai hanya menampilkan data milikmu.', '🎒'],
  ortu: ['Pendampingan orang tua', 'Perkembangan ananda dalam satu pandangan.', 'Pantau kehadiran, pembiasaan Yaumiah, tugas, prestasi, dan hasil belajar ananda.', '👨‍👩‍👦'],
  guru: ['Ruang kerja guru', 'Monitoring kelas dan mata pelajaran lebih terarah.', 'Data siswa dibatasi ke kelas binaan dan mata pelajaran yang Anda ampu.', '📚'],
  kepsek: ['Dashboard eksekutif', 'Gambaran sekolah untuk pengambilan keputusan.', 'Pantau kehadiran, pembiasaan, akademik, dan kesiapan bank soal seluruh sekolah.', '📈'],
  superadmin: ['Pusat kendali SISKU', 'Data sekolah dan integrasi dalam satu ruang.', 'Pantau seluruh cakupan data, direktori akun, dan sinkronisasi GAS ke Railway.', '⚙️']
};

const TABLE_COLUMNS = {
  attendance: [
    { label: 'Tanggal', key: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'NIS', key: 'nis' }, { label: 'Status', key: 'status', badge: true }, { label: 'Jam', key: 'time' }
  ],
  yaumiah: [
    { label: 'Tanggal', key: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'NIS', key: 'nis' }, { label: 'Capaian', value: row => `${formatNumber(row.achievement)}%`, className: 'score-cell' },
    { label: 'Tilawah / Murajaah', key: 'reading' }
  ],
  tasks: [
    { label: 'Tugas', key: 'title' }, { label: 'Mapel', key: 'subject' },
    { label: 'Kelas', key: 'classCode' }, { label: 'Deadline', key: 'deadline' }, { label: 'Status', key: 'status', badge: true }
  ],
  achievements: [
    { label: 'Tanggal', key: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'Prestasi', key: 'title' }, { label: 'Kategori', key: 'category' }, { label: 'Tingkat', key: 'level' }
  ],
  grades: [
    { label: 'Tanggal', key: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'Mapel', key: 'subject' }, { label: 'Nilai', key: 'score', className: 'score-cell' },
    { label: 'Status', key: 'status', badge: true }
  ],
  questions: [
    { label: 'Mata pelajaran', key: 'subject' }, { label: 'Total soal', key: 'total' },
    { label: 'Disetujui', key: 'approved', className: 'score-cell' }, { label: 'Menunggu', key: 'pending' }
  ]
};

const MASTER_COLUMNS = {
  accounts: [
    { label: 'Nama', key: 'name' }, { label: 'Username', key: 'username' }, { label: 'Peran', key: 'role', badge: true },
    { label: 'Kelas', key: 'classCode' }, { label: 'NIS terkait', key: 'nis' }, { label: 'Aktif', value: row => row.active ? 'Ya' : 'Tidak' }
  ],
  students: [
    { label: 'NIS', key: 'nis' }, { label: 'Nama siswa', key: 'name' },
    { label: 'Kelas', key: 'classCode' }, { label: 'Username', key: 'username' }
  ],
  teachers: [
    { label: 'NIP', key: 'nip' }, { label: 'Nama guru', key: 'name' },
    { label: 'Mata pelajaran', key: 'subjects' }, { label: 'Wali kelas', key: 'classCode' }
  ],
  classes: [
    { label: 'Kode', key: 'code' }, { label: 'Nama kelas', key: 'name' },
    { label: 'Wali kelas', key: 'homeroom' }, { label: 'Jumlah siswa', key: 'capacity' }
  ],
  subjects: [
    { label: 'Kode', key: 'code' }, { label: 'Mata pelajaran', key: 'name' }, { label: 'Kelompok', key: 'group' }
  ]
};

const state = {
  user: null, dashboard: null, overview: null, activeView: 'summary',
  masterResource: 'students', masterItems: [], tableRows: {}, loadingCount: 0
};

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

function formatDate(value, withTime = true) {
  if (!value) return 'Belum ada';
  const options = { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' };
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' });
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', options).format(date);
}

function setLoading(active) {
  state.loadingCount = Math.max(0, state.loadingCount + (active ? 1 : -1));
  $('#loading-bar').hidden = state.loadingCount === 0;
}

async function api(path, options = {}) {
  setLoading(true);
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(payload.message || 'Layanan belum dapat dihubungi.');
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    setLoading(false);
  }
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove('show'), 3400);
}

function emptyMessage(label) {
  const element = document.createElement('p');
  element.className = 'empty-state';
  element.textContent = label || 'Belum ada data.';
  return element;
}

function statusClass(value) {
  const key = String(value || '').toLowerCase();
  if (/pending|menunggu|komplain/.test(key)) return 'status-chip pending';
  if (/closed|tutup|belum|tidak/.test(key)) return 'status-chip closed';
  return 'status-chip';
}

function createTable(container, columns, rows, emptyLabel) {
  container.replaceChildren();
  if (!Array.isArray(rows) || !rows.length) {
    container.append(emptyMessage(emptyLabel));
    return;
  }
  const table = document.createElement('table');
  table.className = 'data-table';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach(column => {
    const cell = document.createElement('th');
    cell.textContent = column.label;
    headRow.append(cell);
  });
  head.append(headRow);
  const body = document.createElement('tbody');
  rows.forEach(row => {
    const tableRow = document.createElement('tr');
    columns.forEach(column => {
      const cell = document.createElement('td');
      const raw = typeof column.value === 'function' ? column.value(row) : row[column.key];
      if (column.badge) {
        const badge = document.createElement('span');
        badge.className = statusClass(raw);
        badge.textContent = raw == null || raw === '' ? '—' : String(raw);
        cell.append(badge);
      } else {
        cell.textContent = raw == null || raw === '' ? '—' : String(raw);
      }
      if (column.className) cell.className = column.className;
      tableRow.append(cell);
    });
    body.append(tableRow);
  });
  table.append(head, body);
  container.append(table);
}

function filterRows(rows, query) {
  const wanted = String(query || '').trim().toLowerCase();
  if (!wanted) return rows;
  return rows.filter(row => Object.values(row).some(value => String(value == null ? '' : value).toLowerCase().includes(wanted)));
}

function registerTable(id, rows, columns, emptyLabel) {
  state.tableRows[id] = { rows: rows || [], columns, emptyLabel };
  createTable($(`#${id}`), columns, rows || [], emptyLabel);
}

function metricCard(icon, label, number, detail) {
  const card = document.createElement('article');
  card.className = 'metric-card';
  const iconBox = document.createElement('span');
  iconBox.className = 'metric-icon';
  iconBox.textContent = icon;
  const copy = document.createElement('div');
  const title = document.createElement('p'); title.textContent = label;
  const strong = document.createElement('strong'); strong.textContent = typeof number === 'number' ? formatNumber(number) : String(number || 0);
  const small = document.createElement('small'); small.textContent = detail || '';
  copy.append(title, strong, small); card.append(iconBox, copy);
  return card;
}

function miniStat(label, number, detail) {
  const card = document.createElement('article');
  card.className = 'mini-stat';
  const title = document.createElement('p'); title.textContent = label;
  const strong = document.createElement('strong'); strong.textContent = typeof number === 'number' ? formatNumber(number) : String(number || 0);
  const small = document.createElement('small'); small.textContent = detail || '';
  card.append(title, strong, small);
  return card;
}

function navItems() {
  return ROLE_NAV[state.user && state.user.role] || ROLE_NAV.siswa;
}

function buildNavigation() {
  const top = $('#top-navigation');
  const bottom = $('#bottom-navigation');
  top.replaceChildren(); bottom.replaceChildren();
  navItems().forEach(([id, icon, label]) => {
    [top, bottom].forEach(container => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-button';
      button.dataset.view = id;
      const iconElement = document.createElement('span'); iconElement.className = 'nav-icon'; iconElement.textContent = icon;
      const labelElement = document.createElement('span'); labelElement.textContent = label;
      button.append(iconElement, labelElement);
      button.addEventListener('click', () => showView(id));
      container.append(button);
    });
  });
}

function allowedView(name) {
  return navItems().some(item => item[0] === name);
}

function showView(name) {
  const target = allowedView(name) ? name : 'summary';
  state.activeView = target;
  document.querySelectorAll('.view-panel').forEach(panel => { panel.hidden = panel.id !== `${target}-panel`; });
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === target));
  if (target === 'master') loadMaster(state.masterResource).catch(error => toast(error.message));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function configureRole() {
  const user = state.user;
  const role = user.role;
  $('#dashboard-view').dataset.role = role;
  $('#role-badge').textContent = ROLE_LABELS[role] || role;
  $('#user-name').textContent = user.name || user.username;
  $('#user-avatar').textContent = String(user.name || user.username || 'S').trim().charAt(0).toUpperCase();
  $('#greeting-label').textContent = greeting();
  const context = role === 'siswa' ? `Siswa · ${user.classCode || 'Kelas belum diatur'}`
    : role === 'ortu' ? `Orang tua · NIS ${user.nis || state.overview?.scope?.nis || '—'}`
      : role === 'guru' ? `Guru · ${user.classCode && user.classCode !== '-' ? `Wali ${user.classCode}` : 'Mata pelajaran'}`
        : ROLE_LABELS[role] || role;
  $('#user-context').textContent = context;
  const today = new Date();
  $('#today-day').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).format(today);
  $('#today-full').textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }).format(today);
  const hero = ROLE_HERO[role] || ROLE_HERO.siswa;
  $('#hero-eyebrow').textContent = hero[0]; $('#hero-title').textContent = hero[1]; $('#hero-copy').textContent = hero[2]; $('#hero-mark').textContent = hero[3];
  document.querySelectorAll('.operational-link').forEach(link => { link.href = GAS_URL; });
  buildNavigation();
  buildMasterTabs();
}

function roleMetrics() {
  const o = state.overview;
  const d = state.dashboard;
  const metrics = o.metrics || {};
  if (o.role === 'superadmin') {
    const users = (d.roles || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
    return [['👥', 'Akun aktif', users, 'Semua peran'], ['✓', 'Presensi hari ini', metrics.attendanceToday, 'Seluruh sekolah'], ['#', 'Sheet tersinkron', d.migration?.sheet_count, 'Snapshot append-only'], ['📝', 'Soal disetujui', metrics.approvedQuestions, 'Bank soal UAS']];
  }
  if (o.role === 'kepsek') return [['🎒', 'Total siswa', metrics.students, 'Seluruh sekolah'], ['🏫', 'Rombel', metrics.classes, 'Kelas aktif'], ['✓', 'Presensi hari ini', metrics.attendanceToday, 'Seluruh siswa'], ['📝', 'Soal disetujui', metrics.approvedQuestions, 'Siap digunakan']];
  if (o.role === 'guru') return [['🎒', 'Siswa dipantau', metrics.students, o.scope.classCode || 'Sesuai mapel'], ['✓', 'Presensi hari ini', metrics.attendanceToday, 'Kelas binaan'], ['📿', 'Yaumiah hari ini', metrics.yaumiahToday, 'Catatan terbaru'], ['📝', 'Soal disetujui', metrics.approvedQuestions, 'Mapel diampu']];
  return [['✓', 'Presensi hari ini', metrics.attendanceToday, 'Catatan kehadiran'], ['📿', 'Yaumiah hari ini', metrics.yaumiahToday, 'Pembiasaan harian'], ['📚', 'Tugas kelas', metrics.tasks, 'Agenda tersedia'], ['📝', 'Riwayat nilai', metrics.grades, 'Hasil ujian']];
}

function renderSummary() {
  const metricGrid = $('#metric-grid');
  metricGrid.replaceChildren();
  roleMetrics().forEach(item => metricGrid.append(metricCard(...item)));
  const announcements = $('#announcement-list');
  announcements.replaceChildren();
  if (!state.overview.announcements?.length) announcements.append(emptyMessage('Belum ada pengumuman untuk akun ini.'));
  (state.overview.announcements || []).slice(0, 5).forEach(item => {
    const card = document.createElement('article'); card.className = 'announcement';
    const icon = document.createElement('span'); icon.className = 'announcement-icon'; icon.textContent = '📣';
    const copy = document.createElement('div');
    const title = document.createElement('b'); title.textContent = item.title || 'Pengumuman';
    const message = document.createElement('p'); message.textContent = item.message;
    copy.append(title, message); card.append(icon, copy); announcements.append(card);
  });
  createTable($('#summary-attendance'), TABLE_COLUMNS.attendance.slice(0, 4), (state.overview.recentAttendance || []).slice(0, 5), 'Belum ada presensi.');
  createTable($('#summary-grades'), TABLE_COLUMNS.grades.slice(0, 4), (state.overview.recentGrades || []).slice(0, 5), 'Belum ada nilai.');
}

function renderOperationalViews() {
  const o = state.overview;
  const isFamily = ['siswa', 'ortu'].includes(o.role);
  $('#attendance-title').textContent = isFamily ? 'Riwayat kehadiran siswa' : 'Monitoring presensi siswa';
  $('#attendance-copy').textContent = isFamily ? 'Hanya data NIS yang terhubung ke akun ini.' : 'Data siswa mengikuti cakupan kelas dan peran Anda.';
  registerTable('attendance-table', o.recentAttendance, TABLE_COLUMNS.attendance, 'Belum ada riwayat presensi.');
  $('#attendance-count').textContent = `${formatNumber(o.recentAttendance?.length)} data`;

  $('#yaumiah-title').textContent = o.role === 'ortu' ? 'Monitoring & paraf Yaumiah' : o.role === 'siswa' ? 'Lembar Yaumiah siswa' : 'Monitoring Yaumiah siswa';
  $('#yaumiah-copy').textContent = isFamily ? 'Capaian harian dibatasi untuk siswa yang terhubung.' : 'Pantau capaian, tilawah, dan murajaah siswa dalam cakupan Anda.';
  const yaumiahRows = o.recentYaumiah || [];
  const averageYaumiah = yaumiahRows.length ? Math.round(yaumiahRows.reduce((sum, row) => sum + Number(row.achievement || 0), 0) / yaumiahRows.length) : 0;
  const yaumiahCards = $('#yaumiah-cards'); yaumiahCards.replaceChildren();
  yaumiahCards.append(miniStat('Catatan Yaumiah', yaumiahRows.length, 'Riwayat dalam snapshot'), miniStat('Rata-rata capaian', `${averageYaumiah}%`, 'Dari data terlihat'), miniStat('Hari ini', o.metrics?.yaumiahToday || 0, 'Catatan hari ini'));
  registerTable('yaumiah-table', yaumiahRows, TABLE_COLUMNS.yaumiah, 'Belum ada catatan Yaumiah.');
  $('#yaumiah-count').textContent = `${formatNumber(yaumiahRows.length)} data`;

  registerTable('task-table', o.tasks, TABLE_COLUMNS.tasks, 'Belum ada tugas kelas.');
  registerTable('achievement-table', o.achievements, TABLE_COLUMNS.achievements, 'Belum ada prestasi tercatat.');
  $('#task-count').textContent = `${formatNumber(o.tasks?.length)} tugas`;
  $('#achievement-count').textContent = `${formatNumber(o.achievements?.length)} prestasi`;

  $('#grades-title').textContent = isFamily ? 'Hasil ujian siswa' : 'Rekap nilai ujian';
  $('#grades-copy').textContent = isFamily ? 'Nilai hanya berasal dari NIS yang terhubung ke akun.' : 'Rekap dibatasi sesuai peran, kelas, dan mata pelajaran.';
  const gradeRows = o.recentGrades || [];
  const averageGrade = gradeRows.length ? Math.round(gradeRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / gradeRows.length * 10) / 10 : 0;
  const highestGrade = gradeRows.length ? Math.max(...gradeRows.map(row => Number(row.score || 0))) : 0;
  const gradeCards = $('#grade-cards'); gradeCards.replaceChildren();
  gradeCards.append(miniStat('Riwayat nilai', gradeRows.length, 'Nilai dalam cakupan'), miniStat('Rata-rata', averageGrade, 'Seluruh nilai terlihat'), miniStat('Nilai tertinggi', highestGrade, 'Capaian terbaik'));
  registerTable('grade-table', gradeRows, TABLE_COLUMNS.grades, 'Belum ada nilai ujian.');
  $('#grade-count').textContent = `${formatNumber(gradeRows.length)} nilai`;

  registerTable('question-table', o.questionStats, TABLE_COLUMNS.questions, 'Belum ada statistik soal.');
  const sessions = $('#session-list'); sessions.replaceChildren();
  if (!o.examSessions?.length) sessions.append(emptyMessage('Belum ada sesi ujian dalam cakupan.'));
  (o.examSessions || []).forEach(item => {
    const card = document.createElement('article'); card.className = 'session-item';
    const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = `${item.subject} · ${item.classCode}`;
    const detail = document.createElement('p'); detail.textContent = item.note || 'Tanpa catatan sesi'; copy.append(title, detail);
    const badge = document.createElement('span'); badge.className = statusClass(item.status); badge.textContent = item.status;
    card.append(copy, badge); sessions.append(card);
  });
}

function renderIntegration() {
  const d = state.dashboard;
  const migration = d.migration;
  const grid = $('#migration-metrics'); grid.replaceChildren();
  grid.append(
    metricCard('≡', 'Baris tersalin', migration?.row_count || 0, 'Snapshot append-only'),
    metricCard('#', 'Sheet terarsip', migration?.sheet_count || 0, 'Checksum per sheet'),
    metricCard('◷', 'Sinkronisasi terakhir', migration ? formatDate(migration.imported_at) : 'Belum ada', 'Waktu Railway'),
    metricCard('◎', 'Sumber data', migration ? formatDate(migration.source_exported_at) : 'Belum ada', 'Waktu GAS')
  );
  $('#checksum-badge').textContent = migration ? `SHA ${String(migration.snapshot_checksum).slice(0, 10)}` : '—';
  const list = $('#sheet-list'); list.replaceChildren();
  (d.sheets || []).forEach(sheet => {
    const item = document.createElement('div'); item.className = 'sheet-item';
    const name = document.createElement('span'); name.textContent = sheet.name;
    const count = document.createElement('b'); count.textContent = `${formatNumber(sheet.count)} baris`;
    item.append(name, count); list.append(item);
  });
  if (!d.sheets?.length) list.append(emptyMessage('Belum ada snapshot.'));
}

function masterResources() {
  if (state.user.role === 'superadmin') return [['accounts', 'Semua akun'], ['students', 'Siswa'], ['teachers', 'Guru'], ['classes', 'Kelas'], ['subjects', 'Mata pelajaran']];
  if (state.user.role === 'kepsek') return [['students', 'Siswa'], ['teachers', 'Guru'], ['classes', 'Kelas'], ['subjects', 'Mata pelajaran']];
  return [['students', 'Siswa binaan']];
}

function buildMasterTabs() {
  const resources = masterResources();
  if (!resources.some(item => item[0] === state.masterResource)) state.masterResource = resources[0][0];
  const tabs = $('#master-tabs'); tabs.replaceChildren();
  resources.forEach(([id, label]) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'tab-button'; button.dataset.resource = id; button.textContent = label;
    button.addEventListener('click', () => loadMaster(id).catch(error => toast(error.message)));
    tabs.append(button);
  });
}

async function loadMaster(resource, search = '') {
  state.masterResource = resource;
  const result = await api(`/api/v1/master/${encodeURIComponent(resource)}?limit=200&search=${encodeURIComponent(search)}`);
  state.masterItems = result.items || [];
  $('#master-count').textContent = `${formatNumber(result.total)} data`;
  document.querySelectorAll('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.resource === resource));
  createTable($('#master-table'), MASTER_COLUMNS[resource] || [], state.masterItems, 'Data tidak ditemukan.');
}

function renderAll() {
  $('#school-name').textContent = state.dashboard.appName || 'SISKU';
  configureRole(); renderSummary(); renderOperationalViews(); renderIntegration();
}

async function loadDashboard() {
  const [dashboard, overview] = await Promise.all([api('/api/v1/dashboard'), api('/api/v1/overview')]);
  state.dashboard = dashboard; state.overview = overview;
  renderAll();
}

function showLogin() {
  $('#dashboard-view').hidden = true; $('#login-view').hidden = false;
  $('#pin').value = ''; $('#username').focus();
}

function showDashboard() {
  $('#login-view').hidden = true; $('#dashboard-view').hidden = false;
}

document.querySelectorAll('[data-view-link]').forEach(element => {
  element.addEventListener('click', event => { event.preventDefault(); showView(element.dataset.viewLink); });
});

document.querySelectorAll('[data-table-filter]').forEach(input => {
  input.addEventListener('input', event => {
    const id = event.currentTarget.dataset.tableFilter;
    const definition = state.tableRows[id];
    if (definition) createTable($(`#${id}`), definition.columns, filterRows(definition.rows, event.currentTarget.value), definition.emptyLabel);
  });
});

$('#security-shortcut').addEventListener('click', () => showView('security'));

$('#toggle-pin').addEventListener('click', () => {
  const input = $('#pin');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('#toggle-pin').textContent = visible ? 'Tampilkan' : 'Sembunyikan';
});

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#login-message'); const button = $('#login-button');
  message.textContent = ''; button.disabled = true; button.textContent = 'Memeriksa akun…';
  try {
    const result = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#username').value, pin: $('#pin').value }) });
    state.user = result.user; showDashboard(); await loadDashboard(); showView('summary');
    toast(`Selamat datang, ${state.user.name || state.user.username}.`);
  } catch (error) {
    message.textContent = error.message; $('#pin').select();
  } finally {
    button.disabled = false; button.textContent = 'Masuk ke SISKU';
  }
});

$('#logout-button').addEventListener('click', async () => {
  try { await api('/api/v1/auth/logout', { method: 'POST', body: '{}' }); } catch (_) {}
  state.user = null; state.dashboard = null; state.overview = null; showLogin();
});

$('#sync-gas-button').addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true; button.textContent = 'Menyinkronkan…';
  try {
    const result = await api('/api/v1/admin/sync-gas', { method: 'POST', body: '{}' });
    await loadDashboard(); toast(result.message || 'Sinkronisasi selesai.');
  } catch (error) { toast(error.message); }
  finally { button.disabled = false; button.textContent = 'Sinkronkan sekarang'; }
});

let masterSearchTimer;
$('#master-search').addEventListener('input', event => {
  window.clearTimeout(masterSearchTimer);
  masterSearchTimer = window.setTimeout(() => loadMaster(state.masterResource, event.target.value).catch(error => toast(error.message)), 280);
});

$('#change-pin-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#pin-message');
  const currentPin = $('#current-pin').value; const newPin = $('#new-pin').value; const confirmation = $('#confirm-pin').value;
  message.textContent = '';
  if (!/^\d{6}$/.test(newPin)) { message.textContent = 'PIN baru harus tepat 6 digit.'; return; }
  if (newPin !== confirmation) { message.textContent = 'Konfirmasi PIN baru tidak sama.'; return; }
  try {
    const result = await api('/api/v1/auth/change-pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) });
    event.target.reset(); toast(result.message || 'PIN berhasil diperbarui.'); showView('summary');
  } catch (error) { message.textContent = error.message; }
});

async function initialize() {
  try {
    const result = await api('/api/v1/auth/me');
    if (!result.authenticated || !result.user) return showLogin();
    state.user = result.user;
    showDashboard(); await loadDashboard(); showView('summary');
  } catch (_) { showLogin(); }
}

initialize();
