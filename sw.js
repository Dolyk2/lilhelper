/* Service worker: only shows notifications. It caches nothing, so new versions of the app load normally. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Us', {
    body: d.body || 'Something new was added.',
    icon: 'apple-icon-v4.png',
    badge: 'favicon-us.png',
    tag: d.tag || 'us-update', // a newer notification replaces the older one instead of piling up
    data: { url: d.url || './' }
  }));
});

/* Tapping a notification opens the app on the new item (the link looks like ./#tasks/abc123). */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    if (c) { await c.focus(); c.postMessage({ type: 'open', url }); return; } // app already open: let it jump there
    return self.clients.openWindow(url); // app closed: open it straight on that item
  }));
});
