/**
 * Service Worker for AISchool Offline Mode
 *
 * Strategy:
 *   - Static assets & pages → Cache First
 *   - API calls → Network First with offline queue fallback
 *   - Course content (videos, PDFs) → Cache First with versioning
 *
 * Offline queue is stored in IndexedDB via the client-side useOfflineSync hook.
 * On reconnect, the hook POSTs queued records to /api/offline-sync.
 */

const CACHE_VERSION = 'aischool-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const CONTENT_CACHE = `${CACHE_VERSION}-content`;

const PRECACHE_URLS = [
  '/',
  '/dashboard/student',
  '/offline',
  '/manifest.json',
];

const CONTENT_ORIGINS = [
  '/api/courses',
  '/api/assignments',
  '/api/live-session',
];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('aischool-') && k !== STATIC_CACHE && k !== CONTENT_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for offline queuing (handled by client)
  if (request.method !== 'GET') return;

  // Content assets — Cache First
  if (isContentRequest(url)) {
    event.respondWith(contentCacheFirst(request));
    return;
  }

  // API calls — Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Navigation — Network First with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Static assets — Cache First
  event.respondWith(staticCacheFirst(request));
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isContentRequest(url) {
  return (
    url.pathname.includes('/course-content/') ||
    url.pathname.endsWith('.pdf') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.webm')
  );
}

async function contentCacheFirst(request) {
  const cache = await caches.open(CONTENT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Content unavailable offline', { status: 503 });
  }
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigationHandler(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match('/offline')) ?? (await cache.match('/'));
  }
}

async function staticCacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(triggerOfflineSync());
  }
});

async function triggerOfflineSync() {
  // Notify all clients to run their sync logic
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
  }
}
