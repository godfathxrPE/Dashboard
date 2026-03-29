/* ═══════════════════════════════════════════
   LIB/EVENTS.JS
   Центральный диспетчер событий.
   Паттерн: Event Delegation (React, Stimulus).
   Один listener на document вместо 200+ inline handlers.
   Элементы помечены data-action="имя-действия",
   дополнительные параметры через data-* атрибуты.
   Phase 2.3: вынесен из inline <script> в index.html.
═══════════════════════════════════════════ */

var ActionDispatcher = {
  /* ── Click-действия ── */
  'install-pwa':          function()          { installPWA(); },
  'cmd-open':             function()          { cmdOpen(); },
  'toggle-focus-mode':    function()          { toggleFocusMode(); },
  'toggle-dark-light':    function()          { toggleDarkLight(); },
  'wc-toggle':            function()          { wcToggle(); },
  'toggle-theme-menu':    function()          { toggleThemeMenu(); },
  'tour-start':           function()          { tourStart(); },
  'tour-end':             function()          { tourEnd(); },
  'timer-play-pause':     function()          { timerPlayPause(); },
  'timer-reset':          function()          { timerReset(); },
  'reset-day-report':     function()          { resetDayReport(); },
  'open-fail-reason':     function(el, e)     { openFailReason(e); },
  'call-result-reset':    function()          { callResultReset(); },
  'ql-clear':             function()          { qlClear(); },
  'ql-add':               function()          { qlAdd(); },
  'open-task-modal':      function(el)        { openTaskModal(el.dataset.id || null); },
  'open-meeting-modal':   function()          { openMeetingModal(); },
  'open-comm-modal':      function()          { openCommModal(); },
  'clear-activity':       function()          { clearActivity(); },
  'open-project-modal':   function(el)        { openProjectModal(el.dataset.id || undefined); },
  'open-call-modal':      function(el)        { openCallModal(el.dataset.id || null); },
  'open-loss-modal':      function(el)        { openLossModal(el.dataset.id); },
  'kpi-reset':            function()          { kpiReset(); },
  'kpi-modal-open':       function()          { kpiModalOpen(); },
  'kpi-modal-close':      function()          { kpiModalClose(); },
  'kpi-modal-backdrop-click': function(el, e) { kpiModalBackdropClick(e); },
  'ctx-edit':             function()          { ctxEdit(); },
  'ctx-delete':           function()          { ctxDelete(); },
  'save-task':            function()          { saveTask(); },
  'save-project':         function()          { saveProject(); },
  'close-loss-modal':     function()          { closeLossModal(); },
  'save-loss-modal':      function()          { saveLossModal(); },
  'save-meeting':         function()          { saveMeeting(); },
  'save-comm':            function()          { saveComm(); },
  'toggle-lost-section':  function()          { toggleLostSection(); },
  'close-export':         function()          { closeExport(); },
  'close-review':         function()          { closeReview(); },
  'close-call-modal':     function()          { closeCallModal(); },
  'save-call':            function()          { saveCall(); },
  'dc-open-modal':        function()          { dcOpenModal(); },
  'dc-close-modal':       function()          { dcCloseModal(); },
  'dc-save':              function()          { dcSave(); },
  'dc-snooze':            function()          { dcSnooze(); },
  'dc-dismiss-alert':     function()          { dcDismissAlert(); },
  'dc-mark-done-from-alert': function()       { dcMarkDoneFromAlert(); },
  'wc-close':             function()          { wcClose(); },
  'wc-reset-all':         function()          { wcResetAll(); },
  'wc-toggle-row':        function(el)        { wcToggleRow(el.dataset.wid); },
  'fab-close':            function()          { fabClose(); },
  'fab-toggle':           function()          { fabToggle(); },
  'export-data':          function()          { exportData(); },
  'export-tasks-csv':     function()          { exportTasksCSV(); },
  'export-projects-csv':  function()          { exportProjectsCSV(); },
  'export-calls-csv':     function()          { exportCallsCSV(); },
  'export-all-csv':       function()          { exportAllCSV(); },
  'copy-review':          function()          { copyReview(); },
  'send-magic-link':      function()          { sendMagicLink(document.getElementById('login-email').value); },
  'set-view':             function(el)        { setView(el.dataset.value); },
  'set-theme':            function(el)        { setTheme(el.dataset.value); },
  'set-timer-mode':       function(el)        { setTimerMode(el.dataset.value); },
  'set-proj-sort':        function(el)        { setProjSort(el.dataset.value, el); },
  'call-tracker-add':     function(el)        { callTrackerAdd(+el.dataset.delta); },
  'call-result-add':      function(el)        { callResultAdd(el.dataset.value); },
  'close-modal':          function(el)        { closeModal(el.dataset.modal); },
  'close-modal-bg':       function(el, e)     { closeModalOnBg(e, el.dataset.modal); },
  'ctx-move-to':          function(el)        { ctxMoveTo(el.dataset.value); },
  'select-priority':      function(el)        { selectPriority(el.dataset.value); },
  'select-loss-reason':   function(el)        { selectLossReason(el, el.dataset.r); },
  'loss-modal-select':    function(el)        { lossModalSelect(el, el.dataset.r); },
  'select-person':        function(el)        { selectPerson(el, el.dataset.value); },
  'ql-select-type':       function(el)        { qlSelectType(el); },
  'pick-fail-reason':     function(el)        { pickFailReason(el.dataset.value); },
  'toggle-task':          function(el)        { toggleTask(el.dataset.id); },
  'delete-task':          function(el)        { deleteTask(el.dataset.id); },
  'toggle-project':       function(el)        { toggleProject(el.dataset.id); },
  'delete-project':       function(el)        { deleteProject(el.dataset.id); },
  'restore-project':      function(el)        { restoreProject(el.dataset.id); },
  'set-project-stage':    function(el)        { setProjectStage(el.dataset.id, +el.dataset.stage); },
  'toggle-call':          function(el)        { toggleCall(el.dataset.id); },
  'delete-call':          function(el)        { deleteCall(el.dataset.id); },
  'delete-meeting':       function(el)        { deleteMeeting(el.dataset.id); },
  'delete-comm':          function(el)        { deleteComm(el.dataset.id); },
  'dc-toggle-done':       function(el)        { dcToggleDone(el.dataset.id); },
  'dc-toggle-bell':       function(el)        { dcToggleBell(el.dataset.id); },
  'dc-delete':            function(el)        { dcDelete(el.dataset.id); },
  'dr-dismiss':           function(el)        { drDismiss(el.dataset.id); },
  'ql-delete':            function(el)        { qlDelete(el.dataset.id); },
  'dismiss-toast':        function(el)        { dismissToast(el.parentElement); },
  'tour-show':            function(el)        { tourShow(+el.dataset.idx); },
  'smart-alert':          function(el)        { smartAlertAction(+el.dataset.idx); },
  'cmd-exec':             function(el)        { cmdExec(+el.dataset.idx); },
  'kpi-change':           function(el)        { kpiChange(el.dataset.mid, +el.dataset.di, +el.dataset.delta); },
  'kpi-input-focus':      function(el)        { el.select(); },
  /* ── Backdrop click-to-close (if target === self) ── */
  'close-loss-modal-bg':  function(el, e)     { if (e.target === el) closeLossModal(); },
  'close-call-modal-bg':  function(el, e)     { if (e.target === el) closeCallModal(); },
  'dc-close-modal-bg':    function(el, e)     { if (e.target === el) dcCloseModal(); },
  'dc-dismiss-alert-bg':  function(el, e)     { if (e.target === el) dcDismissAlert(); },
  'close-export-bg':      function(el, e)     { if (e.target === el) closeExport(); },
  'close-review-bg':      function(el, e)     { if (e.target === el) closeReview(); },
  'cmd-close-bg':         function(el, e)     { if (e.target === el) cmdClose(); },
  /* ── FAB combined actions ── */
  'fab-open-task':        function()          { fabClose(); openTaskModal(null); },
  'fab-open-project':     function()          { fabClose(); openProjectModal(); },
  'fab-open-call':        function()          { fabClose(); openCallModal(); },
  'fab-open-meeting':     function()          { fabClose(); openMeetingModal(); },
  /* ── Проработка ── */
  'prospect-filter':      function(el)        { prospectSetFilter(el.dataset.value); },
  'prospect-open':        function(el)        { window.open('./calls-campaign.html#' + el.dataset.inn, '_blank'); },
  'prospect-to-project':  function(el)        { prospectToProject(el.dataset.inn); },
  'del-proj-contact':     function(el)        { delProjContact(el.dataset.id, +el.dataset.idx); },
  'edit-proj-contact':    function(el)        { editProjContact(el.dataset.id, +el.dataset.idx); },
  'save-edit-proj-contact':function(el)       { saveEditProjContact(el.dataset.id, +el.dataset.idx); },
  'cancel-edit-proj-contact':function()       { renderProjects(); },
  'expand-comment':       function(el)        { openCommentOverlay(el.dataset.id); },
  'close-comment-overlay': function()         { closeCommentOverlay(); },
  'close-comment-overlay-bg':function(el,e)   { if (e.target === el) closeCommentOverlay(); },
  'save-comment-overlay':  function()         { saveCommentOverlay(); },
  'add-proj-contact-form':function(el)        { showProjContactForm(el.dataset.id); },
  'save-proj-contact':    function(el)        { saveProjContact(el.dataset.id); },
  'cancel-proj-contact':  function(el)        { renderProjects(); },
};

/* ── Главный click-listener ── */
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var stopEl = e.target.closest('[data-stop]');
  if (stopEl && stopEl !== el && el.contains(stopEl)) return;
  var handler = ActionDispatcher[el.dataset.action];
  if (handler) handler(el, e);
});

/* ── Enter-key delegation ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var el = e.target.closest('[data-enter-action]');
  if (!el) return;
  var action = el.dataset.enterAction;
  if (action === 'blur') { el.blur(); return; }
  if (action === 'quick-add') { quickAdd(el.dataset.lane, el); return; }
  var handler = ActionDispatcher[action];
  if (handler) handler(el, e);
});

/* ── Input delegation ── */
var InputDispatcher = {
  'save-focus':           function(el) { saveFocus(); },
  'call-tracker-set-plan':function(el) { callTrackerSetPlan(el.value); },
  'render-funnel':        function(el) { renderFunnel(); },
  'save-funnel':          function(el) { saveFunnelManual(); renderFunnel(); },
  'save-pf-plans':        function(el) { savePFPlans(); renderPlanFact(); },
  'schedule-note-save':   function(el) { scheduleNoteSave(); },
  'format-budget':        function(el) { formatBudgetInput(el); },
};
document.addEventListener('input', function(e) {
  var el = e.target.closest('[data-input-action]');
  if (!el) return;
  var handler = InputDispatcher[el.dataset.inputAction];
  if (handler) handler(el);
});

/* ── Change delegation ── */
var ChangeDispatcher = {
  'check-lost-stage':     function(el) { checkLostStage(el.value); },
  'update-proj-field':    function(el) {
    var val = el.dataset.field === 'budget' ? el.value.replace(/\D/g, '') : el.value;
    updateProjField(el.dataset.id, el.dataset.field, val);
  },
  'update-proj-deadline': function(el) { updateProjField(el.dataset.id, 'deadline', el.value); renderProjects(); },
  'save-next-step':       function(el) { saveNextStep(el.dataset.id, el.value); },
  'kpi-set':              function(el) { kpiSet(el.dataset.mid, +el.dataset.di, el.value); },
  'wc-toggle-by-id':      function(el) { wcToggleById(el.dataset.wid, el.checked); },
  'import-data':          function(el) { importData(el); },
};
document.addEventListener('change', function(e) {
  var el = e.target.closest('[data-change-action]');
  if (!el) return;
  var handler = ChangeDispatcher[el.dataset.changeAction];
  if (handler) handler(el);
});

/* ── Blur delegation ── */
var BlurDispatcher = {
  'save-next-step':    function(el) { saveNextStep(el.dataset.id, el.value); },
  'save-last-contact': function(el) { saveLastContact(el.dataset.id, el.value); },
};
document.addEventListener('focusout', function(e) {
  var el = e.target.closest('[data-blur-action]');
  if (!el) return;
  var handler = BlurDispatcher[el.dataset.blurAction];
  if (handler) handler(el);
});
