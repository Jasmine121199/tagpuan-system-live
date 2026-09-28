// TAGPUAN FOOD HUB ERP - Progressive Web App Service Worker
// Multi-Tier Caching with 'Stale-While-Revalidate' for Core UI Assets & Fonts
// Ensures offline resilience and smooth performance during intermittent connectivity

const CACHE_VERSION = 'v2.1.0';
const STATIC_CACHE = `tagpuan-static-${CACHE_VERSION}`;
const ASSET_CACHE = `tagpuan-assets-${CACHE_VERSION}`;
const FONT_CACHE = `tagpuan-fonts-${CACHE_VERSION}`;

const CURRENT_CACHES = [STATIC_CACHE, ASSET_CACHE, FONT_CACHE];

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Helper: Determine if URL is a font resource
function isFontRequest(url, request) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    request.destination === 'font' ||
    /\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(url.pathname)
  );
}

// Helper: Determine if URL is a core UI asset (scripts, styles, images)
function isCoreUIAsset(url, request) {
  // Stylesheets
  if (request.destination === 'style' || /\.css(\?.*)?$/i.test(url.pathname)) {
    return true;
  }
  // Scripts and module chunks
  if (
    request.destination === 'script' ||
    /\.(js|mjs)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/src/')
  ) {
    return true;
  }
  // Visual assets & icons
  if (
    request.destination === 'image' ||
    /\.(png|jpe?g|svg|webp|ico|gif)(\?.*)?$/i.test(url.pathname) ||
    url.pathname.startsWith('/icons/')
  ) {
    return true;
  }
  // Manifest & Web App Metadata
  if (url.pathname === '/manifest.json' || url.pathname === '/manifest.webmanifest') {
    return true;
  }

  return false;
}

/**
 * Generic Stale-While-Revalidate Handler:
 * 1. Checks cache and immediately responds with cached data if available (Fast).
 * 2. Simultaneously triggers a background network fetch to revalidate and update the cache (Fresh).
 * 3. If cache misses, awaits network fetch and populates cache.
 * 4. Gracefully falls back when network is intermittent or offline.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Background fetch for revalidation
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      // Cache valid responses (including opaque responses for cross-origin assets like Google Fonts)
      if (
        networkResponse &&
        (networkResponse.status === 200 || networkResponse.type === 'opaque')
      ) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((err) => {
      // Intermittent or offline network failure
      // If we have a cached version, it was already served; log only for debugging
      return cachedResponse || null;
    });

  // Stale hit: return immediately while background revalidation updates the cache
  if (cachedResponse) {
    return cachedResponse;
  }

  // Cache miss: wait for the network response
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }
  } catch (err) {
    // Both cache and network failed
  }

  // Offline fallback response for missing UI asset
  return new Response('Asset temporarily unavailable offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: new Headers({ 'Content-Type': 'text/plain' })
  });
}

// 1. INSTALL EVENT - Pre-cache safe app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      console.log('[Tagpuan SW] Pre-caching core app shell');
      // Resilient pre-caching: add assets safely without breaking install if an optional icon is absent
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[Tagpuan SW] Optional asset skipped during pre-cache: ${asset}`, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT - Clean up outdated cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!CURRENT_CACHES.includes(key)) {
            console.log('[Tagpuan SW] Purging obsolete cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT - Route requests with optimal strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations always hit network directly)
  if (request.method !== 'GET') {
    return;
  }

  // Ignore unsupported schemes (e.g. chrome-extension, file)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // STRICT REAL-TIME BYPASS:
  // Never cache live backend API endpoints (/api/*), Supabase, WebSockets, or live telemetry
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/socket.io')
  ) {
    return; // Pass through to network directly
  }

  // STRATEGY A: STALE-WHILE-REVALIDATE FOR FONTS (Google Fonts & Webfonts)
  if (isFontRequest(url, request)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // STRATEGY B: STALE-WHILE-REVALIDATE FOR CORE UI ASSETS (JS, CSS, Images, Icons)
  if (isCoreUIAsset(url, request)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // STRATEGY C: NAVIGATION REQUESTS (HTML / SPA Entry Point)
  // Network-First with Cache Fallback to /index.html ensures online users get latest build
  // while offline users seamlessly load the Tagpuan SPA shell.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cachedShell) => {
            if (cachedShell) {
              return cachedShell;
            }
            return caches.match(request).then((fallback) => {
              if (fallback) {
                return fallback;
              }
              return new Response(
                '<!DOCTYPE html><html><head><title>Tagpuan ERP - Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Tagpuan ERP Offline</h2><p>Working offline. Core features and cached data remain available.</p></body></html>',
                {
                  status: 200,
                  headers: new Headers({ 'Content-Type': 'text/html' })
                }
              );
            });
          });
        })
    );
    return;
  }

  // DEFAULT FALLBACK: Stale-While-Revalidate for other static assets
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// 4. MESSAGE EVENT - Immediate updates when user triggers update prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
