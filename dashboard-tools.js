/* ══════════════════════════════════════════
   WIDGET REORDER
   Паттерн: Drag Reorder (iOS, Notion Sidebar).
   Виджеты в правой колонке перетаскиваются.
   Порядок сохраняется в localStorage.
══════════════════════════════════════════ */
let WR_KEY = 'wdb_widget_order';

function wrInit() {
  let col = document.querySelector('.right-col');
  if (!col) return;

  /* Загружаем сохранённый порядок */
  let order = LS.get(WR_KEY, null);
  if (order && Array.isArray(order)) {
    order.forEach(function(id) {
      let el = col.querySelector('[data-widget-id="' + id + '"]');
      if (el) col.appendChild(el);
    });
  }

  /* Добавляем draggable ко всем виджетам */
  col.querySelectorAll('[data-widget-id]').forEach(function(el) {
    el.setAttribute('draggable', 'true');
  });

  /* ── Gap Drop Zones — зоны-приёмники между виджетами ──
     Паттерн: Notion/Linear block reorder.
     При dragstart: создаём div.widget-drop-zone между каждой парой виджетов.
     При dragover на зону: зона расширяется (visual feedback).
     При drop на зону: вставляем виджет перед следующим элементом.
     При dragend: удаляем все зоны. */

  function createDropZones() {
    removeDropZones();
    var widgets = col.querySelectorAll('[data-widget-id]');
    widgets.forEach(function(w, i) {
      var zone = document.createElement('div');
      zone.className = 'widget-drop-zone';
      zone.setAttribute('data-insert-before', w.getAttribute('data-widget-id'));
      col.insertBefore(zone, w);
    });
    /* Последняя зона — после последнего виджета */
    var lastZone = document.createElement('div');
    lastZone.className = 'widget-drop-zone';
    lastZone.setAttribute('data-insert-end', 'true');
    col.appendChild(lastZone);
  }

  function removeDropZones() {
    col.querySelectorAll('.widget-drop-zone').forEach(function(z) { z.remove(); });
  }

  col.addEventListener('dragstart', function(e) {
    var el = e.target.closest('[data-widget-id]');
    if (!el) return;
    e.dataTransfer.setData('text/plain', el.getAttribute('data-widget-id'));
    e.dataTransfer.effectAllowed = 'move';
    /* Задержка чтобы элемент успел "схватиться" до добавления зон */
    setTimeout(function() {
      el.classList.add('widget-dragging');
      createDropZones();
    }, 0);
    playSound('click');
  });

  col.addEventListener('dragend', function(e) {
    col.querySelectorAll('.widget-dragging').forEach(function(el) {
      el.classList.remove('widget-dragging');
    });
    removeDropZones();
  });

  col.addEventListener('dragover', function(e) {
    var zone = e.target.closest('.widget-drop-zone');
    if (!zone) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    /* Подсвечиваем только текущую зону */
    col.querySelectorAll('.widget-drop-zone.active').forEach(function(z) {
      if (z !== zone) z.classList.remove('active');
    });
    zone.classList.add('active');
  });

  col.addEventListener('dragleave', function(e) {
    var zone = e.target.closest('.widget-drop-zone');
    if (zone && !zone.contains(e.relatedTarget)) {
      zone.classList.remove('active');
    }
  });

  col.addEventListener('drop', function(e) {
    var zone = e.target.closest('.widget-drop-zone');
    if (!zone) return;
    e.preventDefault();
    var draggedId = e.dataTransfer.getData('text/plain');
    var draggedEl = col.querySelector('[data-widget-id="' + draggedId + '"]');
    if (!draggedEl) return;

    if (zone.hasAttribute('data-insert-end')) {
      /* Вставка в конец */
      col.appendChild(draggedEl);
    } else {
      /* Вставка перед целевым виджетом */
      var targetId = zone.getAttribute('data-insert-before');
      var targetEl = col.querySelector('[data-widget-id="' + targetId + '"]');
      if (targetEl && targetEl !== draggedEl) {
        col.insertBefore(draggedEl, targetEl);
      }
    }
    removeDropZones();
    draggedEl.classList.remove('widget-dragging');
    wrSaveOrder(col);
    playSound('tick');
  });
}

function wrSaveOrder(col) {
  let order = [];
  col.querySelectorAll('[data-widget-id]').forEach(function(el) {
    order.push(el.getAttribute('data-widget-id'));
  });
  try { localStorage.setItem(WR_KEY, JSON.stringify(order)); } catch(e) {}
}

/* Инициализация при загрузке */
document.addEventListener('DOMContentLoaded', wrInit);


/* ══════════════════════════════════════════
   DEADLINE NOTIFICATIONS
   Паттерн: Time-based Alerts (Google Calendar, Todoist).
   Проверяет задачи каждые 60 сек. Если задача имеет
   deadline + time + remind — показывает toast-уведомление.
══════════════════════════════════════════ */
let _notifiedTasks = {}; /* Чтобы не спамить */

function checkDeadlineNotifications() {
  let now = new Date();
  let nowMs = now.getTime();
  let today = now.toISOString().split('T')[0];

  (LS.get('wdb_tasks', [])).forEach(function(t) {
    if (!t.deadline || !t.time || !t.remind || t.lane === 'done') return;
    if (_notifiedTasks[t.id]) return;

    /* Собираем дату-время дедлайна */
    let deadlineMs = new Date(t.deadline + 'T' + t.time + ':00').getTime();
    let remindMs = parseInt(t.remind) * 60 * 1000;
    let alertMs = deadlineMs - remindMs;

    /* Если сейчас в окне [alertMs, deadlineMs] — уведомляем */
    if (nowMs >= alertMs && nowMs <= deadlineMs) {
      _notifiedTasks[t.id] = true;
      let minsLeft = Math.round((deadlineMs - nowMs) / 60000);
      let label = minsLeft <= 0 ? 'Дедлайн сейчас!' : 'Через ' + minsLeft + ' мин';

      toast(label + ': ' + t.text, 'warning', 8000);

      /* Браузерное уведомление */
      try {
        if (Notification.permission === 'granted') {
          new Notification('Дедлайн: ' + t.text, {
            body: label + (t.project ? ' · ' + t.project : ''),
            icon: './icon-192.png'
          });
        }
      } catch(e) {}
    }
  });
}

/* Запускаем проверку каждые 60 секунд */
setInterval(checkDeadlineNotifications, 60000);
/* И сразу при загрузке */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(checkDeadlineNotifications, 3000);
});


/* ══════════════════════════════════════════
   SMART ALERTS
   Паттерн: Proactive Notifications (Linear, Notion).
   Анализирует данные и показывает pill-badges
   под greeting с actionable подсказками.
══════════════════════════════════════════ */
function updateSmartAlerts() {
  let el = document.getElementById('smart-alerts');
  if (!el) return;
  let alerts = [];
  let today = new Date();
  today.setHours(0,0,0,0);

  /* 1. Просроченные задачи */
  let overdueTasks = (LS.get('wdb_tasks', [])).filter(function(t) {
    if (!t.deadline || t.lane === 'done') return false;
    return new Date(t.deadline + 'T00:00:00') < today;
  });
  if (overdueTasks.length > 0) {
    alerts.push({ cls: 'danger', text: overdueTasks.length + ' просроч. задач', action: function() { scrollToWidget('.tasks-block'); } });
  }

  /* 2. Проекты без обновлений > 5 дней */
  (LS.get('wdb_projects', [])).forEach(function(p) {
    if (p.stage === 'lost') return;
    if (!p.lastContactDate) {
      alerts.push({ cls: 'warn', text: p.name + ': нет контакта', action: function() { scrollToWidget('.projects-block'); toggleProject(p.id); } });
      return;
    }
    let daysSince = Math.floor((Date.now() - new Date(p.lastContactDate).getTime()) / 86400000);
    if (daysSince >= 5) {
      alerts.push({ cls: 'warn', text: p.name + ': ' + daysSince + ' дн без контакта', action: function() { scrollToWidget('.projects-block'); toggleProject(p.id); } });
    }
  });

  /* 3. Звонки: 0 за сегодня при плане > 0 */
  let d = new Date();
  let ctKey = 'wdb_call_tracker_' + d.getFullYear() + '_' + d.getMonth() + '_' + d.getDate();
  let ct = LS.get(ctKey, null);
  let todayCalls = ct ? (ct.done || 0) : 0;
  let todayPlan = ct ? (ct.plan || 40) : 40;
  if (todayCalls === 0 && d.getHours() >= 10) {
    alerts.push({ cls: 'info', text: '0 звонков — план ' + todayPlan, action: function() { scrollToWidget('[data-widget-id="call-tracker"]'); } });
  }

  /* 4. WIP лимит превышен */
  let nowCount = (LS.get('wdb_tasks', [])).filter(function(t) { return t.lane === 'now'; }).length;
  let WIP_LIMIT = 7;
  if (nowCount > WIP_LIMIT) {
    alerts.push({ cls: 'warn', text: 'WIP: ' + nowCount + '/' + WIP_LIMIT + ' задач', action: function() { scrollToWidget('.tasks-block'); } });
  }

  /* Максимум 4 alerts чтобы не перегружать */
  el.innerHTML = alerts.slice(0, 4).map(function(a, i) {
    return '<span class="smart-alert ' + a.cls + '" data-action="smart-alert" data-idx="' + i + '">' + esc(a.text) + '</span>';
  }).join('');

  /* Сохраняем actions для onclick */
  window._smartAlertActions = alerts.slice(0, 4).map(function(a) { return a.action; });
}

function smartAlertAction(idx) {
  if (window._smartAlertActions && window._smartAlertActions[idx]) {
    window._smartAlertActions[idx]();
  }
}

/* Обновляем alerts при загрузке и каждые 5 минут */
document.addEventListener('DOMContentLoaded', function() { setTimeout(updateSmartAlerts, 2000); });
setInterval(updateSmartAlerts, 300000);


/* ══════════════════════════════════════════
   WIP LIMITS
   Паттерн: Kanban WIP Limit (Jira, Linear).
   Максимум задач в "Сейчас". При превышении —
   header краснеет, badge пульсирует.
══════════════════════════════════════════ */
let WIP_LIMIT = 7;

function checkWipLimit() {
  let header = document.getElementById('lane-header-now');
  let label = document.getElementById('wip-label');
  if (!header) return;
  let nowCount = tasks.filter(function(t) { return t.lane === 'now'; }).length;
  let isOver = nowCount > WIP_LIMIT;
  header.classList.toggle('wip-over', isOver);
  if (label) label.textContent = isOver ? '(лимит ' + WIP_LIMIT + ')' : '';
}

/* Хукаем в renderTasks — вызывается после каждого render */
let _origRenderTasks = typeof renderTasks === 'function' ? renderTasks : null;


/* ══════════════════════════════════════════
   DASHBOARD VIEWS
   Паттерн: View Switcher (Notion Board/List/Calendar).
   3 режима отображения: Default, Sales, Analytics.
══════════════════════════════════════════ */
function setView(mode) {
  document.body.classList.remove('view-sales', 'view-analytics');
  if (mode !== 'default') document.body.classList.add('view-' + mode);
  /* Обновляем кнопки */
  document.querySelectorAll('.view-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-view') === mode);
  });
  localStorage.setItem('wdb_view_mode', mode);
  playSound('click');
  /* Рендерим графики при входе в Analytics */
  if (mode === 'analytics') renderAnalyticsCharts();
}
/* Восстанавливаем при загрузке */
document.addEventListener('DOMContentLoaded', function() {
  let saved = localStorage.getItem('wdb_view_mode');
  if (saved && saved !== 'default') setView(saved);
});

