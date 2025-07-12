// plik: client/public/sw.js

self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalacja');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja');
});

// NOWA, DZIAŁAJĄCA WERSJA
self.addEventListener('fetch', (event) => {
  // Na razie stosujemy strategię "tylko sieć".
  // Oznacza to, że Service Worker przechwytuje żądanie, ale po prostu przekazuje je dalej do sieci.
  // To wystarczy, aby przeglądarka uznała naszą aplikację za PWA.
  // W przyszłości dodamy tu logikę cachowania zasobów (pracy w trybie offline).
  event.respondWith(fetch(event.request));
});
