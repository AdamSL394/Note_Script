/// <reference lib="webworker" />

// This service worker follows the standard Create React App / Workbox
// pattern -- react-scripts detects this exact file (src/service-worker.ts)
// during `npm run build` and processes it with workbox-webpack-plugin's
// InjectManifest mode, which is what fills in self.__WB_MANIFEST below
// with the actual list of build assets to precache. Nothing else needs
// to change for this to work; react-scripts already bundles Workbox as
// a dependency for exactly this purpose.

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precaches every asset from the production build (JS, CSS, the app
// shell) -- this is what makes the app load instantly on repeat visits
// and gives basic offline access to the shell itself.
precacheAndRoute(self.__WB_MANIFEST);

// Client-side routing: any navigation request that isn't for an actual
// static file (e.g. a deep link into /notes while offline) falls back
// to the cached index.html shell, letting the React Router take over
// once the JS loads, instead of hitting the network and failing.
const fileExtensionRegexp = /[^/?]+\.[^/]+$/;
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL('/index.html')
);

// Runtime caching for same-origin static assets Workbox didn't already
// precache (e.g. anything fetched dynamically after the initial load).
// Deliberately scoped to /static/ only -- API calls (/notes/*, etc.)
// are never cached here, since journal entries need to stay live and
// current, not served from a possibly-stale cache.
registerRoute(
  ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.startsWith('/static/'),
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Lets the app trigger an immediate update (skip waiting for all tabs
// to close) via serviceWorkerRegistration's update-available flow,
// rather than the new version silently waiting until every tab is
// closed and reopened.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Displays the actual notification when a push arrives from the
// server. event.waitUntil keeps the service worker alive until
// showNotification's promise resolves -- without it, the worker could
// be terminated mid-display on some browsers.
self.addEventListener('push', (event) => {
  let payload = { title: 'Note Script', body: "You haven't logged today yet." };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      // Falls back to the default payload above if the push data
      // isn't valid JSON for any reason, rather than throwing and
      // showing no notification at all.
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

// Focuses an already-open tab of the app if one exists, rather than
// always opening a fresh one -- most users clicking a reminder notification
// already have the app open in some tab or window.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
