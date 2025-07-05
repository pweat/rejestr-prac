import { computed } from 'vue';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'authToken';

// --- Podstawowe funkcje do zarządzania tokenem ---

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// --- Funkcje pomocnicze dla aplikacji ---

// Reaktywna zmienna sprawdzająca, czy użytkownik jest zalogowany
export const isAuthenticated = computed(() => !!getToken());

// Tworzy nagłówki potrzebne do autoryzacji zapytań API
export function getAuthHeaders() {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// Dekoduje token i zwraca rolę użytkownika
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
    // W przypadku błędu (np. uszkodzony token), usuwamy go dla bezpieczeństwa
    removeToken();
    return null;
  }
}
