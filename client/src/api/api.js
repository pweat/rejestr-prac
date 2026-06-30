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

  // Tylko wygaśnięcie sesji (401) powoduje wylogowanie
  if (response.status === 401) {
    clearAuthData();
    window.location.href = '/login';
    throw new Error('Sesja wygasła. Proszę zalogować się ponownie.');
  }

  return response;
}
