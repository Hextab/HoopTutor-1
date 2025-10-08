const CACHE_NAME = 'hooptutor-cache-v2';
const ASSETS = [
  '/',
  '/shooting.html',
  '/ball-handling.html',
  '/defense.html',
  '/fitness.html',
  '/library.html',
  '/login',
  '/profile',
  '/about.html',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/state.js',
  '/static/js/drill-library.js',
  '/static/data/drills.json',
  '/static/images/hero-basketball-court.jpg',
  '/static/images/shooting-drill.jpg',
  '/static/images/ball-handling-drill.jpg',
  '/static/images/defense-drill.jpg',
  '/static/images/fitness-drill.jpg',
  '/static/images/about_background.jpg',
  '/static/images/jordan_varsity_guard.jpg',
  '/static/images/user.jpg',
  '/static/images/wall-shooting.jpg',
  '/static/images/one-hand-shooting.jpg',
  '/static/images/elbow-shooting.jpg',
  '/static/images/catch-shoot.jpg',
  '/static/images/step-back.jpg',
  '/static/images/figure-8-dribble.jpg',
  '/static/images/cone-crossover.jpg',
  '/static/images/spider-dribble.jpg',
  '/static/images/two-ball-dribble.jpg',
  '/static/images/z-pattern-dribble.jpg',
  '/static/images/closeout-drill.jpg',
  '/static/images/mirror-drill.jpg',
  '/static/images/shell-drill.jpg',
  '/static/images/transition-recovery.jpg',
  '/static/images/avatar1.png',
  '/static/images/logo-placeholder.png',
  '/static/images/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.url.includes('/static/data/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
