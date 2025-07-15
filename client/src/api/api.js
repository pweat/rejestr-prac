// plik: client/src/api/api.js

import { getAuthHeaders, clearAuthData } from '../auth/auth.js';

// Nasz nowy, inteligentny "strażnik" dla zapytań fetch
export async function authenticatedFetch(url, options = {}) {
  // Dołączamy nagłówki autoryzacji do każdego zapytania
  const newOptions = {
    ...options,
    headers: {
      ...options.headers,
      ...getAuthHeaders(),
    },
  };

  const response = await fetch(url, newOptions);

  // Jeśli sesja wygasła (błąd 401 lub 403), wyloguj i przeładuj
  if (response.status === 401 || response.status === 403) {
    clearAuthData(); // Czyścimy stary token
    window.location.href = '/login'; // Przekierowujemy do logowania
    // Rzucamy błąd, aby zatrzymać dalsze wykonywanie kodu w komponencie
    throw new Error('Sesja wygasła. Proszę zalogować się ponownie.');
  }

  return response;
}
