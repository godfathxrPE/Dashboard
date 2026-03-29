/* Module: features/pomodoro.js */
/* ── POMODORO ТАЙМЕР ── */
const TIMER_MODES = { work: 25*60, short: 5*60, long: 15*60 };
let timerMode     = 'work';
let timerTotal    = TIMER_MODES.work;
let timerLeft     = TIMER_MODES.work;
let timerRunning  = false;
let timerInterval = null;
let timerSessions = LS.get('wdb_timer_sessions', 0);

function setTimerMode(mode) {
  if (timerRunning) return; // не переключать во время работы
  timerMode  = mode;
  timerTotal = TIMER_MODES[mode];
  timerLeft  = timerTotal;
  ['work','short','long'].forEach(m => {
    const btn = document.getElementById('tbtn-'+m);
    if (btn) btn.classList.toggle('active', m === mode);
  });
  renderTimer();
}

function renderTimer() {
  const m = String(Math.floor(timerLeft/60)).padStart(2,'0');
  const s = String(timerLeft%60).padStart(2,'0');
  const dig = document.getElementById('timer-digits');
  if (dig) {
    dig.textContent = m + ':' + s;
    dig.className = 'w-timer-digits' + (timerRunning ? ' running' : '') + (timerLeft <= 60 && timerRunning ? ' alert' : '');
  }
  const bar = document.getElementById('timer-bar');
  if (bar) bar.style.width = Math.round((timerLeft / timerTotal) * 100) + '%';
  const playBtn = document.getElementById('timer-play-btn');
  if (playBtn) playBtn.textContent = timerRunning ? '⏸ Пауза' : '▶ Старт';
  // сессии
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('ts-'+i);
    if (dot) dot.classList.toggle('done', i < timerSessions % 4);
  }
}

function timerPlayPause() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
  } else {
    timerRunning = true;
    timerInterval = setInterval(() => {
      timerLeft--;
      if (timerLeft <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerLeft = 0;
        renderTimer();
        timerDone();
        return;
      }
      renderTimer();
    }, 1000);
  }
  renderTimer();
}

function timerReset() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft    = timerTotal;
  renderTimer();
}

function timerDone() {
  if (timerMode === 'work') {
    timerSessions++;
    LS.set('wdb_timer_sessions', timerSessions);
    checkCelebration('pomodoro');
  }
  renderTimer();
  // Уведомление
  try {
    if (Notification.permission === 'granted') {
      new Notification(timerMode === 'work' ? '⏱ Фокус завершён! Время отдохнуть.' : '🎯 Пауза закончилась. За работу!');
    }
  } catch(e) {}
  // Запрашиваем разрешение если нет
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
renderTimer();
