const STATIC_CACHE = 'gastando-static-v1'

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (!url.protocol.startsWith('http')) return

  // Cache-first for Next.js static assets (they have content hashes — safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Network-first for everything else (pages, API calls)
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(r => r ?? new Response('', { status: 503 }))
    )
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  const title = data.title ?? 'Gastando'
  const options = {
    body: data.body ?? '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag ?? 'gastando-aviso',
    data: { url: data.url ?? '/avisos' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/avisos'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
