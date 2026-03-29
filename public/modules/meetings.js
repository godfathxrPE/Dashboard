/* ═══════════════════════════════════════════
   ВСТРЕЧИ
   Module: meetings.js
   Dependencies: meetings (state), LS, uid, esc,
   fmtDate, emptyState, closeModal, renderFunnel,
   renderPlanFact, toast, toastUndo, logActivity
═══════════════════════════════════════════ */

function renderMeetings() {
  const el = document.getElementById('meetings-list');
  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7*86400000).toISOString().split('T')[0];
  const week = meetings
    .filter(m => m.date >= today && m.date <= weekEnd)
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  if(!week.length) {
    el.innerHTML = emptyState('users', 'Встреч на неделе нет', 'Добавь встречу через «+» выше');
    return;
  }
  el.innerHTML = week.map(m => `
    <div class="meeting-item" oncontextmenu="event.preventDefault();deleteMeeting('${m.id}')">
      <div class="meeting-time">
        ${esc(m.time||'—')}
        <div class="meeting-day">${fmtDate(m.date)}</div>
      </div>
      <div>
        <div class="meeting-title">${esc(m.title)}</div>
        ${m.who ? `<div class="meeting-sub">${esc(m.who)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-icon" data-action="delete-meeting" data-id="${m.id}" title="Удалить">✕</button>
    </div>`).join('');
}

function openMeetingModal(id) {
  const m = id ? meetings.find(x => x.id === id) : null;
  document.getElementById('meeting-edit-id').value  = m?.id || '';
  document.getElementById('meeting-title-in').value = m?.title || '';
  document.getElementById('meeting-date-in').value  = m?.date || new Date().toISOString().split('T')[0];
  document.getElementById('meeting-time-in').value  = m?.time || '';
  document.getElementById('meeting-who-in').value   = m?.who || '';
  document.getElementById('meeting-modal').classList.add('open');
  setTimeout(() => document.getElementById('meeting-title-in').focus(), 80);
}

function saveMeeting() {
  const id = document.getElementById('meeting-edit-id').value;
  const data = {
    title: document.getElementById('meeting-title-in').value.trim(),
    date:  document.getElementById('meeting-date-in').value,
    time:  document.getElementById('meeting-time-in').value,
    who:   document.getElementById('meeting-who-in').value.trim(),
  };
  if(!data.title) return;
  data._updatedAt = Date.now();
  if(id) {
    const m = meetings.find(x => x.id === id);
    if(m) Object.assign(m, data);
  } else {
    meetings.push({ id: uid(), ...data });
  }
  LS.set('wdb_meetings', meetings);
  closeModal('meeting-modal');
  renderMeetings();
  renderFunnel();
  renderPlanFact();
  toast(id ? 'Встреча обновлена' : 'Встреча добавлена', 'success');
  logActivity('users', (id ? 'Обновил' : 'Добавил') + ' встречу: ' + data.title);
}

function deleteMeeting(id) {
  let deleted = meetings.find(x => x.id === id);
  if (!deleted) return;
  let idx = meetings.indexOf(deleted);
  meetings = meetings.filter(x => x.id !== id);
  LS.set('wdb_meetings', meetings);
  renderMeetings();
  renderFunnel();
  renderPlanFact();
  toastUndo('Встреча удалена', function() {
    meetings.splice(idx, 0, deleted);
    LS.set('wdb_meetings', meetings);
    renderMeetings();
    renderFunnel();
    renderPlanFact();
  });
}
