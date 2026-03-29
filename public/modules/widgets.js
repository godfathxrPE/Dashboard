/* Module: modules/widgets.js — Воронка, метрики, фокус дня, статистика, виджеты 1-4, quicklog */

   ВОРОНКА НЕДЕЛИ
═══════════════════════════════════════════ */
function getFunnelKey() {
  const now = new Date();
  const weekNum = getWeekNum(now);
  return `wdb_funnel_${now.getFullYear()}_w${weekNum}`;
}
function getFunnelData() {
  return LS.get(getFunnelKey(), { meetings: 0, kp: 0, deals: 0, goalCalls: 200 });
}
function saveFunnelManual() {
  const data = getFunnelData();
  const m = parseInt(document.getElementById('wfn-meetings-in')?.value) || 0;
  const k = parseInt(document.getElementById('wfn-kp-in')?.value)       || 0;
  const d = parseInt(document.getElementById('wfn-deals-in')?.value)    || 0;
  const g = parseInt(document.getElementById('wfn-goal-calls')?.value)  || 200;
  LS.set(getFunnelKey(), { ...data, meetings: m, kp: k, deals: d, goalCalls: g });
}

/* ── Auto-метрики из данных дашборда (shared между воронкой и план/фактом) ── */
function getAutoMetrics() {
  const now = new Date();
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const mon = new Date(now); mon.setDate(now.getDate() - day); mon.setHours(0,0,0,0);

  /* Звонки — суммируем call tracker за рабочие дни недели */
  let weekCalls = 0;
  for (let i = 0; i <= day && i < 5; i++) {
    const dd = new Date(mon); dd.setDate(mon.getDate() + i);
    const key = `wdb_call_tracker_${dd.getFullYear()}_${dd.getMonth()}_${dd.getDate()}`;
    const ct = LS.get(key, { done: 0 });
    weekCalls += ct.done || 0;
  }

  /* Встречи — из wdb_meetings за эту неделю */
  const weekStart = mon.toISOString().split('T')[0];
  const weekEnd = new Date(mon); weekEnd.setDate(mon.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const autoMeetings = (LS.get('wdb_meetings', [])).filter(m => m.date >= weekStart && m.date <= weekEndStr).length;

  /* КП и сделки — из стадий проектов */
  const activeProjects = (LS.get('wdb_projects', [])).filter(p => p.stage !== 'lost');
  const autoKP    = activeProjects.filter(p => parseInt(p.stage) >= 4 && parseInt(p.stage) <= 5).length;
  const autoDeals = activeProjects.filter(p => parseInt(p.stage) >= 10).length;

  return { weekCalls, autoMeetings, autoKP, autoDeals, activeProjects };
}

function renderFunnel() {
  const fn = getFunnelData();
  const now = new Date();
  const weekNum = getWeekNum(now);
  const lbl = document.getElementById('wfn-week-label');
  if (lbl) lbl.textContent = `Неделя ${weekNum}`;

  // Звонки берём из трекера (суммируем каждый день недели)
  let weekCalls = 0;
  const auto = getAutoMetrics();
  weekCalls = auto.weekCalls;
  const autoMeetings = auto.autoMeetings;
  const activeProjects = auto.activeProjects;
  const autoKP = auto.autoKP;
  const autoDeals = auto.autoDeals;

  const goalCalls = parseInt(document.getElementById('wfn-goal-calls')?.value) || fn.goalCalls || 200;
  // Встречи: авто-значение, но ручной ввод может быть выше (доп. встречи вне системы)
  const manualMeetings = parseInt(document.getElementById('wfn-meetings-in')?.value);
  const meetings = Math.max(autoMeetings, isNaN(manualMeetings) ? (fn.meetings ?? 0) : manualMeetings);
  const manualKP = parseInt(document.getElementById('wfn-kp-in')?.value);
  const kp = Math.max(autoKP, isNaN(manualKP) ? (fn.kp ?? 0) : manualKP);
  const manualDeals = parseInt(document.getElementById('wfn-deals-in')?.value);
  const deals = Math.max(autoDeals, isNaN(manualDeals) ? (fn.deals ?? 0) : manualDeals);

  // Восстанавливаем поля при загрузке
  const mIn = document.getElementById('wfn-meetings-in');
  const kIn = document.getElementById('wfn-kp-in');
  const dIn = document.getElementById('wfn-deals-in');
  const gIn = document.getElementById('wfn-goal-calls');
  if (mIn && mIn !== document.activeElement) mIn.value = meetings;
  if (kIn && kIn !== document.activeElement) kIn.value = kp;
  if (dIn && dIn !== document.activeElement) dIn.value = deals;
  if (gIn && gIn !== document.activeElement) gIn.value = fn.goalCalls ?? 200;

  // Счётчики
  const numCalls = document.getElementById('wfn-num-calls');
  const numMeet  = document.getElementById('wfn-num-meetings');
  const numKP    = document.getElementById('wfn-num-kp');
  if (numCalls) numCalls.textContent = weekCalls;
  if (numMeet)  numMeet.textContent  = meetings;
  if (numKP)    numKP.textContent    = kp;

  // Полоски (относительно максимума)
  const top = Math.max(weekCalls, 1);
  const barC = document.getElementById('wfn-bar-calls');
  const barM = document.getElementById('wfn-bar-meetings');
  const barK = document.getElementById('wfn-bar-kp');
  if (barC) barC.style.width = Math.min(100, Math.round((weekCalls / goalCalls) * 100)) + '%';
  if (barM) barM.style.width = weekCalls > 0 ? Math.min(100, Math.round((meetings / top) * 100)) + '%' : '0%';
  if (barK) barK.style.width = weekCalls > 0 ? Math.min(100, Math.round((kp / top) * 100)) + '%'      : '0%';

  // Конверсии
  const conv = document.getElementById('wfn-conv');
  if (conv) {
    const c2m = weekCalls > 0 ? Math.round((meetings / weekCalls) * 100) : 0;
    const m2k = meetings  > 0 ? Math.round((kp / meetings) * 100)        : 0;
    const k2d = kp        > 0 ? Math.round((deals / kp) * 100)           : 0;
    conv.innerHTML = `
      <span class="w-fn-conv-item">Звонок → встреча: <b>${c2m}%</b></span>
      <span class="w-fn-conv-item">Встреча → КП: <b>${m2k}%</b></span>
      <span class="w-fn-conv-item">КП → сделка: <b>${k2d}%</b></span>
    `;
  }

  // Pipeline — распределение проектов по стадиям
  var pipeEl = document.getElementById('wfn-pipeline');
  if (pipeEl && activeProjects.length > 0) {
    var stageCounts = {};
    activeProjects.forEach(function(p) {
      var s = parseInt(p.stage) || 0;
      stageCounts[s] = (stageCounts[s] || 0) + 1;
    });
    var pipeHTML = '<div style="font-size:var(--text-2xs);color:var(--text-mute);margin-bottom:4px;">Проекты по стадиям (' + activeProjects.length + ')</div>';
    pipeHTML += '<div style="display:flex;gap:1px;height:16px;border-radius:4px;overflow:hidden;">';
    var colors = ['var(--text-mute)','var(--blue)','var(--blue)','var(--yellow)','var(--accent)','var(--accent)','var(--green)','var(--green)','var(--green)','var(--green)','var(--green)','var(--green)'];
    FUNNEL.forEach(function(name, i) {
      var cnt = stageCounts[i] || 0;
      if (cnt === 0) return;
      var pct = Math.round((cnt / activeProjects.length) * 100);
      pipeHTML += '<div title="' + name + ': ' + cnt + '" style="flex:' + cnt + ';background:' + (colors[i]||'var(--accent)') + ';opacity:0.7;min-width:8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:600;">' + (pct >= 15 ? cnt : '') + '</div>';
    });
    pipeHTML += '</div>';
    pipeEl.innerHTML = pipeHTML;
    pipeEl.style.display = '';
  } else if (pipeEl) {
    pipeEl.style.display = 'none';
  }
}
renderFunnel();

// Патч: после каждого нажатия + или - обновляем тепловую карту и воронку
const _ctAdd_original = callTrackerAdd;
window.callTrackerAdd = function(delta) {
  const actual = _ctAdd_original(delta); // реальное изменение
  if (actual !== 0) heatmapRecord(actual); // работает и для -1
  renderFunnel();
};


function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  const el = document.getElementById('w-time');
  if (el) el.textContent = hh + ':' + mm + ':' + ss;

  const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const d = document.getElementById('w-date');
  const w = document.getElementById('w-week');
  if (d) d.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()];
  const weekNum = getWeekNum(now);
  if (w) w.textContent = 'Неделя ' + weekNum;
}
setInterval(tickClock, 1000);
tickClock();

/* ── ФОКУС ДНЯ ── */
(function(){
  const today = new Date().toDateString();
  const saved = LS.get('wdb_focus', {});
  const inp = document.getElementById('w-focus-input');
  if (inp && saved.date === today) inp.value = saved.text || '';
})();

let focusTimer = null;
function saveFocus() {
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => {
    const inp = document.getElementById('w-focus-input');
    if (!inp) return;
    LS.set('wdb_focus', { date: new Date().toDateString(), text: inp.value });
    const s = document.getElementById('w-focus-saved');
    if (s) { s.classList.add('show'); setTimeout(()=>s.classList.remove('show'), 1800); }
    // обновляем лейбл таймера
    const tl = document.getElementById('timer-task-label');
    if (tl) tl.textContent = inp.value || '—';
  }, 600);
}
// Инициализируем лейбл таймера из фокуса
(function(){
  const saved = LS.get('wdb_focus', {});
  const today = new Date().toDateString();
  const tl = document.getElementById('timer-task-label');
  if (tl && saved.date === today && saved.text) tl.textContent = saved.text;
})();

/* ── МИНИ-СТАТИСТИКА ── */
function updateStats() {
  // Проекты активные (не закрытые)
  const closedStages = ['closed','cancelled','lost'];
  const activeProjects = (LS.get('wdb_projects',[])).filter(p => !closedStages.includes(p.stage)).length;
  const el1 = document.getElementById('ws-projects');
  if (el1) animateValue(el1, activeProjects);

  // Звонки за неделю
  const weekAgo = Date.now() - 7*24*60*60*1000;
  const weekCalls = (LS.get('wdb_calls',[])).filter(c => {
    if (!c.date) return false;
    return new Date(c.date).getTime() >= weekAgo;
  }).length;
  const el2 = document.getElementById('ws-calls');
  if (el2) {
    // Показываем звонки из трекера сегодня если есть, иначе за неделю
    const todayCt = getCTData ? getCTData() : null;
    const callVal = todayCt && todayCt.done > 0 ? todayCt.done : weekCalls;
    animateValue(el2, callVal);
    // Обновляем desc
    const desc = el2.closest('.w-stat-item')?.querySelector('.w-stat-desc');
    if (desc) desc.innerHTML = todayCt && todayCt.done > 0 ? 'звонков<br>сегодня' : 'звонков<br>за неделю';
  }

  // Задачи в работе (now) и выполненные
  const allTasks = LS.get('wdb_tasks',[]);
  const nowTasks  = allTasks.filter(t => t.lane === 'now').length;
  const doneTasks = allTasks.filter(t => t.lane === 'done').length;
  const el3 = document.getElementById('ws-tasks-now');
  const el4 = document.getElementById('ws-tasks-done');
  if (el3) animateValue(el3, nowTasks);
  if (el4) animateValue(el4, doneTasks);
}
updateStats();
/* Спарклайны инициализируются после первого updateStats */
setTimeout(function() { updateSparklines(); }, 500);

// Обновляем статистику при любом изменении localStorage
const _origLSset = LS.set.bind(LS);
LS.set = function(k, v) {
  _origLSset(k, v);
  updateStats();
  updateSparklines();
  // Перерисовываем новые виджеты при изменении данных
  if (k === 'wdb_projects' || k === 'wdb_tasks') {
    renderDeadlineRadar();
    renderProjProgress();
  }
  renderPlanFact();
};

/* ═══════════════════════════════════════════
   ВИДЖЕТ 1: ДЕДЛАЙН-РАДАР
═══════════════════════════════════════════ */
/* Dismissed из радара — по ID */
function drGetDismissed() { return LS.get('wdb_dr_dismissed', []); }
function drDismiss(itemKey) {
  const list = drGetDismissed();
  if (!list.includes(itemKey)) list.push(itemKey);
  LS.set('wdb_dr_dismissed', list);
  renderDeadlineRadar();
}

function renderDeadlineRadar() {
  const el = document.getElementById('wdr-list');
  const countEl = document.getElementById('wdr-count');
  if (!el) return;

  const today = new Date();
  today.setHours(0,0,0,0);
  const items = [];
  const dismissed = drGetDismissed();

  // Из проектов — исключаем lost и финальный этап (11 = подписание)
  (LS.get('wdb_projects', [])).forEach(p => {
    if (!p.deadline) return;
    if (p.stage === 'lost') return;
    if (parseInt(p.stage) >= 11) return;
    const itemKey = 'proj_' + p.id;
    if (dismissed.includes(itemKey)) return;
    const d = new Date(p.deadline + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    if (diff <= 5) items.push({ id: itemKey, name: p.name, diff, type: 'Проект' });
  });

  // Из задач — исключаем выполненные
  (LS.get('wdb_tasks', [])).filter(t => t.deadline && t.lane !== 'done').forEach(t => {
    const itemKey = 'task_' + t.id;
    if (dismissed.includes(itemKey)) return;
    const d = new Date(t.deadline + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    if (diff <= 5) items.push({ id: itemKey, name: t.text, diff, type: 'Задача' });
  });

  // Из коммуникаций — исключаем done
  (LS.get('wdb_comms', [])).forEach(c => {
    if (!c.deadline) return;
    if (c.status === 'done') return;
    const itemKey = 'comm_' + c.id;
    if (dismissed.includes(itemKey)) return;
    const d = new Date(c.deadline + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    if (diff <= 3) items.push({ id: itemKey, name: c.person + (c.topic ? ': ' + c.topic : ''), diff, type: 'Контакт' });
  });

  items.sort((a,b) => a.diff - b.diff);

  if (countEl) countEl.textContent = items.length ? items.length + ' пунктов' : '';

  if (!items.length) {
    el.innerHTML = emptyState('target', 'Срочных дедлайнов нет', 'Всё под контролем');
    return;
  }

  function getDotClass(diff) {
    if (diff < 0)  return 'overdue';
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    return 'soon';
  }
  function getDaysLabel(diff) {
    if (diff < 0)  return 'просроч.';
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'завтра';
    return 'через ' + diff + ' д.';
  }

  el.innerHTML = items.slice(0, 7).map(item => {
    const dc = getDotClass(item.diff);
    return `<div class="w-dr-item">
      <div class="w-dr-dot ${dc}"></div>
      <div class="w-dr-name" title="${esc(item.name)}">${esc(item.name)}</div>
      <span class="w-dr-type">${item.type}</span>
      <div class="w-dr-days ${dc}">${getDaysLabel(item.diff)}</div>
      <button class="w-dr-dismiss" data-action="dr-dismiss" data-id="${item.id}" title="Убрать">✕</button>
    </div>`;
  }).join('');
}
renderDeadlineRadar();

/* ═══════════════════════════════════════════
   ВИДЖЕТ 2: ПРОГРЕСС ПРОЕКТОВ
═══════════════════════════════════════════ */
function renderProjProgress() {
  const el = document.getElementById('wpp-list');
  if (!el) return;
  const projs = LS.get('wdb_projects', []).filter(p => p.stage !== 'lost');
  if (!projs.length) {
    el.innerHTML = emptyState('trending', 'Добавь проект — прогресс появится', 'Воронка оживёт');
    return;
  }

  el.innerHTML = projs.map(p => {
    const stage = parseInt(p.stage) || 0;
    const total = 11; // 0-11 stages
    const pct = Math.round((stage / total) * 100);
    const doneClass = stage >= 11 ? ' done' : '';
    return `<div class="w-pp-item">
      <div class="w-pp-top">
        <div class="w-pp-name" title="${esc(p.name)}">${esc(p.name)}</div>
        <div class="w-pp-pct">${pct}%</div>
      </div>
      <div class="w-pp-track">
        <div class="w-pp-fill${doneClass}" style="width:${pct}%"></div>
      </div>
      <div class="w-pp-stage">${FUNNEL[stage]}${p.deadline ? ' · ' + fmtDate(p.deadline) : ''}</div>
    </div>`;
  }).join('');
}
renderProjProgress();

/* ═══════════════════════════════════════════
   ВИДЖЕТ 3: ПЛАН vs ФАКТ НЕДЕЛИ
═══════════════════════════════════════════ */
function getPFWeekKey() {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=пн
  const mon = new Date(d); mon.setDate(d.getDate() - day); mon.setHours(0,0,0,0);
  return `${mon.getFullYear()}_${mon.getMonth()}_${mon.getDate()}`;
}

function loadPFPlans() {
  const saved = LS.get('wdb_pf_plans_' + getPFWeekKey(), { calls: 200, meets: 5, kp: 3, deals: 1 });
  const ids = { calls: 'wpf-plan-calls', meets: 'wpf-plan-meets', kp: 'wpf-plan-kp', deals: 'wpf-plan-deals' };
  Object.keys(ids).forEach(k => {
    const inp = document.getElementById(ids[k]);
    if (inp && inp !== document.activeElement) inp.value = saved[k] ?? { calls:200, meets:5, kp:3, deals:1 }[k];
  });
}

function savePFPlans() {
  const data = {
    calls: parseInt(document.getElementById('wpf-plan-calls')?.value) || 200,
    meets: parseInt(document.getElementById('wpf-plan-meets')?.value) || 5,
    kp:    parseInt(document.getElementById('wpf-plan-kp')?.value)    || 3,
    deals: parseInt(document.getElementById('wpf-plan-deals')?.value) || 1,
  };
  /* Записываем напрямую в localStorage (минуя LS.set → Supabase sync),
     т.к. plans — локальная настройка, не требующая облачной синхронизации */
  localStorage.setItem('wdb_pf_plans_' + getPFWeekKey(), JSON.stringify(data));
}

function renderPlanFact() {
  const el = document.getElementById('wpf-rows');
  const wlEl = document.getElementById('wpf-week-label');
  if (!el) return;

  // Неделя
  const d = new Date();
  const weekNum = getWeekNum(d);
  if (wlEl) wlEl.textContent = 'Неделя ' + weekNum;

  const plans = LS.get('wdb_pf_plans_' + getPFWeekKey(), { calls: 200, meets: 5, kp: 3, deals: 1 });

  // Факт из shared helper
  const auto = getAutoMetrics();
  const factCalls = auto.weekCalls;
  const factMeets = auto.autoMeetings;

  // КП/сделки: максимум из авто (проекты) и ручного (воронка)
  const funnelKey = `wdb_funnel_${d.getFullYear()}_w${weekNum}`;
  const funnelManual = LS.get(funnelKey, { meetings: 0, kp: 0, deals: 0 });
  const factKP    = Math.max(auto.autoKP,    funnelManual.kp    || 0);
  const factDeals = Math.max(auto.autoDeals, funnelManual.deals || 0);

  const metrics = [
    { label: 'Звонки',  plan: plans.calls, fact: factCalls },
    { label: 'Встречи', plan: plans.meets, fact: factMeets },
    { label: 'КП',      plan: plans.kp,    fact: factKP    },
    { label: 'Сделки',  plan: plans.deals,  fact: factDeals }];

  const maxVal = Math.max(1, ...metrics.map(m => Math.max(m.plan, m.fact)));

  el.innerHTML = metrics.map(m => {
    const planPct = Math.round((m.plan / maxVal) * 100);
    const factPct = Math.round((m.fact / maxVal) * 100);
    const delta = m.fact - m.plan;
    const dClass = delta > 0 ? 'pos' : delta < 0 ? 'neg' : 'neu';
    const dText  = delta > 0 ? '+' + delta : delta < 0 ? String(delta) : '=';
    const factBarCls = delta >= 0 ? ' over' : ' under';
    return `<div class="w-pf-row">
      <div class="w-pf-metric">${m.label}</div>
      <div class="w-pf-bars">
        <div class="w-pf-bar-row">
          <span class="w-pf-bar-label" style="color:var(--text-mute)">план</span>
          <div class="w-pf-bar-wrap"><div class="w-pf-bar-fill plan" style="width:${planPct}%"></div></div>
          <span class="w-pf-num" style="color:var(--text-mute)">${m.plan}</span>
        </div>
        <div class="w-pf-bar-row">
          <span class="w-pf-bar-label" style="color:var(--accent)">факт</span>
          <div class="w-pf-bar-wrap"><div class="w-pf-bar-fill fact${factBarCls}" style="width:${factPct}%"></div></div>
          <span class="w-pf-num">${m.fact}</span>
        </div>
      </div>
      <div class="w-pf-delta ${dClass}">${dText}</div>
    </div>`;
  }).join('');

  // Саммари
  const summaryEl = document.getElementById('wpf-summary');
  if (summaryEl) {
    const done = metrics.filter(m => m.fact >= m.plan).length;
    const total = metrics.length;
    summaryEl.style.display = '';
    summaryEl.innerHTML = `Выполнено показателей: <b>${done} / ${total}</b> — ${done === total ? 'отличная неделя!' : done >= 2 ? 'хороший темп' : 'нужно ускориться'}`;
  }
}
loadPFPlans();
renderPlanFact();
// Обновляем каждые 2 минуты
setInterval(renderPlanFact, 120000);

/* ═══════════════════════════════════════════
   ВИДЖЕТ 4: БЫСТРЫЙ ЛОГ ИТОГА
═══════════════════════════════════════════ */
let qlActiveType = 'call';

function qlSelectType(btn) {
  qlActiveType = btn.dataset.type;
  document.querySelectorAll('.w-ql-type').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ql-text')?.focus();
}

function qlGetData() {
  const today = new Date().toDateString();
  const saved = LS.get('wdb_quicklog', null);
  if (!saved || saved.date !== today) return [];
  return saved.entries || [];
}

function qlSaveData(entries) {
  localStorage.setItem('wdb_quicklog', JSON.stringify({ date: new Date().toDateString(), entries }));
}

const QL_TYPE_LABELS = { call: 'Звонок', meet: 'Встреча', kp: 'КП', deal: 'Сделка', other: 'Другое' };

function qlAdd() {
  const inp = document.getElementById('ql-text');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) { inp.focus(); return; }
  const entries = qlGetData();
  const now = new Date();
  const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  entries.unshift({ id: uid(), type: qlActiveType, text, time: timeStr });
  qlSaveData(entries);
  inp.value = '';
  renderQL();
  inp.focus();
}

function qlDelete(id) {
  const entries = qlGetData().filter(e => e.id !== id);
  qlSaveData(entries);
  renderQL();
}

function qlClear() {
  toastConfirm('Очистить лог за сегодня?', function() {
    qlSaveData([]);
    renderQL();
    toast('Лог очищен', 'success');
  });
}

function renderQL() {
  const el = document.getElementById('ql-history');
  if (!el) return;
  const entries = qlGetData();
  if (!entries.length) {
    el.innerHTML = '<div style="font-size:var(--text-sm);color:var(--text-mute);padding:6px 0;text-align:center">Лог пуст — фиксируй итоги за день</div>';
    return;
  }
  el.innerHTML = entries.map(e => `
    <div class="w-ql-entry">
      <span class="w-ql-entry-type ql-${e.type}">${QL_TYPE_LABELS[e.type] || e.type}</span>
      <div class="w-ql-entry-text">${esc(e.text)}</div>
      <span class="w-ql-entry-time">${e.time}</span>
      <button class="w-ql-entry-del" data-action="ql-delete" data-id="${e.id}" title="Удалить">✕</button>
    </div>`).join('');
}
renderQL();

