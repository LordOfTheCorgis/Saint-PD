const NUI = (endpoint, data) => fetch(`https://pd_pc/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(data||{}) });

const body = document.body;
const login = document.getElementById('login');
const desktop = document.getElementById('desktop');
const taskbar = document.getElementById('taskbar');
const icons = document.getElementById('desktop-icons');
const iconsViewers = document.getElementById('desktop-icons-viewers');
const tasks = document.getElementById('tasks');
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');

let zIndexTop = 10;
const openTasks = new Map();
let dragging = null; 
let selectedCharges = [];
let focusedAppId = null;
let officerName = '';
const JAIL_MAX = 300;
const JAIL_SCALE = 0.5; 

function openEvidenceDetail(rec){
  const div = document.getElementById('ev-detail');
  if (!div) return;
  const atts = (rec.attachments||[]).map(u=>`<a href="${u}" target="_blank">${u}</a>`).join(', ') || 'None';
  div.innerHTML = `
    <div class="row"><span class="label">Case</span>${rec.caseNumber||''} <button data-copy="${rec.caseNumber||''}">Copy</button></div>
    <div class="row"><span class="label">Officer</span>${rec.officer||''}</div>
    <div class="row"><span class="label">Suspect ID</span>${rec.suspectId||''}</div>
    <div class="row"><span class="label">Items</span>${(rec.items||[]).join(', ')}</div>
    <div class="row"><span class="label">Attachments</span>${atts}</div>
    <div class="row"><span class="label">Description</span>${(rec.description||'').replace(/\n/g,'<br>')}</div>
    <div class="row"><span class="label">Time</span>${new Date((rec.timestamp||0)*1000).toLocaleString()}</div>
  `;
  openApp('app-evidence-detail');
}

function openBookingDetail(rec){
  const div = document.getElementById('bk-detail');
  if (!div) return;
  const charges = Array.isArray(rec.charges) ? rec.charges.map(c => c.name ? `${c.name} (${c.code})` : (c.code||'')).join(', ') : '';
  const mug = rec.mugshot ? `<a href="${rec.mugshot}" target="_blank">Open mugshot</a>` : 'None';
  div.innerHTML = `
    <div class="row"><span class="label">Target</span>${rec.targetId||''} <button data-copy="${rec.targetId||''}">Copy</button></div>
    <div class="row"><span class="label">Officer</span>${rec.officer||''}</div>
    <div class="row"><span class="label">Jail</span>${rec.jailSeconds||0} seconds</div>
    <div class="row"><span class="label">Charges</span>${charges}</div>
    <div class="row"><span class="label">Notes</span>${(rec.notes||'').replace(/\n/g,'<br>')}</div>
    <div class="row"><span class="label">Mugshot</span>${mug}</div>
    <div class="row"><span class="label">Time</span>${new Date((rec.timestamp||0)*1000).toLocaleString()}</div>
  `;
  openApp('app-booking-detail');
}
 

function showLoginUI(){
  body.classList.remove('nui-hidden');
  desktop.classList.remove('hidden'); 
  login.classList.remove('hidden');
  login.classList.remove('fade-out');
  login.style.zIndex = 3;
  taskbar.classList.add('hidden');
  icons.classList.add('hidden');
  if (iconsViewers) iconsViewers.classList.add('hidden');
}

function requestEvidence(){ NUI('getEvidence', {}); }
function requestBookings(){ NUI('getBookings', {}); }

function renderEvidenceRecords(list){
  evidenceData = list.slice().reverse();
  drawEvidenceCards();
}

function renderBookingRecords(list){
  bookingData = list.slice().reverse();
  drawBookingCards();
}

const evRefresh = document.getElementById('ev-refresh');
if (evRefresh) evRefresh.addEventListener('click', requestEvidence);
const bkRefresh = document.getElementById('bk-refresh');
if (bkRefresh) bkRefresh.addEventListener('click', requestBookings);

function hideStartMenu(){ startMenu && startMenu.classList.add('hidden'); }
if (startBtn) startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startMenu.classList.toggle('hidden');
});
window.addEventListener('click', () => hideStartMenu());
const menuLogout = document.getElementById('menu-logout');
if (menuLogout) menuLogout.addEventListener('click', () => {
  hideStartMenu();
  showLoginUI();
});
const menuShutdown = document.getElementById('menu-shutdown');
if (menuShutdown) menuShutdown.addEventListener('click', () => {
  hideStartMenu();
  NUI('close', {});
});

let evidenceData = [], bookingData = [];
const evState = { page: 1, pageSize: 8, search: '' };
const bkState = { page: 1, pageSize: 8, search: '', timeFilter: '' };
const evSearch = document.getElementById('ev-search');
if (evSearch) evSearch.addEventListener('input', () => { evState.search = evSearch.value.toLowerCase(); evState.page = 1; drawEvidenceCards(); });

function drawEvidenceCards(){
  const wrap = document.getElementById('ev-cards');
  const pager = document.getElementById('ev-pager');
  if (!wrap) return;
  const filtered = evidenceData.filter(r => {
    const blob = `${r.caseNumber||''} ${r.officer||''} ${r.suspectId||''} ${(r.items||[]).join(' ')} ${(r.attachments||[]).join(' ')}`.toLowerCase();
    return blob.includes(evState.search);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / evState.pageSize));
  evState.page = Math.min(evState.page, pages);
  const start = (evState.page - 1) * evState.pageSize;
  const slice = filtered.slice(start, start + evState.pageSize);
  wrap.innerHTML = slice.map(r => {
    const items = (r.items||[]).slice(0,3).join(', ');
    return `<div class="card" data-case="${r.caseNumber||''}">
      <div class="card-title">${r.caseNumber||'CASE'}</div>
      <div class="muted">Officer: ${r.officer||''}</div>
      <div class="muted">Suspect: ${r.suspectId||''}</div>
      <div class="muted">Items: ${items}${(r.items||[]).length>3?'…':''}</div>
      <div class="muted">${new Date((r.timestamp||0)*1000).toLocaleString()}</div>
    </div>`;
  }).join('');
  wrap.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-case');
      const rec = evidenceData.find(x => (x.caseNumber||'') === id);
      if (rec) openEvidenceDetail(rec);
    });
  });
  if (pager) pager.innerHTML = pagerHtml(evState.page, pages, (p)=>{ evState.page = p; drawEvidenceCards(); });
}

const bkSearch = document.getElementById('bk-search');
if (bkSearch) bkSearch.addEventListener('input', () => { bkState.search = bkSearch.value.toLowerCase(); bkState.page = 1; drawBookingCards(); });
const bkTimeFilter = document.getElementById('bk-time-filter');
if (bkTimeFilter) bkTimeFilter.addEventListener('change', () => { bkState.timeFilter = bkTimeFilter.value; bkState.page = 1; drawBookingCards(); });

function drawBookingCards(){
  const wrap = document.getElementById('bk-cards');
  const pager = document.getElementById('bk-pager');
  if (!wrap) return;
  const filtered = bookingData.filter(r => {
    const chargesTxt = Array.isArray(r.charges) ? r.charges.map(c => c.name||c.code||'').join(' ') : '';
    const blob = `${r.targetId||''} ${r.officer||''} ${chargesTxt}`.toLowerCase();
    if (!blob.includes(bkState.search)) return false;
    if (bkState.timeFilter === '<=300') return (r.jailSeconds||0) <= 300;
    if (bkState.timeFilter === '>300') return (r.jailSeconds||0) > 300;
    return true;
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / bkState.pageSize));
  bkState.page = Math.min(bkState.page, pages);
  const start = (bkState.page - 1) * bkState.pageSize;
  const slice = filtered.slice(start, start + bkState.pageSize);
  wrap.innerHTML = slice.map(r => {
    const charges = Array.isArray(r.charges) ? r.charges.slice(0,3).map(c => c.name || c.code).join(', ') : '';
    return `<div class="card" data-target="${r.targetId||''}" data-time="${r.timestamp||0}">
      <div class="card-title">Target ${r.targetId||''}</div>
      <div class="muted">Officer: ${r.officer||''}</div>
      <div class="muted">Jail: ${r.jailSeconds||0}s</div>
      <div class="muted">Charges: ${charges}${Array.isArray(r.charges) && r.charges.length>3?'…':''}</div>
      <div class="muted">${new Date((r.timestamp||0)*1000).toLocaleString()}</div>
    </div>`;
  }).join('');
  wrap.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const target = parseInt(card.getAttribute('data-target'), 10);
      const time = parseInt(card.getAttribute('data-time'), 10);
      const rec = bookingData.find(x => x.targetId === target && x.timestamp === time);
      if (rec) openBookingDetail(rec);
    });
  });
  if (pager) pager.innerHTML = pagerHtml(bkState.page, pages, (p)=>{ bkState.page = p; drawBookingCards(); });
}

function pagerHtml(page, pages, onClick){
  const btn = (p, label) => `<button data-p="${p}" ${p===page?'disabled':''}>${label}</button>`;
  const html = `${btn(Math.max(1,page-1),'Prev')} ${btn(Math.min(pages,page+1),'Next')}`;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const div = wrap;
  setTimeout(()=>{
    div.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{ onClick(parseInt(b.dataset.p,10)); });
    });
  },0);
  return div.innerHTML;
}

function showDesktopUI(){
  login.classList.add('fade-out');
  setTimeout(() => {
    login.classList.add('hidden');
    login.classList.remove('fade-out');
    desktop.classList.remove('hidden');
    taskbar.classList.remove('hidden');
    icons.classList.remove('hidden');
  if (iconsViewers) iconsViewers.classList.remove('hidden');
  hideStartMenu();
  }, 180);
}

function hideAllUI(){
  body.classList.add('nui-hidden');
  login.classList.add('hidden');
}

window.addEventListener('message', (e) => {
  const data = e.data;
  if (data.action === 'open') {
    showLoginUI();
  } else if (data.action === 'desktop') {
    showDesktopUI();
  } else if (data.action === 'close') {
    hideAllUI();
  } else if (data.action === 'evidenceData') {
    renderEvidenceRecords(data.data || []);
  } else if (data.action === 'bookingData') {
    renderBookingRecords(data.data || []);
  }
});

document.getElementById('loginBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('username');
  officerName = (nameInput && nameInput.value.trim()) || '';
  NUI('login', {}).then(() => {});
});

function focusApp(win){
  zIndexTop += 1;
  win.style.zIndex = zIndexTop;
  focusedAppId = win.id;
  tasks.querySelectorAll('.task').forEach(t => t.classList.remove('active'));
  const btn = openTasks.get(win.id);
  if (btn) btn.classList.add('active');
}

function openApp(id){
  const win = document.getElementById(id);
  if (!win) return;
  win.classList.remove('hidden');
  focusApp(win);
  if (!openTasks.has(id)) {
    const btn = document.createElement('div');
    btn.className = 'task';
    btn.dataset.app = id;
    const mini = document.createElement('span');
    mini.className = 'mini';
    const label = document.createElement('span');
    label.textContent = id === 'app-evidence' ? 'Evidence' : id === 'app-booking' ? 'Booking' : id === 'app-evidence-view' ? 'Evidence Records' : id === 'app-booking-view' ? 'Booking Records' : id.replace('app-','');
    btn.appendChild(mini);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      if (win.classList.contains('hidden')) {
        win.classList.remove('hidden');
        focusApp(win);
      } else {
        minimizeApp(win);
      }
    });
    tasks.appendChild(btn);
    openTasks.set(id, btn);
  }
}

function closeAppEl(el){
  const win = el.closest('.app');
  if (!win) return;
  win.classList.add('hidden');
  const id = win.id;
  const btn = openTasks.get(id);
  if (btn) {
    btn.remove();
    openTasks.delete(id);
  }
  if (focusedAppId === id) focusedAppId = null;
}

const taskContext = document.getElementById('task-context');
let taskContextFor = null;
function showTaskMenu(appId, x, y){
  taskContextFor = appId;
  if (!taskContext) return;
  taskContext.style.left = x + 'px';
  taskContext.style.top = y + 'px';
  taskContext.classList.remove('hidden');
}
function hideTaskMenu(){ if (taskContext) taskContext.classList.add('hidden'); taskContextFor = null; }

tasks.addEventListener('contextmenu', (e)=>{
  const btn = e.target.closest('.task');
  if (!btn) return;
  e.preventDefault();
  hideStartMenu();
  const appId = btn.dataset.app;
  showTaskMenu(appId, e.clientX, e.clientY);
});

document.addEventListener('click', (e)=>{
  const inMenu = e.target.closest && e.target.closest('#task-context');
  const inTask = e.target.closest && e.target.closest('.task');
  if (!inMenu && !inTask) hideTaskMenu();
});

if (taskContext) taskContext.addEventListener('click', (e)=>{
  const actBtn = e.target.closest('button[data-task-action]');
  if (!actBtn) return;
  const action = actBtn.getAttribute('data-task-action');
  const appId = taskContextFor;
  hideTaskMenu();
  if (!appId) return;
  const win = document.getElementById(appId);
  if (!win) return;
  if (action === 'restore') {
    win.classList.remove('hidden');
    focusApp(win);
  } else if (action === 'minimize') {
    minimizeApp(win);
  } else if (action === 'close') {
    win.classList.add('hidden');
    const btn = openTasks.get(appId);
    if (btn) { btn.remove(); openTasks.delete(appId); }
    if (focusedAppId === appId) focusedAppId = null;
  }
});

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => closeAppEl(e.target));
});

function minimizeApp(win){
  const btn = openTasks.get(win.id);
  const winRect = win.getBoundingClientRect();
  let dx = 0, dy = 0;
  if (btn) {
    const btnRect = btn.getBoundingClientRect();
    dx = (btnRect.left + btnRect.width/2) - (winRect.left + winRect.width/2);
    dy = (btnRect.top + btnRect.height/2) - (winRect.top + winRect.height/2);
  }
  win.style.transition = 'transform 0.18s ease-in, opacity 0.18s ease-in';
  win.style.transform = `translate(${dx}px, ${dy}px) scale(0.95)`;
  win.style.opacity = '0';
  setTimeout(() => {
    win.style.transition = '';
    win.style.transform = '';
    win.style.opacity = '';
    win.classList.add('hidden');
  }, 180);
  if (focusedAppId === win.id) focusedAppId = null;
}

document.querySelectorAll('[data-minimize]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const win = e.target.closest('.app');
    if (win) minimizeApp(win);
  });
});

document.querySelectorAll('.icon').forEach(icon => {
  icon.addEventListener('click', () => {
    const app = icon.getAttribute('data-app');
    if (app === 'evidence') openApp('app-evidence');
    if (app === 'booking') openApp('app-booking');
    if (app === 'evidence-view') { openApp('app-evidence-view'); requestEvidence(); }
    if (app === 'booking-view') { openApp('app-booking-view'); requestBookings(); }
  });
});

function val(id){ const el = document.getElementById(id); return el && typeof el.value === 'string' ? el.value.trim() : ''; }

document.getElementById('ev-submit').addEventListener('click', () => {
  const payload = {
    caseNumber: val('ev-case'),
    suspectId: val('ev-suspect-id'),
    location: val('ev-location'),
    collectedAt: val('ev-collect-time'),
    officerBadge: val('ev-badge'),
    locker: val('ev-locker'),
    description: val('ev-desc'),
    items: val('ev-items').split(',').map(s=>s.trim()).filter(Boolean),
    units: val('ev-units').split(',').map(s=>s.trim()).filter(Boolean),
    attachments: evAttachments.slice(),
    officerName
  };
  NUI('submitEvidence', payload).then(() => {
    closeAppEl(document.getElementById('app-evidence'));
  });
});

document.getElementById('bk-submit').addEventListener('click', () => {
  const payload = {
    targetId: val('bk-id'),
    name: val('bk-name'),
    dob: val('bk-dob'),
    sex: val('bk-sex'),
    address: val('bk-address'),
    phone: val('bk-phone'),
    charges: selectedCharges.slice(),
    totalTime: parseInt((document.getElementById('bk-total-time') && document.getElementById('bk-total-time').value) || '0', 10) || 0,
    arrestLocation: val('bk-arrest-loc'),
    arrestTime: val('bk-arrest-time'),
    mirandaTime: val('bk-miranda-time'),
    plate: val('bk-plate'),
    mugshot: val('bk-mug'),
    medicalCleared: val('bk-med'),
    inventory: val('bk-inventory').split(',').map(s=>s.trim()).filter(Boolean),
    notes: val('bk-notes'),
    officerName
  };
  NUI('submitBooking', payload).then(() => {
    closeAppEl(document.getElementById('app-booking'));
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    NUI('close', {});
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
    if (focusedAppId) {
      const win = document.getElementById(focusedAppId);
      if (win) minimizeApp(win);
    }
  }
  if (e.altKey && (e.key === 'Tab')) {
    e.preventDefault();
    const ids = Array.from(openTasks.keys());
    if (ids.length === 0) return;
    let idx = focusedAppId ? ids.indexOf(focusedAppId) : -1;
    idx = (idx + 1) % ids.length;
    const nextId = ids[idx];
    const win = document.getElementById(nextId);
    if (win) {
      win.classList.remove('hidden');
      focusApp(win);
    }
  }
});

function updateClock(){
  const el = document.getElementById('clock');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

function setupDragging(){
  document.querySelectorAll('.app .title-bar').forEach(tb => {
    const win = tb.closest('.app');
    tb.addEventListener('dblclick', () => {
      toggleMaximize(win);
    });
    tb.addEventListener('mousedown', (e) => {
      if (win.classList.contains('hidden')) return;
      if (win.classList.contains('maximized')) {
        let prev = null;
        try { if (win.dataset.prev) prev = JSON.parse(win.dataset.prev); } catch(_) {}
        let width = prev && prev.width ? prev.width : Math.min(720, window.innerWidth - 40);
        let height = prev && prev.height ? prev.height : Math.min(480, window.innerHeight - 80);
        win.classList.remove('maximized');
        let left = Math.max(0, Math.min(window.innerWidth - width, e.clientX - width / 2));
        let top = Math.max(0, Math.min(window.innerHeight - height, e.clientY - 10));
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.left = left + 'px';
        win.style.top = top + 'px';
      }
      const rect = win.getBoundingClientRect();
      dragging = {
        win,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };
      focusApp(win);
      e.preventDefault();
      document.body.classList.add('no-select');
    });
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = e.clientX - dragging.offsetX;
    const y = e.clientY - dragging.offsetY;
    dragging.win.style.left = Math.max(0, x) + 'px';
    dragging.win.style.top = Math.max(0, y) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (dragging) {
      const win = dragging.win;
      const rect = win.getBoundingClientRect();
      const grid = 10;
      const snapEdge = 8;
      let left = rect.left;
      let top = rect.top;
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      if (left < snapEdge) left = 0; else if (Math.abs(left - maxX) < snapEdge) left = maxX;
      if (top < snapEdge) top = 0; else if (Math.abs(top - maxY) < snapEdge) top = maxY;
      left = Math.round(left / grid) * grid;
      top = Math.round(top / grid) * grid;
      win.style.left = Math.max(0, Math.min(maxX, left)) + 'px';
      win.style.top = Math.max(0, Math.min(maxY, top)) + 'px';
    }
    dragging = null;
    document.body.classList.remove('no-select');
  });
}
setupDragging();

function setupAppFlows(){
  const evSplash = document.getElementById('ev-splash');
  const evPages = document.getElementById('ev-pages');
  const evCont = document.getElementById('ev-continue');
  if (evCont && evSplash && evPages) {
    evCont.addEventListener('click', ()=>{ evSplash.classList.add('hidden'); evPages.classList.remove('hidden'); });
  }
  const bkSplash = document.getElementById('bk-splash');
  const bkPages = document.getElementById('bk-pages');
  const bkCont = document.getElementById('bk-continue');
  if (bkCont && bkSplash && bkPages) {
    bkCont.addEventListener('click', ()=>{ bkSplash.classList.add('hidden'); bkPages.classList.remove('hidden'); });
  }
  document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const target = btn.getAttribute('data-target');
      const container = btn.closest('.window-body');
      if (!container) return;
      let bc = container.querySelector('.breadcrumb');
      if (!bc) { bc = document.createElement('div'); bc.className = 'breadcrumb'; container.prepend(bc); }
      bc.textContent = `Section: ${btn.textContent}`;
      container.querySelectorAll('.app-page').forEach(p=>{ p.classList.add('page-hidden'); p.classList.add('hidden'); });
      const page = container.querySelector(`.app-page[data-page="${target}"]`);
      if (page) {
        page.classList.remove('hidden');
        setTimeout(()=>page.classList.remove('page-hidden'), 0);
      }
    });
  });
}
setupAppFlows();

document.addEventListener('click', (e)=>{
  const t = e.target;
  if (t && t.matches('button[data-copy]')){
    const text = t.getAttribute('data-copy') || '';
    if (navigator.clipboard && text) navigator.clipboard.writeText(text);
  }
});

function toggleMaximize(win){
  if (!win) return;
  if (win.classList.contains('maximized')) {
    const prev = win.dataset.prev;
    if (prev) {
      const { left, top, width, height } = JSON.parse(prev);
      win.style.left = left + 'px';
      win.style.top = top + 'px';
      win.style.width = width + 'px';
      win.style.height = height + 'px';
    }
    win.classList.remove('maximized');
  } else {
    const rect = win.getBoundingClientRect();
    win.dataset.prev = JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    win.classList.add('maximized');
  }
  focusApp(win);
}

let resizing = null;
function setupResizers(){
  document.querySelectorAll('.app').forEach(win => {
    win.querySelectorAll('.resizer').forEach(rs => {
      rs.addEventListener('mousedown', (e) => {
        const rect = win.getBoundingClientRect();
        resizing = {
          win,
          edge: Array.from(rs.classList).find(c=>['nw','ne','sw','se','n','s','w','e'].includes(c)),
          startX: e.clientX,
          startY: e.clientY,
          startW: rect.width,
          startH: rect.height,
          startL: rect.left,
          startT: rect.top
        };
        focusApp(win);
        e.preventDefault();
        e.stopPropagation();
      });
    });
  });
  window.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    const minW = 280, minH = 160;
    let dX = e.clientX - resizing.startX;
    let dY = e.clientY - resizing.startY;
    let newW = resizing.startW;
    let newH = resizing.startH;
    let newL = resizing.startL;
    let newT = resizing.startT;
    const edge = resizing.edge;
    if (edge.includes('e')) newW = Math.max(minW, resizing.startW + dX);
    if (edge.includes('s')) newH = Math.max(minH, resizing.startH + dY);
    if (edge.includes('w')) { newW = Math.max(minW, resizing.startW - dX); newL = resizing.startL + dX; }
    if (edge.includes('n')) { newH = Math.max(minH, resizing.startH - dY); newT = resizing.startT + dY; }
    const maxW = window.innerWidth - newL;
    const maxH = window.innerHeight - newT;
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);
    resizing.win.style.width = newW + 'px';
    resizing.win.style.height = newH + 'px';
    resizing.win.style.left = Math.max(0, newL) + 'px';
    resizing.win.style.top = Math.max(0, newT) + 'px';
  });
  window.addEventListener('mouseup', () => { resizing = null; });
}
setupResizers();

// def not florida charges but I don't care enough as these are just for testing.
const FL_CHARGES = [
  { code: '784.03', name: 'Battery', category: 'Misdemeanor', degree: '1st', time: 120, fine: 500 },
  { code: '784.021', name: 'Aggravated Assault', category: 'Felony', degree: '3rd', time: 300, fine: 1500 },
  { code: '784.045', name: 'Aggravated Battery', category: 'Felony', degree: '2nd', time: 600, fine: 2500 },
  { code: '812.014', name: 'Theft', category: 'Misdemeanor', degree: '1st', time: 180, fine: 750 },
  { code: '812.13', name: 'Robbery', category: 'Felony', degree: '2nd', time: 900, fine: 3000 },
  { code: '810.02', name: 'Burglary', category: 'Felony', degree: '2nd', time: 720, fine: 2500 },
  { code: '806.01', name: 'Arson', category: 'Felony', degree: '1st', time: 1200, fine: 5000 },
  { code: '790.01', name: 'Carrying Concealed Weapon', category: 'Misdemeanor', degree: '1st', time: 120, fine: 500 },
  { code: '790.23', name: 'Felon in Possession of Firearm', category: 'Felony', degree: '2nd', time: 900, fine: 3500 },
  { code: '322.34', name: 'Driving While License Suspended', category: 'Misdemeanor', degree: '1st', time: 90, fine: 300 },
  { code: '316.193', name: 'DUI', category: 'Misdemeanor', degree: '1st', time: 240, fine: 1000 },
  { code: '843.02', name: 'Resisting without Violence', category: 'Misdemeanor', degree: '1st', time: 120, fine: 400 },
  { code: '843.01', name: 'Resisting with Violence', category: 'Felony', degree: '3rd', time: 360, fine: 1500 },
  { code: '316.1935', name: 'Fleeing/Eluding', category: 'Felony', degree: '3rd', time: 480, fine: 2000 },
  { code: '893.13', name: 'Possession Controlled Substance', category: 'Felony', degree: '3rd', time: 360, fine: 1500 },
  { code: '893.135', name: 'Trafficking Controlled Substances', category: 'Felony', degree: '1st', time: 1200, fine: 7500 }
];

function populateCharges(){
  const sel = document.getElementById('bk-charge-select');
  if (!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a charge';
  sel.appendChild(placeholder);
  FL_CHARGES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code}) [${c.category} ${c.degree}]`;
    sel.appendChild(opt);
  });
}
populateCharges();

function renderChargeChips(){
  const wrap = document.getElementById('bk-charge-chips');
  if (!wrap) return;
  wrap.innerHTML = '';
  selectedCharges.forEach((c, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = `${c.name} (${c.code})`;
    const rm = document.createElement('button');
    rm.className = 'remove';
    rm.textContent = 'x';
    rm.addEventListener('click', () => {
      selectedCharges.splice(idx, 1);
      renderChargeChips();
      updateTotals();
    });
    chip.appendChild(rm);
    wrap.appendChild(chip);
  });
}

const addBtn = document.getElementById('bk-add-charge');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    const sel = document.getElementById('bk-charge-select');
    const code = sel && sel.value;
    const found = FL_CHARGES.find(c => c.code === code);
    if (found && !selectedCharges.some(c => c.code === found.code)) {
      // push a scaled copy to shorten times
      selectedCharges.push({ ...found, time: Math.floor((found.time || 0) * JAIL_SCALE) });
      renderChargeChips();
      updateTotals();
    }
  });
}

function updateTotals(){
  const timeEl = document.getElementById('bk-total-time');
  const fineEl = document.getElementById('bk-total-fine');
  if (!timeEl || !fineEl) return;
  const totals = selectedCharges.reduce((acc, c) => {
    acc.time += c.time || 0;
    acc.fine += c.fine || 0;
    return acc;
  }, { time: 0, fine: 0 });
  timeEl.value = Math.min(JAIL_MAX, totals.time);
  fineEl.value = totals.fine;
}

let evAttachments = [];
function renderAttachChips(){
  const wrap = document.getElementById('ev-attach-chips');
  if (!wrap) return;
  wrap.innerHTML = '';
  evAttachments.forEach((u, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = u;
    const rm = document.createElement('button');
    rm.className = 'remove';
    rm.textContent = 'x';
    rm.addEventListener('click', () => { evAttachments.splice(idx, 1); renderAttachChips(); });
    chip.appendChild(rm);
    wrap.appendChild(chip);
  });
}
const evAddAttachBtn = document.getElementById('ev-add-attach');
if (evAddAttachBtn) {
  evAddAttachBtn.addEventListener('click', () => {
    const input = document.getElementById('ev-attach-url');
    const url = (input.value || '').trim();
    if (url) {
      evAttachments.push(url);
      input.value = '';
      renderAttachChips();
    }
  });
}
const evAddTemplateBtn = document.getElementById('ev-add-template');
if (evAddTemplateBtn) {
  evAddTemplateBtn.addEventListener('click', () => {
    const sel = document.getElementById('ev-template-select');
    const item = sel && sel.value;
    if (item) {
      const itemsInput = document.getElementById('ev-items');
      const current = (itemsInput.value || '').trim();
      itemsInput.value = current ? (current + ', ' + item) : item;
    }
  });
}

