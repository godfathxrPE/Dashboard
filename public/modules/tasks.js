/* ═══════════════════════════════════════════
   MODULES/TASKS.JS
   Kanban-задачи: рендер, CRUD, drag-drop, контекстное меню.
   Phase 2.3: вынесен из inline <script> в index.html.
   Зависимости (глобальные): tasks, LS, esc, animateValue,
   checkCelebration, logActivity, updateStreak, toast, toastUndo,
   checkWipLimit, updateSmartAlerts, uid, fmtDate.
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   ЗАДАЧИ
═══════════════════════════════════════════ */
let draggingId = null;
let ctxTaskId  = null;
/* Трекер: ID задачи которая только что переместилась.
   renderTasks() подсветит её highlight-пульсом. */
let _lastMovedTaskId = null;

function renderTasks() {
  const lanes = ['now','next','wait','done'];
  lanes.forEach(l => {
    const el = document.getElementById('tasks-'+l);
    const lt = tasks.filter(t => t.lane === l);
    el.innerHTML = lt.length ? lt.map(t => taskHTML(t)).join('') : '';
    animateValue(document.getElementById('cnt-'+l), lt.length, 250);
  });
  const active = tasks.filter(t => t.lane !== 'done').length;
  animateValue(document.getElementById('tasks-count'), active, 300);
  // bind drag
  document.querySelectorAll('.task-card-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      draggingId = el.dataset.id;
      setTimeout(() => el.style.opacity = '0.4', 0);
    });
    el.addEventListener('dragend', () => el.style.opacity = '1');
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      ctxTaskId = el.dataset.id;
      showCtx(e);
    });
  });
  /* WIP Limit check + Smart Alerts refresh */
  checkWipLimit();
  updateSmartAlerts();

  /* Highlight перемещённой задачи — accent glow pulse */
  if (_lastMovedTaskId) {
    let movedEl = document.querySelector('.task-card-item[data-id="' + _lastMovedTaskId + '"]');
    if (movedEl) movedEl.classList.add('task-just-moved');
    _lastMovedTaskId = null;
  }
}

function taskHTML(t) {
  const done = t.lane === 'done';
  const prioClass = t.priority ? ' priority-' + t.priority : '';
  const timeBadge = t.time ? '<span class="task-time-badge">' + esc(t.time) + '</span>' : '';
  const projName = esc(t.project || '');
  const dateStr = t.deadline ? `<div class="task-meta">${timeBadge}${fmtDate(t.deadline)}${projName ? ' · ' + projName : ''}</div>` :
                  (t.time || projName)  ? `<div class="task-meta">${timeBadge}${projName}</div>` : '';
  let doneInfo = '';
  if (done && t.doneAt) {
    const days = Math.floor((Date.now() - t.doneAt) / 86400000);
    const label = days === 0 ? 'сегодня' : days === 1 ? '1 день назад' : `${days} дн. назад`;
    doneInfo = `<div class="task-meta" style="color:var(--text-mute)">${label}</div>`;
  }
  const deleteBtn = done
    ? `<button class="btn btn-ghost btn-icon" data-action="delete-task" data-id="${t.id}" data-stop title="Удалить"><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'/></svg></button>`
    : '';
  return `
    <div class="task-card-item task-item ${done?'is-done':''}${prioClass}" data-id="${t.id}" draggable="true"
         data-action="toggle-task">
      <div class="task-check">${done?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div class="task-text">${esc(t.text)}</div>
        ${dateStr}${doneInfo}
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-icon" data-action="open-task-modal" data-id="${t.id}" data-stop title="Редактировать"><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'/></svg></button>
        ${deleteBtn}
      </div>
    </div>`;
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if(!t) return;
  let wasDone = (t.lane === 'done');
  if (t.lane === 'done') { t.lane = 'now'; delete t.doneAt; } else { t.lane = 'done'; t.doneAt = Date.now(); }
  t._updatedAt = Date.now();
  LS.set('wdb_tasks', tasks);
  _lastMovedTaskId = id;
  renderTasks();
  /* Celebration при завершении задачи */
  if (!wasDone && t.lane === 'done') {
    checkCelebration('task-done');
    logActivity('target', 'Выполнил задачу: ' + t.text);
    updateStreak();
    /* Проверяем: все задачи "Сейчас" выполнены? */
    let nowTasks = tasks.filter(function(x) { return x.lane === 'now'; });
    if (nowTasks.length === 0 && tasks.filter(function(x) { return x.lane === 'done'; }).length > 0) {
      setTimeout(function() { checkCelebration('all-tasks-done'); }, 600);
    }
  }
}

// Удалить задачу вручную — с exit-анимацией
function deleteTask(id) {
  let el = document.querySelector('.task-card-item[data-id="' + id + '"]');
  if (el) {
    el.classList.add('task-exiting');
    setTimeout(function() {
      tasks = tasks.filter(t => t.id !== id);
      LS.set('wdb_tasks', tasks);
      renderTasks();
    }, 250); /* Длительность совпадает с task-exit animation */
  } else {
    tasks = tasks.filter(t => t.id !== id);
    LS.set('wdb_tasks', tasks);
    renderTasks();
  }
}

// Автоудаление выполненных задач старше 10 дней
function cleanOldDoneTasks() {
  const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
  const before = tasks.length;
  tasks = tasks.filter(t => {
    if (t.lane !== 'done') return true;       // не выполненные — не трогаем
    if (!t.doneAt) return true;               // нет даты — оставляем (старые задачи)
    return (Date.now() - t.doneAt) < TEN_DAYS; // моложе 10 дней — оставляем
  });
  if (tasks.length !== before) {
    LS.set('wdb_tasks', tasks); // сохраняем только если что-то удалили
  }
}

function quickAdd(lane, input) {
  const text = input.value.trim();
  if(!text) return;
  let newId = uid();
  tasks.push({ id: newId, text, lane, project:'', deadline:'', _updatedAt: Date.now() });
  LS.set('wdb_tasks', tasks);
  input.value = '';
  _lastMovedTaskId = newId;
  renderTasks();
}

function selectPriority(val) {
  document.getElementById('task-priority-in').value = val;
  document.querySelectorAll('#task-priority-sel .priority-opt').forEach(function(btn) {
    btn.className = 'priority-opt';
  });
  let btns = document.querySelectorAll('#task-priority-sel .priority-opt');
  if (val === 'important') btns[1].classList.add('active-important');
  else if (val === 'critical') btns[2].classList.add('active-critical');
  else btns[0].classList.add('active-none');
}

function populateProjectDropdown() {
  let sel = document.getElementById('task-proj-in');
  if (!sel) return;
  let html = '<option value="">— без проекта —</option>';
  (LS.get('wdb_projects', [])).forEach(function(p) {
    if (p.stage === 'lost') return;
    html += '<option value="' + p.id + '">' + esc(p.name) + '</option>';
  });
  sel.innerHTML = html;
}

function openTaskModal(id) {
  const t = id ? tasks.find(x => x.id === id) : null;
  populateProjectDropdown();
  document.getElementById('task-modal-title').textContent = t ? 'Редактировать задачу' : 'Новая задача';
  document.getElementById('task-edit-id').value  = t?.id || '';
  document.getElementById('task-text-in').value  = t?.text || '';
  document.getElementById('task-lane-in').value  = t?.lane || 'now';
  document.getElementById('task-proj-in').value  = t?.projectId || t?.project || '';
  document.getElementById('task-date-in').value  = t?.deadline || '';
  document.getElementById('task-time-in').value  = t?.time || '';
  document.getElementById('task-remind-in').value = t?.remind || '';
  selectPriority(t?.priority || '');
  document.getElementById('task-modal').classList.add('open');
  setTimeout(() => document.getElementById('task-text-in').focus(), 80);
}

function saveTask() {
  const id    = document.getElementById('task-edit-id').value;
  const text  = document.getElementById('task-text-in').value.trim();
  const lane  = document.getElementById('task-lane-in').value;
  const projId = document.getElementById('task-proj-in').value;
  const date  = document.getElementById('task-date-in').value;
  const time  = document.getElementById('task-time-in').value;
  const priority = document.getElementById('task-priority-in').value;
  const remind = document.getElementById('task-remind-in').value;
  /* Resolve project name for display */
  const projObj = projId ? (LS.get('wdb_projects', [])).find(function(p) { return p.id === projId; }) : null;
  const projName = projObj ? projObj.name : '';
  if(!text) return;
  let taskId = id;
  if(id) {
    const t = tasks.find(t => t.id === id);
    if(t) Object.assign(t, {text, lane, projectId: projId, project: projName, deadline: date, time: time, priority: priority, remind: remind, _updatedAt: Date.now()});
  } else {
    taskId = uid();
    tasks.push({ id: taskId, text, lane, projectId: projId, project: projName, deadline: date, time: time, priority: priority, remind: remind, _updatedAt: Date.now() });
  }
  LS.set('wdb_tasks', tasks);
  closeModal('task-modal');
  _lastMovedTaskId = taskId;
  renderTasks();
  toast(id ? 'Задача обновлена' : 'Задача создана', 'success');
  logActivity('clipboard', (id ? 'Обновил' : 'Создал') + ' задачу: ' + text);
}

/* drag-drop */
function onDragOver(e)  { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function onDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function onDrop(e, lane) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(!draggingId) return;
  const t = tasks.find(t => t.id === draggingId);
  if(t) { t.lane = lane; t._updatedAt = Date.now(); LS.set('wdb_tasks', tasks); _lastMovedTaskId = t.id; renderTasks(); }
  draggingId = null;
}

/* ctx task actions */
function ctxMoveTo(lane) {
  if(!ctxTaskId) return;
  const t = tasks.find(x => x.id === ctxTaskId);
  if(t) { t.lane = lane; t._updatedAt = Date.now(); LS.set('wdb_tasks', tasks); _lastMovedTaskId = t.id; renderTasks(); }
  closeCtx();
}
function ctxEdit() {
  if(ctxTaskId) openTaskModal(ctxTaskId);
  closeCtx();
}
function ctxDelete() {
  if(!ctxTaskId) return;
  let deleted = tasks.find(t => t.id === ctxTaskId);
  if (!deleted) return;
  let idx = tasks.indexOf(deleted);
  let delId = ctxTaskId;
  tasks = tasks.filter(t => t.id !== delId);
  LS.set('wdb_tasks', tasks);
  renderTasks();
  closeCtx();
  toastUndo('Задача удалена', function() {
    tasks.splice(idx, 0, deleted);
    LS.set('wdb_tasks', tasks);
    renderTasks();
  });
}

/* ── Контекстное меню задачи ── */
function showCtx(e) {
  var menu = document.getElementById('ctx-menu');
  menu.style.left = Math.min(e.clientX, window.innerWidth - 170) + 'px';
  menu.style.top  = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  menu.classList.add('open');
}
function closeCtx() { document.getElementById('ctx-menu').classList.remove('open'); }
