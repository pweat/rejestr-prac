// plik: src/auth/auth.js
import { ref, computed } from 'vue';

export const token = ref(localStorage.getItem('authToken'));
export const isAuthenticated = computed(() => !!token.value);

// ZMIANA: Tworzymy funkcję, która zwraca gotowe do użycia nagłówki
export function getAuthHeaders() {
  if (token.value) {
    return { 'Authorization': `Bearer ${token.value}` };
  }
  return {};
}

export function setToken(newToken) {
  token.value = newToken;
  localStorage.setItem('authToken', newToken);
}

export function removeToken() {
  token.value = null;
  localStorage.removeItem('authToken');
}