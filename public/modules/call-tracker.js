/* Module: modules/call-tracker.js — Трекер звонков, результативность, тепловая карта */

/* ═══════════════════════════════════════════
   ТРЕКЕР ЗВОНКОВ ЗА ДЕНЬ
═══════════════════════════════════════════ */
const CALL_NORM_PER_HOUR = 5;
const WORK_START = 9;  // рабочий день с 9
const WORK_END   = 18; // до 18 (отчёт в 18:00)

// Данные хранятся по дате — сброс каждый день
function getCTKey() {
  const d = new Date();
  return `wdb_call_tracker_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}
function getCTData() {
  const key = getCTKey();
  const def = { done: 0, plan: 40, hourly: {}, reportShown: false };
  return LS.get(key, def);
}
function saveCTData(data) {
  LS.set(getCTKey(), data);
}

// Результаты звонков (сегодня)
function getCRKey() {
  const d = new Date();
  return `wdb_call_results_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}
function getCRData() {
  return LS.get(getCRKey(), { success: 0, fail: 0 });
}
function saveCRData(data) {
  LS.set(getCRKey(), data);
}

function callTrackerAdd(delta) {
  const ct = getCTData();
  const prevDone = ct.done || 0;
  ct.done = Math.max(0, prevDone + delta);
  const actualDelta = ct.done - prevDone; // реальное изменение (0 если уже на нуле)
  if (actualDelta !== 0) {
    const h = new Date().getHours();
    ct.hourly = ct.hourly || {};
    ct.hourly[h] = Math.max(0, (ct.hourly[h] || 0) + actualDelta);
  }
  saveCTData(ct);
  renderCallTracker();
  updateStats();
  if (actualDelta > 0) updateStreak();
  return actualDelta;
}

function callTrackerSetPlan(val) {
  const n = parseInt(val) || 40;
  const ct = getCTData();
  ct.plan = Math.max(1, n);
  saveCTData(ct);
  renderCallTracker();
}

function renderCallTracker() {
  const ct = getCTData();
  const now = new Date();
  const currentHour = now.getHours();

  // Счётчик
  const done = ct.done || 0;
  const plan = ct.plan || 40;
  const doneEl = document.getElementById('wct-done');
  const planEl = document.getElementById('wct-plan-display');
  const planInput = document.getElementById('wct-plan-input');
  const badge = document.getElementById('wct-day-badge');
  if (doneEl) {
    animateValue(doneEl, done, 350);
    doneEl.className = 'w-ct-num ' + (done >= plan ? 'green' : (done > 0 ? 'normal' : 'normal'));
  }
  if (planEl) planEl.textContent = plan;
  if (planInput && planInput !== document.activeElement) planInput.value = plan;
  if (badge) {
    if (done >= plan) {
      badge.className = 'w-ct-plan-badge ok';
      badge.textContent = '✓ Норма!';
    } else if (done > 0) {
      badge.className = 'w-ct-plan-badge bad';
      badge.textContent = `−${plan - done}`;
    } else {
      badge.className = 'w-ct-plan-badge neutral';
      badge.textContent = '—';
    }
  }

  // Почасовая сетка
  const grid = document.getElementById('wct-hours-grid');
  const hourNow = document.getElementById('wct-hour-now');
  if (grid) {
    const hours = [];
    for (let h = WORK_START; h < WORK_END; h++) hours.push(h);
    const maxVal = Math.max(CALL_NORM_PER_HOUR, ...hours.map(h => (ct.hourly||{})[h]||0));
    grid.innerHTML = hours.map(h => {
      const count = (ct.hourly||{})[h] || 0;
      const isPast   = h < currentHour;
      const isCurrent = h === currentHour;
      const isFuture = h > currentHour;
      let barClass = 'bar-empty';
      let heightPct = 0;
      if (isFuture) {
        barClass = 'bar-future';
        heightPct = 10;
      } else if (count > 0) {
        barClass = count >= CALL_NORM_PER_HOUR ? 'bar-green' : 'bar-red';
        heightPct = Math.min(100, Math.round((count / maxVal) * 100));
      } else if (isPast) {
        barClass = 'bar-red';
        heightPct = 5; // маленькая красная полоска — был час, но 0 звонков
      }
      const countLabel = count > 0 ? count : (isFuture ? '' : '0');
      const isNow = isCurrent ? 'style="outline:2px solid var(--accent);outline-offset:1px;"' : '';
      return `
        <div class="w-ct-hour-cell">
          <div class="w-ct-hour-count" style="color:${count >= CALL_NORM_PER_HOUR && count > 0 ? 'var(--green)' : (count > 0 ? 'var(--red)' : 'var(--text-mute)')}">${countLabel}</div>
          <div class="w-ct-hour-bar-wrap" ${isNow}>
            <div class="w-ct-hour-bar ${barClass}" style="height:${heightPct}%"></div>
          </div>
          <div class="w-ct-hour-label">${h}ч</div>
        </div>`;
    }).join('');
  }
  if (hourNow) hourNow.textContent = `сейчас ${currentHour}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Отчёт в 18:00
  const reportEl = document.getElementById('wct-report');
  const rowsEl   = document.getElementById('wct-report-rows');
  if (reportEl && rowsEl && currentHour >= WORK_END) {
    reportEl.classList.add('show');
    const hours = [];
    for (let h = WORK_START; h < WORK_END; h++) hours.push(h);
    const rowsHTML = hours.map(h => {
      const count = (ct.hourly||{})[h] || 0;
      const ok = count >= CALL_NORM_PER_HOUR;
      return `<div class="w-ct-report-row">
        <span>${h}:00 – ${h+1}:00</span>
        <span class="${ok?'ok':'bad'}">${count} зв. ${ok?'✓':'✗'}</span>
      </div>`;
    }).join('');
    rowsEl.innerHTML = rowsHTML + `<div class="w-ct-report-row" style="font-weight:600;color:var(--text)">
      <span>Итого за день</span>
      <span class="${done >= plan ? 'ok' : 'bad'}">${done} / ${plan}</span>
    </div>`;
  } else if (reportEl) {
    reportEl.classList.remove('show');
  }
}

function resetDayReport() {
  toastConfirm('Сбросить все данные за сегодня?', function() {
    const ct = { done: getCTData().plan || 40, plan: getCTData().plan || 40, hourly: {}, reportShown: false };
    const blankCt = { done: 0, plan: ct.plan, hourly: {}, reportShown: false };
    saveCTData(blankCt);
    renderCallTracker();
    toast('Данные сброшены', 'success');
  });
}

// Обновляем каждую минуту для отслеживания смены часа
setInterval(renderCallTracker, 60000);
renderCallTracker();

/* ═══════════════════════════════════════════
   РЕЗУЛЬТАТИВНОСТЬ ЗВОНКОВ
═══════════════════════════════════════════ */
function callResultAdd(type) {
  const cr = getCRData();
  cr[type] = (cr[type] || 0) + 1;
  saveCRData(cr);
  renderCallResults();
}

function callResultReset() {
  toastConfirm('Обнулить результаты за сегодня?', function() {
    saveCRData({ success: 0, fail: 0, reasons: {} });
    renderCallResults();
    toast('Результаты обнулены', 'success');
  });
}

function renderCallResults() {
  const cr = getCRData();
  const s = cr.success || 0;
  const f = cr.fail    || 0;
  const total = s + f;
  const rate = total > 0 ? Math.round((s / total) * 100) : 0;
  const sEl = document.getElementById('wcr-success');
  const fEl = document.getElementById('wcr-fail');
  const rEl = document.getElementById('wcr-rate');
  const fill = document.getElementById('wcr-rate-fill');
  if (sEl) animateValue(sEl, s, 300);
  if (fEl) animateValue(fEl, f, 300);
  if (rEl) rEl.textContent = rate + '%';
  if (fill) fill.style.width = rate + '%';

  // Причины неуспеха
  const barsEl = document.getElementById('wcr-reasons-bars');
  if (barsEl) {
    const reasons = cr.reasons || {};
    const total_r = Object.values(reasons).reduce((a,b) => a+b, 0);
    if (total_r === 0) {
      barsEl.innerHTML = '<div style="font-size: var(--text-xs);color:var(--text-mute);padding:4px 0">Нажми ✕ и выбери причину</div>';
    } else {
      const order = ['Недозвон','Занято','Нет нужного','Отказ','Другое'];
      barsEl.innerHTML = order.filter(r => reasons[r] > 0).map(r => {
        const cnt = reasons[r] || 0;
        const pct = Math.round((cnt / total_r) * 100);
        return `<div class="w-cr-reason-row">
          <span class="w-cr-reason-label">${r}</span>
          <div class="w-cr-reason-bar-wrap"><div class="w-cr-reason-bar" style="width:${pct}%"></div></div>
          <span class="w-cr-reason-count">${cnt}</span>
        </div>`;
      }).join('');
    }
  }
}
renderCallResults();

/* ── ПОПАП ПРИЧИНЫ НЕУСПЕХА ── */
function openFailReason(e) {
  e.stopPropagation();
  e.preventDefault();
  const popup = document.getElementById('fail-reason-popup');

  // Если уже открыт — закрываем
  if (popup.classList.contains('open')) {
    popup.classList.remove('open');
    return;
  }

  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect(); // координаты относительно viewport

  // Показываем за экраном чтобы измерить размер
  popup.style.top  = '-9999px';
  popup.style.left = '-9999px';
  popup.classList.add('open');

  requestAnimationFrame(() => {
    const ph = popup.offsetHeight;
    const pw = popup.offsetWidth;

    // position:fixed — координаты от viewport, scrollY НЕ нужен
    let top = rect.top - ph - 8;
    if (top < 8) top = rect.bottom + 8; // не влезает сверху — показываем снизу

    let left = rect.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;

    popup.style.top  = Math.max(8, top) + 'px';
    popup.style.left = Math.max(8, left) + 'px';
  });
}

function pickFailReason(reason) {
  const cr = getCRData();
  cr.fail = (cr.fail || 0) + 1;
  cr.reasons = cr.reasons || {};
  cr.reasons[reason] = (cr.reasons[reason] || 0) + 1;
  saveCRData(cr);
  document.getElementById('fail-reason-popup').classList.remove('open');
  renderCallResults();
  // Добавляем в трекер (heatmap и воронка обновятся автоматически)
  window.callTrackerAdd(1);
}

document.addEventListener('click', e => {
  const popup = document.getElementById('fail-reason-popup');
  const failBtn = document.querySelector('.w-cr-btn.fail');
  if (popup && !popup.contains(e.target) && !failBtn?.contains(e.target)) {
    popup.classList.remove('open');
  }
});

/* ═══════════════════════════════════════════
   ТЕПЛОВАЯ КАРТА НЕДЕЛИ
═══════════════════════════════════════════ */
const HM_DAYS   = ['Пн','Вт','Ср','Чт','Пт'];
const HM_DAY_JS = [1,2,3,4,5]; // getDay() values
const HM_HOURS  = [9,10,11,12,13,14,15,16,17];

function getHeatmapKey(weekOffset) {
  // Ключ по номеру недели
  const now = new Date();
  const weekNum = getWeekNum(now);
  return `wdb_heatmap_${now.getFullYear()}_w${weekNum + (weekOffset||0)}`;
}

function getHeatmapData() {
  return LS.get(getHeatmapKey(0), {});
}

// Записываем/убираем звонок в тепловую карту
function heatmapRecord(count) {
  const now = new Date();
  const dayJs = now.getDay();
  const hour  = now.getHours();
  if (!HM_DAY_JS.includes(dayJs)) return;
  const dayIdx = HM_DAY_JS.indexOf(dayJs);
  const key = `${dayIdx}_${hour}`;
  const data = getHeatmapData();
  data[key] = Math.max(0, (data[key] || 0) + count);
  LS.set(getHeatmapKey(0), data);
  renderHeatmap();
}

function renderHeatmap() {
  const grid = document.getElementById('w-hm-grid');
  if (!grid) return;
  const data = getHeatmapData();
  const now = new Date();
  const todayDayIdx = HM_DAY_JS.indexOf(now.getDay());

  // Находим максимум для шкалы
  const allVals = Object.values(data).filter(v => v > 0);
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : CALL_NORM_PER_HOUR;

  // Шапка — часы
  let html = '<div></div>'; // пустая ячейка угла
  HM_HOURS.forEach(h => {
    html += `<div class="w-hm-header">${h}ч</div>`;
  });

  // Строки — дни
  HM_DAYS.forEach((day, di) => {
    const isToday = di === todayDayIdx;
    html += `<div class="w-hm-day-label ${isToday ? 'today' : ''}">${day}</div>`;
    HM_HOURS.forEach(h => {
      const key = `${di}_${h}`;
      const val = data[key] || 0;
      // Определяем уровень
      let lvl;
      if (val === 0)                          lvl = 'hm-0';
      else if (val >= CALL_NORM_PER_HOUR * 2) lvl = 'hm-over';
      else if (val >= CALL_NORM_PER_HOUR)     lvl = 'hm-5';
      else if (val >= 4)                      lvl = 'hm-4';
      else if (val >= 3)                      lvl = 'hm-3';
      else if (val >= 2)                      lvl = 'hm-2';
      else                                    lvl = 'hm-1';
      const todayCls = isToday ? ' today-col' : '';
      html += `<div class="w-hm-cell ${lvl}${todayCls}" data-tip="${val} зв."></div>`;
    });
  });

  grid.innerHTML = html;
}
renderHeatmap();

/* END */
