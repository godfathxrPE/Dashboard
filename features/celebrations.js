/* ══════════════════════════════════════════
   FOCUS MODE + CELEBRATION SYSTEM
   Module: features/celebrations.js
   Dependencies: toast, playSound, celebrate
══════════════════════════════════════════ */

/* ── FOCUS MODE (ZEN MODE) ──
   Паттерн: Distraction-Free Mode (Linear, Bear, iA Writer). */
var focusModeActive = false;

function toggleFocusMode() {
  focusModeActive = !focusModeActive;
  document.body.classList.toggle('focus-mode', focusModeActive);

  if (focusModeActive) {
    toast('Режим фокуса включён', 'info', 2000);
    var tasks = document.querySelector('.tasks-block');
    if (tasks) tasks.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    toast('Режим фокуса выключен', 'info', 1500);
  }
}

function exitFocusMode() {
  if (!focusModeActive) return;
  focusModeActive = false;
  document.body.classList.remove('focus-mode');
}


/* ── CELEBRATION SYSTEM — Canvas Confetti ──
   Паттерн: Achievement Celebration (Asana, Stripe). */
function celebrate(intensity) {
  intensity = intensity || 'small';
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var counts = { small: 30, medium: 60, big: 120 };
  var count = counts[intensity] || 30;

  var style = getComputedStyle(document.documentElement);
  var accentColor = style.getPropertyValue('--accent').trim() || '#b5622a';
  var greenColor = style.getPropertyValue('--green').trim() || '#2e7d52';
  var blueColor = style.getPropertyValue('--blue').trim() || '#2d6ab4';
  var yellowColor = style.getPropertyValue('--yellow').trim() || '#a07020';

  var colors = [accentColor, greenColor, blueColor, yellowColor, '#fff'];

  var particles = [];
  for (var i = 0; i < count; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.4,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * (intensity === 'big' ? 16 : 10),
      vy: -(Math.random() * 12 + 4),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.15 + Math.random() * 0.1,
      opacity: 1,
      decay: 0.008 + Math.random() * 0.008,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }

  var startTime = performance.now();
  var duration = intensity === 'big' ? 3000 : intensity === 'medium' ? 2000 : 1200;

  function frame(now) {
    var elapsed = now - startTime;
    if (elapsed > duration) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(function(p) {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity -= p.decay;
      if (p.opacity <= 0) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ── Celebration triggers ── */
var _lastCelebratedKPI = false;

function checkCelebration(type, data) {
  switch (type) {
    case 'task-done':
      celebrate('small');
      playSound('tick');
      break;
    case 'pomodoro':
      celebrate('medium');
      playSound('chime');
      if (focusModeActive) {
        setTimeout(function() {
          exitFocusMode();
          toast('Pomodoro завершён! Время отдохнуть.', 'success', 3000);
        }, 1000);
      }
      break;
    case 'kpi-100':
      if (!_lastCelebratedKPI) {
        _lastCelebratedKPI = true;
        celebrate('big');
        playSound('success');
        toast('KPI выполнен на 100%!', 'success', 4000);
      }
      break;
    case 'kpi-reset':
      _lastCelebratedKPI = false;
      break;
    case 'all-tasks-done':
      celebrate('big');
      playSound('success');
      toast('Все задачи "Сейчас" выполнены!', 'success', 3000);
      break;
  }
}

/* ── DOMContentLoaded — запуск UI-эффектов при загрузке ── */
document.addEventListener('DOMContentLoaded', function() {
  showSkeletons();
  replaceEmoji();
  initGreeting();
  tourAutoStart();
  updateStreak();
});
