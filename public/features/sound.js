/* ══════════════════════════════════════════
   SOUND DESIGN
   Module: features/sound.js
   Паттерн: Subtle UI Sounds (Asana, Things 3, Notion).
   Web Audio API синтезированные звуки. Без файлов.
   Dependencies: toast
══════════════════════════════════════════ */
var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}

function soundEnabled() {
  return localStorage.getItem('wdb_sounds') !== 'off';
}

function playSound(type) {
  if (!soundEnabled()) return;
  var ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (type) {
    case 'tick':
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
      break;

    case 'chime':
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      setTimeout(function() {
        var o2 = ctx.createOscillator();
        var g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 1320;
        o2.type = 'sine';
        g2.gain.setValueAtTime(0.08, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o2.start(ctx.currentTime);
        o2.stop(ctx.currentTime + 0.5);
      }, 200);
      break;

    case 'click':
      osc.frequency.value = 600;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
      break;

    case 'success':
      osc.frequency.value = 523;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      setTimeout(function() {
        var o2 = ctx.createOscillator(); var g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.value = 659; o2.type = 'sine';
        g2.gain.setValueAtTime(0.07, ctx.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.3);
      }, 120);
      setTimeout(function() {
        var o3 = ctx.createOscillator(); var g3 = ctx.createGain();
        o3.connect(g3); g3.connect(ctx.destination);
        o3.frequency.value = 784; o3.type = 'sine';
        g3.gain.setValueAtTime(0.06, ctx.currentTime);
        g3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o3.start(ctx.currentTime); o3.stop(ctx.currentTime + 0.4);
      }, 240);
      break;
  }
}

function toggleSounds() {
  var on = soundEnabled();
  localStorage.setItem('wdb_sounds', on ? 'off' : 'on');
  toast(on ? 'Звуки выключены' : 'Звуки включены', 'info', 1500);
  if (!on) playSound('click');
}
