/* ══════════════════════════════════════════
   SUPABASE AUTH
   Module: lib/auth.js
   Dependencies: supabase CDN, screenHide, sbSyncInit
══════════════════════════════════════════ */
const SUPABASE_URL      = 'https://uoiavcabxgdjugzryrmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvaWF2Y2FieGdkanVnenJ5cm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODUyOTgsImV4cCI6MjA4OTE2MTI5OH0.Q64IVBFl_7LQd1SaBqbFu-QFkMwPQViMAnnmZPommqo';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function initAuth() {
  const { data: { session } } = await _sb.auth.getSession();
  session ? showDashboard(session.user) : showLoginScreen();
  _sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN')  showDashboard(session.user);
    if (event === 'SIGNED_OUT') showLoginScreen();
  });
}

async function sendMagicLink(email) {
  if (!email || !email.includes('@')) { showMsg('Введи корректный email', 'err'); return; }
  var btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';
  showMsg('', '');
  const { error } = await _sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: 'https://godfathxrpe.github.io/Dashboard/' }
  });
  if (error) {
    var msg = error.message.includes('not found')
      ? '⚠️ Email не найден. Попроси администратора добавить тебя.'
      : error.message.includes('rate limit')
      ? '⏳ Слишком много попыток. Подожди 10 минут и попробуй снова.'
      : 'Ошибка: ' + error.message;
    showMsg(msg, 'err');
    btn.disabled = false;
    btn.textContent = 'Войти через email';
  } else {
    showMsg('✉️ Письмо отправлено! Проверь почту и кликни ссылку.', 'ok');
  }
}

async function signOut() { await _sb.auth.signOut(); }

function showDashboard(user) {
  window._screenAuthResolved = true;
  window._screenNeedsAuth    = false;
  document.getElementById('app').style.display = 'block';
  if (window.screenHide) window.screenHide();
  var badge = document.getElementById('user-badge');
  if (badge) badge.textContent = user.email.split('@')[0];
  sbSyncInit(user);
}

function showLoginScreen() {
  window._screenAuthResolved = true;
  window._screenNeedsAuth    = true;
  document.getElementById('app').style.display = 'none';
  var screen = document.getElementById('screen');
  if (screen) { screen.classList.remove('hidden'); screen.style.display = 'flex'; }
  var splashPhase = document.getElementById('splash-phase');
  var authPhase   = document.getElementById('auth-phase');
  if (splashPhase && splashPhase.classList.contains('exit')) {
    if (authPhase) authPhase.classList.add('enter');
  }
}

function showMsg(text, type) {
  var el = document.getElementById('login-msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'err' ? '#c0392b' : type === 'ok' ? '#2e7d52' : 'var(--text-dim, #6b6860)';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
