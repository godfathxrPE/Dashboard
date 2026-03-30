/* Module: modules/prospects.js — Проработка, контакты проектов, INIT, тема */

/* ═══════════════════════════════════════════
   ПРОРАБОТКА — виджет, читающий данные кампании
   из localStorage ключа calls-campaign-v1.
   Паттерн: Cross-File Data Bridge.
═══════════════════════════════════════════ */
const PROSPECT_STORAGE_KEY = 'calls-campaign-v1';
const PROSPECT_STATUS = {
  calling:    { label: 'В работе',    cls: 's-calling' },
  nodial:     { label: 'Недозвон',    cls: 's-nodial' },
  gatekeeper: { label: 'Привратник',  cls: 's-gatekeeper' },
  found:      { label: 'ЛПР найден', cls: 's-found' },
  project:    { label: 'В проекте',   cls: 's-project' },
  done:       { label: 'Внедрена',    cls: 's-done' },
};
let prospectFilter = 'active';

function prospectSetFilter(f) {
  prospectFilter = f;
  document.querySelectorAll('.prospect-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === f);
  });
  renderProspects();
}

/* ═══════════════════════════════════════════
   PROSPECT → PROJECT BRIDGE
   Создаёт проект из данных кампании прозвона.
   Предзаполняет модальное окно проекта:
   name, client, contact (ЛПР), nextStep, sourceInn.
═══════════════════════════════════════════ */
function prospectToProject(inn) {
  /* Читаем данные компании из кампании */
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(PROSPECT_STORAGE_KEY)) || {}; } catch(e) {}
  const c = raw[inn];
  if (!c) { toast('Данные компании не найдены', 'error'); return; }

  /* Проверяем дублирование */
  if (projects.some(p => p.sourceInn === inn)) {
    toast('Проект для этой компании уже существует', 'warning');
    return;
  }

  /* Находим ЛПР-контакт */
  const contacts = c.contacts || [];
  const lpr = contacts.find(ct => ct.isLpr);
  const contactName = lpr ? lpr.name : (contacts.length ? contacts[0].name : '');

  /* Собираем заметку из истории кампании */
  let noteLines = [];
  if (c.notes) noteLines.push(c.notes);
  if (c.callLog && c.callLog.length) {
    noteLines.push('--- История звонков (' + c.callLog.length + ') ---');
    c.callLog.slice(-3).forEach(function(log) {
      noteLines.push((log.date || '') + ' | ' + (log.contact || '') + ': ' + (log.result || ''));
    });
  }
  noteLines.push('Источник: кампания прозвона (ИНН ' + inn + ')');

  /* Открываем модальное окно проекта */
  openProjectModal(null);

  /* Заполняем поля после открытия */
  setTimeout(function() {
    var nameIn = document.getElementById('proj-name-in');
    var clientIn = document.getElementById('proj-client-in');
    var contactIn = document.getElementById('proj-contact-in');
    var stageIn = document.getElementById('proj-stage-in');
    var nextIn = document.getElementById('proj-nextstep-in');
    if (nameIn)    nameIn.value = c.name || '';
    if (clientIn)  clientIn.value = c.name || '';
    if (contactIn) contactIn.value = contactName;
    if (stageIn)   stageIn.value = '0'; /* Новый лид */
    if (nextIn)    nextIn.value = c.nextStep || '';

    /* Сохраняем sourceInn в скрытом поле (создадим его) */
    var hiddenInn = document.getElementById('proj-source-inn');
    if (!hiddenInn) {
      hiddenInn = document.createElement('input');
      hiddenInn.type = 'hidden';
      hiddenInn.id = 'proj-source-inn';
      nameIn.parentNode.appendChild(hiddenInn);
    }
    hiddenInn.value = inn;

    /* Сохраняем заметку из кампании в скрытом поле */
    var hiddenNotes = document.getElementById('proj-source-notes');
    if (!hiddenNotes) {
      hiddenNotes = document.createElement('input');
      hiddenNotes.type = 'hidden';
      hiddenNotes.id = 'proj-source-notes';
      nameIn.parentNode.appendChild(hiddenNotes);
    }
    hiddenNotes.value = noteLines.join('\n');

    /* Сохраняем контакты из кампании в скрытом поле */
    var hiddenContacts = document.getElementById('proj-source-contacts');
    if (!hiddenContacts) {
      hiddenContacts = document.createElement('input');
      hiddenContacts.type = 'hidden';
      hiddenContacts.id = 'proj-source-contacts';
      nameIn.parentNode.appendChild(hiddenContacts);
    }
    hiddenContacts.value = JSON.stringify(contacts.map(function(ct) {
      return { name: ct.name||'', position: ct.position||'', phone: ct.phone||'', phone2: ct.phone2||'', email: ct.email||'', isLpr: !!ct.isLpr };
    }));

    toast('Заполнено из кампании — проверьте и сохраните', 'success');
  }, 100);
}

/* ── Контактные лица проекта: CRUD ── */
function delProjContact(projId, idx) {
  var p = projects.find(function(x) { return x.id === projId; });
  if (!p || !p.contacts) return;
  p.contacts.splice(idx, 1);
  LS.set('wdb_projects', projects);
  renderProjects();
  toast('Контакт удалён');
}

function showProjContactForm(projId) {
  /* Находим кнопку «+ Добавить контакт» и заменяем на форму */
  var btn = document.querySelector('[data-action="add-proj-contact-form"][data-id="' + projId + '"]');
  if (!btn) return;
  var form = document.createElement('div');
  form.className = 'proj-contact-form';
  form.setAttribute('data-stop', '');
  form.innerHTML =
    '<input id="pc-name-' + projId + '" placeholder="ФИО" style="grid-column:1/-1;">' +
    '<input id="pc-pos-' + projId + '" placeholder="Должность">' +
    '<input id="pc-phone-' + projId + '" placeholder="Телефон">' +
    '<input id="pc-email-' + projId + '" placeholder="Email" style="grid-column:1/-1;">' +
    '<div class="proj-contact-form-actions">' +
      '<button class="btn" data-action="cancel-proj-contact" data-id="' + projId + '" data-stop>Отмена</button>' +
      '<button class="btn btn-primary" data-action="save-proj-contact" data-id="' + projId + '" data-stop>Добавить</button>' +
    '</div>';
  btn.replaceWith(form);
  document.getElementById('pc-name-' + projId).focus();
}

function saveProjContact(projId) {
  var p = projects.find(function(x) { return x.id === projId; });
  if (!p) return;
  if (!p.contacts) p.contacts = [];
  var name = (document.getElementById('pc-name-' + projId) || {}).value || '';
  var pos  = (document.getElementById('pc-pos-' + projId) || {}).value || '';
  var phone = (document.getElementById('pc-phone-' + projId) || {}).value || '';
  var email = (document.getElementById('pc-email-' + projId) || {}).value || '';
  if (!name.trim()) { toast('Укажите ФИО', 'warning'); return; }
  p.contacts.push({ name: name.trim(), position: pos.trim(), phone: phone.trim(), phone2: '', email: email.trim(), isLpr: false });
  LS.set('wdb_projects', projects);
  renderProjects();
  toast('Контакт добавлен');
}

/* ── Редактирование контакта ── */
function editProjContact(projId, idx) {
  var p = projects.find(function(x) { return x.id === projId; });
  if (!p || !p.contacts || !p.contacts[idx]) return;
  var ct = p.contacts[idx];
  var card = document.querySelectorAll('.project-card[data-id="' + projId + '"] .proj-contact-card')[idx];
  if (!card) return;
  var form = document.createElement('div');
  form.className = 'proj-contact-edit-form';
  form.setAttribute('data-stop', '');
  form.innerHTML =
    '<input id="pce-name-' + projId + '-' + idx + '" placeholder="ФИО" value="' + esc(ct.name || '') + '" style="grid-column:1/-1;">' +
    '<input id="pce-pos-' + projId + '-' + idx + '" placeholder="Должность" value="' + esc(ct.position || '') + '">' +
    '<input id="pce-phone-' + projId + '-' + idx + '" placeholder="Телефон" value="' + esc(ct.phone || '') + '">' +
    '<input id="pce-email-' + projId + '-' + idx + '" placeholder="Email" value="' + esc(ct.email || '') + '" style="grid-column:1/-1;">' +
    '<div class="form-actions">' +
      '<label style="font-size:var(--text-2xs);display:flex;align-items:center;gap:4px;margin-right:auto;cursor:pointer;">' +
        '<input type="checkbox" id="pce-lpr-' + projId + '-' + idx + '"' + (ct.isLpr ? ' checked' : '') + '> ЛПР' +
      '</label>' +
      '<button class="btn" data-action="cancel-edit-proj-contact" data-stop>Отмена</button>' +
      '<button class="btn btn-primary" data-action="save-edit-proj-contact" data-id="' + projId + '" data-idx="' + idx + '" data-stop>Сохранить</button>' +
    '</div>';
  card.replaceWith(form);
  document.getElementById('pce-name-' + projId + '-' + idx).focus();
}

function saveEditProjContact(projId, idx) {
  var p = projects.find(function(x) { return x.id === projId; });
  if (!p || !p.contacts || !p.contacts[idx]) return;
  var pfx = 'pce-';
  var name  = (document.getElementById(pfx + 'name-' + projId + '-' + idx) || {}).value || '';
  var pos   = (document.getElementById(pfx + 'pos-' + projId + '-' + idx) || {}).value || '';
  var phone = (document.getElementById(pfx + 'phone-' + projId + '-' + idx) || {}).value || '';
  var email = (document.getElementById(pfx + 'email-' + projId + '-' + idx) || {}).value || '';
  var isLpr = (document.getElementById(pfx + 'lpr-' + projId + '-' + idx) || {}).checked || false;
  if (!name.trim()) { toast('Укажите ФИО', 'warning'); return; }
  p.contacts[idx].name = name.trim();
  p.contacts[idx].position = pos.trim();
  p.contacts[idx].phone = phone.trim();
  p.contacts[idx].email = email.trim();
  p.contacts[idx].isLpr = isLpr;
  LS.set('wdb_projects', projects);
  renderProjects();
  toast('Контакт обновлён');
}

/* ── Развёрнутый комментарий (overlay) ── */
var _commentOverlayId = null;

function openCommentOverlay(projId) {
  var p = projects.find(function(x) { return x.id === projId; });
  if (!p) return;
  _commentOverlayId = projId;
  var overlay = document.getElementById('comment-overlay');
  var textarea = document.getElementById('comment-overlay-textarea');
  var meta = document.getElementById('comment-overlay-meta');
  var title = document.getElementById('comment-overlay-title');
  title.textContent = 'Последний контакт — ' + (p.name || '');
  textarea.value = p.lastContact || '';
  meta.textContent = p.lastContactDate ? 'обновлено ' + fmtDate(p.lastContactDate) : '';
  overlay.classList.add('open');
  setTimeout(function() { textarea.focus(); }, 100);
}

function closeCommentOverlay() {
  document.getElementById('comment-overlay').classList.remove('open');
  _commentOverlayId = null;
}

function saveCommentOverlay() {
  if (!_commentOverlayId) return;
  var p = projects.find(function(x) { return x.id === _commentOverlayId; });
  if (!p) return;
  var val = document.getElementById('comment-overlay-textarea').value;
  p.lastContact = val;
  p.lastContactDate = new Date().toISOString().slice(0, 10);
  LS.set('wdb_projects', projects);
  closeCommentOverlay();
  renderProjects();
  toast('Комментарий сохранён');
}

function renderProspects() {
  const el = document.getElementById('prospect-list');
  const badge = document.getElementById('prospect-count');
  if (!el) return;

  /* Читаем данные кампании из localStorage */
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(PROSPECT_STORAGE_KEY)) || {}; } catch(e) {}

  /* Собираем массив компаний с активными статусами */
  const activeStatuses = ['calling', 'nodial', 'gatekeeper', 'found', 'project', 'done'];
  let items = [];
  for (const inn in raw) {
    const c = raw[inn];
    if (!c.status || !activeStatuses.includes(c.status)) continue;
    items.push({
      inn: inn,
      name: c.name || ('ИНН ' + inn),
      status: c.status,
      nextStep: c.nextStep || '',
      nextDate: c.nextDate || '',
      contacts: c.contacts || [],
      callLog: c.callLog || [],
      notes: c.notes || ''
    });
  }

  /* Фильтруем по текущему фильтру */
  let filtered = items;
  if (prospectFilter === 'active') {
    filtered = items.filter(c => c.status !== 'done');
  } else if (prospectFilter !== 'all') {
    filtered = items.filter(c => c.status === prospectFilter);
  }

  /* Сортировка: found → calling → gatekeeper → nodial → done */
  const ORDER = { found: 0, project: 1, calling: 2, gatekeeper: 3, nodial: 4, done: 5 };
  filtered.sort((a, b) => (ORDER[a.status] ?? 5) - (ORDER[b.status] ?? 5));

  /* Обновляем badge — количество активных (без done) */
  const activeCount = items.filter(c => c.status !== 'done').length;
  if (badge) badge.textContent = activeCount;

  if (!filtered.length) {
    el.innerHTML = '<div class="prospect-empty">' +
      (items.length ? 'Нет компаний с таким статусом' : 'Откройте кампанию прозвона — данные появятся автоматически') +
    '</div>';
    return;
  }

  el.innerHTML = filtered.map(c => {
    const st = PROSPECT_STATUS[c.status] || PROSPECT_STATUS.calling;
    const lpr = c.contacts ? c.contacts.find(ct => ct.isLpr) : null;
    const lprName = lpr ? esc(lpr.name) : '';
    const lastCall = c.callLog && c.callLog.length ? c.callLog[c.callLog.length - 1] : null;
    const lastDate = lastCall ? lastCall.date : '';
    const nextLabel = c.nextStep ? esc(c.nextStep) + (c.nextDate ? ' · ' + c.nextDate : '') : '';

    /* Проверяем, есть ли уже проект с таким sourceInn */
    const hasProject = projects.some(p => p.sourceInn === c.inn);
    const actionBtn = hasProject
      ? '<span class="prospect-in-proj">В проекте ✓</span>'
      : '<button class="prospect-to-proj" data-action="prospect-to-project" data-inn="' + c.inn + '" data-stop>→ В проект</button>';

    return '<div class="prospect-card" data-action="prospect-open" data-inn="' + c.inn + '">' +
      '<div class="prospect-status-bar ' + st.cls + '"></div>' +
      '<div class="prospect-info">' +
        '<div class="prospect-name">' + esc(c.name) + '</div>' +
        '<div class="prospect-meta">' +
          (lprName ? '<span>👤 ' + lprName + '</span>' : '') +
          (lastDate ? '<span>📞 ' + lastDate + '</span>' : '') +
          '<span>' + (c.contacts ? c.contacts.length : 0) + ' конт.</span>' +
        '</div>' +
        (nextLabel ? '<div class="prospect-next">→ ' + nextLabel + '</div>' : '') +
      '</div>' +
      '<div class="prospect-actions">' +
        '<span class="prospect-badge ' + st.cls + '">' + st.label + '</span>' +
        actionBtn +
      '</div>' +
    '</div>';
  }).join('');
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
cleanOldDoneTasks(); // удаляем выполненные задачи старше 10 дней
renderTasks();
renderKPI();
renderProjects();
renderProspects();
renderMeetings();
renderComms();

/* ═══════════════════════════════════════════
   DATA BRIDGE — связь с calls-campaign.html
   Паттерн: Cross-Tab Sync.
   1. visibilitychange — обновляет виджет при возврате на вкладку
   2. storage event — обновляет если campaign открыта в соседней вкладке
═══════════════════════════════════════════ */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    renderProspects();
    /* Campaign пишет в call tracker — подхватываем при возврате */
    if (typeof renderCallTracker === 'function') renderCallTracker();
    if (typeof renderFunnel === 'function') renderFunnel();
    if (typeof renderPlanFact === 'function') renderPlanFact();
    if (typeof updateSmartAlerts === 'function') updateSmartAlerts();
  }
});
window.addEventListener('storage', (e) => {
  if (e.key === PROSPECT_STORAGE_KEY) renderProspects();
  /* Campaign инкрементирует call tracker — обновляем виджеты */
  if (e.key && e.key.startsWith('wdb_call_tracker_')) {
    if (typeof renderCallTracker === 'function') renderCallTracker();
    if (typeof renderFunnel === 'function') renderFunnel();
    if (typeof updateSmartAlerts === 'function') updateSmartAlerts();
  }
});

/* ═══════════════════════════════════════════
   ТЕМА — переключатель
═══════════════════════════════════════════ */
const THEMES = ['t-claude','t-frost','t-paper','t-sand','t-aurora','t-tidal'];
const THEME_KEY = 'wdb_theme';

function setTheme(t) {
  THEMES.forEach(th => document.documentElement.classList.remove(th));
  document.documentElement.classList.add(t);
  localStorage.setItem(THEME_KEY, t);
  // обновляем active-класс в меню
  document.querySelectorAll('.theme-item').forEach((el,i) => {
    el.classList.toggle('active', THEMES[i] === t);
  });
  closeThemeMenu();
  /* Обновляем иконку Dark/Light toggle */
  updateDLIcon();
}

function toggleThemeMenu() {
  document.getElementById('theme-menu').classList.toggle('open');
}

function closeThemeMenu() {
  document.getElementById('theme-menu').classList.remove('open');
}

// закрыть по клику вне
document.addEventListener('click', e => {
  if (!document.getElementById('theme-switcher').contains(e.target)) closeThemeMenu();
});

// восстановить тему
(function(){
  const saved = localStorage.getItem(THEME_KEY) || 't-claude';
  setTheme(saved);
})();


/* ═══════════════════════════════════════════
