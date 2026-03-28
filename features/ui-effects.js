/* ══════════════════════════════════════════
   UI EFFECTS
   Module: features/ui-effects.js
   Contains: animateValue, EMOJI_MAP, EMPTY_ILLUST,
   emptyState, replaceEmoji, showSkeletons, hideSkeletons
   Dependencies: ICON (from lib/utils.js), esc
══════════════════════════════════════════ */

/* ── ANIMATED COUNTERS ──
   Паттерн: CountUp Animation (Stripe Dashboard, Linear).
   easeOutQuart: быстро стартует, плавно тормозит. */
function animateValue(el, to, duration) {
  if (!el) return;
  var from = parseInt(el.textContent) || 0;
  if (from === to) return;
  duration = duration || 400;
  var start = null;
  var diff = to - from;

  el.classList.remove('counter-pop');

  function step(ts) {
    if (!start) start = ts;
    var progress = Math.min((ts - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.round(from + diff * eased);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      void el.offsetWidth;
      el.classList.add('counter-pop');
    }
  }
  requestAnimationFrame(step);
}


/* ── EMOJI → SVG POST-PROCESSOR ── */
var EMOJI_MAP = {
  '📅': ICON.calendar,
  '🎯': ICON.target,
  '📊': ICON.chart,
  '⏱':  ICON.timer,
  '📞': ICON.phone,
  '📋': ICON.clipboard,
  '🔻': ICON.funnel,
  '🗓':  ICON.grid,
  '🔴': ICON.alert,
  '📈': ICON.trending,
  '🤝': ICON.users,
  '💬': ICON.message,
  '📝': ICON.fileText,
  '⚡': ICON.zap,
  '🔧': ICON.settings,
  '📁': ICON.folder,
  '➕': ICON.plus,
};


/* ── CONTEXT-AWARE EMPTY STATES ──
   Паттерн: Scene Illustrations (Notion, Linear, Raycast). */
var EMPTY_ILLUST = {
  folder: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="14" width="28" height="22" rx="3" opacity="0.3"/><rect x="11" y="10" width="28" height="22" rx="3" opacity="0.5"/><rect x="14" y="6" width="28" height="22" rx="3"/><line x1="28" y1="13" x2="28" y2="21"/><line x1="24" y1="17" x2="32" y2="17"/></svg>',
  users: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="24" height="24" rx="3"/><line x1="8" y1="18" x2="32" y2="18"/><line x1="16" y1="6" x2="16" y2="14"/><line x1="24" y1="6" x2="24" y2="14"/><circle cx="36" cy="24" r="4"/><path d="M30 36c0-3.3 2.7-6 6-6s6 2.7 6 6"/><line x1="14" y1="24" x2="18" y2="24" opacity="0.4"/><line x1="22" y1="24" x2="26" y2="24" opacity="0.4"/><line x1="14" y1="28" x2="18" y2="28" opacity="0.4"/></svg>',
  phone: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 20c0-2 1-4 3-5.5s4.5-2 7-2c2.5 0 5 .5 7 2s3 3.5 3 5.5"/><path d="M11 14.5a15.4 15.4 0 0113-6c5 0 9.5 2.2 13 6" opacity="0.4"/><rect x="12" y="24" width="8" height="14" rx="4"/><rect x="28" y="24" width="8" height="14" rx="4"/><path d="M12 31h-1a3 3 0 01-3-3v-4a3 3 0 013-3h1" opacity="0.5"/><path d="M36 31h1a3 3 0 003-3v-4a3 3 0 00-3-3h-1" opacity="0.5"/></svg>',
  target: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16" opacity="0.25"/><circle cx="24" cy="24" r="10" opacity="0.5"/><circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="1.5" fill="currentColor" stroke="none"/><line x1="24" y1="4" x2="24" y2="8" opacity="0.3"/><line x1="24" y1="40" x2="24" y2="44" opacity="0.3"/><line x1="4" y1="24" x2="8" y2="24" opacity="0.3"/><line x1="40" y1="24" x2="44" y2="24" opacity="0.3"/></svg>',
  trending: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="38" x2="42" y2="38" opacity="0.3"/><rect x="8" y="30" width="6" height="8" rx="1" opacity="0.3"/><rect x="17" y="24" width="6" height="14" rx="1" opacity="0.5"/><rect x="26" y="18" width="6" height="20" rx="1" opacity="0.7"/><rect x="35" y="12" width="6" height="26" rx="1"/><polyline points="10 16 20 12 30 8 40 4" stroke-dasharray="2 3" opacity="0.4"/><circle cx="40" cy="4" r="2" fill="currentColor" stroke="none" opacity="0.5"/></svg>',
  chart: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 28 12 28 16 20 20 32 24 16 28 28 32 24 36 28 44 28" opacity="0.3"/><circle cx="24" cy="24" r="6" opacity="0.4"/><line x1="24" y1="22" x2="24" y2="26"/><line x1="22" y1="24" x2="26" y2="24"/></svg>',
  clipboard: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="8" width="28" height="34" rx="3"/><rect x="18" y="4" width="12" height="8" rx="2"/><line x1="16" y1="20" x2="32" y2="20" opacity="0.25"/><line x1="16" y1="26" x2="28" y2="26" opacity="0.25"/><line x1="16" y1="32" x2="24" y2="32" opacity="0.25"/></svg>',
  calendar: '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="26" height="26" rx="3"/><line x1="6" y1="18" x2="32" y2="18"/><line x1="14" y1="6" x2="14" y2="14"/><line x1="24" y1="6" x2="24" y2="14"/><circle cx="36" cy="32" r="9"/><polyline points="36 28 36 32 40 34"/><line x1="12" y1="24" x2="16" y2="24" opacity="0.3"/><line x1="20" y1="24" x2="26" y2="24" opacity="0.3"/><line x1="12" y1="30" x2="16" y2="30" opacity="0.3"/></svg>',
};

function emptyState(iconKey, text, hint) {
  var illust = EMPTY_ILLUST[iconKey] || '';
  if (!illust && ICON[iconKey]) {
    var ic = ICON[iconKey];
    illust = ic.replace(/width="\d+"/, 'width="40"').replace(/height="\d+"/, 'height="40"');
  }
  return '<div class="empty-msg">' +
    (illust ? '<span class="empty-illust">' + illust + '</span>' : '') +
    '<span>' + esc(text) + '</span>' +
    (hint ? '<span class="empty-hint">' + esc(hint) + '</span>' : '') +
  '</div>';
}

function replaceEmoji() {
  var walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  var nodesToProcess = [];
  while (walker.nextNode()) {
    var text = walker.currentNode.textContent;
    for (var emoji in EMOJI_MAP) {
      if (text.indexOf(emoji) !== -1) {
        nodesToProcess.push(walker.currentNode);
        break;
      }
    }
  }
  nodesToProcess.forEach(function(node) {
    var html = node.textContent;
    var changed = false;
    for (var emoji in EMOJI_MAP) {
      if (html.indexOf(emoji) !== -1) {
        html = html.split(emoji).join('<span class="inline-icon">' + EMOJI_MAP[emoji] + '</span>');
        changed = true;
      }
    }
    if (changed) {
      var span = document.createElement('span');
      span.innerHTML = html;
      node.parentNode.replaceChild(span, node);
    }
  });
}

function showSkeletons() {
  var tasksNow = document.getElementById('tasks-now');
  if (tasksNow && tasksNow.children.length === 0) {
    tasksNow.innerHTML =
      '<div class="skeleton-group" id="sk-tasks">' +
        '<div class="skeleton-row"><div class="skeleton sk-circle"></div><div class="skeleton sk-line" style="flex:1"></div></div>' +
        '<div class="skeleton-row"><div class="skeleton sk-circle"></div><div class="skeleton sk-line" style="flex:1;width:80%"></div></div>' +
        '<div class="skeleton-row"><div class="skeleton sk-circle"></div><div class="skeleton sk-line" style="flex:1;width:65%"></div></div>' +
      '</div>';
  }
  var projGrid = document.querySelector('.projects-grid');
  if (projGrid && projGrid.children.length === 0) {
    projGrid.innerHTML =
      '<div id="sk-projects">' +
        '<div class="skeleton sk-card"></div>' +
        '<div class="skeleton sk-card"></div>' +
      '</div>';
  }
  var commList = document.getElementById('comms-list');
  if (commList && commList.children.length === 0) {
    commList.innerHTML =
      '<div id="sk-comms" style="padding:4px 0;">' +
        '<div class="skeleton-row" style="padding:7px 0;gap:10px;"><div class="skeleton sk-circle"></div><div style="flex:1"><div class="skeleton sk-line"></div><div class="skeleton sk-line-sm"></div></div></div>' +
        '<div class="skeleton-row" style="padding:7px 0;gap:10px;"><div class="skeleton sk-circle"></div><div style="flex:1"><div class="skeleton sk-line" style="width:75%"></div><div class="skeleton sk-line-sm"></div></div></div>' +
      '</div>';
  }
  var callList = document.getElementById('calls-list');
  if (callList && callList.children.length === 0) {
    callList.innerHTML =
      '<div id="sk-calls">' +
        '<div class="skeleton sk-card"></div>' +
        '<div class="skeleton sk-card"></div>' +
        '<div class="skeleton sk-card" style="width:80%"></div>' +
      '</div>';
  }
}

function hideSkeletons() {
  var ids = ['sk-tasks', 'sk-projects', 'sk-meetings', 'sk-comms', 'sk-calls'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
}
