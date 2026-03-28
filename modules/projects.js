/* ═══════════════════════════════════════════
   MODULES/PROJECTS.JS
   Проекты CRM: воронка, health score, CRUD, drag-drop.
   Phase 2.3: вынесен из inline <script> в index.html.
   Зависимости (глобальные): projects, tasks, LS, esc, uid,
   fmtDate, fmtBudget, deadlineDays, FUNNEL, toast, toastUndo,
   renderFunnel, renderPlanFact, renderDeadlineRadar, renderProjProgress,
   emptyState, animateValue, logActivity, closeModal.
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   ПРОЕКТЫ
═══════════════════════════════════════════ */
let expandedProject = null;
let projSort = 'added';
let lostSectionOpen = false;
let selectedLossReason = '';

function setProjSort(mode, btn) {
  projSort = mode;
  document.querySelectorAll('.proj-sort-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjects();
}

function toggleLostSection() {
  lostSectionOpen = !lostSectionOpen;
  document.getElementById('lost-list')?.classList.toggle('open', lostSectionOpen);
  document.getElementById('lost-chevron')?.classList.toggle('open', lostSectionOpen);
}

function checkLostStage(val) {
  const block = document.getElementById('proj-loss-block');
  if (block) block.style.display = val === 'lost' ? '' : 'none';
}

function selectLossReason(btn, reason) {
  selectedLossReason = reason;
  document.querySelectorAll('#proj-loss-block .loss-reason-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('proj-loss-reason-in').value = reason;
}

/* Отдельная модалка проигрыша (открывается из кнопки в карточке) */
function openLossModal(id) {
  document.getElementById('loss-proj-id').value = id;
  document.querySelectorAll('#loss-modal .loss-reason-opt').forEach(b => b.classList.remove('active'));
  document.getElementById('loss-detail-in').value = '';
  document.getElementById('loss-modal').classList.add('open');
}
function closeLossModal() {
  document.getElementById('loss-modal').classList.remove('open');
}
function lossModalSelect(btn, reason) {
  document.querySelectorAll('#loss-modal .loss-reason-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function saveLossModal() {
  const id = document.getElementById('loss-proj-id').value;
  const reason = document.querySelector('#loss-modal .loss-reason-opt.active')?.dataset.r || 'Не указана';
  const detail = document.getElementById('loss-detail-in').value.trim();
  const p = projects.find(x => x.id === id);
  if (!p) return;
  p.stage = 'lost';
  p.lossReason = reason;
  p.lossDetail = detail;
  p.lostDate = new Date().toISOString().split('T')[0];
  p._updatedAt = Date.now();
  LS.set('wdb_projects', projects);
  if (expandedProject === id) expandedProject = null;
  closeLossModal();
  renderProjects();
  renderProjProgress();
  renderDeadlineRadar();
}

function saveLastContact(id, text) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  p.lastContact = text;
  p.lastContactDate = new Date().toISOString().split('T')[0];
  p._updatedAt = Date.now();
  LS.set('wdb_projects', projects);
  const metaEl = document.getElementById('plc-meta-' + id);
  if (metaEl) metaEl.textContent = 'обновлено ' + fmtDate(p.lastContactDate);
}

function saveNextStep(id, text) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  p.nextStep = text;
  p._updatedAt = Date.now();
  LS.set('wdb_projects', projects);
}

function renderProjects() {
  const el = document.getElementById('projects-list');
  const lostEl = document.getElementById('lost-list');
  const lostCountEl = document.getElementById('lost-count');

  const active = projects.filter(p => p.stage !== 'lost');
  const lost   = projects.filter(p => p.stage === 'lost');

  document.getElementById('projects-count').textContent = active.length;
  if (lostCountEl) lostCountEl.textContent = lost.length;

  const sorted = [...active].sort((a, b) => {
    if (projSort === 'deadline') return (a.deadline||'9999').localeCompare(b.deadline||'9999');
    if (projSort === 'stage')    return (parseInt(b.stage)||0) - (parseInt(a.stage)||0);
    return 0;
  });

  el.innerHTML = sorted.length
    ? sorted.map(p => projectHTML(p)).join('')
    : emptyState('folder', 'Проектов пока нет', 'Нажми «+ Проект» чтобы добавить первый');

  if (lostEl) {
    lostEl.innerHTML = lost.length
      ? lost.map(p => lostProjectHTML(p)).join('')
      : '<div class="empty-msg" style="padding:8px 0;border:none;background:none;"><span class="empty-hint">Проигранных сделок нет</span></div>';
  }
}

/* ── CLIENT HEALTH SCORE ──
   Паттерн: Health Indicator (Salesforce, HubSpot).
   Green: всё ок. Yellow: давно нет контакта или нет nextStep.
   Red: просрочен дедлайн + давно нет контакта. */
function getHealthClass(p) {
  if (p.stage === 'lost') return '';
  let score = 3; /* 3=healthy, 2=warning, 1=critical */
  /* Дни без контакта */
  if (p.lastContactDate) {
    let daysSince = Math.floor((Date.now() - new Date(p.lastContactDate).getTime()) / 86400000);
    if (daysSince > 7) score--;
    if (daysSince > 14) score--;
  } else { score--; }
  /* Нет следующего шага */
  if (!p.nextStep) score--;
  /* Просроченный дедлайн */
  if (p.deadline) {
    let diff = Math.floor((new Date(p.deadline + 'T00:00:00') - new Date()) / 86400000);
    if (diff < 0) score--;
  }
  if (score >= 3) return 'healthy';
  if (score >= 2) return 'warning';
  return 'critical';
}

function projectHTML(p) {
  const stage = parseInt(p.stage) || 0;
  const expanded = expandedProject === p.id;
  const dd = deadlineDays(p.deadline);

  const deadlineHtml = p.deadline ? (
    '<span style="font-size:var(--text-sm);color:' + (dd.cls==='overdue'||dd.cls==='urgent'?'var(--red)':'var(--text-mute)') + '">📅 ' + fmtDate(p.deadline) + '</span>' +
    '<span class="proj-deadline-days ' + dd.cls + '">' + dd.text + '</span>'
  ) : '';

  const funnelHTML = FUNNEL.map((s,i) => {
    const cls = i === stage ? 'active' : (i < stage ? 'past' : '');
    return '<span class="funnel-step ' + cls + '"' +
      ' data-action="set-project-stage" data-id="' + p.id + '" data-stage="' + i + '" data-stop ' +
      ' ondragover="projFunnelDragOver(event)"' +
      ' ondragleave="projFunnelDragLeave(event)"' +
      ' ondrop="projFunnelDrop(event,\'' + p.id + '\',' + i + ')"' +
      ' title="' + s + '">' + s + '</span>';
  }).join('');

  const nextStepPreview = p.nextStep
    ? '<div style="font-size:var(--text-xs);color:var(--accent);margin-top:2px;">→ ' + esc(p.nextStep) + '</div>'
    : '';

  return `
  <div class="project-card ${expanded?'expanded':''}" data-id="${p.id}"
       draggable="true"
       ondragstart="projDragStart(event,'${p.id}')"
       ondragend="projDragEnd(event)"
       data-action="toggle-project" data-id="${p.id}"
       oncontextmenu="event.preventDefault();openProjectModal('${p.id}')">
    <div class="project-top">
      <div style="flex:1;min-width:0;">
        <div class="project-name"><span class="health-dot ${getHealthClass(p)}"></span>${esc(p.name)}</div>
        <div class="project-client">${esc(p.client||'')}${p.contact?' · '+esc(p.contact):''}${p.sourceInn ? ' <a href="./calls-campaign.html#'+esc(p.sourceInn)+'" target="_blank" data-stop style="font-size:var(--text-2xs);color:var(--accent);opacity:0.6;text-decoration:none;" title="Открыть в кампании прозвона">📞 кампания</a>' : ''}</div>
        ${nextStepPreview}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        ${deadlineHtml}
        <span class="status-pill st-${stage}">${FUNNEL[stage]}</span>
      </div>
    </div>
    <div class="project-details">
      <div class="funnel-track">${funnelHTML}</div>
      <div class="project-fields">
        <div class="project-field">
          <label>Ответственный</label>
          <input value="${esc(p.owner||'')}" data-stop
            data-change-action="update-proj-field" data-id="${p.id}" data-field="owner" placeholder="—">
        </div>
        <div class="project-field">
          <label>Бюджет</label>
          <input value="${p.budget ? fmtBudget(p.budget) : ''}"
            data-stop data-input-action="format-budget"
            data-change-action="update-proj-field" data-id="${p.id}" data-field="budget" placeholder="—">
        </div>
        <div class="project-field">
          <label>Дедлайн</label>
          <input type="date" value="${p.deadline||''}" data-stop
            data-change-action="update-proj-deadline" data-id="${p.id}">
        </div>
      </div>
      <div class="proj-next-step">
        <div class="proj-next-step-label">→ Следующий шаг</div>
        <input class="proj-next-step-input"
          placeholder="Что сделать прямо сейчас?"
          value="${esc(p.nextStep||'')}"
          data-stop
          data-blur-action="save-next-step" data-id="${p.id}"
          data-change-action="save-next-step" data-id="${p.id}">
      </div>
      <div class="proj-last-contact">
        <div class="proj-last-contact-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Последний контакт</span>
          <button class="comment-expand-btn" data-action="expand-comment" data-id="${p.id}" data-stop title="Развернуть">⤢</button>
        </div>
        <textarea class="proj-last-contact-input"
          placeholder="Что обсудили, договорённости, настроение клиента..."
          data-stop
          data-blur-action="save-last-contact" data-id="${p.id}">${esc(p.lastContact||'')}</textarea>
        <div class="proj-last-contact-meta">
          <span id="plc-meta-${p.id}">${p.lastContactDate ? 'обновлено ' + fmtDate(p.lastContactDate) : 'ещё не заполнено'}</span>
          <span>blur — сохранит</span>
        </div>
      </div>
      ${p.campaignNotes ? `<div class="proj-campaign-notes" data-stop>
        <div style="font-size:var(--text-2xs);color:var(--text-mute);margin-bottom:4px;display:flex;align-items:center;gap:4px;">📞 Из кампании прозвона</div>
        <div style="font-size:var(--text-xs);color:var(--text-dim);white-space:pre-line;line-height:1.5;max-height:120px;overflow-y:auto;padding:6px 8px;background:var(--surface2);border-radius:var(--radius-s);border:1px solid var(--border);">${esc(p.campaignNotes)}</div>
      </div>` : ''}
      ${renderProjContacts(p)}
      <div class="project-actions-row">
        <button class="btn" data-action="open-project-modal" data-id="${p.id}" data-stop><span class="inline-icon" style="margin-right:3px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>Редактировать</button>
        <button class="btn" style="color:var(--red)" data-action="open-loss-modal" data-id="${p.id}" data-stop>Проиграть</button>
        <button class="btn danger" style="color:var(--red)" data-action="delete-project" data-id="${p.id}" data-stop>Удалить</button>
      </div>
      ${getLinkedItemsHTML(p.id)}
    </div>
  </div>`;
}

/* ── Контактные лица проекта ── */
function renderProjContacts(p) {
  const contacts = p.contacts || [];
  let html = '<div class="proj-contacts-wrap" data-stop>';
  html += '<div class="proj-contacts-title"><span>Контактные лица (' + contacts.length + ')</span></div>';
  contacts.forEach(function(ct, i) {
    const phones = [ct.phone, ct.phone2].filter(function(x) { return x && x.trim(); });
    html += '<div class="proj-contact-card' + (ct.isLpr ? ' is-lpr' : '') + '">';
    html += '<div><span class="proj-contact-name">' + esc(ct.name || '') + '</span>';
    if (ct.position) html += '<span class="proj-contact-position">' + esc(ct.position) + '</span>';
    if (ct.isLpr) html += ' <span style="font-size:var(--text-2xs);color:var(--green);font-weight:600;">⭐ ЛПР</span>';
    html += '</div>';
    if (phones.length || ct.email) {
      html += '<div class="proj-contact-row">';
      phones.forEach(function(ph) {
        html += '<a href="tel:' + esc(ph.replace(/[^+\d]/g, '')) + '">' + esc(ph) + '</a>';
      });
      if (ct.email) html += '<a href="mailto:' + esc(ct.email) + '">' + esc(ct.email) + '</a>';
      html += '</div>';
    }
    html += '<button class="proj-contact-edit" data-action="edit-proj-contact" data-id="' + p.id + '" data-idx="' + i + '" title="Редактировать">✎</button>';
    html += '<button class="proj-contact-del" data-action="del-proj-contact" data-id="' + p.id + '" data-idx="' + i + '" title="Удалить контакт">✕</button>';
    html += '</div>';
  });
  html += '<button class="proj-contact-add-btn" data-action="add-proj-contact-form" data-id="' + p.id + '">+ Добавить контакт</button>';
  html += '</div>';
  return html;
}

function lostProjectHTML(p) {
  return `
  <div class="project-card lost" data-id="${p.id}">
    <div class="project-top">
      <div style="flex:1;min-width:0;">
        <div class="project-name">${esc(p.name)}</div>
        <div class="project-client">${esc(p.client||'')}${p.contact?' · '+esc(p.contact):''}</div>
        ${p.lossDetail ? '<div class="proj-lost-reason">' + esc(p.lossDetail) + '</div>' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
        ${p.budget ? '<span style="font-size:var(--text-xs);color:var(--text-mute)">' + fmtBudget(p.budget) + '</span>' : ''}
        <span class="proj-loss-badge">${esc(p.lossReason||'Проиграна')}${p.lostDate ? ' · ' + fmtDate(p.lostDate) : ''}</span>
        <button class="btn" style="font-size:var(--text-xs);padding:2px 8px;" data-action="restore-project" data-id="${p.id}">↩ Вернуть</button>
        <button class="btn" style="font-size:var(--text-xs);padding:2px 8px;color:var(--red)" data-action="delete-project" data-id="${p.id}">Удалить</button>
      </div>
    </div>
  </div>`;
}

/* ── Связанные задачи и звонки в проекте ──
   Паттерн: Linked Items (Notion Relations, Linear Sub-issues). */
function getLinkedItemsHTML(projectId) {
  let linkedTasks = tasks.filter(function(t) { return t.projectId === projectId && t.lane !== 'done'; });
  let doneTasks = tasks.filter(function(t) { return t.projectId === projectId && t.lane === 'done'; });
  /* Запланированные звонки — ищем по projectId */
  let dcList = LS.get('wdb_daycalls_' + new Date().toISOString().split('T')[0], []);
  let linkedCalls = dcList.filter(function(c) { return c.projectId === projectId; });

  if (!linkedTasks.length && !doneTasks.length && !linkedCalls.length) return '';

  let html = '<div class="proj-linked" data-stop>';

  if (linkedTasks.length || doneTasks.length) {
    html += '<div class="proj-linked-title">' + ICON.clipboard + ' Задачи (' + linkedTasks.length + ' активных)</div>';
    linkedTasks.forEach(function(t) {
      let prioMark = t.priority === 'critical' ? ' style="color:var(--red)"' : t.priority === 'important' ? ' style="color:var(--yellow)"' : '';
      html += '<div class="proj-linked-item"><span class="linked-dot task"' + prioMark + '></span>' + esc(t.text) +
        (t.deadline ? '<span style="font-size: var(--text-2xs);color:var(--text-mute);margin-left:auto;flex-shrink:0;">' + fmtDate(t.deadline) + '</span>' : '') +
        '</div>';
    });
    if (doneTasks.length) {
      html += '<div style="font-size: var(--text-2xs);color:var(--text-mute);margin-top:2px;">' + doneTasks.length + ' выполнено</div>';
    }
  }

  if (linkedCalls.length) {
    html += '<div class="proj-linked-title" style="margin-top:8px;">' + ICON.phone + ' Запланированные звонки</div>';
    linkedCalls.forEach(function(c) {
      html += '<div class="proj-linked-item"><span class="linked-dot call"></span>' +
        (c.time || '') + ' ' + esc(c.company || '') + (c.contact ? ' · ' + esc(c.contact) : '') +
        '</div>';
    });
  }

  html += '</div>';
  return html;
}

function toggleProject(id) {
  expandedProject = expandedProject === id ? null : id;
  renderProjects();
}

function setProjectStage(id, stage) {
  const p = projects.find(x => x.id === id);
  if(p) {
    let oldStage = p.stage;
    p.stage = stage;
    p._updatedAt = Date.now();
    LS.set('wdb_projects', projects);
    renderProjects();
    renderFunnel();
    renderPlanFact();
    if (oldStage !== stage) toast(FUNNEL[stage], 'success', 2000);
  }
}

/* ── DRAG-AND-DROP ПРОЕКТОВ ──
   Паттерн: Kanban Drag (Trello, Linear, Notion Board).
   Проект перетаскивается → бросается на этап воронки.
   Также поддерживает перетаскивание между карточками проектов
   для изменения порядка. */
let projDraggingId = null;

function projDragStart(e, id) {
  projDraggingId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  /* Задержка чтобы dragging-класс не мешал snapshot */
  setTimeout(function() {
    let card = document.querySelector('.project-card[data-id="' + id + '"]');
    if (card) card.classList.add('dragging');
  }, 0);
}

function projDragEnd(e) {
  projDraggingId = null;
  document.querySelectorAll('.project-card.dragging').forEach(function(el) {
    el.classList.remove('dragging');
  });
  document.querySelectorAll('.funnel-step.drop-target').forEach(function(el) {
    el.classList.remove('drop-target');
  });
}

function projFunnelDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drop-target');
}

function projFunnelDragLeave(e) {
  e.currentTarget.classList.remove('drop-target');
}

function projFunnelDrop(e, projId, stageIdx) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drop-target');
  /* Используем id перетаскиваемого проекта если бросили на чужую воронку */
  let id = projDraggingId || projId;
  setProjectStage(id, stageIdx);
}

function updateProjField(id, field, value) {
  const p = projects.find(x => x.id === id);
  if(p) { p[field] = value; p._updatedAt = Date.now(); LS.set('wdb_projects', projects); }
}

function restoreProject(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  p.stage = 0;
  delete p.lossReason; delete p.lostDate; delete p.lossDetail;
  p._updatedAt = Date.now();
  LS.set('wdb_projects', projects);
  renderProjects();
}

function openProjectModal(id) {
  selectedLossReason = '';
  const p = id ? projects.find(x => x.id === id) : null;
  document.getElementById('proj-modal-title').textContent = p ? 'Редактировать проект' : 'Новый проект';
  document.getElementById('proj-edit-id').value      = p?.id || '';
  document.getElementById('proj-name-in').value      = p?.name || '';
  document.getElementById('proj-client-in').value    = p?.client || '';
  document.getElementById('proj-contact-in').value   = p?.contact || '';
  document.getElementById('proj-deadline-in').value  = p?.deadline || '';
  const rawB = p?.budget ? parseInt(String(p.budget).replace(/\D/g,'')) : '';
  document.getElementById('proj-budget-in').value    = rawB ? rawB.toLocaleString('ru-RU') : '';
  document.getElementById('proj-stage-in').value     = p?.stage ?? 0;
  document.getElementById('proj-owner-in').value     = p?.owner || '';
  document.getElementById('proj-nextstep-in').value  = p?.nextStep || '';
  const lossBlock = document.getElementById('proj-loss-block');
  if (lossBlock) lossBlock.style.display = p?.stage === 'lost' ? '' : 'none';
  document.getElementById('proj-loss-reason-in').value = p?.lossReason || '';
  document.getElementById('proj-loss-detail-in').value = p?.lossDetail || '';
  document.querySelectorAll('#proj-loss-block .loss-reason-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.r === p?.lossReason);
  });
  selectedLossReason = p?.lossReason || '';
  document.getElementById('project-modal').classList.add('open');
  /* Очищаем поля моста — при обычном открытии они не нужны */
  var _si = document.getElementById('proj-source-inn');
  var _sn = document.getElementById('proj-source-notes');
  var _sc = document.getElementById('proj-source-contacts');
  if (_si) _si.value = p?.sourceInn || '';
  if (_sn) _sn.value = '';
  if (_sc) _sc.value = '';
  setTimeout(() => document.getElementById('proj-name-in').focus(), 80);
}

function saveProject() {
  const id = document.getElementById('proj-edit-id').value;
  const stageVal = document.getElementById('proj-stage-in').value;
  const rawBudget = document.getElementById('proj-budget-in').value.replace(/\D/g,'');
  const data = {
    name:     document.getElementById('proj-name-in').value.trim(),
    client:   document.getElementById('proj-client-in').value.trim(),
    contact:  document.getElementById('proj-contact-in').value.trim(),
    deadline: document.getElementById('proj-deadline-in').value,
    budget:   rawBudget,
    stage:    stageVal === 'lost' ? 'lost' : parseInt(stageVal),
    owner:    document.getElementById('proj-owner-in').value.trim(),
    nextStep: document.getElementById('proj-nextstep-in').value.trim(),
  };
  if (stageVal === 'lost') {
    data.lossReason = document.getElementById('proj-loss-reason-in').value || selectedLossReason || 'Не указана';
    data.lossDetail = document.getElementById('proj-loss-detail-in').value.trim();
    if (!id) data.lostDate = new Date().toISOString().split('T')[0];
  }
  /* ── Prospect → Project bridge: сохраняем sourceInn ── */
  var sourceInnEl = document.getElementById('proj-source-inn');
  var sourceNotesEl = document.getElementById('proj-source-notes');
  if (!id && sourceInnEl && sourceInnEl.value) {
    data.sourceInn = sourceInnEl.value;
    if (sourceNotesEl && sourceNotesEl.value) {
      data.campaignNotes = sourceNotesEl.value;
    }
    /* Контакты из кампании */
    var sourceContactsEl = document.getElementById('proj-source-contacts');
    if (sourceContactsEl && sourceContactsEl.value) {
      try { data.contacts = JSON.parse(sourceContactsEl.value); } catch(e) {}
    }
  }
  if (!data.name) return;
  data._updatedAt = Date.now();
  if (id) {
    const p = projects.find(x => x.id === id);
    if (p) Object.assign(p, data);
  } else {
    projects.push({ id: uid(), ...data });
  }
  LS.set('wdb_projects', projects);
  /* ── Обновляем статус в кампании прозвона ── */
  if (!id && data.sourceInn) {
    try {
      var cRaw = JSON.parse(localStorage.getItem(PROSPECT_STORAGE_KEY)) || {};
      if (cRaw[data.sourceInn]) {
        cRaw[data.sourceInn].status = 'project';
        localStorage.setItem(PROSPECT_STORAGE_KEY, JSON.stringify(cRaw));
      }
    } catch(e) {}
  }
  closeModal('project-modal');
  renderProjects();
  renderProspects(); /* обновляем кнопки "В проекте ✓" */
  renderFunnel();    /* обновляем pipeline в воронке */
  renderPlanFact();  /* обновляем факт КП/сделок */
  /* Очищаем скрытые поля моста */
  var _sinn = document.getElementById('proj-source-inn');
  var _snot = document.getElementById('proj-source-notes');
  var _scon = document.getElementById('proj-source-contacts');
  if (_sinn) _sinn.value = '';
  if (_snot) _snot.value = '';
  if (_scon) _scon.value = '';
  toast(id ? 'Проект обновлён' : 'Проект создан', 'success');
  logActivity('folder', (id ? 'Обновил' : 'Создал') + ' проект: ' + data.name);
}

function deleteProject(id) {
  let deleted = projects.find(x => x.id === id);
  if (!deleted) return;
  let idx = projects.indexOf(deleted);
  projects = projects.filter(x => x.id !== id);
  LS.set('wdb_projects', projects);
  if(expandedProject === id) expandedProject = null;
  renderProjects();
  renderFunnel();
  renderPlanFact();
  toastUndo('Проект удалён', function() {
    projects.splice(idx, 0, deleted);
    LS.set('wdb_projects', projects);
    renderProjects();
    renderFunnel();
    renderPlanFact();
  });
}

function projCtx(id, e) {
  openProjectModal(id);
}
