'use strict';

const $ = selector => document.querySelector(selector);
const state = { user: null, dashboard: null, overview: null, masterResource: 'students', masterItems: [] };

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Belum ada';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

async function api(path, options = {}) {
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
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  window.setTimeout(() => element.classList.remove('show'), 3200);
}

function showLogin() {
  $('#dashboard-view').hidden = true;
  $('#login-view').hidden = false;
  $('#pin').value = '';
  $('#username').focus();
}

function showDashboard() {
  $('#login-view').hidden = true;
  $('#dashboard-view').hidden = false;
  const user = state.user;
  $('#user-name').textContent = user.name || user.username;
  $('#user-role').textContent = user.classCode && user.classCode !== '-' ? `${user.role} · ${user.classCode}` : user.role;
  $('#user-avatar').textContent = String(user.name || user.username || 'S').trim().charAt(0).toUpperCase();
  $('#today-label').textContent = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
  const canSeeMaster = ['superadmin', 'guru'].includes(user.role);
  $('#master-nav').hidden = !canSeeMaster;
  $('#sync-gas-button').hidden = user.role !== 'superadmin';
  document.querySelectorAll('.admin-only').forEach(element => { element.hidden = user.role !== 'superadmin'; });
}

function emptyMessage(label) {
  const element = document.createElement('p');
  element.className = 'empty-state';
  element.textContent = label;
  return element;
}

function createTable(container, columns, rows, emptyLabel) {
  container.replaceChildren();
  if (!rows || !rows.length) {
    container.append(emptyMessage(emptyLabel || 'Belum ada data.'));
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
      const raw = typeof column.value === 'function' ? column.value(row) : row[column.value];
      cell.textContent = raw == null || raw === '' ? '—' : String(raw);
      if (column.className) cell.className = column.className;
      tableRow.append(cell);
    });
    body.append(tableRow);
  });
  table.append(head, body);
  container.append(table);
}

function renderDashboard(data) {
  state.dashboard = data;
  $('#school-name').textContent = data.appName || 'SISKU';
  $('#total-rows').textContent = formatNumber(data.migration && data.migration.row_count);
  $('#total-sheets').textContent = formatNumber(data.migration && data.migration.sheet_count);
  $('#snapshot-time').textContent = data.migration ? formatDate(data.migration.imported_at) : 'Belum ada';
  $('#snapshot-source').textContent = data.migration ? `Sumber ${formatDate(data.migration.source_exported_at)}` : 'Menunggu sinkronisasi';
  const totalUsers = (data.roles || []).reduce((sum, role) => sum + Number(role.count || 0), 0);
  $('#total-users').textContent = formatNumber(totalUsers);
  $('#role-summary').textContent = data.roles && data.roles.length
    ? data.roles.map(role => `${role.role} ${formatNumber(role.count)}`).join(' · ')
    : 'Belum diproyeksikan';
  $('#checksum-badge').textContent = data.migration ? `SHA ${String(data.migration.snapshot_checksum).slice(0, 8)}` : '—';

  const modules = $('#module-list');
  modules.replaceChildren();
  (data.modules || []).forEach((module, index) => {
    const item = document.createElement('div');
    item.className = 'module-item';
    const number = document.createElement('span');
    number.className = 'module-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('div');
    const title = document.createElement('b');
    title.textContent = module.label;
    const detail = document.createElement('p');
    detail.textContent = module.detail;
    copy.append(title, detail);
    const status = document.createElement('span');
    status.className = `module-status ${module.status === 'next' ? 'next' : (module.status === 'ready' ? 'ready' : '')}`;
    status.textContent = module.status === 'ready' ? 'Tersedia' : (module.status === 'next' ? 'Berikutnya' : 'GAS aktif');
    item.append(number, copy, status);
    modules.append(item);
  });

  const sheets = $('#sheet-list');
  sheets.replaceChildren();
  if (!data.sheets || !data.sheets.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Belum ada snapshot yang diimpor.';
    sheets.append(empty);
  } else {
    data.sheets.forEach(sheet => {
      const row = document.createElement('div');
      row.className = 'sheet-item';
      const name = document.createElement('span');
      name.textContent = sheet.name;
      const count = document.createElement('b');
      count.textContent = `${formatNumber(sheet.count)} baris`;
      row.append(name, count);
      sheets.append(row);
    });
  }
}

function renderOverview(data) {
  state.overview = data;
  const roleLabels = { superadmin: 'administrator', guru: 'guru', siswa: 'siswa', ortu: 'orang tua' };
  $('#hero-title').textContent = `Ringkasan ${roleLabels[data.role] || 'sekolah'} sudah siap.`;
  $('#hero-copy').textContent = data.role === 'superadmin'
    ? 'Pantau data master dan aktivitas hasil migrasi. Perubahan operasional tetap dikunci selama rekonsiliasi.'
    : 'Informasi dibatasi sesuai akun, kelas, dan NIS agar data setiap siswa tetap terlindungi.';

  const metricDefinitions = [
    ['Siswa dalam cakupan', data.metrics.students],
    ['Presensi hari ini', data.metrics.attendanceToday],
    ['Yaumiah hari ini', data.metrics.yaumiahToday],
    ['Riwayat nilai', data.metrics.grades]
  ];
  if (['guru', 'superadmin'].includes(data.role)) {
    metricDefinitions[3] = ['Soal disetujui', data.metrics.approvedQuestions || 0];
  }
  const metrics = $('#operational-metrics');
  metrics.replaceChildren();
  metricDefinitions.forEach(([label, metricValue]) => {
    const card = document.createElement('article');
    card.className = 'compact-metric';
    const title = document.createElement('p');
    title.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = formatNumber(metricValue);
    card.append(title, strong);
    metrics.append(card);
  });

  const announcements = $('#announcement-list');
  announcements.replaceChildren();
  (data.announcements || []).forEach(item => {
    const card = document.createElement('article');
    card.className = 'announcement';
    const title = document.createElement('b');
    title.textContent = item.title || 'Pengumuman';
    const copy = document.createElement('p');
    copy.textContent = item.message;
    card.append(title, copy);
    announcements.append(card);
  });

  createTable($('#attendance-table'), [
    { label: 'Tanggal', value: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'Status', value: 'status' }, { label: 'Jam', value: 'time' }
  ], data.recentAttendance, 'Belum ada riwayat presensi.');
  createTable($('#grade-table'), [
    { label: 'Tanggal', value: 'date' }, { label: 'Mapel', value: 'subject' },
    { label: 'Nama', value: row => row.name || row.nis }, { label: 'Nilai', value: 'score', className: 'score-cell' }
  ], data.recentGrades, 'Belum ada riwayat nilai.');
  createTable($('#yaumiah-table'), [
    { label: 'Tanggal', value: 'date' }, { label: 'Nama', value: row => row.name || row.nis },
    { label: 'Capaian', value: row => `${formatNumber(row.achievement)}%` }, { label: 'Tilawah', value: 'reading' }
  ], data.recentYaumiah, 'Belum ada riwayat yaumiah.');
  createTable($('#task-table'), [
    { label: 'Judul', value: 'title' }, { label: 'Mapel', value: 'subject' },
    { label: 'Kelas', value: 'classCode' }, { label: 'Status', value: 'status' }
  ], data.tasks, 'Belum ada tugas aktif.');
}

function showView(name) {
  document.querySelectorAll('.view-panel').forEach(panel => { panel.hidden = panel.id !== `${name}-panel`; });
  document.querySelectorAll('.nav-item[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  if (name === 'master') loadMaster(state.masterResource).catch(error => toast(error.message));
}

const masterColumns = {
  students: [
    { label: 'NIS', value: 'nis' }, { label: 'Nama', value: 'name' },
    { label: 'Kelas', value: 'classCode' }, { label: 'Username', value: 'username' }
  ],
  teachers: [
    { label: 'NIP', value: 'nip' }, { label: 'Nama', value: 'name' },
    { label: 'Mapel', value: 'subjects' }, { label: 'Wali kelas', value: 'classCode' }
  ],
  classes: [
    { label: 'Kode', value: 'code' }, { label: 'Nama kelas', value: 'name' },
    { label: 'Wali kelas', value: 'homeroom' }, { label: 'Kapasitas', value: 'capacity' }
  ],
  subjects: [
    { label: 'Kode', value: 'code' }, { label: 'Mata pelajaran', value: 'name' }, { label: 'Kelompok', value: 'group' }
  ]
};

async function loadMaster(resource, search = '') {
  state.masterResource = resource;
  const result = await api(`/api/v1/master/${encodeURIComponent(resource)}?limit=200&search=${encodeURIComponent(search)}`);
  state.masterItems = result.items || [];
  $('#master-count').textContent = `${formatNumber(result.total)} data`;
  document.querySelectorAll('.tab-button').forEach(button => button.classList.toggle('active', button.dataset.resource === resource));
  createTable($('#master-table'), masterColumns[resource] || [], state.masterItems, 'Data tidak ditemukan.');
}

async function loadDashboard() {
  const [dashboard, overview] = await Promise.all([
    api('/api/v1/dashboard'),
    api('/api/v1/overview')
  ]);
  renderDashboard(dashboard);
  renderOverview(overview);
}

document.querySelectorAll('.nav-item[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    if (!button.disabled) showView(button.dataset.view);
  });
});

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => loadMaster(button.dataset.resource).catch(error => toast(error.message)));
});

let searchTimer;
$('#master-search').addEventListener('input', event => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => loadMaster(state.masterResource, event.target.value).catch(error => toast(error.message)), 250);
});

$('#toggle-pin').addEventListener('click', () => {
  const input = $('#pin');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('#toggle-pin').textContent = visible ? 'Tampilkan' : 'Sembunyikan';
});

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#login-message');
  const button = $('#login-button');
  message.textContent = '';
  button.disabled = true;
  button.firstElementChild.textContent = 'Memeriksa akun…';
  try {
    const result = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: $('#username').value, pin: $('#pin').value })
    });
    state.user = result.user;
    showDashboard();
    await loadDashboard();
    showView('summary');
    toast(`Selamat datang, ${state.user.name || state.user.username}.`);
  } catch (error) {
    message.textContent = error.message;
    $('#pin').select();
  } finally {
    button.disabled = false;
    button.firstElementChild.textContent = 'Masuk dengan aman';
  }
});

$('#logout-button').addEventListener('click', async () => {
  try { await api('/api/v1/auth/logout', { method: 'POST', body: '{}' }); }
  catch (_) {}
  state.user = null;
  showLogin();
});

$('#sync-gas-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  const label = button.firstElementChild;
  button.disabled = true;
  label.textContent = 'Menyinkronkan…';
  try {
    const result = await api('/api/v1/admin/sync-gas', { method: 'POST', body: '{}' });
    await loadDashboard();
    toast(result.message || 'Sinkronisasi selesai.');
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    label.textContent = 'Sinkronkan dari GAS';
  }
});

$('#change-pin-form').addEventListener('submit', async event => {
  event.preventDefault();
  const message = $('#pin-message');
  const currentPin = $('#current-pin').value;
  const newPin = $('#new-pin').value;
  const confirmation = $('#confirm-pin').value;
  message.textContent = '';
  if (!/^\d{6}$/.test(newPin)) {
    message.textContent = 'PIN baru harus tepat 6 digit.';
    return;
  }
  if (newPin !== confirmation) {
    message.textContent = 'Konfirmasi PIN baru tidak sama.';
    return;
  }
  try {
    const result = await api('/api/v1/auth/change-pin', {
      method: 'POST', body: JSON.stringify({ currentPin, newPin })
    });
    event.target.reset();
    toast(result.message || 'PIN berhasil diperbarui.');
    showView('summary');
  } catch (error) {
    message.textContent = error.message;
  }
});

async function initialize() {
  try {
    const result = await api('/api/v1/auth/me');
    state.user = result.user;
    showDashboard();
    await loadDashboard();
    showView('summary');
  } catch (_) {
    showLogin();
  }
}

initialize();
