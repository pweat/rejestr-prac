import { getAuthHeaders, clearAuthData } from '../auth/auth.js';

export async function authenticatedFetch(url, options = {}) {
  const defaultHeaders = getAuthHeaders();

  // NOWA LOGIKA: Jeśli w zapytaniu jest 'body', automatycznie dodaj nagłówek JSON
  if (options.body) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const newOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, newOptions);

  // Jeśli sesja wygasła (błąd 401 lub 403), wyloguj i przeładuj
  if (response.status === 401 || response.status === 403) {
    clearAuthData();
    window.location.href = '/login';
    // Rzucamy błąd, aby zatrzymać dalsze wykonywanie kodu w komponencie
    throw new Error('Sesja wygasła. Proszę zalogować się ponownie.');
  }

  return response;
}
