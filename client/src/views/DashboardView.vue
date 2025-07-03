<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getAuthHeaders, removeToken } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter();

const isLoading = ref(true);
const serviceReminders = ref([]);
const lowStockItems = ref([]);
const monthlyStats = ref(null);
const selectedMonth = ref(new Date().toISOString().slice(0, 7)); // Format YYYY-MM

const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    removeToken();
    router.push('/login');
    return true;
  }
  return false;
};

async function fetchServiceReminders() {
  try {
    const response = await fetch(`${API_URL}/api/service-reminders`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Błąd sieci! Status: ${response.status}`);
    serviceReminders.value = result;
  } catch (error) {
    console.error('Błąd podczas pobierania powiadomień:', error);
    if (!handleAuthError(error)) {
      alert('Nie udało się pobrać powiadomień serwisowych.');
    }
  }
}

async function fetchLowStockItems() {
  try {
    const response = await fetch(`${API_URL}/api/inventory/low-stock`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania danych o niskim stanie magazynowym');
    lowStockItems.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania danych o niskim stanie magazynowym:', error);
    if (!handleAuthError(error)) {
      alert('Nie udało się pobrać danych o niskim stanie magazynowym.');
    }
  }
}

async function getStatsForMonth() {
  try {
    const [year, month] = selectedMonth.value.split('-');
    const params = new URLSearchParams({ year, month });
    const response = await fetch(`${API_URL}/api/stats/monthly-summary?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania statystyk');
    monthlyStats.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk:', error);
    if (!handleAuthError(error)) {
      alert('Nie udało się pobrać statystyk dla wybranego miesiąca.');
    }
  }
}

// Zmiana: Główna funkcja ładująca dane dla pulpitu
async function loadDashboardData() {
  isLoading.value = true;
  try {
    // Uruchamiamy wszystkie zapytania równolegle i czekamy, aż wszystkie się zakończą
    await Promise.all([fetchServiceReminders(), fetchLowStockItems(), getStatsForMonth()]);
  } catch (error) {
    // Błędy są już obsługiwane w poszczególnych funkcjach
    console.error('Wystąpił ogólny błąd podczas ładowania danych pulpitu.', error);
  } finally {
    // Wyłączamy ładowanie dopiero, gdy WSZYSTKIE dane są gotowe
    isLoading.value = false;
  }
}

watch(selectedMonth, getStatsForMonth);

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

      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">📊</span> Statystyki</h2>
        <div v-if="isLoading" class="loading-container" style="min-height: 100px">
          <div class="spinner"></div>
        </div>
        <div v-else-if="monthlyStats" class="stats-list">
          <div class="stat-item">
            <span>Suma metrów:</span>
            <strong>{{ monthlyStats.totalMeters }} m</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane studnie:</span>
            <strong>{{ monthlyStats.jobCounts.well_drilling }}</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane podłączenia:</span>
            <strong>{{ monthlyStats.jobCounts.connection }}</strong>
          </div>
          <div class="stat-item">
            <span>Zainstalowane stacje:</span>
            <strong>{{ monthlyStats.jobCounts.treatment_station }}</strong>
          </div>
          <div class="stat-item">
            <span>Wykonane serwisy:</span>
            <strong>{{ monthlyStats.jobCounts.service }}</strong>
          </div>
          <div class="stat-item total-profit">
            <span>Dochód w tym miesiącu:</span>
            <strong :class="monthlyStats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'"
              >{{ monthlyStats.totalProfit.toFixed(2) }} zł</strong
            >
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak danych do wyświetlenia.</p>
        </div>
      </div>
      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">📦</span> Niski Stan Magazynowy</h2>
        <div v-if="isLoading" class="loading-container" style="min-height: 100px">
          <div class="spinner"></div>
        </div>
        <div v-else-if="lowStockItems.length > 0" class="reminders-list">
          <div v-for="item in lowStockItems" :key="item.id" class="reminder-item low-stock">
            <div class="reminder-icon">❗</div>
            <div class="reminder-details">
              <strong>{{ item.name }}</strong>
              <span
                >Stan: {{ item.quantity }} {{ item.unit }} (Minimum:
                {{ item.min_stock_level }})</span
              >
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
.reminder-item.low-stock {
  background-color: #fff3f3;
  border-color: #fdb8b8;
  border-left-color: #dc3545;
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
  padding: 5px 0;
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
}
.profit-positive {
  color: var(--green);
}
.profit-negative {
  color: var(--red);
}
.month-picker-container {
  margin-bottom: 25px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.month-picker-container label {
  font-weight: 600;
}
.month-picker-container input[type='month'] {
  font-size: 16px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
</style>
