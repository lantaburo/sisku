'use strict';

const $ = selector => document.querySelector(selector);
const ROLE_LABELS = {
  siswa: 'Siswa', ortu: 'Orang Tua', guru: 'Guru / Wali Kelas',
  kepsek: 'Kepala Sekolah', superadmin: 'Superadmin'
};

const ROLE_NAV = {
  siswa: [
    ['summary', '🏠', 'Beranda'], ['attendance', '✓', 'Presensi'], ['yaumiah', '📿', 'Yaumiah'],
    ['tasks', '🏆', 'Tugas & Prestasi'], ['grades', '📝', 'Ujian & Nilai'], ['services', '▦', 'Layanan'], ['security', '🔑', 'Keamanan']
  ],
  ortu: [
    ['summary', '👨‍👩‍👦', 'Monitoring Anak'], ['attendance', '✓', 'Presensi'], ['yaumiah', '✍️', 'Yaumiah'],
    ['tasks', '🏅', 'Tugas & Prestasi'], ['grades', '📊', 'Nilai Anak'], ['services', '▦', 'Layanan'], ['security', '🔑', 'Keamanan']
  ],
  guru: [
    ['summary', '🏠', 'Beranda'], ['attendance', '📊', 'Monitoring Siswa'], ['yaumiah', '🕌', 'Yaumiah'],
    ['tasks', '📚', 'Tugas & Prestasi'], ['grades', '📝', 'Rekap Nilai'], ['questions', '📑', 'Bank Soal'],
    ['master', '👥', 'Data Siswa'], ['services', '▦', 'Layanan'], ['security', '🔑', 'Keamanan']
  ],
  kepsek: [
    ['summary', '📈', 'Dashboard Eksekutif'], ['attendance', '✓', 'Presensi'], ['yaumiah', '🕌', 'Supervisi Yaumiah'],
    ['grades', '📊', 'Rekap Akademik'], ['questions', '✅', 'Approval Soal'], ['master', '🏛️', 'Data Sekolah'],
    ['services', '▦', 'Layanan'], ['security', '🔑', 'Keamanan']
  ],
  superadmin: [
    ['summary', '🏠', 'Dashboard'], ['attendance', '✓', 'Presensi'], ['yaumiah', '📿', 'Yaumiah'],
    ['tasks', '📚', 'Tugas & Prestasi'], ['grades', '📝', 'Ujian & Nilai'], ['questions', '📑', 'Bank Soal'],
    ['management', '⚙️', 'Kelola Data'], ['master', '🏛️', 'Direktori'],
    ['services', '▦', 'Layanan'], ['integration', '⚡', 'GAS & Railway'], ['security', '🔑', 'Keamanan']
  ]
};

const SERVICE_FEATURES = {
  siswa: [['📝', 'CBT Soal UAS', 'Mulai ujian aktif sesuai kelas.', 'grades'], ['✉️', 'Pesan ke Admin', 'Kirim pertanyaan atau kendala ke superadmin.', 'services'], ['📍', 'Input Presensi', 'Catat kehadiran langsung di Railway.', 'attendance'], ['📿', 'Isi Yaumiah', 'Catat pembiasaan harian secara lengkap.', 'yaumiah']],
  ortu: [['✍️', 'Paraf Yaumiah', 'Tinjau dan beri catatan pembinaan untuk ananda.', 'yaumiah'], ['✉️', 'Pesan ke Admin', 'Sampaikan pertanyaan kepada superadmin.', 'services'], ['📊', 'Nilai Anak', 'Tinjau hasil ujian ananda.', 'grades']],
  guru: [['🕌', 'Atur Yaumiah', 'Pantau pembiasaan kelas binaan.', 'yaumiah'], ['📚', 'Kelola Tugas', 'Terbitkan tugas untuk siswa.', 'tasks'], ['🚀', 'Sesi Ujian', 'Buka atau tutup CBT sesuai mapel.', 'grades'], ['✉️', 'Pesan ke Admin', 'Kirim kendala operasional ke superadmin.', 'services']],
  kepsek: [['✅', 'Approval Soal', 'Tinjau dan setujui soal di Railway.', 'questions'], ['✉️', 'Pesan ke Admin', 'Sampaikan pesan internal ke superadmin.', 'services'], ['📊', 'Rekap Akademik', 'Tinjau hasil ujian sekolah.', 'grades']],
  superadmin: [['👥', 'Kelola Akun', 'Kelola akun guru, siswa, dan orang tua.', 'management'], ['📜', 'Integritas & Log', 'Pantau snapshot dan aktivitas aplikasi.', 'integration'], ['📣', 'Pengumuman', 'Kirim informasi dari Railway.', 'services'], ['📥', 'Pesan Masuk', 'Baca pesan internal pengguna.', 'services'], ['🏛️', 'Data Master', 'Kelola mapel dan kelas.', 'management'], ['📝', 'Bank Soal', 'Kelola soal dan approval.', 'questions']]
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
  parents: [
    { label: 'Nama orang tua', key: 'name' }, { label: 'Username', key: 'username' },
    { label: 'Kelas anak', key: 'classCode' }, { label: 'NIS terkait', key: 'nis' }
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
  masterResource: 'students', masterItems: [], tableRows: {}, loadingCount: 0,
  formOptions: null, managementResource: 'subjects', managementItems: [],
  managementEditing: null, managementLoaded: false, nativeQuestions: [], selectedQuestions: new Set(), exams: [], activeExam: null, attempts: [], taskEditing: null, questionEditing: null, questionImageData: '', yaumiahConfig: null, yaumiahEditing: null, attendanceConfig: null, attendanceCoords: null, activityFilter: '', organization: {}
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
      error.code = payload.code;
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
  if (target === 'management') prepareManagement().catch(error => toast(error.message));
  if (target === 'questions') {
    loadNativeQuestions().catch(error => toast(error.message));
    if (['guru', 'superadmin'].includes(state.user.role)) prepareQuestionForm().catch(error => toast(error.message));
  }
  if (target === 'grades') Promise.all([prepareExams(), loadAttempts()]).catch(error => toast(error.message));
  if (target === 'yaumiah') prepareYaumiah().catch(error => toast(error.message));
  if (target === 'attendance') loadAttendanceConfig().catch(error => toast(error.message));
  if (target === 'tasks' && ['guru', 'superadmin'].includes(state.user.role)) prepareOperationalOptions().catch(error => toast(error.message));
  if (target === 'services' && state.user.role === 'superadmin') loadAdminMessages().catch(error => toast(error.message));
  if (target === 'services') loadOrganization().catch(error => toast(error.message));
  if (target === 'integration' && state.user.role === 'superadmin') Promise.all([loadOrganization(), loadActivity(), loadAttendanceConfig()]).catch(error => toast(error.message));
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
  buildNavigation();
  buildMasterTabs();
  renderServiceCards();
  $('#question-form-surface').hidden = !['guru', 'superadmin'].includes(role);
  $('#bulk-question-surface').hidden = !['guru', 'superadmin'].includes(role);
  $('#bulk-approve-questions').hidden = !['kepsek', 'superadmin'].includes(role);
  $('#attendance-entry-surface').hidden = !['siswa', 'guru', 'superadmin'].includes(role);
  $('#attendance-nis-label').hidden = role === 'siswa';
  $('#attendance-nis').required = role !== 'siswa';
  $('#yaumiah-entry-surface').hidden = !['siswa', 'ortu'].includes(role);
  $('#yaumiah-entry-button').hidden = !['siswa', 'ortu'].includes(role);
  $('#yaumiah-parent-note-label').hidden = role !== 'ortu';
  $('#yaumiah-management').hidden = !['guru', 'superadmin'].includes(role);
  $('#task-entry-surface').hidden = !['guru', 'superadmin'].includes(role);
  $('#task-entry-button').hidden = !['guru', 'superadmin'].includes(role);
  $('#exam-session-form').hidden = !['guru', 'kepsek', 'superadmin'].includes(role);
  $('#communication-title').textContent = role === 'superadmin' ? 'Kirim pengumuman' : 'Pesan ke superadmin';
  $('#communication-targets-label').hidden = role !== 'superadmin';
  $('#communication-form').querySelector('button').textContent = role === 'superadmin' ? 'Terbitkan pengumuman' : 'Kirim pesan';
  $('#impersonation-banner').hidden = !user.isImpersonating;
  $('#impersonation-target').textContent = `${user.name || user.username} (${ROLE_LABELS[role] || role})`;
  const schoolToday = state.overview?.scope?.today || new Date().toISOString().slice(0, 10);
  $('#attendance-date').value = schoolToday; $('#yaumiah-date').value = schoolToday;
}

function renderServiceCards() {
  const container = $('#service-grid');
  container.replaceChildren();
  (SERVICE_FEATURES[state.user.role] || []).forEach(([icon, titleText, description, target]) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'service-card';
    const mark = document.createElement('span'); mark.textContent = icon;
    const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = titleText;
    const paragraph = document.createElement('p'); paragraph.textContent = description;
    const action = document.createElement('small'); action.textContent = 'Buka di Railway →';
    copy.append(title, paragraph, action); card.append(mark, copy); container.append(card);
    card.addEventListener('click', () => showView(target));
  });
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

  renderTasks(o.tasks || []);
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

function renderTasks(tasks) {
  const container = $('#task-table'); container.replaceChildren();
  if (!tasks.length) return container.append(emptyMessage('Belum ada tugas kelas.'));
  const table = document.createElement('table'); table.className = 'data-table';
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  ['Tugas', 'Mapel', 'Kelas', 'Deadline', 'Status', 'Aksi'].forEach(label => { const th = document.createElement('th'); th.textContent = label; headRow.append(th); }); head.append(headRow);
  const body = document.createElement('tbody');
  tasks.forEach(task => {
    const tr = document.createElement('tr');
    [task.title, task.subject, task.classCode, task.deadline ? formatDate(task.deadline) : '—', task.submissionStatus || task.status].forEach(value => { const td = document.createElement('td'); td.textContent = value || '—'; tr.append(td); });
    const actions = document.createElement('td'); actions.className = 'row-actions';
    if (state.user.role === 'siswa' && task.submissionStatus !== 'SELESAI') { const done = document.createElement('button'); done.type = 'button'; done.className = 'small-button'; done.textContent = 'Tandai selesai'; done.addEventListener('click', () => completeTask(task)); actions.append(done); }
    if (['guru', 'superadmin'].includes(state.user.role)) {
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'small-button'; edit.textContent = 'Ubah'; edit.addEventListener('click', () => editTask(task));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-button danger-button'; remove.textContent = 'Hapus'; remove.addEventListener('click', () => deleteTask(task)); actions.append(edit, remove);
    }
    tr.append(actions); body.append(tr);
  }); table.append(head, body); container.append(table);
}

async function completeTask(task) {
  try { const result = await nativeAction('UPDATE_TUGAS_STATUS', { id: task.id }); await loadDashboard(); toast(result.message); } catch (error) { toast(error.message); }
}

function editTask(task) {
  state.taskEditing = task; $('#task-subject').value = task.subject; $('#task-class').value = task.classCode; $('#task-title').value = task.title; $('#task-description').value = task.description || '';
  if (task.deadline) { const date = new Date(task.deadline); $('#task-deadline').value = Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  $('#task-entry-surface').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteTask(task) {
  if (!window.confirm(`Nonaktifkan tugas “${task.title}”?`)) return;
  try { const result = await nativeAction('DELETE_TUGAS', { id: task.id }); await loadDashboard(); toast(result.message); } catch (error) { toast(error.message); }
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
  if (state.user.role === 'superadmin') return [['accounts', 'Semua akun'], ['students', 'Siswa'], ['teachers', 'Guru'], ['parents', 'Orang Tua'], ['classes', 'Kelas'], ['subjects', 'Mata pelajaran']];
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
  if (['accounts', 'students', 'teachers', 'parents'].includes(resource) && state.user.role === 'superadmin') renderImpersonationDirectory(resource);
  else createTable($('#master-table'), MASTER_COLUMNS[resource] || [], state.masterItems, 'Data tidak ditemukan.');
}

function renderImpersonationDirectory(resource) {
  const container = $('#master-table'); container.replaceChildren();
  if (!state.masterItems.length) return container.append(emptyMessage('Data akun tidak ditemukan.'));
  const table = document.createElement('table'); table.className = 'data-table';
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  const columns = MASTER_COLUMNS[resource] || MASTER_COLUMNS.accounts;
  [...columns.map(column => column.label), 'Aksi'].forEach(label => { const th = document.createElement('th'); th.textContent = label; headRow.append(th); });
  head.append(headRow); const body = document.createElement('tbody');
  state.masterItems.forEach(item => {
    const tr = document.createElement('tr');
    columns.forEach(column => { const td = document.createElement('td'); const value = typeof column.value === 'function' ? column.value(item) : item[column.key]; td.textContent = value == null || value === '' ? '—' : String(value); tr.append(td); });
    const action = document.createElement('td');
    if (item.role !== 'superadmin' && item.active !== false) { const button = document.createElement('button'); button.type = 'button'; button.className = 'small-button'; button.textContent = 'Lihat sebagai'; button.addEventListener('click', () => startImpersonation(item)); action.append(button); }
    const log = document.createElement('button'); log.type = 'button'; log.className = 'small-button'; log.textContent = 'Log'; log.addEventListener('click', () => { state.activityFilter = item.username; showView('integration'); }); action.append(log);
    tr.append(action); body.append(tr);
  });
  table.append(head, body); container.append(table);
}

async function startImpersonation(item) {
  if (!window.confirm(`Masuk mode lihat sebagai ${item.name || item.username}? Semua aksi perubahan akan dikunci.`)) return;
  const result = await api('/api/v1/admin/impersonate', { method: 'POST', body: JSON.stringify({ username: item.username }) });
  state.user = result.user; state.formOptions = null; state.masterItems = []; state.managementLoaded = false;
  await loadDashboard(); showView('summary'); toast(`Sekarang melihat sebagai ${state.user.name || state.user.username}.`);
}

const MANAGEMENT_CONFIG = {
  subjects: {
    label: 'Mata pelajaran', resource: 'subjects', create: 'REGISTER_MAPEL', update: 'UPDATE_MAPEL', remove: 'DELETE_MAPEL',
    columns: [{ label: 'Kode', key: 'code' }, { label: 'Mata pelajaran', key: 'name' }, { label: 'Kelompok', key: 'group' }],
    fields: [
      { name: 'code', label: 'Kode mapel', required: true, maxLength: 40 },
      { name: 'name', label: 'Nama mapel', required: true, maxLength: 120 },
      { name: 'group', label: 'Kelompok', type: 'select', options: [['Umum', 'Umum'], ['Agama', 'Agama'], ['Muatan Lokal', 'Muatan Lokal']] }
    ]
  },
  classes: {
    label: 'Kelas', resource: 'classes', create: 'REGISTER_KELAS', update: 'UPDATE_KELAS', remove: 'DELETE_KELAS',
    columns: [{ label: 'Kode', key: 'code' }, { label: 'Nama kelas', key: 'name' }, { label: 'Wali kelas', key: 'homeroom' }, { label: 'Kapasitas', key: 'capacity' }],
    fields: [
      { name: 'code', label: 'Kode kelas', required: true, maxLength: 40 },
      { name: 'name', label: 'Nama kelas', required: true, maxLength: 120 },
      { name: 'homeroom', label: 'Wali kelas', type: 'select', optionsKey: 'teachers', empty: '-' },
      { name: 'capacity', label: 'Kapasitas', type: 'number', min: 1, max: 100, defaultValue: '30' }
    ]
  },
  teachers: {
    label: 'Akun guru', resource: 'teachers', create: 'REGISTER_GURU', update: 'UPDATE_GURU', remove: 'DELETE_GURU',
    columns: [{ label: 'NIP', key: 'nip' }, { label: 'Username', key: 'username' }, { label: 'Nama guru', key: 'name' }, { label: 'Mapel', key: 'subjects' }, { label: 'Wali kelas', key: 'classCode' }],
    fields: [
      { name: 'nip', label: 'NIP', required: true, maxLength: 40 },
      { name: 'username', label: 'Username', required: true, maxLength: 120 },
      { name: 'name', label: 'Nama guru', required: true, maxLength: 160 },
      { name: 'subjects', label: 'Mata pelajaran', required: true, maxLength: 300, placeholder: 'Pisahkan beberapa mapel dengan koma' },
      { name: 'classCode', label: 'Wali kelas', type: 'select', optionsKey: 'classes', empty: '-' },
      { name: 'pin', label: 'PIN 6–12 digit', type: 'password', maxLength: 12, createRequired: true, placeholder: 'Kosongkan jika tidak diubah' }
    ]
  },
  student_accounts: {
    label: 'Akun siswa & orang tua', resource: 'student_accounts', create: 'REGISTER_SISWA', update: 'UPDATE_SISWA', remove: 'DELETE_SISWA',
    columns: [{ label: 'NIS', key: 'nis' }, { label: 'Nama siswa', key: 'name' }, { label: 'Kelas', key: 'classCode' }, { label: 'Akun siswa', key: 'username' }, { label: 'Akun orang tua', key: 'parentUsername' }, { label: 'Nama orang tua', key: 'parentName' }],
    fields: [
      { name: 'nis', label: 'NIS', required: true, maxLength: 40 },
      { name: 'name', label: 'Nama siswa', required: true, maxLength: 160 },
      { name: 'classCode', label: 'Kelas', type: 'select', optionsKey: 'classes', required: true },
      { name: 'username', label: 'Username siswa', required: true, maxLength: 120 },
      { name: 'parentUsername', label: 'Username orang tua', required: true, maxLength: 120 },
      { name: 'parentName', label: 'Nama orang tua / wali', required: true, maxLength: 160 },
      { name: 'pinStudent', label: 'PIN siswa 6–12 digit', type: 'password', maxLength: 12, createRequired: true, placeholder: 'Kosongkan jika tidak diubah' },
      { name: 'pinParent', label: 'PIN orang tua 6–12 digit', type: 'password', maxLength: 12, createRequired: true, placeholder: 'Kosongkan jika tidak diubah' }
    ]
  }
};

async function nativeAction(action, data) {
  return api('/api/v1/native/action', { method: 'POST', body: JSON.stringify({ action, data }) });
}

async function loadFormOptions(force = false) {
  if (state.formOptions && !force) return state.formOptions;
  state.formOptions = await api('/api/v1/form-options');
  return state.formOptions;
}

function optionPairs(key) {
  const values = state.formOptions && state.formOptions[key] || [];
  if (key === 'teachers') return values.map(item => [item.name || item.nip, item.name || item.nip]);
  return values.map(item => [item.code || item.name, item.name ? `${item.code || ''} — ${item.name}`.replace(/^ — /, '') : item.code]);
}

function buildManagementTabs() {
  const tabs = $('#management-tabs');
  tabs.replaceChildren();
  Object.entries(MANAGEMENT_CONFIG).forEach(([id, config]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tab-button'; button.dataset.managementResource = id; button.textContent = config.label;
    button.addEventListener('click', () => loadManagement(id).catch(error => toast(error.message)));
    tabs.append(button);
  });
}

function buildManagementForm() {
  const config = MANAGEMENT_CONFIG[state.managementResource];
  const editing = state.managementEditing;
  $('#management-form-eyebrow').textContent = editing ? 'Ubah data' : 'Data baru';
  $('#management-form-title').textContent = `${editing ? 'Ubah' : 'Tambah'} ${config.label}`;
  $('#management-message').textContent = '';
  const fields = $('#management-form-fields');
  fields.replaceChildren();
  config.fields.forEach(field => {
    const label = document.createElement('label'); label.textContent = field.label;
    let control;
    if (field.type === 'select') {
      control = document.createElement('select');
      const empty = document.createElement('option'); empty.value = field.empty || ''; empty.textContent = field.empty || 'Pilih…'; control.append(empty);
      const options = field.options || optionPairs(field.optionsKey);
      options.forEach(([optionValue, optionLabel]) => {
        const option = document.createElement('option'); option.value = optionValue; option.textContent = optionLabel; control.append(option);
      });
    } else {
      control = document.createElement('input'); control.type = field.type || 'text';
    }
    control.name = field.name;
    if (field.maxLength) control.maxLength = field.maxLength;
    if (field.min) control.min = field.min;
    if (field.max) control.max = field.max;
    if (field.placeholder) control.placeholder = field.placeholder;
    control.required = Boolean(field.required || (!editing && field.createRequired));
    const current = editing && editing[field.name] != null ? editing[field.name] : (field.defaultValue || '');
    control.value = current;
    if (control.tagName === 'SELECT' && current && control.value !== String(current)) {
      const option = document.createElement('option'); option.value = current; option.textContent = current; control.append(option); control.value = current;
    }
    label.append(control); fields.append(label);
  });
}

function managementValues() {
  const values = {};
  $('#management-form').querySelectorAll('[name]').forEach(control => { values[control.name] = control.value.trim(); });
  return values;
}

function managementPayload(values) {
  const editing = state.managementEditing;
  if (state.managementResource === 'subjects') return { oldKode: editing?.code, kode: values.code, nama: values.name, kelompok: values.group || 'Umum' };
  if (state.managementResource === 'classes') return { oldKode: editing?.code, kode: values.code, nama: values.name, wali: values.homeroom || '-', kapasitas: Number(values.capacity) || 30 };
  if (state.managementResource === 'teachers') return { oldNip: editing?.nip, nip: values.nip, username: values.username, nama: values.name, mapel: values.subjects, waliKelas: values.classCode || '-', pin: values.pin || '' };
  return {
    oldNis: editing?.nis, nis: values.nis, nama: values.name, kelas: values.classCode,
    akunSiswa: values.username || values.nis, akunOrtu: values.parentUsername || `ortu.${values.nis}`,
    namaOrtu: values.parentName || `Wali ${values.name}`, pinSiswa: values.pinStudent || '', pinOrtu: values.pinParent || ''
  };
}

function optimisticManagementRow(values) {
  if (state.managementResource === 'subjects') return { code: values.code, name: values.name, group: values.group || 'Umum' };
  if (state.managementResource === 'classes') return { code: values.code, name: values.name, homeroom: values.homeroom || '-', capacity: Number(values.capacity) || 30 };
  if (state.managementResource === 'teachers') return { nip: values.nip, username: values.username, name: values.name, subjects: values.subjects, classCode: values.classCode || '-' };
  return { nis: values.nis, name: values.name, classCode: values.classCode, username: values.username || values.nis, parentUsername: values.parentUsername || `ortu.${values.nis}`, parentName: values.parentName || `Wali ${values.name}` };
}

function managementIdentity(row) {
  if (state.managementResource === 'subjects' || state.managementResource === 'classes') return row.code;
  if (state.managementResource === 'teachers') return row.nip;
  return row.nis;
}

function renderManagementTable(query = '') {
  const container = $('#management-table'); container.replaceChildren();
  const config = MANAGEMENT_CONFIG[state.managementResource];
  const rows = filterRows(state.managementItems, query);
  if (!rows.length) return container.append(emptyMessage('Data tidak ditemukan.'));
  const table = document.createElement('table'); table.className = 'data-table';
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  [...config.columns, { label: 'Aksi' }].forEach(column => { const th = document.createElement('th'); th.textContent = column.label; headRow.append(th); });
  head.append(headRow); const body = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    config.columns.forEach(column => { const td = document.createElement('td'); td.textContent = row[column.key] == null || row[column.key] === '' ? '—' : String(row[column.key]); tr.append(td); });
    const actions = document.createElement('td'); actions.className = 'row-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'small-button'; edit.textContent = 'Ubah'; edit.addEventListener('click', () => startManagementEdit(row));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-button danger-button'; remove.textContent = 'Hapus'; remove.addEventListener('click', () => deleteManagementRow(row));
    actions.append(edit, remove); tr.append(actions); body.append(tr);
  });
  table.append(head, body); container.append(table);
}

function startManagementEdit(row) {
  state.managementEditing = { ...row };
  buildManagementForm();
  $('.management-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetManagementForm() {
  state.managementEditing = null;
  buildManagementForm();
}

async function deleteManagementRow(row) {
  const config = MANAGEMENT_CONFIG[state.managementResource];
  const identity = managementIdentity(row);
  if (!window.confirm(`Nonaktifkan ${config.label} “${identity}”? Riwayat tetap disimpan di PostgreSQL.`)) return;
  const data = state.managementResource === 'subjects' || state.managementResource === 'classes' ? { kode: identity }
    : state.managementResource === 'teachers' ? { nip: identity } : { nis: identity };
  try {
    const result = await nativeAction(config.remove, data);
    state.managementItems = state.managementItems.filter(item => managementIdentity(item) !== identity);
    renderManagementTable($('#management-search').value); resetManagementForm();
    toast(result.message || 'Data berhasil dinonaktifkan.');
    scheduleManagementRefresh();
  } catch (error) { toast(error.message); }
}

function scheduleManagementRefresh() {
  state.formOptions = null;
}

async function loadManagement(resource = state.managementResource, force = false) {
  state.managementResource = resource;
  state.managementEditing = null;
  await loadFormOptions(force);
  const config = MANAGEMENT_CONFIG[resource];
  const result = await api(`/api/v1/master/${encodeURIComponent(config.resource)}?limit=200`);
  state.managementItems = result.items || [];
  state.managementLoaded = true;
  document.querySelectorAll('[data-management-resource]').forEach(button => button.classList.toggle('active', button.dataset.managementResource === resource));
  buildManagementForm(); renderManagementTable($('#management-search').value);
}

async function prepareManagement() {
  buildManagementTabs();
  if (!state.managementLoaded) await loadManagement(state.managementResource);
}

function newQuestionId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 6) : String(Date.now()).slice(-6);
  return `SOAL-${stamp}-${suffix}`.toUpperCase();
}

function resetQuestionForm() {
  state.questionEditing = null;
  state.questionImageData = '';
  $('#question-form').reset();
  $('#question-id').value = newQuestionId();
  $('#question-id').readOnly = false;
  $('#question-message').textContent = '';
  updateQuestionType();
}

function updateQuestionType() {
  const multipleChoice = ['PG', 'PGK'].includes($('#question-type').value);
  ['a', 'b', 'c', 'd', 'e'].forEach(letter => { $(`#question-option-${letter}`).closest('label').hidden = !multipleChoice; });
  $('#question-key').placeholder = multipleChoice ? 'Contoh: A' : 'Jawaban acuan (opsional)';
}

async function prepareQuestionForm() {
  const options = await loadFormOptions();
  const subject = $('#question-subject'); const selectedSubject = subject.value; subject.replaceChildren();
  (options.subjects || []).forEach(item => { const option = document.createElement('option'); option.value = item.name || item.code; option.textContent = item.name ? `${item.code || ''} — ${item.name}`.replace(/^ — /, '') : item.code; subject.append(option); });
  const classSelect = $('#question-class'); const selectedClass = classSelect.value; classSelect.replaceChildren();
  const allClasses = document.createElement('option'); allClasses.value = 'SEMUA'; allClasses.textContent = 'SEMUA — seluruh kelas'; classSelect.append(allClasses);
  (options.classes || []).forEach(item => { const option = document.createElement('option'); option.value = item.code || item.name; option.textContent = item.name ? `${item.code || ''} — ${item.name}`.replace(/^ — /, '') : item.code; classSelect.append(option); });
  if (selectedSubject) subject.value = selectedSubject;
  if (selectedClass) classSelect.value = selectedClass;
  fillSelect($('#bulk-question-subject'), options.subjects || []);
  fillSelect($('#bulk-question-class'), options.classes || [], true);
  if (!$('#question-id').value) resetQuestionForm();
}

function renderNativeQuestions(query = '') {
  const container = $('#native-question-table'); container.replaceChildren();
  const rows = filterRows(state.nativeQuestions, query);
  $('#native-question-count').textContent = `${formatNumber(rows.length)} soal`;
  if (!rows.length) return container.append(emptyMessage('Belum ada soal yang sesuai.'));
  const table = document.createElement('table'); table.className = 'data-table question-data-table';
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  ['Pilih', 'ID / Mapel', 'Pertanyaan & opsi', 'Kelas', 'Status', 'Pembuat', 'Aksi'].forEach(label => { const th = document.createElement('th'); th.textContent = label; headRow.append(th); });
  head.append(headRow); const body = document.createElement('tbody');
  rows.forEach(item => {
    const tr = document.createElement('tr');
    const selectCell = document.createElement('td'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = state.selectedQuestions.has(item.id); checkbox.addEventListener('change', () => { if (checkbox.checked) state.selectedQuestions.add(item.id); else state.selectedQuestions.delete(item.id); }); selectCell.append(checkbox);
    const identity = document.createElement('td'); const id = document.createElement('b'); id.textContent = item.id; const subject = document.createElement('small'); subject.textContent = `${item.subject}${item.packageId ? ` · ${item.packageId}` : ''}`; identity.append(id, subject);
    const question = document.createElement('td'); const text = document.createElement('b'); text.textContent = item.question; const options = document.createElement('small');
    const optionText = Object.entries(item.options || {}).filter(([, answer]) => answer).map(([key, answer]) => `${key}. ${answer}`).join(' · ');
    options.textContent = `${item.type || 'PG'}${optionText ? ` · ${optionText}` : ''}${item.answerKey ? ` · Kunci: ${item.answerKey}` : ''}`; question.append(text, options);
    const classCell = document.createElement('td'); classCell.textContent = item.classCode || 'SEMUA';
    const statusCell = document.createElement('td'); const status = document.createElement('span'); status.className = statusClass(item.status); status.textContent = item.status || 'Menunggu'; statusCell.append(status);
    if (item.revisionNote) { const note = document.createElement('small'); note.className = 'revision-note'; note.textContent = item.revisionNote; statusCell.append(note); }
    const creator = document.createElement('td'); creator.textContent = item.creator || 'Migrasi lama';
    const actions = document.createElement('td'); actions.className = 'row-actions';
    if (['guru', 'superadmin'].includes(state.user.role)) {
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'small-button'; edit.textContent = 'Ubah'; edit.addEventListener('click', () => editNativeQuestion(item)); actions.append(edit);
    }
    if (['kepsek', 'superadmin'].includes(state.user.role) && item.status !== 'Approved') {
      const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'small-button'; approve.textContent = 'Setujui'; approve.addEventListener('click', () => updateQuestionApproval(item, 'Approved'));
      actions.append(approve);
    }
    if (['kepsek', 'superadmin'].includes(state.user.role)) {
      const revise = document.createElement('button'); revise.type = 'button'; revise.className = 'small-button'; revise.textContent = 'Revisi'; revise.addEventListener('click', () => requestQuestionRevision(item)); actions.append(revise);
    }
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-button danger-button'; remove.textContent = 'Nonaktifkan'; remove.addEventListener('click', () => deleteNativeQuestion(item)); actions.append(remove);
    if (item.packageId) { const removePackage = document.createElement('button'); removePackage.type = 'button'; removePackage.className = 'small-button danger-button'; removePackage.textContent = 'Hapus paket'; removePackage.addEventListener('click', () => deleteQuestionPackage(item)); actions.append(removePackage); }
    tr.append(selectCell, identity, question, classCell, statusCell, creator, actions); body.append(tr);
  });
  table.append(head, body); container.append(table);
}

function editNativeQuestion(item) {
  state.questionEditing = item;
  $('#question-id').value = item.id; $('#question-id').readOnly = true; $('#question-type').value = item.type || 'PG'; $('#question-level').value = item.level || 'C3';
  $('#question-subject').value = item.subject; $('#question-class').value = item.classCode || 'SEMUA'; $('#question-kd').value = item.competency || ''; $('#question-text').value = item.question || '';
  for (const key of ['a', 'b', 'c', 'd', 'e']) $(`#question-option-${key}`).value = item.options?.[key.toUpperCase()] || '';
  $('#question-key').value = item.answerKey || ''; updateQuestionType(); $('#question-form-surface').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#question-image-url').value = /^https?:/i.test(item.imageUrl || '') ? item.imageUrl : ''; state.questionImageData = /^data:image\//i.test(item.imageUrl || '') ? item.imageUrl : '';
}

async function loadNativeQuestions() {
  const result = await api('/api/v1/questions');
  state.nativeQuestions = result.items || [];
  renderNativeQuestions($('#native-question-search').value);
}

function adjustQuestionStats(item, nextStatus, deleting = false) {
  const stat = (state.overview.questionStats || []).find(entry => entry.subject === item.subject);
  if (!stat) return;
  if (item.status === 'Approved') stat.approved = Math.max(0, stat.approved - 1);
  else stat.pending = Math.max(0, stat.pending - 1);
  if (deleting) stat.total = Math.max(0, stat.total - 1);
  else if (nextStatus === 'Approved') stat.approved += 1;
  else stat.pending += 1;
  registerTable('question-table', state.overview.questionStats, TABLE_COLUMNS.questions, 'Belum ada statistik soal.');
}

async function updateQuestionApproval(item, nextStatus, note = '') {
  try {
    const result = await nativeAction('UPDATE_APPROVAL_SOAL', { id: item.id, statusApproval: nextStatus, catatanRevisi: note });
    adjustQuestionStats(item, nextStatus); item.status = nextStatus; item.revisionNote = note;
    renderNativeQuestions($('#native-question-search').value); toast(result.message || 'Status soal diperbarui.');
  } catch (error) { toast(error.message); }
}

function requestQuestionRevision(item) {
  const note = window.prompt('Tuliskan catatan revisi untuk pembuat soal:', item.revisionNote || '');
  if (note == null) return;
  if (note.trim().length < 3) return toast('Catatan revisi perlu diisi.');
  updateQuestionApproval(item, 'Perlu Revisi', note.trim());
}

async function deleteNativeQuestion(item) {
  if (!window.confirm(`Nonaktifkan soal “${item.id}”? Riwayat audit tetap disimpan.`)) return;
  try {
    const result = await nativeAction('DELETE_SOAL', { id: item.id });
    adjustQuestionStats(item, '', true); state.nativeQuestions = state.nativeQuestions.filter(question => question.id !== item.id);
    renderNativeQuestions($('#native-question-search').value); toast(result.message || 'Soal dinonaktifkan.');
  } catch (error) { toast(error.message); }
}

async function deleteQuestionPackage(item) {
  if (!window.confirm(`Nonaktifkan seluruh soal dalam paket “${item.packageId}”?`)) return;
  try { const result = await nativeAction('DELETE_SOAL_PACKAGE', { paketId: item.packageId }); state.selectedQuestions.clear(); await Promise.all([loadNativeQuestions(), loadDashboard()]); toast(result.message); } catch (error) { toast(error.message); }
}

function fillSelect(select, items, includeAll = false) {
  const current = select.value; select.replaceChildren();
  if (includeAll) { const all = document.createElement('option'); all.value = 'SEMUA'; all.textContent = 'SEMUA'; select.append(all); }
  items.forEach(item => { const option = document.createElement('option'); option.value = item.name || item.code; option.textContent = item.name ? `${item.code || ''} — ${item.name}`.replace(/^ — /, '') : item.code; select.append(option); });
  if (current) select.value = current;
}

async function prepareYaumiah() {
  const result = await api('/api/v1/yaumiah/config'); state.yaumiahConfig = result;
  const list = $('#yaumiah-item-list'); list.replaceChildren();
  (result.items || []).forEach(item => {
    const label = document.createElement('label'); label.className = 'check-item';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = item.id; input.dataset.yaumiahItem = item.id;
    const text = document.createElement('span'); text.textContent = `${item.name} · ${item.points} poin`; label.append(input, text); list.append(label);
  });
  if (!result.items?.length) list.append(emptyMessage('Belum ada aktivitas Yaumiah terstruktur; capaian dapat diisi manual.'));
  if (['guru', 'superadmin'].includes(state.user.role)) {
    const options = await loadFormOptions();
    fillSelect($('#yaumiah-master-class'), options.classes || [], state.user.role === 'superadmin');
    fillSelect($('#tahfidz-class'), options.classes || [], state.user.role === 'superadmin');
    if (state.user.role === 'guru' && state.user.classCode && state.user.classCode !== '-') { $('#yaumiah-master-class').value = state.user.classCode; $('#tahfidz-class').value = state.user.classCode; }
    const manager = $('#yaumiah-master-list'); manager.replaceChildren();
    (result.items || []).forEach(item => {
      const card = document.createElement('article'); card.className = 'exam-card'; const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = item.name; const meta = document.createElement('p'); meta.textContent = `${item.category} · ${item.points} poin · ${item.class_code}`; copy.append(title, meta);
      const actions = document.createElement('div'); actions.className = 'row-actions'; const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'small-button'; edit.textContent = 'Ubah'; edit.addEventListener('click', () => editYaumiahItem(item)); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-button danger-button'; remove.textContent = 'Hapus'; remove.addEventListener('click', () => deleteYaumiahItem(item)); actions.append(edit, remove); card.append(copy, actions); manager.append(card);
    });
  }
  list.addEventListener('change', updateYaumiahAchievement, { once: true });
}

function editYaumiahItem(item) {
  state.yaumiahEditing = item; $('#yaumiah-master-id').value = item.id; $('#yaumiah-master-name').value = item.name; $('#yaumiah-master-category').value = item.category; $('#yaumiah-master-class').value = item.class_code; $('#yaumiah-master-points').value = item.points;
  $('#yaumiah-master-form button').textContent = 'Simpan perubahan';
}

async function deleteYaumiahItem(item) {
  if (!window.confirm(`Nonaktifkan aktivitas “${item.name}”?`)) return;
  try { const result = await nativeAction('DELETE_YAUMIAH', { id: item.id }); await prepareYaumiah(); toast(result.message); } catch (error) { toast(error.message); }
}

function updateYaumiahAchievement() {
  const controls = Array.from(document.querySelectorAll('[data-yaumiah-item]'));
  if (controls.length) $('#yaumiah-achievement').value = Math.round(controls.filter(control => control.checked).length / controls.length * 100);
  $('#yaumiah-item-list').addEventListener('change', updateYaumiahAchievement, { once: true });
}

async function prepareOperationalOptions() {
  const options = await loadFormOptions();
  fillSelect($('#task-subject'), options.subjects || []);
  fillSelect($('#task-class'), options.classes || [], true);
  fillSelect($('#exam-subject'), options.subjects || []);
  fillSelect($('#exam-class'), options.classes || [], true);
}

async function prepareExams() {
  if (['guru', 'kepsek', 'superadmin'].includes(state.user.role)) await prepareOperationalOptions();
  const result = await api('/api/v1/exams'); state.exams = result.items || []; renderExams();
}

async function loadAttempts() {
  const result = await api('/api/v1/attempts');
  state.attempts = result.items || []; renderAttempts();
}

function renderAttempts() {
  const container = $('#attempt-list'); container.replaceChildren();
  $('#attempt-count').textContent = `${formatNumber(state.attempts.length)} hasil`;
  if (!state.attempts.length) return container.append(emptyMessage('Belum ada hasil CBT native.'));
  state.attempts.forEach(attempt => {
    const card = document.createElement('article'); card.className = 'exam-card';
    const copy = document.createElement('div'); copy.className = 'attempt-card-copy';
    const title = document.createElement('b'); title.textContent = `${attempt.subject} · Nilai ${attempt.score}`;
    const meta = document.createElement('small'); meta.textContent = `${attempt.studentName || attempt.studentNis} · ${attempt.classCode} · ${formatDate(attempt.submittedAt)}`;
    copy.append(title, meta);
    if (attempt.complaint) {
      const complaint = document.createElement('small');
      complaint.textContent = `Komplain ${attempt.complaint.status}: ${attempt.complaint.argument}${attempt.complaint.response ? ` · Tanggapan: ${attempt.complaint.response}` : ''}`;
      copy.append(complaint);
    }
    const actions = document.createElement('div'); actions.className = 'attempt-actions';
    if (['siswa', 'ortu'].includes(state.user.role)) {
      const complain = document.createElement('button'); complain.type = 'button'; complain.className = 'small-button'; complain.textContent = attempt.complaint ? 'Ubah komplain' : 'Ajukan komplain'; complain.addEventListener('click', () => submitGradeComplaint(attempt)); actions.append(complain);
    }
    if (['guru', 'superadmin'].includes(state.user.role)) {
      const essay = document.createElement('button'); essay.type = 'button'; essay.className = 'small-button'; essay.textContent = 'Nilai esai'; essay.addEventListener('click', () => gradeEssay(attempt));
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'small-button'; edit.textContent = 'Koreksi nilai'; edit.addEventListener('click', () => updateExamGrade(attempt)); actions.append(essay, edit);
      if (attempt.complaint?.status === 'KOMPLAIN') { const resolve = document.createElement('button'); resolve.type = 'button'; resolve.className = 'small-button'; resolve.textContent = 'Selesaikan komplain'; resolve.addEventListener('click', () => resolveGradeComplaint(attempt)); actions.append(resolve); }
    }
    card.append(copy, actions); container.append(card);
  });
}

async function submitGradeComplaint(attempt) {
  const argument = window.prompt('Jelaskan komplain nilai (minimal 20 karakter):', attempt.complaint?.argument || '');
  if (argument == null) return;
  if (argument.trim().length < 20) return toast('Alasan komplain minimal 20 karakter.');
  try { const result = await nativeAction('SUBMIT_GRADE_COMPLAINT', { attemptId: attempt.id, argument: argument.trim() }); await loadAttempts(); toast(result.message); } catch (error) { toast(error.message); }
}

async function resolveGradeComplaint(attempt) {
  const rawScore = window.prompt('Nilai akhir setelah pemeriksaan:', String(attempt.score)); if (rawScore == null) return;
  const response = window.prompt('Tanggapan guru terhadap komplain:', ''); if (response == null) return;
  try { const result = await nativeAction('RESOLVE_GRADE_COMPLAINT', { complaintId: attempt.complaint.id, newScore: Number(rawScore), teacherResponse: response.trim() }); await Promise.all([loadAttempts(), loadDashboard()]); toast(result.message); } catch (error) { toast(error.message); }
}

async function updateExamGrade(attempt) {
  const rawScore = window.prompt('Masukkan nilai akhir 0–100:', String(attempt.score)); if (rawScore == null) return;
  const note = window.prompt('Catatan koreksi nilai:', attempt.gradingNote || ''); if (note == null) return;
  try { const result = await nativeAction('UPDATE_EXAM_GRADE', { attemptId: attempt.id, score: Number(rawScore), note }); await Promise.all([loadAttempts(), loadDashboard()]); toast(result.message); } catch (error) { toast(error.message); }
}

async function gradeEssay(attempt) {
  try {
    const result = await api(`/api/v1/attempts/${encodeURIComponent(attempt.id)}/essay`);
    if (!result.questions?.length) return toast('Attempt ini tidak memiliki soal esai.');
    const scores = {};
    for (const question of result.questions) {
      const raw = window.prompt(`${question.question}\n\nJawaban: ${question.answer || '(kosong)'}\n\nSkor 0–100:`, String(question.score || 0));
      if (raw == null) return;
      scores[question.id] = Number(raw);
    }
    const objectiveWeight = Number(window.prompt('Bobot soal objektif (%):', '50')); if (!Number.isFinite(objectiveWeight)) return;
    const essayWeight = 100 - objectiveWeight;
    const note = window.prompt('Catatan penilaian esai (opsional):', '') ?? '';
    const saved = await nativeAction('GRADE_ESSAY', { attemptId: attempt.id, scores, note, objectiveWeight, essayWeight });
    await Promise.all([loadAttempts(), loadDashboard()]); toast(`${saved.message} Nilai akhir: ${saved.data?.score}.`);
  } catch (error) { toast(error.message); }
}

function renderExams() {
  const container = $('#native-exam-list'); container.replaceChildren();
  if (!state.exams.length) return container.append(emptyMessage(state.user.role === 'siswa' ? 'Belum ada sesi ujian aktif untuk kelas Anda.' : 'Belum ada sesi ujian native.'));
  state.exams.forEach(exam => {
    const card = document.createElement('article'); card.className = 'exam-card';
    const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = `${exam.subject} · ${exam.classCode}`;
    const detail = document.createElement('p'); detail.textContent = `${exam.questionCount} soal · ${exam.note || 'Tanpa catatan'}${exam.accessToken ? ` · Token: ${exam.accessToken}` : ''}`; copy.append(title, detail);
    const actions = document.createElement('div'); actions.className = 'row-actions';
    const status = document.createElement('span'); status.className = statusClass(exam.status); status.textContent = exam.status; actions.append(status);
    if (state.user.role === 'siswa' && exam.status === 'OPEN') {
      const start = document.createElement('button'); start.type = 'button'; start.className = 'small-button'; start.textContent = 'Mulai ujian'; start.disabled = !exam.questionCount; start.addEventListener('click', () => startExam(exam)); actions.append(start);
    }
    if (['guru', 'kepsek', 'superadmin'].includes(state.user.role) && exam.status === 'OPEN') {
      const close = document.createElement('button'); close.type = 'button'; close.className = 'small-button danger-button'; close.textContent = 'Tutup sesi'; close.addEventListener('click', () => closeExam(exam)); actions.append(close);
    }
    card.append(copy, actions); container.append(card);
  });
}

async function startExam(exam) {
  try {
    const token = exam.requiresToken ? window.prompt(`Masukkan token ujian ${exam.subject}:`, '') : '';
    if (exam.requiresToken && token == null) return;
    const result = await api(`/api/v1/exams/${encodeURIComponent(exam.id)}/start`, { method: 'POST', body: JSON.stringify({ token: token || '' }) });
    state.activeExam = { ...result, exam };
    $('#exam-runner-title').textContent = `${result.session.subject} · ${result.session.classCode}`;
    const list = $('#exam-question-list'); list.replaceChildren();
    result.questions.forEach((question, index) => {
      const card = document.createElement('fieldset'); card.className = 'exam-question'; card.dataset.questionId = question.id;
      const legend = document.createElement('legend'); legend.textContent = `${index + 1}. ${question.question}`; card.append(legend);
      if (question.imageUrl) { const picture = document.createElement('img'); picture.src = question.imageUrl; picture.alt = `Gambar soal ${index + 1}`; picture.className = 'question-image'; card.append(picture); }
      const entries = Object.entries(question.options || {}).filter(([, option]) => option);
      if (entries.length && ['PG', 'PGK'].includes(String(question.type).toUpperCase())) {
        entries.forEach(([key, optionText]) => {
          const label = document.createElement('label'); label.className = 'answer-option'; const input = document.createElement('input');
          input.type = String(question.type).toUpperCase() === 'PGK' ? 'checkbox' : 'radio'; input.name = `answer-${question.id}`; input.value = key;
          const span = document.createElement('span'); span.textContent = `${key}. ${optionText}`; label.append(input, span); card.append(label);
        });
      } else {
        const input = document.createElement(String(question.type).toUpperCase() === 'ESAI' ? 'textarea' : 'input'); input.name = `answer-${question.id}`; input.rows = 4; card.append(input);
      }
      list.append(card);
    });
    try {
      const draft = JSON.parse(localStorage.getItem(`sisku-exam-${result.attemptId}`) || '{}');
      list.querySelectorAll('.exam-question').forEach(card => {
        const saved = String(draft[card.dataset.questionId] || '').split(',');
        card.querySelectorAll('input,textarea').forEach(control => { if (['radio', 'checkbox'].includes(control.type)) control.checked = saved.includes(control.value); else control.value = draft[card.dataset.questionId] || ''; });
      });
    } catch (_) {}
    list.addEventListener('change', saveExamDraft); list.addEventListener('input', saveExamDraft);
    $('#exam-runner').hidden = false; $('#exam-runner').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { toast(error.message); }
}

function saveExamDraft() {
  if (!state.activeExam?.attemptId) return;
  const answers = {};
  $('#exam-question-list').querySelectorAll('.exam-question').forEach(card => {
    const controls = Array.from(card.querySelectorAll('input,textarea')); answers[card.dataset.questionId] = controls.filter(control => !['radio','checkbox'].includes(control.type) || control.checked).map(control => control.value.trim()).filter(Boolean).join(',');
  });
  try { localStorage.setItem(`sisku-exam-${state.activeExam.attemptId}`, JSON.stringify(answers)); } catch (_) {}
}

async function closeExam(exam) {
  if (!window.confirm(`Tutup sesi ujian ${exam.subject} untuk ${exam.classCode}?`)) return;
  try { await nativeAction('SESI_UAS', { id: exam.id, mapel: exam.subject, kelas: exam.classCode, status: 'CLOSED' }); await prepareExams(); toast('Sesi ujian ditutup.'); }
  catch (error) { toast(error.message); }
}

async function loadAdminMessages() {
  const result = await api('/api/v1/messages'); const container = $('#admin-message-list'); container.replaceChildren();
  if (!result.items?.length) return container.append(emptyMessage('Belum ada pesan masuk.'));
  result.items.forEach(item => {
    const card = document.createElement('article'); card.className = 'message-card';
    const heading = document.createElement('div'); const title = document.createElement('b'); title.textContent = item.subject; const meta = document.createElement('small'); meta.textContent = `${item.sender_name || item.sender_username} · ${item.sender_role}`; heading.append(title, meta);
    const message = document.createElement('p'); message.textContent = item.message; const badge = document.createElement('span'); badge.className = statusClass(item.status); badge.textContent = item.status;
    card.append(heading, badge, message);
    if (item.status !== 'SUDAH DIBACA') { const read = document.createElement('button'); read.type = 'button'; read.className = 'small-button'; read.textContent = 'Tandai dibaca'; read.addEventListener('click', async () => { try { await nativeAction('MARK_ADMIN_MESSAGE_READ', { id: item.id }); await loadAdminMessages(); } catch (error) { toast(error.message); } }); card.append(read); }
    container.append(card);
  });
}

async function loadOrganization() {
  const result = await api('/api/v1/organization'); const settings = result.settings || {};
  state.organization = settings;
  $('#org-foundation').value = settings.namaYayasan || ''; $('#org-school').value = settings.namaSekolah || '';
  $('#org-address').value = settings.alamat || ''; $('#org-phone').value = settings.telepon || ''; $('#org-email').value = settings.email || ''; $('#org-logo').value = settings.logoUrl || '';
  $('#org-doc-url').value = settings.docAcuanUrl || ''; $('#org-support-url').value = settings.folderPendukungUrl || ''; $('#org-questions-url').value = settings.folderSoalUrl || '';
  renderResourceLinks();
}

function renderResourceLinks() {
  const links = [['📄', 'Dokumen acuan', state.organization.docAcuanUrl], ['📁', 'Folder pendukung', state.organization.folderPendukungUrl], ['🗂️', 'Folder soal UAS', state.organization.folderSoalUrl]].filter(([, , url]) => /^https:\/\//i.test(url || ''));
  const surface = $('#resource-links-surface'); const container = $('#resource-links'); surface.hidden = !links.length; container.replaceChildren();
  links.forEach(([icon, label, url]) => { const anchor = document.createElement('a'); anchor.className = 'service-card'; anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; const mark = document.createElement('span'); mark.textContent = icon; const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = label; const text = document.createElement('p'); text.textContent = 'Buka berkas sekolah'; copy.append(title, text); anchor.append(mark, copy); container.append(anchor); });
}

async function loadAttendanceConfig() {
  const result = await api('/api/v1/attendance/config'); state.attendanceConfig = result;
  $('#attendance-verification').hidden = !result.enabled;
  if (state.user.role === 'superadmin') {
    const settings = result.settings || {};
    $('#attendance-school-lat').value = settings.schoolLatitude ?? ''; $('#attendance-school-lng').value = settings.schoolLongitude ?? '';
    $('#attendance-radius').value = settings.radiusM || 100; $('#attendance-token-in').value = settings.qrTokenMasuk || ''; $('#attendance-token-out').value = settings.qrTokenPulang || '';
  }
}

async function loadActivity(username = state.activityFilter) {
  const result = await api(`/api/v1/admin/activity${username ? `?username=${encodeURIComponent(username)}` : ''}`);
  createTable($('#activity-list'), [
    { label: 'Waktu', value: row => formatDate(row.occurred_at) }, { label: 'Akun', value: row => row.full_name || row.username || 'Sistem' },
    { label: 'Aksi', key: 'action' }, { label: 'Entitas', value: row => `${row.entity_type || '—'}${row.entity_id ? ` · ${row.entity_id}` : ''}` }
  ], result.items || [], 'Belum ada aktivitas.');
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

document.querySelectorAll('[data-scroll-to]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
});

document.querySelectorAll('[data-table-filter]').forEach(input => {
  input.addEventListener('input', event => {
    const id = event.currentTarget.dataset.tableFilter;
    const definition = state.tableRows[id];
    if (definition) createTable($(`#${id}`), definition.columns, filterRows(definition.rows, event.currentTarget.value), definition.emptyLabel);
  });
});

$('#security-shortcut').addEventListener('click', () => showView('security'));

$('#stop-impersonation').addEventListener('click', async () => {
  try {
    const result = await api('/api/v1/admin/impersonate/stop', { method: 'POST', body: '{}' });
    state.user = result.user; state.formOptions = null; state.masterItems = []; state.managementLoaded = false;
    await loadDashboard(); showView('summary'); toast('Kembali ke akun Superadmin.');
  } catch (error) { toast(error.message); }
});

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

$('#organization-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#organization-message').textContent = '';
  try {
    const settings = { namaYayasan: $('#org-foundation').value, namaSekolah: $('#org-school').value, alamat: $('#org-address').value, telepon: $('#org-phone').value, email: $('#org-email').value, logoUrl: $('#org-logo').value, docAcuanUrl: $('#org-doc-url').value, folderPendukungUrl: $('#org-support-url').value, folderSoalUrl: $('#org-questions-url').value };
    const result = await nativeAction('SAVE_ORG_SETTINGS', { settings }); await loadOrganization(); toast(result.message);
  } catch (error) { $('#organization-message').textContent = error.message; }
});

$('#attendance-settings-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#attendance-settings-message').textContent = '';
  try {
    const data = { schoolLatitude: Number($('#attendance-school-lat').value), schoolLongitude: Number($('#attendance-school-lng').value), radiusM: Number($('#attendance-radius').value), qrTokenMasuk: $('#attendance-token-in').value, qrTokenPulang: $('#attendance-token-out').value };
    const result = await nativeAction('SAVE_ATTENDANCE_SETTINGS', data); await loadAttendanceConfig(); toast(result.message);
  } catch (error) { $('#attendance-settings-message').textContent = error.message; }
});

$('#reload-activity').addEventListener('click', () => loadActivity().catch(error => toast(error.message)));

let masterSearchTimer;
$('#master-search').addEventListener('input', event => {
  window.clearTimeout(masterSearchTimer);
  masterSearchTimer = window.setTimeout(() => loadMaster(state.masterResource, event.target.value).catch(error => toast(error.message)), 280);
});

$('#attendance-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#attendance-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const result = await nativeAction('PRESENSI', { nis: $('#attendance-nis').value, tanggal: $('#attendance-date').value, status: $('#attendance-status').value, qrToken: $('#attendance-qr').value, latitude: state.attendanceCoords?.latitude, longitude: state.attendanceCoords?.longitude });
    await loadDashboard(); showView('attendance'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#attendance-location').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Perangkat tidak mendukung GPS browser.');
  $('#attendance-location-status').textContent = 'Mengambil lokasi…';
  navigator.geolocation.getCurrentPosition(position => {
    state.attendanceCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    $('#attendance-location-status').textContent = `GPS siap (akurasi ±${Math.round(position.coords.accuracy)} m)`;
  }, error => { $('#attendance-location-status').textContent = 'Lokasi gagal'; toast(error.message || 'Izin lokasi diperlukan.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
});

$('#attendance-scan').addEventListener('click', () => $('#attendance-scan-file').click());
$('#attendance-scan-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (!('BarcodeDetector' in window)) throw new Error('Pemindai QR kamera belum didukung browser ini. Tempel token QR secara manual.');
    const formats = await BarcodeDetector.getSupportedFormats(); if (!formats.includes('qr_code')) throw new Error('Browser tidak mendukung format QR.');
    const bitmap = await createImageBitmap(file); const codes = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bitmap); bitmap.close();
    if (!codes.length) throw new Error('QR tidak terbaca. Ambil foto lebih dekat dan terang.');
    $('#attendance-qr').value = codes[0].rawValue; toast('QR berhasil dibaca.');
  } catch (error) { toast(error.message); }
  finally { event.target.value = ''; }
});

$('#yaumiah-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#yaumiah-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const items = Array.from(document.querySelectorAll('[data-yaumiah-item]')).map(control => ({ id: control.value, done: control.checked }));
    const result = await nativeAction('YAUMIAH', { tanggal: $('#yaumiah-date').value, capaian: $('#yaumiah-achievement').value, bacaan: $('#yaumiah-reading').value, catatanOrtu: $('#yaumiah-parent-note').value, items });
    await loadDashboard(); showView('yaumiah'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#yaumiah-master-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#yaumiah-config-message').textContent = '';
  try {
    const data = { oldId: state.yaumiahEditing?.id, id: $('#yaumiah-master-id').value, nama: $('#yaumiah-master-name').value, kategori: $('#yaumiah-master-category').value, kelas: $('#yaumiah-master-class').value, poin: Number($('#yaumiah-master-points').value) };
    const result = await nativeAction(state.yaumiahEditing ? 'UPDATE_YAUMIAH' : 'MASTER_YAUMIAH', data);
    state.yaumiahEditing = null; event.currentTarget.reset(); event.currentTarget.querySelector('button').textContent = 'Tambah aktivitas'; await prepareYaumiah(); toast(result.message);
  } catch (error) { $('#yaumiah-config-message').textContent = error.message; }
});

$('#tahfidz-target-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#yaumiah-config-message').textContent = '';
  try {
    const result = await nativeAction('TARGET_TAHFIDZ', { kelas: $('#tahfidz-class').value, surah: $('#tahfidz-surah').value, ayat: $('#tahfidz-verses').value, periode: $('#tahfidz-period').value });
    await prepareYaumiah(); toast(result.message);
  } catch (error) { $('#yaumiah-config-message').textContent = error.message; }
});

$('#task-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#task-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const payload = { id: state.taskEditing?.id, oldId: state.taskEditing?.id, mapel: $('#task-subject').value, kelas: $('#task-class').value, judul: $('#task-title').value, deskripsi: $('#task-description').value, deadline: $('#task-deadline').value || null };
    const result = await nativeAction(state.taskEditing ? 'UPDATE_TUGAS' : 'TUGAS', payload);
    state.taskEditing = null; event.currentTarget.reset(); await loadDashboard(); showView('tasks'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#exam-session-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; $('#exam-message').textContent = '';
  try {
    const result = await nativeAction('SESI_UAS', { mapel: $('#exam-subject').value, kelas: $('#exam-class').value, catatan: $('#exam-note').value, token: $('#exam-token').value, status: 'OPEN', acakSoal: $('#exam-shuffle-questions').checked, acakOpsi: $('#exam-shuffle-options').checked });
    $('#exam-token').value = ''; await prepareExams(); toast(`${result.message} Token: ${result.data?.token || '—'}`);
  } catch (error) { $('#exam-message').textContent = error.message; }
  finally { button.disabled = false; }
});

$('#exam-cancel').addEventListener('click', () => { $('#exam-runner').hidden = true; state.activeExam = null; });
$('#exam-answer-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!state.activeExam || !window.confirm('Kumpulkan jawaban sekarang? Jawaban tidak dapat diubah lagi.')) return;
  const answers = {};
  $('#exam-question-list').querySelectorAll('.exam-question').forEach(card => {
    const controls = Array.from(card.querySelectorAll('input, textarea')); const checked = controls.filter(control => !['radio', 'checkbox'].includes(control.type) || control.checked).map(control => control.value.trim()).filter(Boolean);
    answers[card.dataset.questionId] = checked.join(',');
  });
  const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; $('#exam-submit-message').textContent = '';
  try {
    const result = await api(`/api/v1/exams/${encodeURIComponent(state.activeExam.session.id)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
    try { localStorage.removeItem(`sisku-exam-${state.activeExam.attemptId}`); } catch (_) {}
    $('#exam-submit-message').textContent = `${result.message} Nilai objektif: ${result.result.score}.`;
    toast(result.message); await loadDashboard();
  } catch (error) { $('#exam-submit-message').textContent = error.message; }
  finally { button.disabled = false; }
});

$('#communication-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#communication-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const action = state.user.role === 'superadmin' ? 'SEND_ANNOUNCEMENT' : 'SEND_ADMIN_MESSAGE';
    const targets = state.user.role === 'superadmin' ? ($('#communication-targets').value.split(/[,;|\n]+/).map(value => value.trim()).filter(Boolean)) : [];
    const result = await nativeAction(action, { judul: $('#communication-subject').value, pesan: $('#communication-message').value, targets: targets.length ? targets : ['SEMUA'] });
    event.currentTarget.reset(); toast(result.message); if (state.user.role === 'superadmin') await loadDashboard();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#management-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#management-message'); const button = $('#management-save');
  const values = managementValues(); const config = MANAGEMENT_CONFIG[state.managementResource]; const editing = state.managementEditing;
  message.textContent = '';
  const pins = [values.pin, values.pinStudent, values.pinParent].filter(Boolean);
  if (pins.some(pin => !/^\d{6,12}$/.test(pin))) { message.textContent = 'PIN harus terdiri dari 6–12 digit angka.'; return; }
  button.disabled = true; button.textContent = 'Menyimpan…';
  try {
    const result = await nativeAction(editing ? config.update : config.create, managementPayload(values));
    const nextRow = optimisticManagementRow(values);
    if (editing) {
      const oldIdentity = managementIdentity(editing);
      state.managementItems = state.managementItems.map(item => managementIdentity(item) === oldIdentity ? nextRow : item);
    } else state.managementItems.unshift(nextRow);
    renderManagementTable($('#management-search').value); resetManagementForm();
    toast(result.message || 'Data berhasil disimpan ke PostgreSQL.'); scheduleManagementRefresh();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Simpan'; }
});

$('#management-new').addEventListener('click', resetManagementForm);
$('#management-cancel').addEventListener('click', resetManagementForm);
$('#management-search').addEventListener('input', event => renderManagementTable(event.target.value));

function splitBulkRow(line, delimiter) {
  const values = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { values.push(value.trim()); value = ''; }
    else value += char;
  }
  values.push(value.trim()); return values;
}

$('#bulk-master-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); const message = $('#bulk-master-message'); message.textContent = ''; button.disabled = true;
  try {
    const type = $('#bulk-master-type').value; const lines = $('#bulk-master-input').value.split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) throw new Error('Data impor masih kosong.');
    const delimiter = lines[0].includes('\t') ? '\t' : ','; const rows = lines.map(line => splitBulkRow(line, delimiter));
    if (/^(kode|nip|nis)/i.test(rows[0]?.[0] || '')) rows.shift();
    if (!rows.length || rows.length > 200) throw new Error('Impor harus berisi 1–200 baris.');
    let success = 0; const errors = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]; let action; let data;
      if (type === 'subjects') { action = 'REGISTER_MAPEL'; data = { kode: row[0], nama: row[1], kelompok: row[2] || 'Umum' }; }
      else if (type === 'classes') { action = 'REGISTER_KELAS'; data = { kode: row[0], nama: row[1], wali: row[2] || '-', kapasitas: Number(row[3]) || 30 }; }
      else if (type === 'teachers') { action = 'REGISTER_GURU'; data = { nip: row[0], username: row[1], nama: row[2], mapel: row[3] || '-', waliKelas: row[4] || '-', pin: row[5] }; }
      else { action = 'REGISTER_SISWA'; data = { nis: row[0], nama: row[1], kelas: row[2], namaOrtu: row[3] || `Wali ${row[1] || ''}`, akunSiswa: row[0], akunOrtu: row[4] || `ortu.${row[0]}`, pinSiswa: row[5], pinOrtu: row[6] }; }
      try { await nativeAction(action, data); success++; } catch (error) { errors.push(`Baris ${index + 1}: ${error.message}`); }
      button.textContent = `Memproses ${index + 1}/${rows.length}…`;
    }
    state.formOptions = null; state.managementLoaded = false; await loadManagement(type, true); $('#bulk-master-input').value = '';
    message.textContent = `${success} tersimpan, ${errors.length} gagal.${errors.length ? ` ${errors.slice(0, 3).join(' · ')}` : ''}`;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Impor data'; }
});

$('#question-type').addEventListener('change', updateQuestionType);
$('#question-reset').addEventListener('click', resetQuestionForm);
$('#native-question-search').addEventListener('input', event => renderNativeQuestions(event.target.value));
$('#question-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#question-message'); const button = event.currentTarget.querySelector('button[type="submit"]');
  const type = $('#question-type').value;
  const data = {
    id: $('#question-id').value.trim(), tipeSoal: type, level: $('#question-level').value,
    mapel: $('#question-subject').value, kelas: $('#question-class').value, kd: $('#question-kd').value.trim(),
    pertanyaan: $('#question-text').value.trim(), opsiA: $('#question-option-a').value.trim(),
    opsiB: $('#question-option-b').value.trim(), opsiC: $('#question-option-c').value.trim(),
    opsiD: $('#question-option-d').value.trim(), opsiE: $('#question-option-e').value.trim(),
    kunci: $('#question-key').value.trim(), gambarUrl: state.questionImageData || $('#question-image-url').value.trim(), statusApproval: 'Menunggu Approval Kepsek'
  };
  message.textContent = '';
  if (['PG', 'PGK'].includes(type) && (!data.opsiA || !data.opsiB || !data.opsiC || !data.opsiD || !data.kunci)) {
    message.textContent = 'Pilihan ganda memerlukan opsi A–D dan kunci jawaban.'; return;
  }
  button.disabled = true; button.textContent = 'Menyimpan…';
  try {
    const result = await nativeAction(state.questionEditing ? 'UPDATE_SOAL' : 'SOAL_UAS', data);
    state.overview.questionStats = state.overview.questionStats || [];
    const existing = state.overview.questionStats.find(item => item.subject === data.mapel);
    if (!state.questionEditing) {
      if (existing) { existing.total += 1; existing.pending += 1; }
      else state.overview.questionStats.push({ subject: data.mapel, total: 1, approved: 0, pending: 1 });
    }
    registerTable('question-table', state.overview.questionStats, TABLE_COLUMNS.questions, 'Belum ada statistik soal.');
    resetQuestionForm(); await loadNativeQuestions(); toast(result.message || 'Soal berhasil disimpan ke PostgreSQL.');
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Simpan soal'; }
});

function parseBulkQuestions(raw) {
  const text = String(raw || '').trim();
  if (!text) throw new Error('Data bulk soal masih kosong.');
  if (text.startsWith('[')) {
    if (/^\[\s*\{/.test(text)) {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('JSON bulk harus berupa array.');
      return parsed;
    }
    const blocks = text.replace(/\r/g, '').split(/\n-{3,}\n|\n(?=\s*\[(?:PGK|PG|ISIAN|ESAI)\])/i).map(value => value.trim()).filter(Boolean);
    return blocks.map((block, index) => {
      const lines = block.split('\n').map(value => value.trim()).filter(Boolean); const header = lines.shift() || '';
      const match = header.match(/^(?:\d+\s*[.)]\s*)?\[(PGK|PG|ISIAN|ESAI)\]\s*(?:\[(?:SMP|SMA)\]\s*)?(.*)$/i);
      if (!match) throw new Error(`Blok ${index + 1} tidak diawali [PG], [PGK], [ISIAN], atau [ESAI].`);
      const item = { id: `UAS-${Date.now().toString(36).toUpperCase()}-${index + 1}`, tipeSoal: match[1].toUpperCase(), pertanyaan: match[2].trim(), mapel: $('#bulk-question-subject').value, kelas: $('#bulk-question-class').value || 'SEMUA', level: 'C3', kd: 'Bank Soal UAS Terpadu' };
      lines.forEach(line => {
        const option = line.match(/^([A-E])\s*[:.]\s*(.*)$/i); if (option) item[`opsi${option[1].toUpperCase()}`] = option[2];
        else if (/^(KUNCI|RUBRIK)\s*[:.]/i.test(line)) item.kunci = line.replace(/^(KUNCI|RUBRIK)\s*[:.]\s*/i, '');
        else if (/^(GAMBAR|FOTO|IMAGE)\s*[:.]/i.test(line)) item.gambarUrl = line.replace(/^(GAMBAR|FOTO|IMAGE)\s*[:.]\s*/i, '');
        else item.pertanyaan += `\n${line}`;
      }); return item;
    });
  }
  const rows = text.split(/\r?\n/).map(line => line.split('\t')).filter(columns => columns.some(value => value.trim()));
  if (/^(id|id soal|id_soal)$/i.test(String(rows[0]?.[0] || '').trim())) rows.shift();
  return rows.map((columns, index) => {
    if (columns.length < 6) throw new Error(`Baris ${index + 1} kurang kolom. Gunakan pemisah TAB.`);
    return { id: columns[0], mapel: columns[1], kelas: columns[2] || 'SEMUA', level: columns[3] || 'C3', kd: columns[4] || '', pertanyaan: columns[5], opsiA: columns[6] || '', opsiB: columns[7] || '', opsiC: columns[8] || '', opsiD: columns[9] || '', opsiE: columns[10] || '', kunci: columns[11] || '', tipeSoal: columns[12] || 'PG', gambarUrl: columns[13] || '' };
  });
}

$('#bulk-question-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button[type="submit"]'); const message = $('#bulk-question-message'); message.textContent = ''; button.disabled = true;
  try {
    const soalList = parseBulkQuestions($('#bulk-question-input').value);
    const paketId = $('#bulk-question-package').value.trim() || `PAKET-${Date.now()}`;
    const result = await nativeAction('SOAL_UAS_BULK', { paketId, soalList });
    event.currentTarget.reset(); await Promise.all([loadNativeQuestions(), loadDashboard()]); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#bulk-question-example').addEventListener('click', () => {
  $('#bulk-question-input').value = '[PG] Berapakah 2 + 2?\nA: 3\nB: 4\nC: 5\nD: 6\nKUNCI: B\n---\n[ESAI] Jelaskan cara menghitungnya.\nRUBRIK: Jawaban dinilai 0–100.';
});

$('#question-image-file').addEventListener('change', event => {
  const file = event.target.files?.[0]; state.questionImageData = '';
  if (!file) return;
  if (file.size > 1_000_000) { event.target.value = ''; return toast('Ukuran gambar maksimal 1 MB.'); }
  const reader = new FileReader();
  reader.onload = () => { state.questionImageData = String(reader.result || ''); $('#question-image-url').value = ''; toast('Gambar siap disimpan bersama soal.'); };
  reader.onerror = () => toast('Gambar tidak dapat dibaca.'); reader.readAsDataURL(file);
});

function printableQuestionsHtml(rows) {
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  return rows.map((item, index) => `<article><h3>${index + 1}. ${escape(item.question)}</h3>${item.imageUrl ? `<img src="${escape(item.imageUrl)}" alt="Gambar soal">` : ''}<ol type="A">${Object.values(item.options || {}).filter(Boolean).map(option => `<li>${escape(option)}</li>`).join('')}</ol></article>`).join('');
}

$('#print-questions').addEventListener('click', () => {
  const rows = filterRows(state.nativeQuestions, $('#native-question-search').value);
  if (!rows.length) return toast('Tidak ada soal untuk dicetak.');
  const printable = window.open('', '_blank', 'noopener,noreferrer');
  if (!printable) return toast('Izinkan pop-up untuk mencetak naskah.');
  const content = printableQuestionsHtml(rows);
  printable.document.write(`<!doctype html><html><head><title>Naskah Soal SISKU</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;line-height:1.5}article{break-inside:avoid;margin-bottom:24px}h3{font-size:16px}img{max-width:520px;max-height:320px}li{margin:6px 0}@media print{body{margin:0}}</style></head><body><h1>Naskah Soal SISKU</h1>${content}<script>window.onload=()=>window.print()<\/script></body></html>`);
  printable.document.close();
});

$('#download-questions-word').addEventListener('click', () => {
  const rows = filterRows(state.nativeQuestions, $('#native-question-search').value); if (!rows.length) return toast('Tidak ada soal untuk diunduh.');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.5}article{margin-bottom:24px}img{max-width:520px;max-height:320px}</style></head><body><h1>Naskah Soal SISKU</h1>${printableQuestionsHtml(rows)}</body></html>`;
  const url = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' })); const link = document.createElement('a'); link.href = url; link.download = `Naskah-Soal-SISKU-${new Date().toISOString().slice(0,10)}.doc`; link.click(); URL.revokeObjectURL(url);
});

$('#bulk-approve-questions').addEventListener('click', async () => {
  const ids = Array.from(state.selectedQuestions); if (!ids.length) return toast('Pilih soal terlebih dahulu.');
  try { const result = await nativeAction('BULK_APPROVE_SOAL', { ids }); state.selectedQuestions.clear(); await Promise.all([loadNativeQuestions(), loadDashboard()]); toast(result.message); } catch (error) { toast(error.message); }
});

$('#bulk-delete-questions').addEventListener('click', async () => {
  const ids = Array.from(state.selectedQuestions); if (!ids.length) return toast('Pilih soal terlebih dahulu.');
  if (!window.confirm(`Nonaktifkan ${ids.length} soal terpilih? Riwayat tetap disimpan.`)) return;
  try { const result = await nativeAction('BULK_DELETE_SOAL', { ids }); state.selectedQuestions.clear(); await Promise.all([loadNativeQuestions(), loadDashboard()]); toast(result.message); } catch (error) { toast(error.message); }
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
