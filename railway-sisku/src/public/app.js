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
  managementEditing: null, managementLoaded: false, nativeQuestions: [], exams: [], activeExam: null
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
  if (target === 'grades') prepareExams().catch(error => toast(error.message));
  if (target === 'tasks' && ['guru', 'superadmin'].includes(state.user.role)) prepareOperationalOptions().catch(error => toast(error.message));
  if (target === 'services' && state.user.role === 'superadmin') loadAdminMessages().catch(error => toast(error.message));
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
  $('#attendance-entry-surface').hidden = !['siswa', 'guru', 'superadmin'].includes(role);
  $('#attendance-nis-label').hidden = role === 'siswa';
  $('#attendance-nis').required = role !== 'siswa';
  $('#yaumiah-entry-surface').hidden = !['siswa', 'ortu'].includes(role);
  $('#yaumiah-entry-button').hidden = !['siswa', 'ortu'].includes(role);
  $('#yaumiah-parent-note-label').hidden = role !== 'ortu';
  $('#task-entry-surface').hidden = !['guru', 'superadmin'].includes(role);
  $('#task-entry-button').hidden = !['guru', 'superadmin'].includes(role);
  $('#exam-session-form').hidden = !['guru', 'kepsek', 'superadmin'].includes(role);
  $('#communication-title').textContent = role === 'superadmin' ? 'Kirim pengumuman' : 'Pesan ke superadmin';
  $('#communication-form').querySelector('button').textContent = role === 'superadmin' ? 'Terbitkan pengumuman' : 'Kirim pesan';
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
  $('#question-form').reset();
  $('#question-id').value = newQuestionId();
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
  if (!$('#question-id').value) resetQuestionForm();
}

function renderNativeQuestions(query = '') {
  const container = $('#native-question-table'); container.replaceChildren();
  const rows = filterRows(state.nativeQuestions, query);
  $('#native-question-count').textContent = `${formatNumber(rows.length)} soal`;
  if (!rows.length) return container.append(emptyMessage('Belum ada soal yang sesuai.'));
  const table = document.createElement('table'); table.className = 'data-table question-data-table';
  const head = document.createElement('thead'); const headRow = document.createElement('tr');
  ['ID / Mapel', 'Pertanyaan & opsi', 'Kelas', 'Status', 'Pembuat', 'Aksi'].forEach(label => { const th = document.createElement('th'); th.textContent = label; headRow.append(th); });
  head.append(headRow); const body = document.createElement('tbody');
  rows.forEach(item => {
    const tr = document.createElement('tr');
    const identity = document.createElement('td'); const id = document.createElement('b'); id.textContent = item.id; const subject = document.createElement('small'); subject.textContent = item.subject; identity.append(id, subject);
    const question = document.createElement('td'); const text = document.createElement('b'); text.textContent = item.question; const options = document.createElement('small');
    const optionText = Object.entries(item.options || {}).filter(([, answer]) => answer).map(([key, answer]) => `${key}. ${answer}`).join(' · ');
    options.textContent = `${item.type || 'PG'}${optionText ? ` · ${optionText}` : ''}${item.answerKey ? ` · Kunci: ${item.answerKey}` : ''}`; question.append(text, options);
    const classCell = document.createElement('td'); classCell.textContent = item.classCode || 'SEMUA';
    const statusCell = document.createElement('td'); const status = document.createElement('span'); status.className = statusClass(item.status); status.textContent = item.status || 'Menunggu'; statusCell.append(status);
    if (item.revisionNote) { const note = document.createElement('small'); note.className = 'revision-note'; note.textContent = item.revisionNote; statusCell.append(note); }
    const creator = document.createElement('td'); creator.textContent = item.creator || 'Migrasi lama';
    const actions = document.createElement('td'); actions.className = 'row-actions';
    if (['kepsek', 'superadmin'].includes(state.user.role) && item.status !== 'Approved') {
      const approve = document.createElement('button'); approve.type = 'button'; approve.className = 'small-button'; approve.textContent = 'Setujui'; approve.addEventListener('click', () => updateQuestionApproval(item, 'Approved'));
      actions.append(approve);
    }
    if (['kepsek', 'superadmin'].includes(state.user.role)) {
      const revise = document.createElement('button'); revise.type = 'button'; revise.className = 'small-button'; revise.textContent = 'Revisi'; revise.addEventListener('click', () => requestQuestionRevision(item)); actions.append(revise);
    }
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'small-button danger-button'; remove.textContent = 'Nonaktifkan'; remove.addEventListener('click', () => deleteNativeQuestion(item)); actions.append(remove);
    tr.append(identity, question, classCell, statusCell, creator, actions); body.append(tr);
  });
  table.append(head, body); container.append(table);
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

function fillSelect(select, items, includeAll = false) {
  const current = select.value; select.replaceChildren();
  if (includeAll) { const all = document.createElement('option'); all.value = 'SEMUA'; all.textContent = 'SEMUA'; select.append(all); }
  items.forEach(item => { const option = document.createElement('option'); option.value = item.name || item.code; option.textContent = item.name ? `${item.code || ''} — ${item.name}`.replace(/^ — /, '') : item.code; select.append(option); });
  if (current) select.value = current;
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

function renderExams() {
  const container = $('#native-exam-list'); container.replaceChildren();
  if (!state.exams.length) return container.append(emptyMessage(state.user.role === 'siswa' ? 'Belum ada sesi ujian aktif untuk kelas Anda.' : 'Belum ada sesi ujian native.'));
  state.exams.forEach(exam => {
    const card = document.createElement('article'); card.className = 'exam-card';
    const copy = document.createElement('div'); const title = document.createElement('b'); title.textContent = `${exam.subject} · ${exam.classCode}`;
    const detail = document.createElement('p'); detail.textContent = `${exam.questionCount} soal · ${exam.note || 'Tanpa catatan'}`; copy.append(title, detail);
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
    const result = await api(`/api/v1/exams/${encodeURIComponent(exam.id)}/start`, { method: 'POST', body: '{}' });
    state.activeExam = { ...result, exam };
    $('#exam-runner-title').textContent = `${result.session.subject} · ${result.session.classCode}`;
    const list = $('#exam-question-list'); list.replaceChildren();
    result.questions.forEach((question, index) => {
      const card = document.createElement('fieldset'); card.className = 'exam-question'; card.dataset.questionId = question.id;
      const legend = document.createElement('legend'); legend.textContent = `${index + 1}. ${question.question}`; card.append(legend);
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
    $('#exam-runner').hidden = false; $('#exam-runner').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { toast(error.message); }
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
    card.append(heading, badge, message); container.append(card);
  });
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

$('#attendance-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#attendance-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const result = await nativeAction('PRESENSI', { nis: $('#attendance-nis').value, tanggal: $('#attendance-date').value, status: $('#attendance-status').value });
    await loadDashboard(); showView('attendance'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#yaumiah-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#yaumiah-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const result = await nativeAction('YAUMIAH', { tanggal: $('#yaumiah-date').value, capaian: $('#yaumiah-achievement').value, bacaan: $('#yaumiah-reading').value, catatanOrtu: $('#yaumiah-parent-note').value });
    await loadDashboard(); showView('yaumiah'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#task-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#task-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const result = await nativeAction('TUGAS', { mapel: $('#task-subject').value, kelas: $('#task-class').value, judul: $('#task-title').value, deskripsi: $('#task-description').value, deadline: $('#task-deadline').value || null });
    event.currentTarget.reset(); await loadDashboard(); showView('tasks'); toast(result.message);
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

$('#exam-session-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; $('#exam-message').textContent = '';
  try {
    const result = await nativeAction('SESI_UAS', { mapel: $('#exam-subject').value, kelas: $('#exam-class').value, catatan: $('#exam-note').value, status: 'OPEN', acakSoal: true });
    await prepareExams(); toast(result.message);
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
    $('#exam-submit-message').textContent = `${result.message} Nilai objektif: ${result.result.score}.`;
    toast(result.message); await loadDashboard();
  } catch (error) { $('#exam-submit-message').textContent = error.message; }
  finally { button.disabled = false; }
});

$('#communication-form').addEventListener('submit', async event => {
  event.preventDefault(); const message = $('#communication-form-message'); const button = event.currentTarget.querySelector('button'); message.textContent = ''; button.disabled = true;
  try {
    const action = state.user.role === 'superadmin' ? 'SEND_ANNOUNCEMENT' : 'SEND_ADMIN_MESSAGE';
    const result = await nativeAction(action, { judul: $('#communication-subject').value, pesan: $('#communication-message').value, targets: ['SEMUA'] });
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
    kunci: $('#question-key').value.trim(), statusApproval: 'Menunggu Approval Kepsek'
  };
  message.textContent = '';
  if (['PG', 'PGK'].includes(type) && (!data.opsiA || !data.opsiB || !data.opsiC || !data.opsiD || !data.kunci)) {
    message.textContent = 'Pilihan ganda memerlukan opsi A–D dan kunci jawaban.'; return;
  }
  button.disabled = true; button.textContent = 'Menyimpan…';
  try {
    const result = await nativeAction('SOAL_UAS', data);
    state.overview.questionStats = state.overview.questionStats || [];
    const existing = state.overview.questionStats.find(item => item.subject === data.mapel);
    if (existing) { existing.total += 1; existing.pending += 1; }
    else state.overview.questionStats.push({ subject: data.mapel, total: 1, approved: 0, pending: 1 });
    registerTable('question-table', state.overview.questionStats, TABLE_COLUMNS.questions, 'Belum ada statistik soal.');
    resetQuestionForm(); await loadNativeQuestions(); toast(result.message || 'Soal berhasil disimpan ke PostgreSQL.');
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Simpan soal'; }
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
