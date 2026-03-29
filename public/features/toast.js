/* ══════════════════════════════════════════
   NOTIFICATION TOAST SYSTEM
   Module: features/toast.js
   Паттерн: Toast Stack (Sonner-style).
   Dependencies: none (self-contained)
══════════════════════════════════════════ */

function toast(message, type, duration) {
  /* type: 'success' | 'error' | 'warning' | 'info' (default) */
  type = type || 'info';
  duration = duration || 4000;

  var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  var container = document.getElementById('toast-container');
  if (!container) return;

  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.style.setProperty('--toast-duration', duration + 'ms');
  el.innerHTML =
    '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span>' +
    '<div class="toast-body">' +
      '<div class="toast-msg">' + message + '</div>' +
    '</div>' +
    '<button class="toast-close" data-action="dismiss-toast">✕</button>' +
    '<div class="toast-progress"></div>';

  container.appendChild(el);

  var timer = setTimeout(function() { dismissToast(el); }, duration);
  el._timer = timer;

  var toasts = container.querySelectorAll('.toast:not(.leaving)');
  if (toasts.length > 4) dismissToast(toasts[0]);
}

function dismissToast(el) {
  if (!el || el.classList.contains('leaving')) return;
  clearTimeout(el._timer);
  el.classList.add('leaving');
  el.addEventListener('animationend', function() { el.remove(); });
}

function toastConfirm(message, onConfirm) {
  var container = document.getElementById('toast-container');
  if (!container) { if (confirm(message)) onConfirm(); return; }

  var el = document.createElement('div');
  el.className = 'toast warning';
  el.style.setProperty('--toast-duration', '10s');
  el.innerHTML =
    '<span class="toast-icon">⚠</span>' +
    '<div class="toast-body">' +
      '<div class="toast-msg">' + message + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:8px;">' +
        '<button class="btn btn-primary tc-confirm-yes" style="font-size:var(--text-sm);padding:4px 12px;">Да</button>' +
        '<button class="btn tc-confirm-no" style="font-size:var(--text-sm);padding:4px 12px;">Отмена</button>' +
      '</div>' +
    '</div>' +
    '<div class="toast-progress"></div>';

  container.appendChild(el);

  el.querySelector('.tc-confirm-yes').onclick = function() { dismissToast(el); onConfirm(); };
  el.querySelector('.tc-confirm-no').onclick  = function() { dismissToast(el); };

  var timer = setTimeout(function() { dismissToast(el); }, 10000);
  el._timer = timer;
}

function toastUndo(message, onUndo, duration) {
  duration = duration || 6000;
  var container = document.getElementById('toast-container');
  if (!container) return;

  var el = document.createElement('div');
  el.className = 'toast success';
  el.style.setProperty('--toast-duration', duration + 'ms');
  el.innerHTML =
    '<span class="toast-icon">✓</span>' +
    '<div class="toast-body">' +
      '<div class="toast-msg">' + message + '</div>' +
    '</div>' +
    '<button class="btn" style="font-size:var(--text-sm);padding:3px 10px;margin-left:4px;white-space:nowrap;flex-shrink:0;" data-stop>Отменить</button>' +
    '<div class="toast-progress"></div>';

  container.appendChild(el);

  var undoBtn = el.querySelector('.btn');
  undoBtn.onclick = function(e) {
    e.stopPropagation();
    dismissToast(el);
    if (onUndo) onUndo();
    toast('Действие отменено', 'info', 2000);
  };

  var timer = setTimeout(function() { dismissToast(el); }, duration);
  el._timer = timer;
}
