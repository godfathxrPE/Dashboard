/* ─────────────────────────────────────────────────────
   РЕЕСТР ВИДЖЕТОВ
   Каждый виджет: id совпадает с data-widget-id в HTML,
   icon — эмодзи, name — название, desc — подсказка,
   section — группа для секционных меток в панели.
───────────────────────────────────────────────────── */

/* ═══════════════════════════════════════════
   ЗАПЛАНИРОВАННЫЕ ЗВОНКИ — виджет + оповещения
═══════════════════════════════════════════ */
function dcKey() {
  let d = new Date();
  return 'wdb_daycalls_' + d.getFullYear() + '_' + (d.getMonth()+1) + '_' + d.getDate();
}
function dcLoad() { return LS.get(dcKey(), []); }
function dcSaveData(arr) { LS.set(dcKey(), arr); }

let dcEditId = null;
let dcAlertCurrentId = null;
let dcTimerHandle = null;
let dcFiredAlerts = {};

function dcRender() {
  let list = dcLoad();
  let el = document.getElementById('dc-list');
  let countEl = document.getElementById('dc-count');
  if (!el) return;

  let active = list.filter(function(x){ return !x.done; });
  if (countEl) countEl.textContent = active.length;

  if (list.length === 0) {
    el.innerHTML = emptyState('calendar', 'Нет запланированных звонков', 'Добавь через «+» выше');
    return;
  }

  let sorted = list.slice().sort(function(a,b){ return (a.time||'').localeCompare(b.time||''); });
  let now = new Date();
  let nowMins = now.getHours() * 60 + now.getMinutes();

  let rows = sorted.map(function(c) {
    let parts = (c.time||'00:00').split(':');
    let callMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    let diff = callMins - nowMins;
    let timeCls = 'dc-time';
    if (c.done) { /* row class handles it */ }
    else if (diff < 0) timeCls += ' past';
    else if (diff <= 5) timeCls += ' soon';
    else timeCls += ' upcoming';

    let bellCls = 'dc-btn-sm' + (c.remind !== false && c.remind >= 0 ? ' bell-on' : '');
    let rowCls = c.done ? 'dc-row-done' : '';
    let phoneFmt = c.phone ? '<a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>' : '—';
    let doneMark = c.done ? '✓' : '○';
    let doneCls = 'dc-btn-sm' + (c.done ? ' done-on' : '');

    return '<tr class="' + rowCls + '">' +
      '<td class="' + timeCls + '">' + esc(c.time || '--:--') + '</td>' +
      '<td class="dc-company" title="' + esc(c.company) + '">' + esc(c.company) + '</td>' +
      '<td class="dc-contact" title="' + esc(c.contact||'') + '">' + esc(c.contact || '—') + '</td>' +
      '<td class="dc-phone">' + phoneFmt + '</td>' +
      '<td class="dc-actions">' +
        '<button class="' + doneCls + '" data-action="dc-toggle-done" data-id="' + c.id + '" title="Выполнено">' + doneMark + '</button>' +
        '<button class="' + bellCls + '" data-action="dc-toggle-bell" data-id="' + c.id + '" title="Оповещение"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></button>' +
        '<button class="dc-btn-sm del" data-action="dc-delete" data-id="' + c.id + '" title="Удалить">✕</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  el.innerHTML = '<table class="w-daycalls-table"><thead><tr>' +
    '<th>Время</th><th>Компания</th><th>Контакт</th><th>Телефон</th><th></th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function dcOpenModal(id) {
  dcEditId = id || null;
  let c = id ? dcLoad().find(function(x){ return x.id === id; }) : null;
  document.getElementById('dc-modal-title').textContent = c ? 'Редактировать' : 'Запланировать звонок';
  document.getElementById('dc-f-time').value = c ? (c.time||'') : '';
  document.getElementById('dc-f-company').value = c ? (c.company||'') : '';
  document.getElementById('dc-f-contact').value = c ? (c.contact||'') : '';
  document.getElementById('dc-f-phone').value = c ? (c.phone||'') : '';
  document.getElementById('dc-f-note').value = c ? (c.note||'') : '';
  document.getElementById('dc-f-remind').value = c && c.remind >= 0 ? c.remind : 2;
  /* Заполняем dropdown проектов */
  let projSel = document.getElementById('dc-f-project');
  if (projSel) {
    let html = '<option value="">— без проекта —</option>';
    (LS.get('wdb_projects', [])).forEach(function(p) {
      if (p.stage === 'lost') return;
      html += '<option value="' + p.id + '">' + esc(p.name) + '</option>';
    });
    projSel.innerHTML = html;
    projSel.value = c ? (c.projectId || '') : '';
  }
  document.getElementById('dc-modal').classList.add('open');
  setTimeout(function(){ document.getElementById('dc-f-time').focus(); }, 80);
}
function dcCloseModal() {
  document.getElementById('dc-modal').classList.remove('open');
  dcEditId = null;
}

function dcSave() {
  let time = document.getElementById('dc-f-time').value;
  let company = document.getElementById('dc-f-company').value.trim();
  if (!time || !company) {
    if (!time) document.getElementById('dc-f-time').focus();
    else document.getElementById('dc-f-company').focus();
    return;
  }
  let projSel = document.getElementById('dc-f-project');
  let data = {
    time: time,
    company: company,
    contact: document.getElementById('dc-f-contact').value.trim(),
    phone: document.getElementById('dc-f-phone').value.trim(),
    note: document.getElementById('dc-f-note').value.trim(),
    remind: parseInt(document.getElementById('dc-f-remind').value) || 2,
    projectId: projSel ? projSel.value : '',
    done: false
  };
  let list = dcLoad();
  if (dcEditId) {
    let idx = list.findIndex(function(x){ return x.id === dcEditId; });
    if (idx >= 0) { data.id = dcEditId; data.done = list[idx].done; list[idx] = data; }
  } else {
    data.id = uid();
    list.push(data);
  }
  dcSaveData(list);
  dcRender();
  dcCloseModal();
  dcScheduleAlerts();
}

function dcDelete(id) {
  let list = dcLoad();
  let deleted = list.find(function(x){ return x.id === id; });
  if (!deleted) return;
  let idx = list.indexOf(deleted);
  let newList = list.filter(function(x){ return x.id !== id; });
  dcSaveData(newList);
  dcRender();
  toastUndo('Звонок удалён', function() {
    let restored = dcLoad();
    restored.splice(idx, 0, deleted);
    dcSaveData(restored);
    dcRender();
  });
}

function dcToggleBell(id) {
  let list = dcLoad();
  let c = list.find(function(x){ return x.id === id; });
  if (!c) return;
  c.remind = (c.remind !== false && c.remind >= 0) ? false : 2;
  dcSaveData(list);
  dcRender();
}

function dcToggleDone(id) {
  let list = dcLoad();
  let c = list.find(function(x){ return x.id === id; });
  if (!c) return;
  c.done = !c.done;
  dcSaveData(list);
  dcRender();
}

/* ── Оповещения ── */
function dcScheduleAlerts() {
  if (dcTimerHandle) clearInterval(dcTimerHandle);
  dcTimerHandle = setInterval(dcCheckAlerts, 15000);
  dcCheckAlerts();
}

function dcCheckAlerts() {
  let list = dcLoad();
  let now = new Date();
  let nowMins = now.getHours() * 60 + now.getMinutes();

  list.forEach(function(c) {
    if (c.done) return;
    if (c.remind === false || c.remind < 0) return;
    let parts = (c.time||'').split(':');
    let callMins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    let alertAt = callMins - (c.remind || 2);
    let alertKey = c.id + '_' + c.time;

    if (nowMins >= alertAt && nowMins <= callMins + 1 && !dcFiredAlerts[alertKey]) {
      dcFiredAlerts[alertKey] = true;
      dcShowAlert(c, callMins - nowMins);
    }
  });
}

function dcShowAlert(c, minsLeft) {
  dcAlertCurrentId = c.id;
  let mins = Math.max(0, minsLeft);
  document.getElementById('dc-alert-mins').textContent = mins <= 0 ? '< 1' : mins;
  document.getElementById('dc-alert-time').textContent = c.time || '--:--';
  document.getElementById('dc-alert-company').textContent = c.company || '—';
  document.getElementById('dc-alert-contact').textContent = c.contact || '—';

  let phoneEl = document.getElementById('dc-alert-phone');
  if (c.phone) {
    phoneEl.innerHTML = '<a class="dc-alert-phone-link" href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a>';
  } else {
    phoneEl.textContent = '—';
  }

  let noteRow = document.getElementById('dc-alert-note-row');
  if (c.note) {
    noteRow.style.display = '';
    document.getElementById('dc-alert-note').textContent = c.note;
  } else {
    noteRow.style.display = 'none';
  }

  document.getElementById('dc-alert').classList.add('open');

  // Звуковой сигнал
  try {
    let actx = new (window.AudioContext || window.webkitAudioContext)();
    let osc = actx.createOscillator();
    let gain = actx.createGain();
    osc.connect(gain); gain.connect(actx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.8);
    osc.start(actx.currentTime); osc.stop(actx.currentTime + 0.8);
    setTimeout(function(){
      try {
        let o2 = actx.createOscillator(); let g2 = actx.createGain();
        o2.connect(g2); g2.connect(actx.destination);
        o2.frequency.value = 1100; o2.type = 'sine';
        g2.gain.setValueAtTime(0.12, actx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.6);
        o2.start(actx.currentTime); o2.stop(actx.currentTime + 0.6);
      } catch(e){}
    }, 500);
  } catch(e){}

  // Browser Notification
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('📞 Звонок через ' + (mins <= 0 ? '< 1' : mins) + ' мин!', {
      body: c.company + (c.contact ? ' — ' + c.contact : '') + (c.phone ? '\n' + c.phone : ''),
      requireInteraction: true
    });
  }
}

function dcDismissAlert() {
  document.getElementById('dc-alert').classList.remove('open');
  dcAlertCurrentId = null;
}

function dcSnooze() {
  if (!dcAlertCurrentId) { dcDismissAlert(); return; }
  let list = dcLoad();
  let c = list.find(function(x){ return x.id === dcAlertCurrentId; });
  if (c) {
    let parts = (c.time||'00:00').split(':');
    let h = parseInt(parts[0]), m = parseInt(parts[1]) + 5;
    if (m >= 60) { h++; m -= 60; }
    c.time = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    delete dcFiredAlerts[dcAlertCurrentId + '_' + parts.join(':')];
    dcSaveData(list);
    dcRender();
  }
  dcDismissAlert();
}

function dcMarkDoneFromAlert() {
  if (!dcAlertCurrentId) { dcDismissAlert(); return; }
  dcToggleDone(dcAlertCurrentId);
  dcDismissAlert();
}

if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission();
}

dcRender();
dcScheduleAlerts();
setInterval(function(){ dcRender(); dcCheckAlerts(); }, 60000);


let WC_REGISTRY = [
  { id: 'clock',        icon: ICON.clock,     name: 'Дата и время',        desc: 'Живые часы + день недели',       section: 'Ориентация' },
  { id: 'daycalls',     icon: ICON.calendar,  name: 'Заплан. звонки',      desc: 'План звонков + оповещения',      section: 'Ориентация' },
  { id: 'focus',        icon: ICON.target,    name: 'Фокус дня',           desc: 'Одно главное дело на сегодня',   section: 'Ориентация' },
  { id: 'stats',        icon: ICON.chart,     name: 'Мини-статистика',      desc: 'Проекты, звонки, задачи',        section: 'Ориентация' },
  { id: 'kpi',          icon: ICON.chart,     name: 'KPI недели',           desc: 'Баллы, прогресс, метрики',       section: 'Ориентация' },
  { id: 'timer',        icon: ICON.timer,     name: 'Pomodoro таймер',      desc: 'Фокус-сессии 25/5/15 мин',       section: 'Продуктивность' },
  { id: 'call-tracker', icon: ICON.phone,     name: 'Трекер звонков',       desc: 'Счётчик и план на день',         section: 'Продуктивность' },
  { id: 'call-results', icon: ICON.target,    name: 'Результат звонков',    desc: 'Успешные, неуспешные, причины',  section: 'Продуктивность' },
  { id: 'quick-log',    icon: ICON.zap,       name: 'Быстрый лог',          desc: 'Звонки, встречи, КП, сделки',    section: 'Продуктивность' },
  { id: 'funnel',       icon: ICON.funnel,    name: 'Воронка недели',       desc: 'Конверсия по этапам',            section: 'Аналитика' },
  { id: 'heatmap',      icon: ICON.grid,      name: 'Тепловая карта',       desc: 'Активность по часам недели',     section: 'Аналитика' },
  { id: 'deadlines',    icon: ICON.alert,     name: 'Дедлайн-радар',        desc: 'Срочные задачи из проектов',     section: 'Аналитика' },
  { id: 'proj-progress',icon: ICON.trending,  name: 'Прогресс проектов',    desc: 'Бары готовности по клиентам',    section: 'Аналитика' },
  { id: 'plan-fact',    icon: ICON.chart,     name: 'План vs Факт',          desc: 'Сравнение план/факт за неделю',  section: 'Аналитика' },
  { id: 'meetings',     icon: ICON.users,     name: 'Встречи на неделе',    desc: 'Календарь встреч',               section: 'Коммуникации' },
  { id: 'comms',        icon: ICON.message,   name: 'Коммуникации',         desc: 'Напоминания по контактам',       section: 'Коммуникации' },
  { id: 'notes',        icon: ICON.fileText,  name: 'Быстрые заметки',      desc: 'Свободный текст, черновики',     section: 'Коммуникации' },
  { id: 'activity',     icon: ICON.clock,     name: 'Лента действий',       desc: 'Хронология за сегодня',          section: 'Коммуникации' },
  { id: 'prospects',    icon: ICON.trending,  name: 'Проработка компаний',  desc: 'Компании из кампании прозвона',  section: 'Продажи' }];

/* ─────────────────────────────────────────────────────
   СОСТОЯНИЕ
   Загружаем из localStorage — если нет, все включены.
   Ключ хранения: wdb_widget_visibility
───────────────────────────────────────────────────── */
let WC_STORAGE_KEY = 'wdb_widget_visibility';

function wcLoadState() {
  try {
    let saved = localStorage.getItem(WC_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  // По умолчанию — все включены
  let def = {};
  WC_REGISTRY.forEach(function(w) { def[w.id] = true; });
  return def;
}

function wcSaveState(state) {
  try { localStorage.setItem(WC_STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

let wcState = wcLoadState();

/* ─────────────────────────────────────────────────────
   ПРИМЕНЕНИЕ СОСТОЯНИЯ К DOM
   Скрываем/показываем виджеты по data-widget-id.
   Используем display:none через класс wc-hidden —
   не трогаем inline styles самих виджетов.
───────────────────────────────────────────────────── */
function wcApplyAll() {
  WC_REGISTRY.forEach(function(w) {
    let el = document.querySelector('[data-widget-id="' + w.id + '"]');
    if (!el) return;
    if (wcState[w.id]) {
      el.classList.remove('wc-hidden');
    } else {
      el.classList.add('wc-hidden');
    }
  });
}

/* ─────────────────────────────────────────────────────
   РЕНДЕР СТРОК ПАНЕЛИ
   Группируем по секциям, рендерим section-label + rows.
───────────────────────────────────────────────────── */
function wcRenderPanel() {
  let body = document.getElementById('wc-body');
  if (!body) return;

  // Собираем уникальные секции в нужном порядке
  let sections = [];
  WC_REGISTRY.forEach(function(w) {
    if (sections.indexOf(w.section) === -1) sections.push(w.section);
  });

  let html = '';
  sections.forEach(function(sec) {
    html += '<div class="wc-section-label">' + sec + '</div>';
    WC_REGISTRY.filter(function(w) { return w.section === sec; }).forEach(function(w) {
      let isOn = wcState[w.id] !== false;
      html +=
        '<div class="wc-row' + (isOn ? ' is-on' : '') + '" id="wc-row-' + w.id + '" data-action="wc-toggle-row" data-wid="' + w.id + '">' +
          '<div class="wc-row-icon">' + w.icon + '</div>' +
          '<div class="wc-row-info">' +
            '<div class="wc-row-name">' + w.name + '</div>' +
            '<div class="wc-row-desc">' + w.desc + '</div>' +
          '</div>' +
          '<label class="wc-toggle" data-stop>' +
            '<input type="checkbox"' + (isOn ? ' checked' : '') + ' data-change-action="wc-toggle-by-id" data-wid="' + w.id + '">' +
            '<div class="wc-toggle-track"></div>' +
            '<div class="wc-toggle-thumb"></div>' +
          '</label>' +
        '</div>';
    });
  });

  body.innerHTML = html;
  wcUpdateCounter();
}

/* ─────────────────────────────────────────────────────
   TOGGLE — переключаем один виджет
   Вызывается и из checkbox, и из клика по всей строке.
───────────────────────────────────────────────────── */
function wcToggleById(id, val) {
  wcState[id] = val;
  wcSaveState(wcState);

  // Обновляем класс строки
  let row = document.getElementById('wc-row-' + id);
  if (row) {
    row.className = 'wc-row' + (val ? ' is-on' : '');
    let cb = row.querySelector('input[type=checkbox]');
    if (cb) cb.checked = val;
  }

  // Показываем/скрываем виджет
  let el = document.querySelector('[data-widget-id="' + id + '"]');
  if (el) {
    if (val) el.classList.remove('wc-hidden');
    else el.classList.add('wc-hidden');
  }

  wcUpdateCounter();
}

function wcToggleRow(id) {
  // Клик по строке = инвертируем текущее состояние
  wcToggleById(id, !wcState[id]);
}

/* ─────────────────────────────────────────────────────
   СБРОС — включаем все виджеты
───────────────────────────────────────────────────── */
function wcResetAll() {
  WC_REGISTRY.forEach(function(w) { wcState[w.id] = true; });
  wcSaveState(wcState);
  wcRenderPanel();   // перерисовываем строки
  wcApplyAll();      // показываем все виджеты
}

/* ─────────────────────────────────────────────────────
   СЧЁТЧИК в подвале панели
───────────────────────────────────────────────────── */
function wcUpdateCounter() {
  let on = WC_REGISTRY.filter(function(w) { return wcState[w.id] !== false; }).length;
  let total = WC_REGISTRY.length;
  let elOn = document.getElementById('wc-on-count');
  let elTotal = document.getElementById('wc-total-count');
  if (elOn) elOn.textContent = on;
  if (elTotal) elTotal.textContent = total;
}

/* ─────────────────────────────────────────────────────
   ОТКРЫТИЕ / ЗАКРЫТИЕ ПАНЕЛИ
   Паттерн: Slide-over с Backdrop Dimming.
   body overflow:hidden — убирает скролл страницы
   пока панель открыта.
───────────────────────────────────────────────────── */
let wcIsOpen = false;

function wcToggle() {
  if (wcIsOpen) wcClose(); else wcOpen();
}

function wcOpen() {
  wcIsOpen = true;
  wcRenderPanel();
  document.getElementById('wc-panel').classList.add('open');
  document.getElementById('wc-backdrop').classList.add('open');
  document.getElementById('wc-open-btn').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function wcClose() {
  wcIsOpen = false;
  document.getElementById('wc-panel').classList.remove('open');
  document.getElementById('wc-backdrop').classList.remove('open');
  document.getElementById('wc-open-btn').classList.remove('active');
  document.body.style.overflow = '';
}

// Закрытие по Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && wcIsOpen) wcClose();
});

/* ─────────────────────────────────────────────────────
   ИНИЦИАЛИЗАЦИЯ
   Применяем сохранённое состояние сразу при загрузке —
   до рендера чтобы не было flash скрытых виджетов.
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  wcApplyAll();
});
