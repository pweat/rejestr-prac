const CACHE_NAME = 'zentroo-cache-v1';
// Lista plików, które tworzą "skorupę" aplikacji i powinny być zawsze dostępne.
const urlsToCache = [
  '/',
  '/index.html',
  // Vite generuje pliki z hashami, więc bezpośrednie cachowanie
  // plików JS/CSS jest trudne. Zamiast tego skupimy się na cachowaniu odpowiedzi API.
];

// Instalacja Service Workera i cachowanie skorupy aplikacji
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalacja');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Otwarto cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Aktywacja Service Workera i czyszczenie starych cache'y
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Przechwytywanie żądań sieciowych
self.addEventListener('fetch', (event) => {
  // Dla żądań do API stosujemy strategię "Network Falling Back to Cache"
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Jeśli odpowiedź jest poprawna, klonujemy ją i zapisujemy w cache
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Jeśli sieć zawiedzie, próbujemy pobrać odpowiedź z cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Dla wszystkich innych żądań (np. skorupa aplikacji, czcionki, style) stosujemy "Cache First"
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Jeśli zasób jest w cache, zwracamy go
      if (response) {
        return response;
      }
      // W przeciwnym razie, pobieramy go z sieci
      return fetch(event.request);
    })
  );
});
