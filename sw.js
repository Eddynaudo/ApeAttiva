/* Ape Attiva CRM · service worker (notifiche push + installazione app) */
const VERSIONE = 'ape-crm-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Necessario per l'installazione come app: le richieste passano normalmente alla rete
self.addEventListener('fetch', () => {});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'Ape Attiva', {
      body: d.body || '',
      icon: 'img/icon-192.png',
      badge: 'img/badge-96.png',
      tag: d.tag || VERSIONE,
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: d.url || 'admin.html' }
    });
    if (self.navigator.setAppBadge) {
      const n = (await self.registration.getNotifications()).length;
      self.navigator.setAppBadge(n).catch(() => {});
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'admin.html', self.registration.scope).href;
  e.waitUntil((async () => {
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const crm = finestre.find(c => c.url.includes('admin.html'));
    if (crm) { await crm.focus(); crm.postMessage({ tipo: 'apri', url }); }
    else await self.clients.openWindow(url);
    if (self.navigator.clearAppBadge) {
      const n = (await self.registration.getNotifications()).length;
      n ? self.navigator.setAppBadge(n).catch(() => {}) : self.navigator.clearAppBadge().catch(() => {});
    }
  })());
});
