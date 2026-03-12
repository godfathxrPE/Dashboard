// ══ SERVICE WORKER — Рабочий дашборд ══
// Версия кэша — меняй при обновлении файлов
const CACHE_NAME = 'dashboard-v2';

// Файлы которые кэшируем при установке
const ASSETS = [
  '/',
  '/index.html',
  '/splash-bg.jpg',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
];

// Установка — кэшируем все файлы
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация — удаляем старые кэши
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Запросы — сначала сеть, при ошибке — кэш (Network First)
self.addEventListener('fetch', function(e) {
  // Firebase запросы не кэшируем — они должны быть всегда свежими
  if (e.request.url.includes('firebaseio.com') ||
      e.request.url.includes('googleapis.com/firebase')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Сохраняем свежую копию в кэш
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, copy);
        });
        return response;
      })
      .catch(function() {
        // Нет сети — берём из кэша
        return caches.match(e.request);
      })
  );
});
