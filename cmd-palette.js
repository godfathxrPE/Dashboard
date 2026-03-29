/* ══════════════════════════════════════════
   DARK / LIGHT TOGGLE
   Паттерн: Theme Pair Toggle (Arc Browser, GitHub).
   Каждая светлая тема имеет тёмную пару.
   Одна кнопка переключает между ними.
══════════════════════════════════════════ */
let THEME_PAIRS = {
  't-claude':   't-tidal',
  't-tidal':    't-claude',
  't-paper':    't-aurora',
  't-aurora':   't-paper',
  't-sand':     't-frost',
  't-frost':    't-sand',
};

let DARK_THEMES = ['t-frost', 't-aurora', 't-tidal'];

function isDarkTheme() {
  let current = localStorage.getItem('wdb_theme') || localStorage.getItem('dashboard-theme') || 't-claude';
  return DARK_THEMES.indexOf(current) !== -1;
}

function toggleDarkLight() {
  let current = localStorage.getItem('wdb_theme') || localStorage.getItem('dashboard-theme') || 't-claude';
  setTheme(paired);
  updateDLIcon();
  toast(isDarkTheme() ? 'Тёмная тема' : 'Светлая тема', 'success', 1500);
}

function updateDLIcon() {
  let el = document.getElementById('dl-icon');
  if (!el) return;
  el.innerHTML = isDarkTheme() ? ICON.sun : ICON.moon;
}

/* Обновляем иконку при загрузке и при смене темы */
/* Stub registry eliminates typeof guards */
document.addEventListener('DOMContentLoaded', updateDLIcon);
/* Хук на setTheme добавляется после определения функции — ниже */


/* ══════════════════════════════════════════
   3. COMMAND PALETTE (Cmd+K / Ctrl+K)
   Паттерн: Spotlight Search (Linear, Raycast, VS Code).
   Быстрый доступ ко всем действиям дашборда.
══════════════════════════════════════════ */
let cmdActions = [
  /* Навигация */
  { group: 'Навигация',    icon: ICON.clipboard, label: 'Задачи',              hint: '1',  action: function(){ scrollToWidget('.tasks-block'); } },
  { group: 'Навигация',    icon: ICON.folder,    label: 'Проекты',             hint: '2',  action: function(){ scrollToWidget('.projects-block'); } },
  { group: 'Навигация',    icon: ICON.phone,     label: 'Звонки',              hint: '3',  action: function(){ scrollToWidget('.calls-block'); } },
  { group: 'Навигация',    icon: ICON.arrowUp,   label: 'Наверх',              hint: 'T',  action: function(){ cmdClose(); window.scrollTo({top:0, behavior:'smooth'}); } },

  /* Быстрые действия */
  { group: 'Действия',     icon: ICON.plus,      label: 'Новая задача',         hint: 'N',  action: function(){ cmdClose(); openTaskModal(null); } },
  { group: 'Действия',     icon: ICON.folder,    label: 'Новый проект',         hint: 'P',  action: function(){ cmdClose(); openProjectModal(); } },
  { group: 'Действия',     icon: ICON.phone,     label: 'Записать звонок',      hint: 'C',  action: function(){ cmdClose(); openCallModal(); } },
  { group: 'Действия',     icon: ICON.calendar,  label: 'Запланировать звонок',          action: function(){ cmdClose(); if(typeof dcOpenModal==='function') dcOpenModal(); } },
  { group: 'Действия',     icon: ICON.users,     label: 'Новая встреча',        hint: 'M',  action: function(){ cmdClose(); openMeetingModal(); } },
  { group: 'Действия',     icon: ICON.message,   label: 'Новое напоминание',   action: function(){ cmdClose(); openCommModal(); } },

  /* Сбросы */
  { group: 'Сбросы',       icon: ICON.refresh,   label: 'Сбросить KPI',        action: function(){ cmdClose(); kpiReset(); } },
  { group: 'Сбросы',       icon: ICON.refresh,   label: 'Сбросить трекер',     action: function(){ cmdClose(); resetDayReport(); } },
  { group: 'Сбросы',       icon: ICON.refresh,   label: 'Сбросить результаты', action: function(){ cmdClose(); callResultReset(); } },
  { group: 'Сбросы',       icon: ICON.trash,     label: 'Очистить лог',        action: function(){ cmdClose(); qlClear(); } },

  /* Настройки */
  { group: 'Настройки',    icon: ICON.settings,  label: 'Настроить виджеты',   action: function(){ cmdClose(); wcToggle(); } },
  { group: 'Настройки',    icon: ICON.target,    label: 'Режим фокуса',        hint: 'F',  action: function(){ cmdClose(); toggleFocusMode(); } },
  { group: 'Настройки',    icon: ICON.target,    label: 'Пройти тур',          hint: '?',  action: function(){ cmdClose(); localStorage.removeItem('wdb_tour_done'); tourStart(); } },
  { group: 'Настройки',    icon: ICON.chart,     label: 'Итоги недели',        hint: 'W',  action: function(){ cmdClose(); openReview(); } },
  { group: 'Настройки',    icon: ICON.folder,    label: 'Экспорт / Импорт',                action: function(){ cmdClose(); openExport(); } },
  { group: 'Настройки',    icon: ICON.chart,     label: 'Экспорт CSV (всё)',               action: function(){ cmdClose(); exportAllCSV(); } },
  { group: 'Настройки',    icon: ICON.zap,       label: 'Звуки вкл/выкл',                  action: function(){ cmdClose(); toggleSounds(); } },
  { group: 'Настройки',    icon: ICON.clipboard, label: 'Daily Standup отчёт',              action: function(){ cmdClose(); generateStandup(); } },

  /* Виды */
  { group: 'Вид',          icon: ICON.grid,      label: 'Всё (по умолчанию)',              action: function(){ cmdClose(); setView('default'); } },
  { group: 'Вид',          icon: ICON.folder,    label: 'Продажи',                         action: function(){ cmdClose(); setView('sales'); } },
  { group: 'Вид',          icon: ICON.chart,     label: 'Аналитика',                       action: function(){ cmdClose(); setView('analytics'); } },

  /* Темы */
  { group: 'Тема',         icon: ICON.palette,   label: 'Claude',              action: function(){ cmdClose(); setTheme('t-claude'); toast('Тема: Claude', 'success'); } },
  { group: 'Тема',         icon: ICON.palette,   label: 'Frost',               action: function(){ cmdClose(); setTheme('t-frost'); toast('Тема: Frost', 'success'); } },
  { group: 'Тема',         icon: ICON.palette,   label: 'Paper',               action: function(){ cmdClose(); setTheme('t-paper'); toast('Тема: Paper', 'success'); } },
  { group: 'Тема',         icon: ICON.palette,   label: 'Sand',                action: function(){ cmdClose(); setTheme('t-sand'); toast('Тема: Sand', 'success'); } },
  { group: 'Тема',         icon: ICON.palette,   label: 'Aurora',              action: function(){ cmdClose(); setTheme('t-aurora'); toast('Тема: Aurora', 'success'); } }];

let cmdIdx = 0; /* Индекс активного элемента */
let cmdFiltered = []; /* Отфильтрованный список */

function cmdOpen() {
  let bd = document.getElementById('cmd-backdrop');
  let inp = document.getElementById('cmd-search');
  bd.classList.add('open');
  inp.value = '';
  cmdIdx = 0;
  cmdRender('');
  /* Задержка для анимации, потом фокус */
  setTimeout(function(){ inp.focus(); }, 50);
}

function cmdClose() {
  document.getElementById('cmd-backdrop').classList.remove('open');
}

function cmdRender(query) {
  let res = document.getElementById('cmd-results');
  query = (query || '').toLowerCase().trim();

  /* Команды */
  let cmdResults = query
    ? cmdActions.filter(function(a) { return a.label.toLowerCase().indexOf(query) !== -1 || a.group.toLowerCase().indexOf(query) !== -1; })
    : cmdActions;

  /* Данные (задачи, проекты, звонки, встречи) — только при ≥2 символах */
  let dataResults = searchData(query);

  /* Объединяем: сначала команды, потом данные */
  cmdFiltered = cmdResults.concat(dataResults);

  if (cmdFiltered.length === 0) {
    res.innerHTML = '<div class="cmd-empty">Ничего не найдено</div>';
    return;
  }

  /* Группировка */
  let groups = {};
  cmdFiltered.forEach(function(a) {
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  });

  let html = '';
  Object.keys(groups).forEach(function(g) {
    html += '<div class="cmd-group-label">' + esc(g) + '</div>';
    groups[g].forEach(function(a, i) {
      let globalIdx = cmdFiltered.indexOf(a);
      html += '<div class="cmd-item' + (globalIdx === cmdIdx ? ' active' : '') + '" data-idx="' + globalIdx + '" data-action="cmd-exec" onmouseenter="cmdHover(' + globalIdx + ')">' +
        '<span class="cmd-item-icon">' + (a.icon || '') + '</span>' +
        '<span class="cmd-item-label">' + esc(a.label) +
          (a.sub ? '<div class="cmd-item-sub">' + esc(a.sub) + '</div>' : '') +
        '</span>' +
        (a.type ? '<span class="cmd-item-type">' + esc(a.type) + '</span>' : '') +
        (a.hint ? '<span class="cmd-item-hint">' + esc(a.hint) + '</span>' : '') +
      '</div>';
    });
  });
  res.innerHTML = html;

  /* Прокрутка к активному */
  let active = res.querySelector('.cmd-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function cmdExec(idx) {
  let a = cmdFiltered[idx];
  if (a && a.action) a.action();
}

function cmdHover(idx) {
  cmdIdx = idx;
  /* Обновляем active класс без полного ре-рендера */
  let items = document.querySelectorAll('.cmd-item');
  items.forEach(function(el) {
    el.classList.toggle('active', parseInt(el.dataset.idx) === idx);
  });
}

function scrollToWidget(selector) {
  cmdClose();
  let el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Keyboard handler */
document.addEventListener('keydown', function(e) {
  let bd = document.getElementById('cmd-backdrop');
  let isOpen = bd && bd.classList.contains('open');

  /* Игнорируем шорткаты когда фокус в input/textarea */
  let tag = (document.activeElement || {}).tagName;
  let inInput = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

  /* Cmd+K / Ctrl+K — открыть палитру (работает всегда) */
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (isOpen) { cmdClose(); } else { cmdOpen(); }
    return;
  }

  /* ── GLOBAL SHORTCUTS (когда палитра закрыта и не в input) ──
     Паттерн: Gmail / Linear keyboard shortcuts.
     Одиночные клавиши — быстрый доступ к действиям.

     Каноническая карта шорткатов:
     N — новая задача     P — новый проект
     C — новый звонок     M — новая встреча
     D — светлая/тёмная   W — итоги недели
     F — фокус-режим      T — наверх
     ? — тур              / — палитра команд
     1-3 — навигация к блокам */
  if (!isOpen && !inInput) {

    /* Дополнительная защита: contentEditable, тур, модалки */
    if (document.activeElement && document.activeElement.isContentEditable) return;
    if (document.querySelector('.tour-overlay.active')) return;

    /* Не перехватываем с модификаторами */
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    /* N — новая задача */
    if (e.key === 'n') {
      e.preventDefault();
      openTaskModal(null);
      toast('Новая задача', 'info', 1500);
      return;
    }

    /* P — новый проект */
    if (e.key === 'p') {
      e.preventDefault();
      openProjectModal();
      toast('Новый проект', 'info', 1500);
      return;
    }

    /* C — записать звонок */
    if (e.key === 'c') {
      e.preventDefault();
      openCallModal();
      toast('Новый звонок', 'info', 1500);
      return;
    }

    /* M — новая встреча */
    if (e.key === 'm') {
      e.preventDefault();
      openMeetingModal();
      toast('Новая встреча', 'info', 1500);
      return;
    }

    /* D — Dark/Light toggle */
    if (e.key === 'd') {
      e.preventDefault();
      toggleDarkLight();
      return;
    }

    /* W — Итоги недели */
    if (e.key === 'w') {
      e.preventDefault();
      openReview();
      return;
    }

    /* ? — Тур */
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      tourStart();
      return;
    }

    /* / — Палитра команд (альтернатива ⌘K) */
    if (e.key === '/' && !e.shiftKey) {
      e.preventDefault();
      cmdOpen();
      return;
    }

    /* 1-3 — навигация к блокам */
    if (e.key === '1') { scrollToWidget('.tasks-block'); return; }
    if (e.key === '2') { scrollToWidget('.projects-block'); return; }
    if (e.key === '3') { scrollToWidget('.calls-block'); return; }

    /* T — наверх */
    if (e.key === 't') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    /* F — Focus Mode */
    if (e.key === 'f') {
      e.preventDefault();
      toggleFocusMode();
      return;
    }
  }

  /* ── CMD PALETTE NAVIGATION (когда палитра открыта) ── */
  if (!isOpen) return;

  /* Escape — закрыть */
  if (e.key === 'Escape') {
    e.preventDefault();
    cmdClose();
    return;
  }

  /* Стрелки — навигация */
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdIdx = (cmdIdx + 1) % cmdFiltered.length;
    cmdRender(document.getElementById('cmd-search').value);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdIdx = (cmdIdx - 1 + cmdFiltered.length) % cmdFiltered.length;
    cmdRender(document.getElementById('cmd-search').value);
    return;
  }

  /* Enter — выполнить */
  if (e.key === 'Enter') {
    e.preventDefault();
    cmdExec(cmdIdx);
    return;
  }
});

/* Search input handler */
document.addEventListener('DOMContentLoaded', function() {
  let inp = document.getElementById('cmd-search');
  if (inp) {
    inp.addEventListener('input', function() {
      cmdIdx = 0;
      cmdRender(this.value);
    });
  }
});


/* ══════════════════════════════════════════
   SHORTCUTS HELP — показывается в Cmd+K footer
══════════════════════════════════════════ */
