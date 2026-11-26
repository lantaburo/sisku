'use strict';

const $ = selector => document.querySelector(selector);
const state = { user: null, dashboard: null };

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
    status.className = `module-status ${module.status === 'next' ? 'next' : ''}`;
    status.textContent = module.status === 'next' ? 'Berikutnya' : 'GAS aktif';
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

async function loadDashboard() {
  const result = await api('/api/v1/dashboard');
  renderDashboard(result);
}

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

async function initialize() {
  try {
    const result = await api('/api/v1/auth/me');
    state.user = result.user;
    showDashboard();
    await loadDashboard();
  } catch (_) {
    showLogin();
  }
}

initialize();
