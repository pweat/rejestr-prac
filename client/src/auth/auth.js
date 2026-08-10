/**
 * @file auth.js
 * @description Moduł pomocniczy do zarządzania uwierzytelnianiem użytkownika.
 * Zawiera funkcje do obsługi tokenów JWT w localStorage, tworzenia nagłówków
 * autoryzacyjnych oraz sprawdzania statusu i roli zalogowanego użytkownika.
 */

import { computed } from 'vue';
import { jwtDecode } from 'jwt-decode';

/**
 * @constant {string} Klucz używany do przechowywania tokenu JWT w localStorage.
 */
const TOKEN_KEY = 'authToken';

// ===================================================================================
// === Podstawowe funkcje do zarządzania tokenem w localStorage ===
// ===================================================================================

/**
 * Zapisuje token uwierzytelniający w localStorage.
 * @param {string} token - Token JWT do zapisania.
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Sprawdza, czy podany token JWT jest ważny (istnieje i nie wygasł).
 * @param {string|null} token
 * @returns {boolean}
 */
function isTokenValid(token) {
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    // exp jest w sekundach unix; brak exp traktujemy jako nieważny
    if (!decoded.exp) return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/**
 * Pobiera ważny token uwierzytelniający z localStorage.
 * Wygasły lub uszkodzony token jest usuwany.
 * @returns {string|null} Token JWT lub null.
 */
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (!isTokenValid(token)) {
    removeToken();
    return null;
  }

  return token;
}

/**
 * Usuwa token uwierzytelniający z localStorage.
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ===================================================================================
// === Funkcje pomocnicze dla logiki aplikacji ===
// ===================================================================================

/**
 * Reaktywna właściwość (computed property) Vue, która sprawdza,
 * czy użytkownik ma ważny (nieprzeterminowany) token.
 * @returns {boolean} `true` jeśli użytkownik jest uwierzytelniony, w przeciwnym razie `false`.
 */
export const isAuthenticated = computed(() => !!getToken());

/**
 * Tworzy obiekt nagłówków HTTP potrzebny do autoryzacji zapytań do API.
 * @returns {object} Obiekt z nagłówkiem `Authorization: Bearer <token>` lub pusty obiekt, jeśli token nie istnieje.
 */
export function getAuthHeaders() {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Dekoduje token JWT, aby uzyskać rolę użytkownika.
 * @returns {string|null} Rola użytkownika (np. 'admin', 'editor') lub null, jeśli token jest nieprawidłowy lub nie istnieje.
 */
export function getUserRole() {
  const token = getToken();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode(token);
    return decoded.role;
  } catch (error) {
    console.error('Błąd dekodowania tokenu:', error);
    // Dla bezpieczeństwa usuwamy uszkodzony lub nieważny token.
    // Dzięki temu aplikacja nie będzie próbowała go używać w kolejnych zapytaniach.
    removeToken();
    return null;
  }
}

export function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  // W przyszłości, jeśli będziemy zapisywać więcej danych (np. nazwę użytkownika),
  // dodamy je tutaj do usunięcia.
}
