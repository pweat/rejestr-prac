<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getAuthHeaders, removeToken } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import { authenticatedFetch } from '../api/api.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================

/** @const {string} Bazowy URL do API. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** Dostęp do instancji routera Vue. */
const router = useRouter();

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================

/** Wskaźnik, czy dane pulpitu są w trakcie ładowania. */
const isLoading = ref(true);

/** Lista przypomnień o zbliżających się serwisach. */
const serviceReminders = ref([]);

/** Lista produktów z niskim stanem magazynowym. */
const lowStockItems = ref([]);

/** Obiekt przechowujący statystyki dla wybranego miesiąca. */
const monthlyStats = ref(null);

/** Aktualnie wybrany miesiąc w formacie YYYY-MM. */
const selectedMonth = ref(new Date().toISOString().slice(0, 7));

// ================================================================================================
// 🔄 FUNKCJE POBIERAJĄCE DANE (API)
// ================================================================================================

/**
 * Pobiera listę powiadomień serwisowych z API.
 */
async function fetchServiceReminders() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-reminders`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania powiadomień');
    serviceReminders.value = result;
  } catch (error) {
    console.error('Błąd podczas pobierania powiadomień serwisowych:', error);
    if (!handleAuthError(error)) {
      // alert('Nie udało się pobrać powiadomień serwisowych.');
    }
  }
}

/**
 * Pobiera listę produktów z niskim stanem magazynowym z API.
 */
async function fetchLowStockItems() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/low-stock`);
    if (!response.ok) throw new Error('Błąd pobierania danych o niskim stanie magazynowym');
    lowStockItems.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania danych o niskim stanie magazynowym:', error);
    if (!handleAuthError(error)) {
      // alert('Nie udało się pobrać danych o niskim stanie magazynowym.');
    }
  }
}

/**
 * Pobiera statystyki dla wybranego miesiąca (`selectedMonth`).
 */
async function getStatsForMonth() {
  try {
    const [year, month] = selectedMonth.value.split('-');
    const params = new URLSearchParams({ year, month });
    const response = await authenticatedFetch(`${API_URL}/api/stats/monthly-summary?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania statystyk');
    monthlyStats.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk:', error);
    if (!handleAuthError(error)) {
      // alert('Nie udało się pobrać statystyk dla wybranego miesiąca.');
    }
  }
}

// ================================================================================================
// 🚀 GŁÓWNA LOGIKA KOMPONENTU
// ================================================================================================

/**
 * Główna funkcja ładująca wszystkie dane potrzebne dla pulpitu.
 * Używa `Promise.all`, aby uruchomić wszystkie zapytania do API równolegle,
 * co znacznie przyspiesza ładowanie komponentu.
 */
async function loadDashboardData() {
  isLoading.value = true;
  try {
    await Promise.all([fetchServiceReminders(), fetchLowStockItems(), getStatsForMonth()]);
  } catch (error) {
    // Błędy są już obsługiwane w poszczególnych funkcjach fetch,
    // więc tutaj logujemy tylko ogólny błąd.
    console.error('Wystąpił ogólny błąd podczas ładowania danych pulpitu.', error);
  } finally {
    // Wskaźnik ładowania jest wyłączany dopiero, gdy WSZYSTKIE dane są gotowe.
    isLoading.value = false;
  }
}

/**
 * Centralna obsługa błędów autoryzacji. Jeśli błąd to 401/403, wylogowuje użytkownika.
 * @param {Error} error - Obiekt błędu.
 * @returns {boolean} `true` jeśli błąd został obsłużony, w przeciwnym razie `false`.
 */
const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    removeToken();
    router.push('/login');
    return true;
  }
  return false;
};

// ================================================================================================
// 👀 WATCHERS & CYKL ŻYCIA
// ================================================================================================

/**
 * Obserwuje zmianę wybranego miesiąca i automatycznie pobiera nowe statystyki.
 */
watch(selectedMonth, getStatsForMonth);

/**
 * Po zamontowaniu komponentu, uruchamia pobieranie wszystkich danych.
 */
onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Pulpit</h1>
    </div>

    <div class="month-picker-container">
      <label for="month-picker">Pokaż statystyki dla miesiąca:</label>
      <input type="month" id="month-picker" v-model="selectedMonth" />
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">🔔</span> Powiadomienia Serwisowe</h2>
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        <div v-else-if="serviceReminders.length > 0" class="reminders-list">
          <div v-for="reminder in serviceReminders" :key="reminder.client_id" class="reminder-item">
            <div class="reminder-icon">⚠️</div>
            <div class="reminder-details">
              <strong>{{ reminder.client_name || 'Klient' }} ({{ reminder.client_phone }})</strong>
              <span>Wymaga serwisu! Ostatnia usługa: {{ formatDate(reminder.last_event_date) }}</span>
              <small>Następny serwis do: {{ formatDate(reminder.next_service_due) }}</small>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak pilnych powiadomień serwisowych.</p>
        </div>
      </div>

      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">📊</span> Statystyki</h2>
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        <div v-else-if="monthlyStats" class="stats-list">
          <div class="stat-item">
            <span>Suma metrów:</span>
            <strong>{{ monthlyStats.totalMeters || 0 }} m</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane studnie:</span>
            <strong>{{ monthlyStats.jobCounts.well_drilling || 0 }}</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane podłączenia:</span>
            <strong>{{ monthlyStats.jobCounts.connection || 0 }}</strong>
          </div>
          <div class="stat-item">
            <span>Zainstalowane stacje:</span>
            <strong>{{ monthlyStats.jobCounts.treatment_station || 0 }}</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane serwisy:</span>
            <strong>{{ monthlyStats.jobCounts.service || 0 }}</strong>
          </div>
          <div class="stat-item total-profit">
            <span>Dochód w tym miesiącu:</span>
            <strong :class="monthlyStats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'"> {{ (monthlyStats.totalProfit || 0).toFixed(2) }} zł </strong>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak danych do wyświetlenia.</p>
        </div>
      </div>

      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">📦</span> Niski Stan Magazynowy</h2>
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        <div v-else-if="lowStockItems.length > 0" class="reminders-list">
          <div v-for="item in lowStockItems" :key="item.id" class="reminder-item low-stock">
            <div class="reminder-icon">❗</div>
            <div class="reminder-details">
              <strong>{{ item.name }}</strong>
              <span>Stan: {{ item.quantity }} {{ item.unit }} (Minimum: {{ item.min_stock_level }})</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak przedmiotów z niskim stanem magazynowym.</p>
        </div>
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
  display: flex;
  flex-direction: column;
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
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
  flex-grow: 1;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
.reminder-item.low-stock {
  background-color: #fff3f3;
  border-color: #fdb8b8;
  border-left-color: #dc3545;
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
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  padding: 8px 0;
}
.stat-item:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}
.stat-item strong {
  font-weight: 600;
  font-size: 16px;
}
.stat-item.total-profit {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid var(--border-color);
  font-size: 16px;
}
.profit-positive {
  color: var(--green);
}
.profit-negative {
  color: var(--red);
}
.empty-message {
  text-align: center;
  color: var(--grey);
  padding: 20px;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.month-picker-container {
  margin-bottom: 25px;
  padding: 20px;
  background-color: var(--background-light-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid var(--border-color);
}
.month-picker-container label {
  font-weight: 600;
}
.month-picker-container input[type='month'] {
  font-size: 16px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-light);
  color: var(--text-color);
}
</style>
