
/* ─────────────────────────────────────────────
   SCROLL PROGRESS BAR
   Паттерн: Reading Indicator — Medium, Linear, Notion.
   passive:true — не блокирует прокрутку на мобиле.
──────────────────────────────────────────────*/
(function() {
  let bar = document.getElementById('scroll-progress');
  if (!bar) return;

  function updateBar() {
    let doc = document.documentElement;
    let scrollable = doc.scrollHeight - doc.clientHeight;
    if (scrollable <= 0) { bar.style.width = '0%'; return; }
    bar.style.width = ((window.scrollY / scrollable) * 100) + '%';
  }

  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar(); // инициализация на случай если страница открылась не с top
})();

/* ─────────────────────────────────────────────
   B: STAGGERED MOUNT REVEAL
   Карточки появляются при каждой загрузке.
   Двойной rAF: гарантирует что браузер видит
   opacity:0 до того как добавить reveal-done.
──────────────────────────────────────────────*/
function runStaggerReveal() {
  let els = document.querySelectorAll('.will-reveal');
  els.forEach(function(el, i) {
    let delay = 80 + i * 90;
    el.style.transition =
      'opacity 0.5s ease ' + delay + 'ms, ' +
      'transform 0.5s cubic-bezier(.22,.68,0,1.15) ' + delay + 'ms, ' +
      'filter 0.6s ease ' + delay + 'ms';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.classList.add('reveal-done');
      });
    });
  });
}
window.addEventListener('load', function() { setTimeout(runStaggerReveal, 50); });

/* ─────────────────────────────────────────────
   C: MICRO — ЧЕКБОКС BOUNCE
   Bounce проигрывается ДО rerenderа DOM,
   поэтому оригинальный toggleTask вызываем
   с задержкой 160ms.
──────────────────────────────────────────────*/
let _origToggleTask = toggleTask;
window.toggleTask = function(id) {
  let el = document.querySelector('.task-card-item[data-id="' + id + '"] .task-check');
  if (el) {
    el.classList.remove('bouncing');
    void el.offsetWidth; // форс-рефлоу для перезапуска анимации
    el.classList.add('bouncing');
    setTimeout(function() {
      _origToggleTask(id);
    }, 160);
  } else {
    _origToggleTask(id);
  }
};

/* ─────────────────────────────────────────────
   C: MICRO — SLIDE-IN НОВОЙ ЗАДАЧИ
   Помечаем уже анимированные элементы через
   data-animated, чтобы не анимировать повторно.
──────────────────────────────────────────────*/
function animateNewTasks() {
  requestAnimationFrame(function() {
    let items = document.querySelectorAll('.task-card-item');
    items.forEach(function(item) {
      if (!item.dataset.animated) {
        item.dataset.animated = '1';
        item.classList.add('task-new-anim');
        setTimeout(function() { item.classList.remove('task-new-anim'); }, 400);
      }
    });
  });
}

let _origQuickAdd = quickAdd;
window.quickAdd = function(lane, input) {
  _origQuickAdd(lane, input);
  animateNewTasks();
};

let _origSaveTask = saveTask;
window.saveTask = function() {
  let isNew = !document.getElementById('task-edit-id').value;
  _origSaveTask();
  if (isNew) animateNewTasks();
};

/* ─────────────────────────────────────────────
   C: MICRO — FADE+COLLAPSE ПРИ УДАЛЕНИИ
   max-height:60px → 0 — стандартный паттерн,
   потому что height:auto нельзя анимировать в CSS.
──────────────────────────────────────────────*/
let _origDeleteTask = deleteTask;
window.deleteTask = function(id) {
  let el = document.querySelector('.task-card-item[data-id="' + id + '"]');
  if (el) {
    el.classList.add('task-removing');
    setTimeout(function() {
      /* Удаляем напрямую, минуя оригинал с его вторичной анимацией */
      tasks = tasks.filter(function(t) { return t.id !== id; });
      LS.set('wdb_tasks', tasks);
      renderTasks();
    }, 280);
  } else {
    _origDeleteTask(id);
  }
};

let _origCtxDelete = ctxDelete;
window.ctxDelete = function() {
  if (!ctxTaskId) return;
  let id = ctxTaskId;
  let deleted = tasks.find(function(t) { return t.id === id; });
  if (!deleted) return;
  let idx = tasks.indexOf(deleted);
  let el = document.querySelector('.task-card-item[data-id="' + id + '"]');
  closeCtx();

  function doDelete() {
    tasks = tasks.filter(function(t) { return t.id !== id; });
    LS.set('wdb_tasks', tasks);
    renderTasks();
    toastUndo('Задача удалена', function() {
      tasks.splice(idx, 0, deleted);
      LS.set('wdb_tasks', tasks);
      renderTasks();
    });
  }

  if (el) {
    el.classList.add('task-removing');
    setTimeout(doDelete, 280);
  } else {
    doDelete();
  }
};

