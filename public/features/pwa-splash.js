let pwaInstallPrompt = null;

// Браузер говорит "можно установить" — показываем кнопку
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  pwaInstallPrompt = e;
  let btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'flex';
});

// Пользователь нажал кнопку — показываем системный диалог
function installPWA() {
  if (!pwaInstallPrompt) return;
  pwaInstallPrompt.prompt();
  pwaInstallPrompt.userChoice.then(function(result) {
    if (result.outcome === 'accepted') {
      let btn = document.getElementById('pwa-install-btn');
      if (btn) btn.style.display = 'none';
    }
    pwaInstallPrompt = null;
  });
}

// Уже установлено — прячем кнопку
window.addEventListener('appinstalled', function() {
  let btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
});
(function() {
  'use strict';

  /* ── Canvas setup ── */
  let canvas = document.getElementById('screen-canvas');
  if (!canvas) return;
  let ctx    = canvas.getContext('2d');
  let dpr    = Math.min(window.devicePixelRatio || 1, 2);
  let W, H;
  let animId = null;
  let startTime = performance.now();

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Theme colors ── */
  function getThemeColors() {
    let s = getComputedStyle(document.documentElement);
    return {
      bg:     s.getPropertyValue('--bg').trim()      || '#f5f4ef',
      accent: s.getPropertyValue('--accent').trim()   || '#b5622a',
      green:  s.getPropertyValue('--green').trim()    || '#2e7d52',
      blue:   s.getPropertyValue('--blue').trim()     || '#2d6ab4',
      red:    s.getPropertyValue('--red').trim()      || '#c0392b',
      mute:   s.getPropertyValue('--text-mute').trim()|| '#a8a59e'
    };
  }
  function parseColor(str) {
    if (str.charAt(0) === '#') {
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
    }
    let m = str.match(/[\d.]+/g);
    if (m && m.length >= 3) return { r: parseInt(m[0]), g: parseInt(m[1]), b: parseInt(m[2]) };
    return { r: 180, g: 100, b: 40 };
  }
  function isDark(bgColor) {
    let c = parseColor(bgColor);
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 < 0.45;
  }

  let colors = getThemeColors();
  let dark   = isDark(colors.bg);

  /* ── Орбы ── */
  let orbs = [
    { x:0.15, y:0.25, r:0.50, color:parseColor(colors.accent), alpha: dark?0.35:0.45, sx:0.13, sy:0.10, px:0,   py:0.5  },
    { x:0.80, y:0.18, r:0.42, color:parseColor(colors.blue),   alpha: dark?0.28:0.35, sx:0.10, sy:0.15, px:1.2, py:0    },
    { x:0.50, y:0.78, r:0.48, color:parseColor(colors.green),  alpha: dark?0.25:0.30, sx:0.16, sy:0.09, px:2.4, py:1.8  },
    { x:0.12, y:0.68, r:0.32, color:parseColor(colors.red),    alpha: dark?0.18:0.22, sx:0.09, sy:0.14, px:3.6, py:3.0  },
    { x:0.82, y:0.62, r:0.38, color:parseColor(colors.accent), alpha: dark?0.20:0.28, sx:0.12, sy:0.11, px:4.8, py:2.2  },
    { x:0.50, y:0.12, r:0.30, color:parseColor(colors.mute),   alpha: dark?0.15:0.20, sx:0.14, sy:0.10, px:0.8, py:4.0  }];
  let AMP_X = 0.12, AMP_Y = 0.10;

  /* ── Render loop ── */
  function draw(t) {
    let elapsed = (t - startTime) / 1000;
    let bgC = parseColor(colors.bg);

    ctx.fillStyle = 'rgb(' + bgC.r + ',' + bgC.g + ',' + bgC.b + ')';
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = dark ? 'lighter' : 'multiply';

    for (let i = 0; i < orbs.length; i++) {
      let o = orbs[i];
      let cx = (o.x + Math.sin(elapsed * o.sx + o.px) * AMP_X) * W;
      let cy = (o.y + Math.cos(elapsed * o.sy + o.py) * AMP_Y) * H;
      let radius = o.r * Math.min(W, H) * (1 + Math.sin(elapsed * 0.3 + i * 1.1) * 0.06);

      let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      let c = o.color;

      if (dark) {
        grad.addColorStop(0,   'rgba('+c.r+','+c.g+','+c.b+','+o.alpha+')');
        grad.addColorStop(0.4, 'rgba('+c.r+','+c.g+','+c.b+','+(o.alpha*0.6)+')');
        grad.addColorStop(1,   'rgba('+c.r+','+c.g+','+c.b+',0)');
      } else {
        let a = o.alpha;
        let mr = Math.round(c.r + (255 - c.r) * (1 - a));
        let mg = Math.round(c.g + (255 - c.g) * (1 - a));
        let mb = Math.round(c.b + (255 - c.b) * (1 - a));
        grad.addColorStop(0,   'rgb('+mr+','+mg+','+mb+')');
        let mr2 = Math.round(c.r + (255 - c.r) * (1 - a * 0.4));
        let mg2 = Math.round(c.g + (255 - c.g) * (1 - a * 0.4));
        let mb2 = Math.round(c.b + (255 - c.b) * (1 - a * 0.4));
        grad.addColorStop(0.5, 'rgb('+mr2+','+mg2+','+mb2+')');
        grad.addColorStop(1,   'rgb(255,255,255)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalCompositeOperation = 'source-over';

    let vign = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.72);
    vign.addColorStop(0, 'rgba('+bgC.r+','+bgC.g+','+bgC.b+',0)');
    vign.addColorStop(1, 'rgba('+bgC.r+','+bgC.g+','+bgC.b+','+(dark?0.55:0.45)+')');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    animId = requestAnimationFrame(draw);
  }
  animId = requestAnimationFrame(draw);

  /* ── Splash content: greeting + clock + date ── */
  let greetEl = document.getElementById('sp-greeting');
  if (greetEl) {
    let h = new Date().getHours();
    greetEl.textContent = h >= 5 && h < 12 ? 'Доброе утро'
                        : h >= 12 && h < 17 ? 'Добрый день'
                        : h >= 17 && h < 22 ? 'Добрый вечер'
                        : 'Доброй ночи';
  }

  function screenClock() {
    let now = new Date();
    let hh = String(now.getHours()).padStart(2, '0');
    let mm = String(now.getMinutes()).padStart(2, '0');
    let el = document.getElementById('sp-clock');
    if (el) el.innerHTML = hh + '<span class="clock-sep">:</span>' + mm;
  }
  screenClock();
  let clockInt = setInterval(screenClock, 1000);

  let dateEl = document.getElementById('sp-date');
  if (dateEl) {
    let now = new Date();
    let days   = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    let months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
    dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()];
  }

  /* ═══ TWO-PHASE TRANSITION ═══
     Флаг _screenAuth устанавливается из initAuth().
     — true  = нет сессии → splash morph → auth form
     — false = есть сессия → splash → fade out → dashboard
     Если initAuth() ещё не выполнился к моменту таймера,
     ждём (не переключаемся преждевременно). */
  window._screenAuthResolved = false;
  window._screenNeedsAuth    = true; // по умолчанию — показываем auth

  /* Убирает canvas и очищает ресурсы */
  function killCanvas() {
    cancelAnimationFrame(animId);
    clearInterval(clockInt);
  }

  /* Скрывает весь экран (для перехода к дашборду) */
  window.screenHide = function() {
    let screen = document.getElementById('screen');
    if (screen) screen.classList.add('hidden');
    /* Останавливаем RAF сразу — нет смысла рендерить canvas
       пока экран fade-out'ится (opacity → 0, visibility → hidden) */
    killCanvas();
  };

  /* Переключает splash → auth form */
  function showAuthPhase() {
    let splashPhase = document.getElementById('splash-phase');
    if (splashPhase) splashPhase.classList.add('exit');
    let authPhase = document.getElementById('auth-phase');
    if (authPhase) authPhase.classList.add('enter');
    setTimeout(function() {
      let emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.focus();
    }, 900);
  }

  /* Таймер: после progress bar решаем что делать */
  let SPLASH_DURATION = 4200; // 0.8s delay + 3.2s fill + buffer

  setTimeout(function() {
    /* Если auth ещё не определился — ждём */
    if (!window._screenAuthResolved) {
      let waitInt = setInterval(function() {
        if (window._screenAuthResolved) {
          clearInterval(waitInt);
          if (window._screenNeedsAuth) {
            showAuthPhase();
          }
          /* Если не нужен auth — screenHide() уже вызван из showDashboard() */
        }
      }, 100);
      return;
    }
    /* Auth уже определился к этому моменту */
    if (window._screenNeedsAuth) {
      showAuthPhase();
    }
  }, SPLASH_DURATION);

})();
