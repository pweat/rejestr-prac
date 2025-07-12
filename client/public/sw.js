// Prosty Service Worker - na razie tylko się instaluje
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalacja...');
  // W przyszłości tutaj dodamy logikę cachowania zasobów
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Aktywacja...');
});

self.addEventListener('fetch', (event) => {
  // Na razie nie przechwytujemy żądań, aplikacja działa normalnie online
});
