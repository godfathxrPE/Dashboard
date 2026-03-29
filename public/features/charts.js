/* ══════════════════════════════════════════
   ANALYTICS CHARTS
   Паттерн: Canvas Dashboard Charts (Stripe, Linear Insights).
   4 графика на Canvas 2D, адаптируются к теме через CSS vars.
   Рендерятся при переключении в Analytics Mode.
══════════════════════════════════════════ */
/* Polyfill: roundRect для Safari < 16 и старых браузеров */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    let r = typeof radii === 'number' ? [radii,radii,radii,radii] : (Array.isArray(radii) ? radii : [0,0,0,0]);
    while (r.length < 4) r.push(r[0] || 0);
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    this.closePath();
    return this;
  };
}

function getThemeColors() {
  let s = getComputedStyle(document.documentElement);
  return {
    accent: s.getPropertyValue('--accent').trim() || '#b5622a',
    green:  s.getPropertyValue('--green').trim() || '#2e7d52',
    blue:   s.getPropertyValue('--blue').trim() || '#2d6ab4',
    red:    s.getPropertyValue('--red').trim() || '#c03030',
    yellow: s.getPropertyValue('--yellow').trim() || '#a07020',
    text:   s.getPropertyValue('--text').trim() || '#333',
    mute:   s.getPropertyValue('--text-mute').trim() || '#999',
    border: s.getPropertyValue('--border').trim() || '#ddd',
    surface2: s.getPropertyValue('--surface2').trim() || '#f5f4ef',
  };
}

function setupCanvas(id) {
  let canvas = document.getElementById(id);
  if (!canvas) return null;
  let dpr = window.devicePixelRatio || 1;
  let rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  let ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);
  return { ctx: ctx, w: rect.width, h: rect.height };
}

/* ── Chart 1: Звонки за 7 дней (Bar Chart) ── */
function renderChartCallsWeek() {
  let c = setupCanvas('chart-calls-week');
  if (!c) return;
  let ctx = c.ctx, w = c.w, h = c.h;
  let clr = getThemeColors();

  let data = [];
  let labels = [];
  let days = ['вс','пн','вт','ср','чт','пт','сб'];
  for (let i = 6; i >= 0; i--) {
    let d = new Date();
    d.setDate(d.getDate() - i);
    let key = 'wdb_call_tracker_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate();
    let ct = LS.get(key, null);
    data.push(ct ? (ct.done || 0) : 0);
    labels.push(days[d.getDay()]);
  }

  let max = Math.max.apply(null, data) || 1;
  let pad = { top: 10, right: 10, bottom: 28, left: 36 };
  let chartW = w - pad.left - pad.right;
  let chartH = h - pad.top - pad.bottom;
  let barW = (chartW / data.length) * 0.6;
  let gap = (chartW / data.length) * 0.4;

  /* Grid lines */
  ctx.strokeStyle = clr.border;
  ctx.lineWidth = 0.5;
  for (let g = 0; g <= 4; g++) {
    let gy = pad.top + chartH - (chartH * g / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke();
    ctx.fillStyle = clr.mute;
    ctx.font = '9px Manrope, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(max * g / 4), pad.left - 4, gy + 3);
  }

  /* Bars */
  data.forEach(function(v, i) {
    let x = pad.left + i * (barW + gap) + gap / 2;
    let barH = (v / max) * chartH;
    let y = pad.top + chartH - barH;

    /* Bar fill */
    ctx.fillStyle = i === data.length - 1 ? clr.accent : clr.blue;
    ctx.globalAlpha = i === data.length - 1 ? 1 : 0.6;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* Value on top */
    if (v > 0) {
      ctx.fillStyle = clr.text;
      ctx.font = '10px Manrope, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(v, x + barW / 2, y - 4);
    }

    /* Label */
    ctx.fillStyle = clr.mute;
    ctx.font = '9px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, h - 6);
  });
}

/* ── Chart 2: Успешность звонков (Stacked Bar) ── */
function renderChartCallResults() {
  let c = setupCanvas('chart-call-results');
  if (!c) return;
  let ctx = c.ctx, w = c.w, h = c.h;
  let clr = getThemeColors();

  let success = [], fail = [], labels = [];
  let days = ['вс','пн','вт','ср','чт','пт','сб'];
  for (let i = 6; i >= 0; i--) {
    let d = new Date();
    d.setDate(d.getDate() - i);
    let key = 'wdb_call_results_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate();
    let cr = LS.get(key, { success: 0, fail: 0 });
    success.push(cr.success || 0);
    fail.push(cr.fail || 0);
    labels.push(days[d.getDay()]);
  }

  let max = Math.max.apply(null, success.map(function(s, i) { return s + fail[i]; })) || 1;
  let pad = { top: 10, right: 10, bottom: 28, left: 36 };
  let chartW = w - pad.left - pad.right;
  let chartH = h - pad.top - pad.bottom;
  let barW = (chartW / 7) * 0.55;
  let gap = (chartW / 7) * 0.45;

  /* Grid */
  ctx.strokeStyle = clr.border; ctx.lineWidth = 0.5;
  for (let g = 0; g <= 4; g++) {
    let gy = pad.top + chartH - (chartH * g / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke();
    ctx.fillStyle = clr.mute; ctx.font = '9px Manrope, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(max * g / 4), pad.left - 4, gy + 3);
  }

  success.forEach(function(sv, i) {
    let fv = fail[i];
    let total = sv + fv;
    let x = pad.left + i * (barW + gap) + gap / 2;

    /* Success bar */
    let sH = (sv / max) * chartH;
    let sY = pad.top + chartH - (total / max) * chartH;
    ctx.fillStyle = clr.green; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.roundRect(x, sY, barW, sH, [3,3,0,0]); ctx.fill();

    /* Fail bar (stacked on top) */
    let fH = (fv / max) * chartH;
    ctx.fillStyle = clr.red; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.roundRect(x, sY + sH, barW, fH, [0,0,3,3]); ctx.fill();
    ctx.globalAlpha = 1;

    /* Label */
    ctx.fillStyle = clr.mute; ctx.font = '9px Manrope, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, h - 6);
  });

  /* Legend */
  ctx.fillStyle = clr.green; ctx.fillRect(w - 100, 4, 8, 8);
  ctx.fillStyle = clr.mute; ctx.font = '9px Manrope, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('успех', w - 88, 12);
  ctx.fillStyle = clr.red; ctx.fillRect(w - 50, 4, 8, 8);
  ctx.fillStyle = clr.mute; ctx.fillText('неуд.', w - 38, 12);
}

/* ── Chart 3: Задачи по статусам (Donut) ── */
function renderChartTasksDist() {
  let c = setupCanvas('chart-tasks-dist');
  if (!c) return;
  let ctx = c.ctx, w = c.w, h = c.h;
  let clr = getThemeColors();

  let allTasks = LS.get('wdb_tasks', []);
  let counts = {
    now:  allTasks.filter(function(t) { return t.lane === 'now'; }).length,
    next: allTasks.filter(function(t) { return t.lane === 'next'; }).length,
    wait: allTasks.filter(function(t) { return t.lane === 'wait'; }).length,
    done: allTasks.filter(function(t) { return t.lane === 'done'; }).length,
  };
  let total = counts.now + counts.next + counts.wait + counts.done;
  if (total === 0) {
    ctx.fillStyle = clr.mute; ctx.font = '12px Manrope, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Нет задач', w / 2, h / 2);
    return;
  }

  let segments = [
    { label: 'Сейчас', val: counts.now, color: clr.accent },
    { label: 'Следующие', val: counts.next, color: clr.blue },
    { label: 'Отложено', val: counts.wait, color: clr.yellow },
    { label: 'Готово', val: counts.done, color: clr.green }];

  let cx = w * 0.38, cy = h / 2, radius = Math.min(cx, cy) - 16;
  let innerRadius = radius * 0.6;
  let startAngle = -Math.PI / 2;

  segments.forEach(function(seg) {
    if (seg.val === 0) return;
    let sliceAngle = (seg.val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + innerRadius * Math.cos(startAngle), cy + innerRadius * Math.sin(startAngle));
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    startAngle += sliceAngle;
  });

  /* Center number */
  ctx.fillStyle = clr.text; ctx.font = '600 22px Manrope, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 2);
  ctx.fillStyle = clr.mute; ctx.font = '9px Manrope, sans-serif';
  ctx.fillText('задач', cx, cy + 14);

  /* Legend */
  let lx = w * 0.68, ly = 20;
  segments.forEach(function(seg) {
    if (seg.val === 0) return;
    ctx.fillStyle = seg.color; ctx.fillRect(lx, ly, 8, 8);
    ctx.fillStyle = clr.text; ctx.font = '11px Manrope, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(seg.label + ' (' + seg.val + ')', lx + 14, ly + 8);
    ly += 20;
  });
}

/* ── Chart 4: Проекты по стадиям (Horizontal Bar) ── */
function renderChartProjectPipeline() {
  let c = setupCanvas('chart-project-pipeline');
  if (!c) return;
  let ctx = c.ctx, w = c.w, h = c.h;
  let clr = getThemeColors();

  let projects = LS.get('wdb_projects', []).filter(function(p) { return p.stage !== 'lost'; });
  if (projects.length === 0) {
    ctx.fillStyle = clr.mute; ctx.font = '12px Manrope, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Нет проектов', w / 2, h / 2);
    return;
  }

  /* Group by stage bucket */
  let buckets = [
    { label: 'Лид / Квалификация', stages: [0,1,2], color: clr.mute, count: 0 },
    { label: 'Подготовка КП', stages: [3,4,5], color: clr.blue, count: 0 },
    { label: 'Согласование', stages: [6,7,8], color: clr.accent, count: 0 },
    { label: 'Закрытие', stages: [9,10,11], color: clr.green, count: 0 }];
  projects.forEach(function(p) {
    let s = parseInt(p.stage) || 0;
    buckets.forEach(function(b) { if (b.stages.indexOf(s) !== -1) b.count++; });
  });

  let maxCount = Math.max.apply(null, buckets.map(function(b) { return b.count; })) || 1;
  let pad = { top: 8, right: 16, bottom: 8, left: 110 };
  let rowH = (h - pad.top - pad.bottom) / buckets.length;

  buckets.forEach(function(b, i) {
    let y = pad.top + i * rowH;
    let barMaxW = w - pad.left - pad.right;
    let barW = (b.count / maxCount) * barMaxW;

    /* Label */
    ctx.fillStyle = clr.text; ctx.font = '11px Manrope, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(b.label, pad.left - 8, y + rowH / 2 + 4);

    /* Bar bg */
    ctx.fillStyle = clr.surface2;
    ctx.beginPath(); ctx.roundRect(pad.left, y + 8, barMaxW, rowH - 16, 4); ctx.fill();

    /* Bar fill */
    if (b.count > 0) {
      ctx.fillStyle = b.color; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.roundRect(pad.left, y + 8, Math.max(barW, 6), rowH - 16, 4); ctx.fill();
      ctx.globalAlpha = 1;

      /* Count */
      ctx.fillStyle = clr.text; ctx.font = '600 12px Manrope, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(b.count, pad.left + barW + 6, y + rowH / 2 + 4);
    }
  });
}

/* ── Master render: all 4 charts ── */
function renderAnalyticsCharts() {
  if (!document.body.classList.contains('view-analytics')) return;
  /* Timeout чтобы CSS grid успел перестроиться */
  setTimeout(function() {
    renderChartCallsWeek();
    renderChartCallResults();
    renderChartTasksDist();
    renderChartProjectPipeline();
  }, 100);
}
/* Перерисовка при resize окна */
let _chartResizeTimer = null;
window.addEventListener('resize', function() {
  clearTimeout(_chartResizeTimer);
  _chartResizeTimer = setTimeout(renderAnalyticsCharts, 200);
});


function generateStandup() {
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let yKey = 'wdb_activity_' + yesterday.toISOString().split('T')[0];
  let yActions = LS.get(yKey, []);
  let today = new Date();

  /* Вчерашние звонки */
  let yCtKey = 'wdb_call_tracker_' + yesterday.getFullYear() + '_' + yesterday.getMonth() + '_' + yesterday.getDate();
  let yCt = LS.get(yCtKey, null);
  let yCalls = yCt ? (yCt.done || 0) : 0;

  /* Текущие задачи */
  let allTasks = LS.get('wdb_tasks', []);
  let nowTasks = allTasks.filter(function(t) { return t.lane === 'now'; });
  let doneTasks = allTasks.filter(function(t) {
    return t.lane === 'done' && t.doneAt &&
      new Date(t.doneAt).toDateString() === yesterday.toDateString();
  });

  /* Проекты с обновлениями вчера */
  let updatedProjects = (LS.get('wdb_projects', [])).filter(function(p) {
    return p.lastContactDate === yesterday.toISOString().split('T')[0];
  });

  /* Формируем текст */
  let lines = [];
  lines.push('📋 ОТЧЁТ ЗА ' + yesterday.toLocaleDateString('ru', { day: 'numeric', month: 'long', weekday: 'long' }).toUpperCase());
  lines.push('');

  if (yCalls > 0) lines.push('Звонков: ' + yCalls);
  if (doneTasks.length > 0) {
    lines.push('Выполнено задач: ' + doneTasks.length);
    doneTasks.forEach(function(t) { lines.push('  • ' + t.text); });
  }
  if (updatedProjects.length > 0) {
    lines.push('Обновлены проекты:');
    updatedProjects.forEach(function(p) { lines.push('  • ' + p.name + ' (' + FUNNEL[parseInt(p.stage)||0] + ')'); });
  }
  if (yActions.length > 0 && !doneTasks.length && !yCalls) {
    lines.push('Действия: ' + yActions.length);
  }

  lines.push('');
  lines.push('ПЛАН НА СЕГОДНЯ:');
  if (nowTasks.length > 0) {
    nowTasks.slice(0, 5).forEach(function(t) {
      let prio = t.priority === 'critical' ? ' ⚠️' : t.priority === 'important' ? ' ⭐' : '';
      lines.push('  • ' + t.text + prio);
    });
    if (nowTasks.length > 5) lines.push('  ...и ещё ' + (nowTasks.length - 5));
  } else {
    lines.push('  (нет задач в "Сейчас")');
  }

  let text = lines.join('\n');

  navigator.clipboard.writeText(text).then(function() {
    toast('Отчёт скопирован в буфер', 'success', 3000);
  });
  logActivity('chart', 'Сгенерировал daily standup');
  return text;
}


function initGreeting() {
  let el = document.getElementById('header-greeting');
  if (!el) return;
  let h = new Date().getHours();
  let greeting;
  if (h >= 5 && h < 12)       greeting = 'Доброе утро';
  else if (h >= 12 && h < 17) greeting = 'Добрый день';
  else if (h >= 17 && h < 22) greeting = 'Добрый вечер';
  else                         greeting = 'Доброй ночи';

  /* По пятницам — мотивационная фраза */
  let day = new Date().getDay();
  if (day === 5) greeting += ' — пятница!';

  el.textContent = greeting;
}

