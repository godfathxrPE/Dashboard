/* ═══════════════════════════════════════════
   LIB/STORAGE.JS
   Фундамент данных: localStorage helper, валидация,
   error boundary для рендер-функций.

   Phase 2.3: вынесен из inline <script> в index.html.
   Загружается как обычный <script src> — до всех
   inline-скриптов. Все функции глобальные (window).
   При полной миграции на ES modules — добавим export.
═══════════════════════════════════════════ */

/* ── HTML escape ── */
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── localStorage wrapper ── */
var LS = {
  get: function(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) ?? def; }
    catch(e) { return def; }
  },
  set: function(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  }
};

/* ── Error Boundary для vanilla JS ── */
function safeRender(renderFn, containerSelector, label) {
  try {
    renderFn();
  } catch (err) {
    console.error('[SafeRender] ' + label + ':', err);
    var el = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (el) {
      el.innerHTML =
        '<div style="padding:16px;text-align:center;color:var(--red);font-size:var(--text-sm);">' +
        '⚠️ Ошибка отображения: ' + esc(label) + '<br>' +
        '<span style="color:var(--text-mute);font-size:var(--text-xs);">' +
        esc(err.message) + '</span><br>' +
        '<button onclick="location.reload()" style="margin-top:8px;padding:4px 12px;' +
        'border:1px solid var(--border);border-radius:var(--radius-s);background:var(--surface);' +
        'color:var(--text);cursor:pointer;font-family:inherit;font-size:var(--text-xs);">' +
        'Перезагрузить</button></div>';
    }
    if (typeof toast === 'function') {
      toast('Ошибка в блоке: ' + label, 'error');
    }
  }
}

/* ── Data Validators ── */
var Validators = {
  task: function(t) {
    return t && typeof t === 'object'
      && typeof t.id === 'string' && t.id.length > 0
      && typeof t.text === 'string' && t.text.length > 0
      && ['now', 'next', 'wait', 'done'].includes(t.lane || 'now');
  },
  project: function(p) {
    return p && typeof p === 'object'
      && typeof p.id === 'string' && p.id.length > 0
      && typeof p.name === 'string' && p.name.length > 0;
  },
  call: function(c) {
    return c && typeof c === 'object'
      && typeof c.id === 'string' && c.id.length > 0
      && typeof c.company === 'string';
  },
  meeting: function(m) {
    return m && typeof m === 'object'
      && typeof m.id === 'string' && m.id.length > 0;
  }
};

/* ── Безопасная загрузка массива с валидацией ── */
function loadValidated(key, validator, fallback) {
  var raw = LS.get(key, fallback);
  if (!Array.isArray(raw)) {
    console.warn('[Validator] ' + key + ' is not an array, using fallback');
    return fallback;
  }
  var valid = raw.filter(function(item, i) {
    var ok = validator(item);
    if (!ok) console.warn('[Validator] ' + key + '[' + i + '] invalid, skipping:', item);
    return ok;
  });
  if (valid.length !== raw.length) {
    console.warn('[Validator] ' + key + ': removed ' + (raw.length - valid.length) + ' invalid items');
    LS.set(key, valid);
  }
  return valid;
}
