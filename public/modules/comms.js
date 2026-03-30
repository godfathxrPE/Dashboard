/* Module: modules/comms.js — Коммуникации, заметки, модалки */

/* ═══════════════════════════════════════════
   КОММУНИКАЦИИ
═══════════════════════════════════════════ */
let selectedCommPerson = '';

function selectPerson(el, name) {
  document.querySelectorAll('#comm-person-tags .tag-opt').forEach(t => t.classList.remove('sel'));
  el.classList.add('sel');
  selectedCommPerson = name;
  document.getElementById('comm-person-in').value = '';
}

function renderComms() {
  const el = document.getElementById('comms-list');
  // Default people if empty
  const defaults = [
    { id:'d-grisha',    person:'Гриша',    topic:'', deadline:'', isDefault:true },
    { id:'d-pankratov', person:'Панкратов',topic:'', deadline:'', isDefault:true }];
  const all = comms.length ? comms : defaults;
  el.innerHTML = all.map(c => {
    const initials = c.person.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const dueCls = c.deadline ? (isDueSoon(c.deadline) ? 'due-soon' : 'due-ok') : '';
    const dueStr = c.deadline ? `<div class="comm-due ${dueCls}">до ${fmtDate(c.deadline)}</div>` : '';
    return `
      <div class="comm-item">
        <div class="comm-avatar">${esc(initials)}</div>
        <div style="flex:1;min-width:0">
          <div class="comm-name">${esc(c.person)}</div>
          ${c.topic ? `<div class="comm-reminder">${esc(c.topic)}</div>` : '<div class="comm-reminder" style="color:var(--text-mute)">Нет напоминаний</div>'}
          ${dueStr}
        </div>
        ${!c.isDefault ? `<button class="btn btn-ghost btn-icon" data-action="delete-comm" data-id="${c.id}" title="Удалить">✕</button>` : ''}
      </div>`;
  }).join('');
}

function openCommModal() {
  selectedCommPerson = '';
  document.querySelectorAll('#comm-person-tags .tag-opt').forEach(t => t.classList.remove('sel'));
  document.getElementById('comm-edit-id').value   = '';
  document.getElementById('comm-person-in').value = '';
  document.getElementById('comm-topic-in').value  = '';
  document.getElementById('comm-date-in').value   = '';
  document.getElementById('comm-modal').classList.add('open');
  setTimeout(() => document.getElementById('comm-topic-in').focus(), 80);
}

function saveComm() {
  const person = selectedCommPerson || document.getElementById('comm-person-in').value.trim();
  const topic  = document.getElementById('comm-topic-in').value.trim();
  const date   = document.getElementById('comm-date-in').value;
  if(!person || !topic) return;
  comms.push({ id: uid(), person, topic, deadline: date });
  LS.set('wdb_comms', comms);
  closeModal('comm-modal');
  renderComms();
  toast('Напоминание добавлено', 'success');
}

function deleteComm(id) {
  let deleted = comms.find(x => x.id === id);
  if (!deleted) return;
  let idx = comms.indexOf(deleted);
  comms = comms.filter(x => x.id !== id);
  LS.set('wdb_comms', comms);
  renderComms();
  toastUndo('Напоминание удалено', function() {
    comms.splice(idx, 0, deleted);
    LS.set('wdb_comms', comms);
    renderComms();
  });
}

/* ═══════════════════════════════════════════
   ЗАМЕТКИ
═══════════════════════════════════════════ */
let noteSaveTimer = null;
const notesEl = document.getElementById('notes-area');
notesEl.value = LS.get('wdb_notes', '');

function scheduleNoteSave() {
  clearTimeout(noteSaveTimer);
  document.getElementById('notes-saved').textContent = 'Сохранение...';
  noteSaveTimer = setTimeout(() => {
    LS.set('wdb_notes', notesEl.value);
    document.getElementById('notes-saved').textContent = 'Сохранено ✓';
    setTimeout(() => document.getElementById('notes-saved').textContent = '', 2000);
  }, 800);
}

notesEl.addEventListener('keydown', e => {
  if(e.key === 'Enter' && e.ctrlKey) {
    clearTimeout(noteSaveTimer);
    LS.set('wdb_notes', notesEl.value);
    document.getElementById('notes-saved').textContent = 'Сохранено ✓';
    setTimeout(() => document.getElementById('notes-saved').textContent = '', 2000);
  }
});

/* ═══════════════════════════════════════════
   MODALS & CTX
═══════════════════════════════════════════ */
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOnBg(e, id) { if(e.target === e.currentTarget) closeModal(id); }

document.addEventListener('click', closeCtx);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') {
    document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open'));
    closeCtx();
  }
});

/* END */
