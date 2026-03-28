/* ═══════════════════════════════════════════
   ЗВОНКИ
   Module: calls.js
   Dependencies: calls (state), editCallId (state),
   LS, uid, esc, emptyState, toast, toastUndo,
   logActivity, updateStreak
═══════════════════════════════════════════ */

function renderCalls() {
  const el = document.getElementById('calls-list');
  document.getElementById('calls-count').textContent = calls.length;
  if (!calls.length) {
    el.innerHTML = emptyState('phone', 'Звонков пока нет', 'Запиши первый звонок через «+ Звонок»');
    return;
  }
  // сортируем: сначала новые
  const sorted = [...calls].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map(c => callHTML(c)).join('');
}

function callHTML(c) {
  const statusLabel = c.status === 'done' ? 'Состоялся' : 'Перенесён';
  const dateStr = c.date ? new Date(c.date).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
  return `
  <div class="call-card" id="call-${c.id}">
    <div class="call-head" data-action="toggle-call" data-id="${c.id}">
      <div class="call-status-dot ${c.status}"></div>
      <div class="call-company">${esc(c.company)}</div>
      ${c.contact ? `<div class="call-contact-inline">${esc(c.contact)}</div>` : ''}
      <div class="call-date">${dateStr}</div>
      <span class="call-status-pill ${c.status}">${statusLabel}</span>
      <div class="call-chevron">▼</div>
    </div>
    <div class="call-body">
      ${c.agreements ? `
        <div class="call-field">
          <div class="call-field-label">Договорённости</div>
          <div class="call-field-value">${esc(c.agreements)}</div>
        </div>` : ''}
      ${c.nextStep ? `
        <div class="call-next-step">
          <div class="call-next-step-label">→ Следующий шаг</div>
          ${esc(c.nextStep)}
        </div>` : ''}
      ${!c.agreements && !c.nextStep ? '<div class="call-field-value" style="margin-top:8px;color:var(--text-mute)">Нет записей</div>' : ''}
      <div class="call-actions">
        <button class="btn" data-action="open-call-modal" data-id="${c.id}"><span class="inline-icon" style="margin-right:3px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>Редактировать</button>
        <button class="btn danger" data-action="delete-call" data-id="${c.id}">Удалить</button>
      </div>
    </div>
  </div>`;
}

function toggleCall(id) {
  const el = document.getElementById('call-'+id);
  if (!el) return;
  const wasOpen = el.classList.contains('expanded');
  // закрываем все
  document.querySelectorAll('.call-card.expanded').forEach(c => c.classList.remove('expanded'));
  if (!wasOpen) el.classList.add('expanded');
}

function openCallModal(id) {
  editCallId = id;
  const c = id ? calls.find(x => x.id === id) : null;
  document.getElementById('call-modal-title').textContent = c ? 'Редактировать звонок' : 'Новый звонок';
  document.getElementById('cf-company').value    = c ? c.company    : '';
  document.getElementById('cf-status').value     = c ? c.status     : 'done';
  document.getElementById('cf-date').value       = c ? (c.date||'') : new Date().toISOString().slice(0,16);
  document.getElementById('cf-contact').value    = c ? (c.contact||'')    : '';
  document.getElementById('cf-agreements').value = c ? (c.agreements||'') : '';
  document.getElementById('cf-next').value       = c ? (c.nextStep||'')   : '';
  document.getElementById('call-modal').classList.add('open');
  setTimeout(()=>document.getElementById('cf-company').focus(), 80);
}

function closeCallModal() {
  document.getElementById('call-modal').classList.remove('open');
  editCallId = null;
}

function saveCall() {
  const company = document.getElementById('cf-company').value.trim();
  if (!company) { document.getElementById('cf-company').focus(); return; }
  const data = {
    company,
    status:     document.getElementById('cf-status').value,
    date:       document.getElementById('cf-date').value,
    contact:    document.getElementById('cf-contact').value.trim(),
    agreements: document.getElementById('cf-agreements').value.trim(),
    nextStep:   document.getElementById('cf-next').value.trim(),
  };
  data._updatedAt = Date.now();
  if (editCallId) {
    const c = calls.find(x => x.id === editCallId);
    if (c) Object.assign(c, data);
  } else {
    calls.push({ id: uid(), ...data });
  }
  LS.set('wdb_calls', calls);
  renderCalls();
  closeCallModal();
  toast(editCallId ? 'Звонок обновлён' : 'Звонок записан', 'success');
  logActivity('phone', 'Записал звонок: ' + company);
  updateStreak();
}

function deleteCall(id) {
  let deleted = calls.find(x => x.id === id);
  if (!deleted) return;
  let idx = calls.indexOf(deleted);
  calls = calls.filter(x => x.id !== id);
  LS.set('wdb_calls', calls);
  renderCalls();
  toastUndo('Звонок удалён', function() {
    calls.splice(idx, 0, deleted);
    LS.set('wdb_calls', calls);
    renderCalls();
  });
}

renderCalls();
