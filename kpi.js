/* ═══════════════════════════════════════════
   KPI TRACKER
   Module: kpi.js
   Dependencies: LS, animateValue, checkCelebration,
   toast, toastConfirm
═══════════════════════════════════════════ */
const KPI_GOAL = 50;
const KPI_METRICS = [
  { id: 'contact',  name: 'Новый контакт',                   pts: 1  },
  { id: 'demo',     name: 'Демо / встреча с новым клиентом', pts: 3  },
  { id: 'close',    name: 'Закрытие сделки (новый клиент)',  pts: 15 },
  { id: 'kp',       name: 'Защита КП',                       pts: 5  },
  { id: 'interest', name: 'Новая сделка в стадии «интерес»', pts: 2  },
  { id: 'nps',      name: 'NPS',                             pts: 2  },
  { id: 'upsell',   name: 'Допродажа текущему клиенту',      pts: 10 },
  { id: 'lead',     name: 'Передача лида между ролями',      pts: 5  }];
const KPI_DAYS = ['Пн','Вт','Ср','Чт','Пт'];

function kpiTodayIdx() {
  const d = new Date().getDay();
  if (d === 0 || d === 6) return -1;
  return d - 1;
}

var kpiData = LS.get('wdb_kpi', null);
if (!kpiData || !kpiData.counts) {
  kpiData = { counts: {} };
  KPI_METRICS.forEach(function(m) { kpiData.counts[m.id] = [0,0,0,0,0]; });
  LS.set('wdb_kpi', kpiData);
}
KPI_METRICS.forEach(function(m) {
  if (!kpiData.counts[m.id]) kpiData.counts[m.id] = [0,0,0,0,0];
});

function kpiSet(metricId, dayIdx, val) {
  kpiData.counts[metricId][dayIdx] = Math.max(0, parseInt(val) || 0);
  LS.set('wdb_kpi', kpiData);
  renderKPI();
}

function kpiChange(metricId, dayIdx, delta) {
  kpiSet(metricId, dayIdx, (kpiData.counts[metricId][dayIdx] || 0) + delta);
}

function kpiReset() {
  toastConfirm('Сбросить все данные KPI?', function() {
    KPI_METRICS.forEach(function(m) { kpiData.counts[m.id] = [0,0,0,0,0]; });
    LS.set('wdb_kpi', kpiData);
    renderKPI();
    toast('KPI сброшен', 'success');
  });
}

function renderKPI() {
  var compact = document.getElementById('kpi-today-compact');
  var modalTbl = document.getElementById('kpi-modal-table');
  if (!compact && !modalTbl) return;
  var today = kpiTodayIdx();
  var dayTotals = [0,0,0,0,0];
  KPI_METRICS.forEach(function(m) {
    for (var di = 0; di < 5; di++) {
      dayTotals[di] += (kpiData.counts[m.id][di] || 0) * m.pts;
    }
  });
  var weekTotal = dayTotals.reduce(function(a,b){return a+b;}, 0);

  // Синхронизируем числа в обоих местах: виджет + модалка
  ['kpi-week-num', 'kpi-modal-week-num'].forEach(function(id) {
    var el = document.getElementById(id); if (el) animateValue(el, weekTotal, 400);
  });
  var pct = Math.min(100, Math.round(weekTotal / KPI_GOAL * 100));
  ['kpi-progress-fill','kpi-modal-progress-fill'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.style.width = pct + '%'; el.className = 'kpi-progress-fill' + (weekTotal >= KPI_GOAL ? ' done' : ''); }
  });
  /* Celebration при достижении 100% */
  if (weekTotal >= KPI_GOAL) { checkCelebration('kpi-100'); }
  else { checkCelebration('kpi-reset'); }
  ['kpi-progress-pct','kpi-modal-progress-pct'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.textContent = pct + '%';
  });

  // Генерируем HTML таблицы для модалки
  var html = '<thead><tr><th class="kpi-metric-head">Показатель</th>';
  KPI_DAYS.forEach(function(d, di) {
    html += '<th class="' + (di===today?'kpi-today-col':'') + '">' + d + '</th>';
  });
  html += '</tr></thead><tbody>';
  KPI_METRICS.forEach(function(m) {
    html += '<tr><td><div class="kpi-metric-name">' + m.name + '<span class="kpi-pts">' + m.pts + '&nbsp;б</span></div></td>';
    KPI_DAYS.forEach(function(_, di) {
      var val = kpiData.counts[m.id][di] || 0;
      var tdCls = di===today ? 'kpi-today-col' : '';
      var inCls = val===0 ? ' zero' : '';
      var mid = m.id;
      html += '<td class="' + tdCls + '"><div class="kpi-cell">'
        + '<button class="kpi-btn" data-action="kpi-change" data-mid="' + mid + '" data-di="' + di + '" data-delta="-1">−</button>'
        + '<input class="kpi-input' + inCls + '" type="number" min="0" value="' + (val===0?'':val) + '" placeholder="·"'
        + ' data-change-action="kpi-set" data-mid="' + mid + '" data-di="' + di + '"'
        + ' data-action="kpi-input-focus" data-stop>'
        + '<button class="kpi-btn" data-action="kpi-change" data-mid="' + mid + '" data-di="' + di + '" data-delta="1">+</button>'
        + '</div></td>';
    });
    html += '</tr>';
  });
  html += '<tr class="kpi-total-row"><td><span class="kpi-total-label">Баллы за день</span></td>';
  KPI_DAYS.forEach(function(_, di) {
    var tdCls = di===today ? 'kpi-today-col' : '';
    var vCls = dayTotals[di]===0 ? ' zero' : '';
    html += '<td class="'+tdCls+'"><div class="kpi-total-val'+vCls+'">'+(dayTotals[di]||'—')+'</div></td>';
  });
  html += '</tr></tbody>';

  /* Полная таблица — только в модалке */
  if (modalTbl) modalTbl.innerHTML = html;

  /* Компактный вид — только сегодняшние метрики с +/− */
  if (compact) {
    var chtml = '<div style="font-size:var(--text-2xs);color:var(--text-mute);padding:6px 12px 2px;">' + KPI_DAYS[today] + ' · сегодня</div>';
    KPI_METRICS.forEach(function(m) {
      var val = kpiData.counts[m.id][today] || 0;
      var inCls = val === 0 ? ' zero' : '';
      chtml += '<div class="kpi-compact-row">'
        + '<span class="kpi-compact-name">' + m.name + '</span>'
        + '<div class="kpi-compact-cell">'
        + '<button class="kpi-btn" data-action="kpi-change" data-mid="' + m.id + '" data-di="' + today + '" data-delta="-1">−</button>'
        + '<input class="kpi-input' + inCls + '" type="number" min="0" value="' + (val===0?'':val) + '" placeholder="·"'
        + ' data-change-action="kpi-set" data-mid="' + m.id + '" data-di="' + today + '"'
        + ' data-action="kpi-input-focus" data-stop style="width:32px;">'
        + '<button class="kpi-btn" data-action="kpi-change" data-mid="' + m.id + '" data-di="' + today + '" data-delta="1">+</button>'
        + '</div></div>';
    });
    chtml += '<div class="kpi-compact-total"><span>Сегодня: ' + dayTotals[today] + ' б</span><span>Неделя: ' + weekTotal + ' / ' + KPI_GOAL + '</span></div>';
    compact.innerHTML = chtml;
  }
}

/* ── KPI MODAL: открытие / закрытие ── */
function kpiModalOpen() {
  renderKPI(); // актуализируем данные перед показом
  var bd = document.getElementById('kpi-modal-backdrop');
  bd.classList.add('open');
  // Блокируем прокрутку страницы пока модалка открыта
  document.body.style.overflow = 'hidden';
}
function kpiModalClose() {
  document.getElementById('kpi-modal-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}
// Клик по тёмному backdrop (не по панели) — закрываем
function kpiModalBackdropClick(e) {
  if (e.target === document.getElementById('kpi-modal-backdrop')) kpiModalClose();
}
// Escape закрывает модалку
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') kpiModalClose();
});
