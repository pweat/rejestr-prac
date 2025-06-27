// plik: src/utils/formatters.js
export function formatDate(dateString) {
  if (!dateString) return '-';
  // Zwraca tylko część RRRR-MM-DD z pełnego formatu daty
  return dateString.split('T')[0];
}