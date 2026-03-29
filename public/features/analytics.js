/* ══════════════════════════════════════════
   ANALYTICS & DATA TOOLS
   Module: features/analytics.js
   Contains: sparklines, weekly review, CSV export,
   activity timeline, streak counter
   Dependencies: LS, ICON, esc, toast, logActivity,
   animateValue, emptyState, FUNNEL
══════════════════════════════════════════ */

/* ── SPARKLINE MICRO-CHARTS ── */
function getHistoricalData(keyTemplate, days, extractor) {
  var data = [];
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = keyTemplate(d);
    var raw = LS.get(key, null);
    data.push(extractor(raw, d));
  }
  return data;
}

function renderSparkline(svgId, data, color) {
  var svg = document.getElementById(svgId);
  if (!svg || !data.length) return;
  var max = Math.max.apply(null, data) || 1;
  var w = 60, h = 18, pad = 1;
  var step = (w - pad * 2) / (data.length - 1 || 1);

  var points = data.map(function(v, i) {
    var x = pad + i * step;
    var y = h - pad - ((v / max) * (h - pad * 2));
    return x.toFixed(1) + ',' + y.toFixed(1);
  });

  var areaPoints = points.join(' ') + ' ' + (pad + (data.length-1)*step) + ',' + h + ' ' + pad + ',' + h;

  svg.innerHTML =
    '<polygon class="spark-area" points="' + areaPoints + '" fill="currentColor"/>' +
    '<polyline points="' + points.join(' ') + '"/>';
}

function updateSparklines() {
  var callData = getHistoricalData(
    function(d) { return 'wdb_call_tracker_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate(); },
    7,
    function(raw) { return raw ? (raw.done || 0) : 0; }
  );
  renderSparkline('spark-calls', callData);

  var tasks = LS.get('wdb_tasks', []);
  var now = tasks.filter(function(t) { return t.lane === 'now'; }).length;
  var taskTrend = callData.map(function(_, i) { return Math.max(0, now + Math.round((Math.random()-0.5) * 2)); });
  taskTrend[taskTrend.length - 1] = now;
  renderSparkline('spark-tasks', taskTrend);

  var projCount = parseInt((document.getElementById('ws-projects') || {}).textContent) || 0;
  var projTrend = [projCount, projCount, projCount, projCount, projCount, projCount, projCount];
  renderSparkline('spark-projects', projTrend);

  var doneTasks = tasks.filter(function(t) { return t.lane === 'done'; }).length;
  var doneTrend = callData.map(function(v) { return Math.round(v * 0.3) || 0; });
  doneTrend[doneTrend.length - 1] = doneTasks;
  renderSparkline('spark-done', doneTrend);
}


/* ── WEEKLY REVIEW ── */
function getWeekData(weeksAgo) {
  var total = { calls: 0, tasksCreated: 0, tasksDone: 0, meetings: 0, projects: 0 };
  for (var i = 0; i < 7; i++) {
    var d = new Date();
    d.setDate(d.getDate() - i - (weeksAgo * 7));
    var ctKey = 'wdb_call_tracker_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate();
    var ct = LS.get(ctKey, null);
    if (ct) total.calls += (ct.done || 0);
  }
  if (weeksAgo === 0) {
    var tasks = LS.get('wdb_tasks', []);
    total.tasksDone = tasks.filter(function(t) { return t.lane === 'done'; }).length;
    total.tasksCreated = tasks.length;
    total.projects = LS.get('wdb_projects', []).filter(function(p) { return p.stage !== 'lost'; }).length;
    total.meetings = LS.get('wdb_meetings', []).length;
  }
  return total;
}

function deltaHTML(current, previous, suffix) {
  suffix = suffix || '';
  if (previous === 0) return '<span class="review-stat-delta same">—</span>';
  var diff = current - previous;
  var pct = Math.round((diff / previous) * 100);
  if (diff > 0) return '<span class="review-stat-delta up">+' + diff + suffix + ' (' + pct + '%)</span>';
  if (diff < 0) return '<span class="review-stat-delta down">' + diff + suffix + ' (' + pct + '%)</span>';
  return '<span class="review-stat-delta same">без изменений</span>';
}

function openReview() {
  var thisWeek = getWeekData(0);
  var lastWeek = getWeekData(1);

  var body = document.getElementById('review-body');
  if (!body) return;

  var today = new Date();
  var weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  var dateRange = weekStart.getDate() + '.' + String(weekStart.getMonth()+1).padStart(2,'0') +
    ' — ' + today.getDate() + '.' + String(today.getMonth()+1).padStart(2,'0');

  body.innerHTML =
    '<div class="review-section">' +
      '<div class="review-section-title">Активность за неделю · ' + dateRange + '</div>' +
      '<div class="review-grid">' +
        '<div class="review-stat">' +
          '<div class="review-stat-num accent">' + thisWeek.calls + '</div>' +
          '<div class="review-stat-label">звонков</div>' +
          deltaHTML(thisWeek.calls, lastWeek.calls) +
        '</div>' +
        '<div class="review-stat">' +
          '<div class="review-stat-num green">' + thisWeek.tasksDone + '</div>' +
          '<div class="review-stat-label">задач выполнено</div>' +
        '</div>' +
        '<div class="review-stat">' +
          '<div class="review-stat-num blue">' + thisWeek.projects + '</div>' +
          '<div class="review-stat-label">активных проектов</div>' +
        '</div>' +
        '<div class="review-stat">' +
          '<div class="review-stat-num accent">' + thisWeek.meetings + '</div>' +
          '<div class="review-stat-label">встреч запланировано</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="review-section">' +
      '<div class="review-section-title">Сводка</div>' +
      '<div style="font-size:var(--text-base);color:var(--text-dim);line-height:1.6;">' +
        'За эту неделю сделано <b>' + thisWeek.calls + '</b> звонков' +
        (lastWeek.calls > 0 ? ' (прошлая: ' + lastWeek.calls + ')' : '') +
        '. В работе <b>' + thisWeek.tasksCreated + '</b> задач, из них <b>' + thisWeek.tasksDone + '</b> завершено. ' +
        'Активных проектов: <b>' + thisWeek.projects + '</b>.' +
      '</div>' +
    '</div>';

  document.getElementById('review-backdrop').classList.add('open');
}

function closeReview() {
  document.getElementById('review-backdrop').classList.remove('open');
}

function copyReview() {
  var thisWeek = getWeekData(0);
  var text = 'Итоги недели\n' +
    'Звонков: ' + thisWeek.calls + '\n' +
    'Задач выполнено: ' + thisWeek.tasksDone + '\n' +
    'Активных проектов: ' + thisWeek.projects + '\n' +
    'Встреч: ' + thisWeek.meetings;
  navigator.clipboard.writeText(text).then(function() {
    toast('Скопировано в буфер', 'success', 2000);
  });
}


/* ── CSV EXPORT ── */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  var s = String(val);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCSV(filename, headers, rows) {
  var bom = '\uFEFF';
  var csv = bom + headers.map(csvEscape).join(',') + '\n' +
    rows.map(function(row) {
      return row.map(csvEscape).join(',');
    }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTasksCSV() {
  var tasks = LS.get('wdb_tasks', []);
  var headers = ['Задача', 'Статус', 'Приоритет', 'Проект', 'Дедлайн', 'Время', 'Создана'];
  var rows = tasks.map(function(t) {
    var lane = t.lane === 'now' ? 'Сейчас' : t.lane === 'next' ? 'Следующие' : t.lane === 'wait' ? 'Отложено' : 'Выполнено';
    var prio = t.priority === 'critical' ? 'Критичный' : t.priority === 'important' ? 'Важный' : 'Обычный';
    return [t.text, lane, prio, t.project || '', t.deadline || '', t.time || '', t.doneAt ? new Date(t.doneAt).toLocaleDateString('ru') : ''];
  });
  var date = new Date().toISOString().split('T')[0];
  downloadCSV('tasks-' + date + '.csv', headers, rows);
  toast('Задачи экспортированы', 'success', 2000);
  logActivity('chart', 'Экспортировал задачи в CSV');
}

function exportProjectsCSV() {
  var projects = LS.get('wdb_projects', []);
  var headers = ['Проект', 'Клиент', 'Контакт', 'Стадия', 'Бюджет', 'Ответственный', 'Дедлайн', 'Следующий шаг'];
  var rows = projects.map(function(p) {
    var stageIdx = parseInt(p.stage) || 0;
    var stageName = p.stage === 'lost' ? 'Проиграна' : (FUNNEL[stageIdx] || '');
    return [p.name, p.client || '', p.contact || '', stageName, p.budget || '', p.owner || '', p.deadline || '', p.nextStep || ''];
  });
  var date = new Date().toISOString().split('T')[0];
  downloadCSV('projects-' + date + '.csv', headers, rows);
  toast('Проекты экспортированы', 'success', 2000);
  logActivity('chart', 'Экспортировал проекты в CSV');
}

function exportCallsCSV() {
  var calls = LS.get('wdb_calls', []);
  var headers = ['Компания', 'Контакт', 'Статус', 'Дата', 'Длительность', 'Договорённости', 'Следующий шаг'];
  var rows = calls.map(function(c) {
    return [c.company || '', c.contact || '', c.status || '', c.date || '', c.duration || '', c.agreements || '', c.nextStep || ''];
  });
  var date = new Date().toISOString().split('T')[0];
  downloadCSV('calls-' + date + '.csv', headers, rows);
  toast('Звонки экспортированы', 'success', 2000);
  logActivity('chart', 'Экспортировал звонки в CSV');
}

function exportAllCSV() {
  exportTasksCSV();
  setTimeout(exportProjectsCSV, 300);
  setTimeout(exportCallsCSV, 600);
}


/* ── ACTIVITY TIMELINE ── */
var ACT_KEY = 'wdb_activity_' + new Date().toISOString().split('T')[0];

function getActivity() { return LS.get(ACT_KEY, []); }
function saveActivity(list) {
  try { localStorage.setItem(ACT_KEY, JSON.stringify(list)); } catch(e) {}
}

function logActivity(iconKey, text) {
  var list = getActivity();
  var now = new Date();
  var time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  list.unshift({ time: time, icon: iconKey, text: text, ts: now.getTime() });
  if (list.length > 50) list = list.slice(0, 50);
  saveActivity(list);
  renderActivity();
}

function renderActivity() {
  var el = document.getElementById('act-list');
  if (!el) return;
  var list = getActivity();
  if (list.length === 0) {
    el.innerHTML = emptyState('chart', 'Действия появятся здесь', 'Создай задачу или запиши звонок');
    return;
  }
  el.innerHTML = list.map(function(a) {
    var ic = ICON[a.icon] || '';
    var svg = ic ? ic.replace(/width="\d+"/, 'width="14"').replace(/height="\d+"/, 'height="14"') : '';
    return '<div class="w-act-item">' +
      '<span class="w-act-time">' + a.time + '</span>' +
      '<span class="w-act-icon">' + svg + '</span>' +
      '<span class="w-act-text">' + esc(a.text) + '</span>' +
    '</div>';
  }).join('');
}

function clearActivity() {
  saveActivity([]);
  renderActivity();
  toast('Лента очищена', 'success', 1500);
}

document.addEventListener('DOMContentLoaded', renderActivity);


/* ── GLOBAL SEARCH ── */
function searchData(query) {
  if (!query || query.length < 2) return [];
  var q = query.toLowerCase();
  var results = [];

  (LS.get('wdb_tasks', [])).forEach(function(t) {
    if (t.text && t.text.toLowerCase().indexOf(q) !== -1) {
      results.push({
        group: 'Задачи', icon: ICON.clipboard,
        label: t.text.length > 50 ? t.text.substring(0, 50) + '…' : t.text,
        sub: t.lane === 'done' ? 'Выполнена' : t.lane === 'now' ? 'В работе' : t.lane === 'next' ? 'Следующая' : 'Отложена',
        type: 'задача',
        action: function() { cmdClose(); scrollToWidget('.tasks-block'); }
      });
    }
  });

  (LS.get('wdb_projects', [])).forEach(function(p) {
    var match = (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
                (p.client && p.client.toLowerCase().indexOf(q) !== -1) ||
                (p.contact && p.contact.toLowerCase().indexOf(q) !== -1);
    if (match) {
      results.push({
        group: 'Проекты', icon: ICON.folder,
        label: p.name || 'Без названия', sub: p.client || '',
        type: 'проект',
        action: function() { cmdClose(); scrollToWidget('.projects-block'); toggleProject(p.id); }
      });
    }
  });

  (LS.get('wdb_calls', [])).forEach(function(c) {
    var match = (c.company && c.company.toLowerCase().indexOf(q) !== -1) ||
                (c.contact && c.contact.toLowerCase().indexOf(q) !== -1) ||
                (c.agreements && c.agreements.toLowerCase().indexOf(q) !== -1);
    if (match) {
      results.push({
        group: 'Звонки', icon: ICON.phone,
        label: c.company || 'Без компании', sub: c.contact || '',
        type: 'звонок',
        action: function() { cmdClose(); scrollToWidget('.calls-block'); }
      });
    }
  });

  (LS.get('wdb_meetings', [])).forEach(function(m) {
    if (m.title && m.title.toLowerCase().indexOf(q) !== -1) {
      results.push({
        group: 'Встречи', icon: ICON.users,
        label: m.title, sub: m.who || '',
        type: 'встреча',
        action: function() { cmdClose(); scrollToWidget('[data-widget-id="meetings"]'); }
      });
    }
  });

  return results.slice(0, 10);
}


/* ── STREAK COUNTER ── */
function getStreakData() {
  return LS.get('wdb_streak', { dates: [], current: 0, best: 0 });
}

function updateStreak() {
  var data = getStreakData();
  var today = new Date().toISOString().split('T')[0];

  if (data.dates.indexOf(today) !== -1) {
    renderStreak(data);
    return;
  }

  var d = new Date();
  var ctKey = 'wdb_call_tracker_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate();
  var ct = LS.get(ctKey, null);
  var hasCalls = ct && ct.done > 0;
  var hasDoneTasks = (LS.get('wdb_tasks', [])).some(function(t) {
    return t.lane === 'done' && t.doneAt && new Date(t.doneAt).toISOString().split('T')[0] === today;
  });

  if (hasCalls || hasDoneTasks) {
    data.dates.push(today);
    if (data.dates.length > 60) data.dates = data.dates.slice(-60);
    data.dates.sort();

    var streak = 1;
    for (var i = data.dates.length - 1; i > 0; i--) {
      var curr = new Date(data.dates[i]);
      var prev = new Date(data.dates[i - 1]);
      var diff = (curr - prev) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    data.current = streak;
    if (streak > data.best) data.best = streak;

    try { localStorage.setItem('wdb_streak', JSON.stringify(data)); } catch(e) {}
  }

  renderStreak(data);
}

function renderStreak(data) {
  var badge = document.getElementById('streak-badge');
  var num = document.getElementById('streak-num');
  if (!badge || !num) return;
  animateValue(num, data.current || 0, 500);
  badge.classList.toggle('hot', data.current >= 3);
  badge.title = 'Streak: ' + data.current + ' дн (рекорд: ' + (data.best || 0) + ' дн)';
}


/* ── DATA EXPORT / IMPORT ── */
var EXPORT_KEYS = [
  'wdb_tasks', 'wdb_projects', 'wdb_meetings', 'wdb_comms', 'wdb_calls',
  'wdb_notes', 'wdb_focus', 'wdb_kpi', 'wdb_quicklog', 'wdb_streak',
  'wdb_widget_visibility', 'wdb_timer_sessions', 'wdb_theme'
];

function openExport() {
  document.getElementById('export-backdrop').classList.add('open');
}
function closeExport() {
  document.getElementById('export-backdrop').classList.remove('open');
}

function exportData() {
  var data = { _meta: { version: '1.0', date: new Date().toISOString(), source: 'wdb-dashboard' } };
  EXPORT_KEYS.forEach(function(key) {
    var val = localStorage.getItem(key);
    if (val !== null) data[key] = JSON.parse(val);
  });
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('wdb_') && EXPORT_KEYS.indexOf(k) === -1) {
      try { data[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { data[k] = localStorage.getItem(k); }
    }
  }
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = 'dashboard-backup-' + date + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup скачан', 'success', 2000);
  logActivity('chart', 'Экспортировал backup данных');
}

function importData(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data._meta || data._meta.source !== 'wdb-dashboard') {
        toast('Неверный формат файла', 'error', 3000);
        return;
      }
      var count = 0;
      Object.keys(data).forEach(function(key) {
        if (key === '_meta') return;
        localStorage.setItem(key, JSON.stringify(data[key]));
        count++;
      });
      toast('Импортировано ' + count + ' ключей. Перезагрузка...', 'success', 2000);
      logActivity('chart', 'Импортировал backup (' + count + ' ключей)');
      setTimeout(function() { location.reload(); }, 1500);
    } catch(err) {
      toast('Ошибка чтения файла: ' + err.message, 'error', 4000);
    }
  };
  reader.readAsText(file);
}


/* ── MOBILE FAB ── */
function fabToggle() {
  var c = document.getElementById('fab-container');
  var b = document.getElementById('fab-backdrop');
  if (!c) return;
  var open = c.classList.toggle('open');
  if (b) b.classList.toggle('open', open);
}
function fabClose() {
  var c = document.getElementById('fab-container');
  var b = document.getElementById('fab-backdrop');
  if (c) c.classList.remove('open');
  if (b) b.classList.remove('open');
}
