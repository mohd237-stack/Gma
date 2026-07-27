let token = sessionStorage.getItem('qamaAdminToken') || '';
let participants = [];
let winners = [];
let settings = { open: true };

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginMessage = document.getElementById('loginMessage');
const adminMessage = document.getElementById('adminMessage');
const categoryLabels = { men: 'رجال', women: 'نساء', children: 'أطفال' };

function message(text, type = 'error') {
  adminMessage.textContent = text;
  adminMessage.className = `status-banner admin-message ${type}`;
  setTimeout(() => adminMessage.classList.add('hidden'), 5000);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    sessionStorage.removeItem('qamaAdminToken'); token = ''; showLogin();
    throw new Error('انتهت جلسة الإدارة. سجل الدخول مرة أخرى.');
  }
  if (!response.ok) throw new Error(data.message || 'تعذر تنفيذ العملية.');
  return data;
}

function showLogin() { loginView.classList.remove('hidden'); dashboardView.classList.add('hidden'); }
function showDashboard() { loginView.classList.add('hidden'); dashboardView.classList.remove('hidden'); }

async function loadData() {
  const data = await api('/api/admin/data');
  participants = data.participants || [];
  winners = data.winners || [];
  settings = data.settings || { open: true };
  renderDashboard();
}

function renderDashboard() {
  document.getElementById('statTotal').textContent = participants.length;
  document.getElementById('statPerfect').textContent = participants.filter(p => p.score === p.totalQuestions).length;
  document.getElementById('statWinners').textContent = winners.length;
  document.getElementById('statStatus').textContent = settings.open ? 'مفتوح' : 'مغلق';
  document.getElementById('toggleOpenBtn').textContent = settings.open ? 'إغلاق الاستقبال' : 'فتح الاستقبال';
  renderTable();
  renderHistory();
}

function renderTable() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const category = document.getElementById('filterCategory').value;
  const filtered = participants.filter(p => {
    const matchesText = !query || p.fullName.toLowerCase().includes(query) || p.phone.includes(query);
    const matchesCategory = category === 'all' || p.category === category;
    return matchesText && matchesCategory;
  });
  const body = document.getElementById('participantsBody');
  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-state">لا توجد مشاركات مطابقة.</td></tr>';
    return;
  }
  body.innerHTML = filtered.map((p, i) => `
    <tr>
      <td>${i + 1}</td><td>${escapeHtml(p.fullName)}</td><td>${categoryLabels[p.category] || p.category}</td>
      <td dir="ltr">${escapeHtml(p.phone)}</td>
      <td class="${p.score === p.totalQuestions ? 'score-full' : 'score-low'}">${p.score} / ${p.totalQuestions}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td><button class="icon-btn" data-delete="${p.id}" title="حذف المشاركة">حذف</button></td>
    </tr>`).join('');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!winners.length) { list.innerHTML = '<div class="empty-state">لم يتم إجراء سحب حتى الآن.</div>'; return; }
  list.innerHTML = winners.map((w, i) => `
    <div class="history-item"><div><strong>${i + 1}. ${escapeHtml(w.fullName)}</strong><br><small>${categoryLabels[w.category] || ''} • ${w.score}/${w.totalQuestions}</small></div><small>${formatDate(w.drawnAt)}</small></div>
  `).join('');
}

function formatDate(value) {
  try { return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Riyadh' }).format(new Date(value)); }
  catch { return value || ''; }
}
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function exportCsv() {
  const rows = [['الاسم الرباعي','الفئة','رقم الجوال','النتيجة','عدد الأسئلة','وقت الإرسال']];
  participants.forEach(p => rows.push([p.fullName, categoryLabels[p.category] || p.category, p.phone, p.score, p.totalQuestions, p.createdAt]));
  const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `مشاركات-مسابقة-القمع-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

async function drawWinner() {
  const btn = document.getElementById('drawBtn');
  const stage = document.getElementById('drawStage');
  btn.disabled = true; stage.classList.add('rolling');
  stage.innerHTML = '<div><div style="font-size:2rem">🔄</div><p>جارٍ الفرز العشوائي...</p></div>';
  await new Promise(r => setTimeout(r, 1250));
  try {
    const result = await api('/api/admin/draw', { method: 'POST', body: JSON.stringify({ pool: document.getElementById('drawPool').value, category: document.getElementById('drawCategory').value }) });
    const w = result.winner;
    stage.innerHTML = `<div><div style="font-size:2.3rem">🏆</div><div class="winner-name">${escapeHtml(w.fullName)}</div><div class="winner-meta">${categoryLabels[w.category]} • النتيجة ${w.score}/${w.totalQuestions}<br><span dir="ltr">${escapeHtml(w.phone)}</span></div></div>`;
    await loadData();
  } catch (e) { stage.innerHTML = `<div><div style="font-size:2rem">⚠️</div><p>${escapeHtml(e.message)}</p></div>`; }
  finally { btn.disabled = false; stage.classList.remove('rolling'); }
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); loginMessage.classList.add('hidden');
  const button = e.currentTarget.querySelector('button'); button.disabled = true;
  try {
    const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: document.getElementById('password').value }) });
    token = data.token; sessionStorage.setItem('qamaAdminToken', token); showDashboard(); await loadData();
  } catch (err) { loginMessage.textContent = err.message; loginMessage.classList.remove('hidden'); }
  finally { button.disabled = false; }
});

document.getElementById('refreshBtn').addEventListener('click', () => loadData().then(() => message('تم تحديث البيانات.', 'success')).catch(e => message(e.message)));
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.getElementById('drawBtn').addEventListener('click', drawWinner);
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('filterCategory').addEventListener('change', renderTable);
document.getElementById('logoutBtn').addEventListener('click', () => { sessionStorage.removeItem('qamaAdminToken'); token = ''; showLogin(); });
document.getElementById('toggleOpenBtn').addEventListener('click', async () => {
  if (!confirm(settings.open ? 'هل تريد إغلاق استقبال المشاركات؟' : 'هل تريد فتح استقبال المشاركات؟')) return;
  try { await api('/api/admin/action', { method: 'POST', body: JSON.stringify({ action: 'setOpen', open: !settings.open }) }); await loadData(); message('تم تحديث حالة استقبال المشاركات.', 'success'); } catch(e) { message(e.message); }
});
document.getElementById('resetWinnersBtn').addEventListener('click', async () => {
  if (!confirm('سيتم مسح سجل الفائزين والسماح بسحبهم من جديد. هل أنت متأكد؟')) return;
  try { await api('/api/admin/action', { method: 'POST', body: JSON.stringify({ action: 'resetWinners' }) }); await loadData(); message('تم مسح سجل الفائزين.', 'success'); } catch(e) { message(e.message); }
});
document.getElementById('participantsBody').addEventListener('click', async e => {
  const id = e.target.dataset.delete; if (!id) return;
  if (!confirm('هل تريد حذف هذه المشاركة نهائيًا؟')) return;
  try { await api('/api/admin/action', { method: 'POST', body: JSON.stringify({ action: 'deleteParticipant', id }) }); await loadData(); message('تم حذف المشاركة.', 'success'); } catch(err) { message(err.message); }
});

if (token) { showDashboard(); loadData().catch(() => showLogin()); } else showLogin();
