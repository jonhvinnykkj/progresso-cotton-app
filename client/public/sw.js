// Service Worker for PWA offline functionality
const CACHE_NAME = 'bale-tracker-v4-superadmin';
const RUNTIME_CACHE = 'runtime-cache-v4';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests: network first with offline queue
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses (only GET requests)
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Fallback to cache for GET requests
          if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
          }

          // Queue POST/PATCH requests for sync
          if (request.method === 'POST' || request.method === 'PATCH') {
            await queueOfflineRequest(request);
            return new Response(
              JSON.stringify({ offline: true, queued: true }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Return offline response
          return new Response(
            JSON.stringify({ error: 'Offline', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Cache successful responses (only GET requests)
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Offline queue management
async function queueOfflineRequest(request) {
  const db = await openDB();
  const tx = db.transaction('offline-queue', 'readwrite');
  const store = tx.objectStore('offline-queue');

  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now(),
  };

  await new Promise((resolve, reject) => {
    const addRequest = store.add(requestData);
    addRequest.onsuccess = () => resolve();
    addRequest.onerror = () => reject(addRequest.error);
  });
  
  // Register background sync
  try {
    await self.registration.sync.register('sync-offline-queue');
  } catch (error) {
    console.log('Background sync not supported, will sync on online event:', error);
    // Fallback: sync will be triggered on online event
  }
  
  // Notify clients that a request was queued
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'REQUEST_QUEUED',
        data: { url: request.url, method: request.method },
      });
    });
  });
}

// IndexedDB for offline queue
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bale-tracker-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const db = await openDB();
  const tx = db.transaction('offline-queue', 'readonly');
  const store = tx.objectStore('offline-queue');
  
  // Properly await the getAll() request
  const requests = await new Promise((resolve, reject) => {
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });

  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });

      if (response.ok) {
        // Remove from queue on success
        const deleteTx = db.transaction('offline-queue', 'readwrite');
        const deleteStore = deleteTx.objectStore('offline-queue');
        
        await new Promise((resolve, reject) => {
          const deleteRequest = deleteStore.delete(req.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });

        // Notify clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              data: { url: req.url, method: req.method },
            });
          });
        });
      }
    } catch (error) {
      console.error('Sync failed for request:', req.url, error);
    }
  }
}

// Listen for online event to trigger sync
self.addEventListener('message', (event) => {
  if (event.data.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('sync-offline-queue').catch((err) => {
      console.error('Sync registration failed:', err);
      // Fallback: trigger sync directly
      syncOfflineQueue();
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Navigate to the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});
