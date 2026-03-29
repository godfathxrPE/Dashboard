/* ══════════════════════════════════════════
   GREETING + ONBOARDING TOUR
   Module: features/onboarding.js
   Dependencies: LS, toast
══════════════════════════════════════════ */

/* ── GREETING — персональное приветствие ── */
function initGreeting() {
  var el = document.getElementById('greeting-text');
  if (!el) return;
  var h = new Date().getHours();
  var greeting = h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  el.textContent = greeting;
}

/* ── ONBOARDING TOUR ──
   Паттерн: Spotlight Tour (Notion, Linear). */
var TOUR_STEPS = [
  { selector: '.tasks-block',         title: 'Текущие дела',        body: 'Kanban-доска с колонками: Сейчас, Следующие, Ожидание, Готово. Перетаскивай задачи между колонками.' },
  { selector: '.projects-block',      title: 'Проекты',             body: 'CRM-карточки с воронкой продаж. Каждый проект проходит 12 этапов от лида до подписания. Перетаскивай проект на нужный этап.' },
  { selector: '.calls-block',         title: 'Журнал звонков',      body: 'Запись звонков с договорённостями и следующими шагами. Раскрой карточку для деталей.' },
  { selector: '.w-clock',             title: 'Часы и дата',         body: 'Живое время, день недели, номер недели. Всегда перед глазами.' },
  { selector: '.w-focus',             title: 'Фокус дня',           body: 'Одно главное дело на сегодня. Запиши утром — видишь весь день.' },
  { selector: '.w-stats',             title: 'Мини-статистика',     body: 'Ключевые числа с трендовыми sparkline-графиками за 7 дней.' },
  { selector: '.w-timer',             title: 'Pomodoro таймер',     body: 'Фокус-сессии 25/5/15 минут. Помогает работать блоками.' },
  { selector: '.hdr-search-btn',      title: 'Быстрый поиск ⌘K',  body: 'Нажми Cmd+K (Ctrl+K) — палитра команд. Любое действие за пару нажатий.' },
  { selector: '#dl-toggle',           title: 'Светлая / Тёмная',   body: 'Мгновенное переключение между светлой и тёмной версией текущей темы.' },
  { selector: '.theme-switcher',      title: '8 тем',               body: 'От минимализма Claude до киберпанка Neon. Выбирай по настроению.' }];

var tourStep = 0;
var tourOverlay = null;
var tourTooltip = null;

function tourCleanup() {
  document.querySelectorAll('.tour-highlight').forEach(function(el) {
    el.classList.remove('tour-highlight');
    el.style.removeProperty('z-index');
    el.style.removeProperty('position');
  });
  document.querySelectorAll('.tour-overlay').forEach(function(el) { el.remove(); });
  document.querySelectorAll('.tour-tooltip').forEach(function(el) { el.remove(); });
  tourOverlay = null;
  tourTooltip = null;
}

function tourStart() {
  tourCleanup();
  tourStep = 0;
  tourOverlay = document.createElement('div');
  tourOverlay.className = 'tour-overlay active';
  tourOverlay.onclick = function(e) { if (e.target === tourOverlay) tourEnd(); };
  document.body.appendChild(tourOverlay);

  tourTooltip = document.createElement('div');
  tourTooltip.className = 'tour-tooltip';
  tourTooltip.style.opacity = '0';
  document.body.appendChild(tourTooltip);

  tourShow(0);
}

function tourShow(idx) {
  tourStep = idx;
  var step = TOUR_STEPS[idx];
  if (!step) { tourEnd(); return; }

  document.querySelectorAll('.tour-highlight').forEach(function(el) {
    el.classList.remove('tour-highlight');
  });

  var target = document.querySelector(step.selector);
  if (!target) {
    if (idx < TOUR_STEPS.length - 1) { tourShow(idx + 1); }
    else { tourEnd(); }
    return;
  }

  target.classList.add('tour-highlight');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (tourOverlay) tourOverlay.style.background = 'transparent';

  var dots = TOUR_STEPS.map(function(_, i) {
    return '<span class="tour-dot' + (i === idx ? ' active' : '') + '"></span>';
  }).join('');

  tourTooltip.innerHTML =
    '<div class="tour-tooltip-title">' + step.title + '</div>' +
    '<div class="tour-tooltip-body">' + step.body + '</div>' +
    '<div class="tour-tooltip-footer">' +
      '<div class="tour-dots">' + dots + '</div>' +
      '<div class="tour-btns">' +
        '<button class="tour-skip" data-action="tour-end">Пропустить</button>' +
        (idx > 0 ? '<button class="btn" data-action="tour-show" data-idx="' + (idx-1) + '">Назад</button>' : '') +
        '<button class="btn btn-primary" ' + (idx < TOUR_STEPS.length - 1 ? 'data-action="tour-show" data-idx="' + (idx+1) + '"' : 'data-action="tour-end"') + '>' +
          (idx < TOUR_STEPS.length - 1 ? 'Далее (' + (idx+1) + '/' + TOUR_STEPS.length + ')' : 'Готово!') +
        '</button>' +
      '</div>' +
    '</div>';

  tourTooltip.style.opacity = '0';
  setTimeout(function() {
    if (!tourTooltip) return;
    var rect = target.getBoundingClientRect();
    var ttRect = tourTooltip.getBoundingClientRect();
    var top = rect.bottom + 14;
    var left = rect.left + (rect.width / 2) - (ttRect.width / 2);
    left = Math.max(12, Math.min(left, window.innerWidth - ttRect.width - 12));
    if (top + ttRect.height > window.innerHeight - 20) {
      top = rect.top - ttRect.height - 14;
    }
    if (top < 12) {
      top = Math.max(12, (window.innerHeight - ttRect.height) / 2);
    }
    tourTooltip.style.top = top + 'px';
    tourTooltip.style.left = left + 'px';
    tourTooltip.style.opacity = '1';
  }, 450);
}

function tourEnd() {
  tourCleanup();
  localStorage.setItem('wdb_tour_done', '1');
}

function tourAutoStart() {
  if (!localStorage.getItem('wdb_tour_done')) {
    setTimeout(tourStart, 1500);
  }
}
