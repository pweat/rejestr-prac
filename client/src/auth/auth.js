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
 * Pobiera token uwierzytelniający z localStorage.
 * @returns {string|null} Zapisany token JWT lub null, jeśli nie istnieje.
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
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
 * czy token istnieje w localStorage. Zmienia swoją wartość automatycznie.
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
