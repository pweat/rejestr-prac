<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAuthHeaders, removeToken } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter();

const isLoading = ref(true);
const serviceReminders = ref([]);

// Funkcja do obsługi błędów autoryzacji (wylogowanie przy 401/403)
const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    removeToken();
    router.push('/login');
    return true; // Zwraca prawdę, jeśli błąd został obsłużony
  }
  return false;
};

// Główna funkcja do pobierania powiadomień
async function fetchServiceReminders() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/api/service-reminders`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) {
      // Przekazujemy pełny obiekt błędu do naszej funkcji obsługi
      throw new Error(result.error || `Błąd sieci! Status: ${response.status}`);
    }
    serviceReminders.value = result;
  } catch (error) {
    console.error('Błąd podczas pobierania powiadomień:', error);
    // Sprawdzamy, czy to błąd autoryzacji. Jeśli nie, pokazujemy generyczny alert.
    if (!handleAuthError(error)) {
      alert('Nie udało się pobrać powiadomień serwisowych.');
    }
  } finally {
    isLoading.value = false;
  }
}

// Wywołanie funkcji po załadowaniu komponentu
onMounted(() => {
  fetchServiceReminders();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Pulpit</h1>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">🔔</span> Powiadomienia Serwisowe</h2>
        <div v-if="isLoading" class="loading-container" style="min-height: 100px">
          <div class="spinner"></div>
        </div>
        <div v-else-if="serviceReminders.length > 0" class="reminders-list">
          <div v-for="reminder in serviceReminders" :key="reminder.id" class="reminder-item">
            <div class="reminder-icon">⚠️</div>
            <div class="reminder-details">
              <strong>{{ reminder.client_name || 'Klient' }} ({{ reminder.client_phone }})</strong>
              <span
                >Wymaga serwisu! Ostatnia usługa: {{ formatDate(reminder.last_event_date) }}</span
              >
              <small>Następny serwis do: {{ formatDate(reminder.next_service_due) }}</small>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak pilnych powiadomień serwisowych.</p>
        </div>
      </div>

      <div class="dashboard-widget placeholder">
        <h2 class="widget-title"><span class="icon">📊</span> Ogólne Statystyki</h2>
        <div class="empty-message"><p>Wkrótce...</p></div>
      </div>
      <div class="dashboard-widget placeholder">
        <h2 class="widget-title"><span class="icon">📦</span> Niski Stan Magazynowy</h2>
        <div class="empty-message"><p>Wkrótce...</p></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 25px;
}
.dashboard-widget {
  background-color: var(--background-light);
  border: 1px solid var(--border-color);
  padding: 20px 25px;
  border-radius: 8px;
}
.widget-title {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.widget-title .icon {
  font-size: 20px;
}
.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.reminder-item {
  display: flex;
  align-items: center;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  border-left: 5px solid #ffc107;
  padding: 15px;
  border-radius: 6px;
}
.reminder-icon {
  font-size: 24px;
  margin-right: 15px;
}
.reminder-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.reminder-details strong {
  font-weight: 600;
}
.reminder-details span {
  font-size: 14px;
  color: var(--grey);
}
.reminder-details small {
  font-size: 12px;
  color: #a0937d;
  font-style: italic;
}
.empty-message {
  text-align: center;
  color: var(--grey);
  padding: 20px;
}
.placeholder {
  opacity: 0.6;
  background-color: #f8f9fa;
}
</style>
