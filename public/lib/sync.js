/* ═══════════════════════════════════════════════════
   SUPABASE REALTIME SYNC
   Замена Firebase — работает в РФ без VPN.
   Использует тот же _sb клиент что и авторизация.
   Таблица: dashboard_sync (id TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
   RLS: каждый видит только свои строки (auth.uid()).
═══════════════════════════════════════════════════ */
const SB_SYNC_KEYS  = ['wdb_tasks','wdb_projects','wdb_meetings','wdb_comms',
                       'wdb_notes','wdb_calls','wdb_focus','wdb_kpi'];
const SB_LOCAL_ONLY = ['wdb_theme','wdb_timer_sessions','wdb_sounds',
                       'wdb_tour_done','wdb_widget_visibility','wdb_widget_order',
                       'wdb_dr_dismissed'];
/* Префиксы daily/weekly ключей которые тоже синхронизируются */
const SB_SYNC_PREFIXES = ['wdb_call_tracker_','wdb_call_results_','wdb_daycalls_',
                          'wdb_heatmap_','wdb_funnel_','wdb_pf_plans_',
                          'wdb_quicklog','wdb_streak'];

/* Универсальная проверка: должен ли ключ синхронизироваться? */
function shouldSync(key) {
  if (SB_LOCAL_ONLY.includes(key)) return false;
  if (SB_SYNC_KEYS.includes(key)) return true;
  return SB_SYNC_PREFIXES.some(function(p) { return key.startsWith(p); });
}

let sbUserId     = null;  // заполняется после авторизации
let suppressSync = false;
let syncChannel  = null;  // Realtime канал

/* ── Хелпер статуса (тот же UI что был у Firebase) ── */
function setSyncStatus(state, text) {
  const ind = document.getElementById('sync-indicator');
  const lbl = document.getElementById('sync-label');
  if (!ind) return;
  ind.className = 'sync-indicator ' + state;
  if (lbl) lbl.textContent = text;
}

/* ═══════════════════════════════════════════
   RECORD-LEVEL MERGE
   Паттерн: Salesforce/HubSpot per-record conflict resolution.
   Вместо «кто последний — тот прав» для всего массива,
   мержим по-записно: для каждого id берём более новую версию.
   Новые записи с обеих сторон сохраняются.
═══════════════════════════════════════════ */
function mergeArrays(local, incoming) {
  if (!Array.isArray(local) || !Array.isArray(incoming)) return incoming;
  if (!local.length) return incoming;
  if (!incoming.length) return local;
  if (!local[0] || !local[0].id || !incoming[0] || !incoming[0].id) return incoming;

  var localMap = {};
  local.forEach(function(item) { localMap[item.id] = item; });

  var incomingMap = {};
  incoming.forEach(function(item) { incomingMap[item.id] = item; });

  /* Собираем все уникальные id */
  var allIds = {};
  local.forEach(function(item) { allIds[item.id] = true; });
  incoming.forEach(function(item) { allIds[item.id] = true; });

  var merged = [];
  Object.keys(allIds).forEach(function(id) {
    var l = localMap[id];
    var r = incomingMap[id];
    if (!l) { merged.push(r); return; }  /* новое из облака */
    if (!r) { merged.push(l); return; }  /* только локальное */
    /* Оба есть — берём тот, у которого свежее _updatedAt */
    var lt = l._updatedAt || 0;
    var rt = r._updatedAt || 0;
    merged.push(rt >= lt ? r : l);
  });

  return merged;
}

/* Ключи для которых работает record-level merge */
var MERGE_KEYS = ['wdb_tasks', 'wdb_projects', 'wdb_calls', 'wdb_meetings'];

/* ── Применить входящие данные к UI ── */
function sbApplyIncoming(key, incoming) {
  suppressSync = true;

  /* ── AUTO-BACKUP: сохраняем предыдущую версию перед перезаписью ── */
  try {
    var prev = localStorage.getItem(key);
    if (prev && prev !== 'null' && prev !== '[]') {
      localStorage.setItem(key + '__backup', prev);
      localStorage.setItem(key + '__backup_ts', new Date().toISOString());
    }
  } catch(e) { /* quota exceeded — не критично */ }

  /* ── ВАЛИДАЦИЯ ВХОДЯЩИХ: фильтруем битые записи из облака ── */
  if (Array.isArray(incoming)) {
    var validator = {
      'wdb_tasks': Validators.task,
      'wdb_projects': Validators.project,
      'wdb_calls': Validators.call,
      'wdb_meetings': Validators.meeting
    }[key];
    if (validator) {
      var before = incoming.length;
      incoming = incoming.filter(validator);
      if (incoming.length !== before) {
        console.warn('[Sync] ' + key + ': filtered out ' +
          (before - incoming.length) + ' invalid items from cloud');
      }
    }
  }

  /* ── RECORD-LEVEL MERGE: мержим по id вместо полной перезаписи ── */
  if (MERGE_KEYS.indexOf(key) !== -1 && Array.isArray(incoming)) {
    try {
      var local = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(local) && local.length > 0) {
        incoming = mergeArrays(local, incoming);
      }
    } catch(e) { /* localStorage read failed — используем incoming as-is */ }
  }

  localStorage.setItem(key, JSON.stringify(incoming));
  try {
    if (key === 'wdb_tasks')    { tasks    = incoming; safeRender(renderTasks, '#tasks-now', 'Задачи (sync)'); }
    if (key === 'wdb_kpi')      { kpiData  = incoming; safeRender(renderKPI, '.kpi-block', 'KPI (sync)'); }
    if (key === 'wdb_projects') { projects = incoming; safeRender(renderProjects, '#projects-list', 'Проекты (sync)'); }
    if (key === 'wdb_meetings') { meetings = incoming; safeRender(renderMeetings, '#meetings-list', 'Встречи (sync)'); }
    if (key === 'wdb_comms')    { comms    = incoming; safeRender(renderComms, '#comms-list', 'Коммуникации (sync)'); }
    if (key === 'wdb_calls')    { calls    = incoming; safeRender(renderCalls, '#calls-list', 'Звонки (sync)'); }
    if (key === 'wdb_notes') {
      const na = document.getElementById('notes-area');
      if (na) na.value = incoming || '';
    }
    if (key === 'wdb_focus') {
      const fi = document.getElementById('w-focus-input');
      if (fi && incoming.date === new Date().toDateString()) fi.value = incoming.text || '';
    }
    /* Daily виджеты — перерисовываем при получении данных */
    if (key.startsWith('wdb_call_tracker_') && typeof renderCallTracker === 'function') renderCallTracker();
    if (key.startsWith('wdb_call_results_') && typeof renderCallResults === 'function') renderCallResults();
    if (key.startsWith('wdb_daycalls_') && typeof dcRender === 'function') dcRender();
    if (key.startsWith('wdb_heatmap_') && typeof renderHeatmap === 'function') renderHeatmap();
    if (key.startsWith('wdb_funnel_') && typeof renderFunnel === 'function') renderFunnel();
    if (key.startsWith('wdb_pf_plans_')) renderPlanFact();
    updateStats();
    if (key === 'wdb_projects' || key === 'wdb_tasks') {
      renderDeadlineRadar();
      renderProjProgress();
    }
    renderPlanFact();
    updateSparklines();
  } catch(e) {
    console.error('[sbApplyIncoming] Unexpected error for key=' + key + ':', e);
  }
  suppressSync = false;
}

/* ── Записать одну запись в Supabase ── */
async function sbWrite(key, value) {
  if (!sbUserId || !_sb) return;
  setSyncStatus('syncing', 'сохранение...');
  const { error } = await _sb
    .from('dashboard_sync')
    .upsert(
      { id: key, user_id: sbUserId, data: value, updated_at: new Date().toISOString() },
      { onConflict: 'id,user_id' }
    );
  if (error) {
    console.warn('Supabase write error:', error.message);
    setSyncStatus('err', 'ошибка записи');
    toast('Ошибка синхронизации', 'error');
  } else {
    setSyncStatus('ok', 'синхронизировано');
  }
}

/* ── Загрузить все ключи при старте ── */
async function sbLoadAll() {
  if (!sbUserId || !_sb) return;
  setSyncStatus('syncing', 'загрузка...');
  const { data, error } = await _sb
    .from('dashboard_sync')
    .select('id, data, updated_at')
    .eq('user_id', sbUserId);
  if (error) {
    console.warn('Supabase load error:', error.message);
    setSyncStatus('err', 'ошибка загрузки');
    toast('Ошибка загрузки из облака', 'error');
    return;
  }
  /* Мержим с учётом timestamp:
     - Если локально пусто → берём облако
     - Если облако новее локального → берём облако
     - Если локальное новее или нет timestamp → заливаем локальное */
  (data || []).forEach(row => {
    const key      = row.id;
    const incoming = row.data;
    const cloudTs  = row.updated_at || '';
    if (!shouldSync(key)) return;
    const local = (() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } })();
    const localEmpty = !local || (Array.isArray(local) && local.length === 0);
    const localTs = localStorage.getItem(key + '__ts') || '';
    if (localEmpty) {
      /* Локально пусто — берём облако */
      sbApplyIncoming(key, incoming);
      localStorage.setItem(key + '__ts', cloudTs);
    } else if (cloudTs && localTs && cloudTs > localTs) {
      /* Облако новее — берём облако */
      sbApplyIncoming(key, incoming);
      localStorage.setItem(key + '__ts', cloudTs);
    } else {
      /* Локальные данные новее или нет timestamp — заливаем в облако */
      sbWrite(key, local);
    }
  });
  setSyncStatus('ok', 'синхронизировано');
}

/* ── Подписка Realtime — слушаем изменения от других устройств ── */
function sbSubscribe() {
  if (!sbUserId || !_sb) return;
  // Отписываемся от старого канала если был
  if (syncChannel) { _sb.removeChannel(syncChannel); syncChannel = null; }

  syncChannel = _sb
    .channel('dashboard-sync-' + sbUserId)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_sync',
          filter: 'user_id=eq.' + sbUserId },
        payload => {
          const key      = payload.new?.id;
          const incoming = payload.new?.data;
          if (!key || incoming === undefined) return;
          if (!shouldSync(key)) return;
          const local = (() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } })();
          if (JSON.stringify(incoming) === JSON.stringify(local)) return;
          setSyncStatus('syncing', 'обновление...');
          sbApplyIncoming(key, incoming);
          setTimeout(() => setSyncStatus('ok', 'синхронизировано'), 600);
        }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') setSyncStatus('ok', 'синхронизировано');
      if (status === 'CLOSED')     setSyncStatus('err', 'нет связи');
    });
}

/* ── Инициализация после авторизации ── */
// Вызывается из showDashboard() когда пользователь вошёл
async function sbSyncInit(user) {
  sbUserId = user.id;
  await sbLoadAll();
  sbSubscribe();
}

/* ── Восстановление из backup ──
   Вызов: restoreBackup('wdb_tasks') — из консоли или Command Palette.
   Откатывает к последнему snapshot перед sync-перезаписью. */
function restoreBackup(key) {
  var backup = localStorage.getItem(key + '__backup');
  var ts = localStorage.getItem(key + '__backup_ts');
  if (!backup) {
    toast('Нет backup для ' + key, 'error');
    return false;
  }
  if (!confirm('Восстановить ' + key + ' из backup от ' + (ts || '?') + '?')) return false;
  localStorage.setItem(key, backup);
  localStorage.setItem(key + '__ts', new Date().toISOString());
  toast('Восстановлено из backup. Перезагрузка...', 'success');
  setTimeout(function() { location.reload(); }, 600);
  return true;
}

/* ── Перехватываем LS.set — безопасная запись + debounced Supabase sync ──
   Fix 6: 1) try/catch для QuotaExceededError
          2) debounce 300ms для Supabase writes
          3) Уведомление если localStorage полон */
const _lsSetOrigSb = LS.set.bind(LS);
const _sbWriteTimers = {};

LS.set = function(key, value) {
  /* 1. Безопасная запись в localStorage */
  try {
    _lsSetOrigSb(key, value);
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      console.error('[LS] Quota exceeded for key:', key);
      toast('Хранилище переполнено! Удали старые данные.', 'error');
      /* Попытка освободить место — удаляем старые backup'ы */
      try {
        Object.keys(localStorage).forEach(function(k) {
          if (k.endsWith('__backup') || k.endsWith('__backup_ts')) {
            localStorage.removeItem(k);
          }
        });
        _lsSetOrigSb(key, value);
      } catch (e2) {
        console.error('[LS] Still full after cleanup:', e2);
      }
    } else {
      console.error('[LS] Write error:', err);
    }
    return;
  }

  /* 2. Skip sync для подавленных/локальных ключей */
  if (suppressSync) return;
  if (!shouldSync(key)) return;

  /* 3. Timestamp для merge-логики */
  try {
    localStorage.setItem(key + '__ts', new Date().toISOString());
  } catch(e) { /* не критично */ }

  /* 4. Debounced Supabase write (300ms) —
     при быстрых кликах (KPI +/-, drag-drop) в облако
     уходит одна запись вместо десяти */
  if (!sbUserId) return;
  if (_sbWriteTimers[key]) clearTimeout(_sbWriteTimers[key]);
  _sbWriteTimers[key] = setTimeout(function() {
    delete _sbWriteTimers[key];
    sbWrite(key, value);
  }, 300);
};
