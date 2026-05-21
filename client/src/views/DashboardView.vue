<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { getUserRole, removeToken } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================

/** @const {string} Bazowy URL do API. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** Dostęp do instancji routera Vue. */
const router = useRouter();
const toast = useToast();
const userRole = getUserRole();

const showPostponeModal = ref(false);
const postponeTarget = ref(null);
const postponeMonths = ref(3);
const scheduleActionLoading = ref(false);

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================

/** Wskaźnik, czy dane pulpitu są w trakcie ładowania. */
const isLoading = ref(true);

/** Lista przypomnień o zbliżających się serwisach. */
const serviceReminders = ref([]);

/** Lista produktów z niskim stanem magazynowym. */
const lowStockItems = ref([]);

/** Lista pojazdów z wygasłym lub zbliżającym się przeglądem / OC. */
const vehicleReminders = ref([]);

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
 * Pobiera przypomnienia o terminach przeglądu i OC pojazdów.
 */
async function fetchVehicleReminders() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/vehicle-reminders`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania przypomnień pojazdów');
    vehicleReminders.value = result;
  } catch (error) {
    console.error('Błąd podczas pobierania przypomnień pojazdów:', error);
    if (!handleAuthError(error)) {
      // alert('Nie udało się pobrać przypomnień pojazdów.');
    }
  }
}

function vehicleReminderLabel(status) {
  if (status === 'expired') return 'Wygasło';
  if (status === 'warning') return 'Wkrótce';
  return '';
}

function serviceReminderLabel(status) {
  if (status === 'expired') return 'Wygasło';
  if (status === 'warning') return 'Wkrótce';
  return '';
}

function jobsLinkForReminder(reminder) {
  const params = new URLSearchParams({ clientId: String(reminder.client_id) });
  if (reminder.miejscowosc && reminder.miejscowosc !== '—') {
    params.set('miejscowosc', reminder.miejscowosc);
  }
  return `/zlecenia?${params.toString()}`;
}

function quickServiceLink(reminder) {
  const params = new URLSearchParams({
    clientId: String(reminder.client_id),
    jobType: 'service',
    action: 'new',
  });
  if (reminder.miejscowosc && reminder.miejscowosc !== '—') {
    params.set('miejscowosc', reminder.miejscowosc);
  }
  return `/zlecenia?${params.toString()}`;
}

async function markScheduleServiced(reminder) {
  if (!reminder.schedule_id || userRole === 'viewer') return;
  scheduleActionLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules/${reminder.schedule_id}/mark-serviced`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się oznaczyć serwisu.');
    toast.success('Harmonogram zaktualizowany — serwis oznaczony jako wykonany.');
    await fetchServiceReminders();
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'Błąd operacji.');
  } finally {
    scheduleActionLoading.value = false;
  }
}

function openPostponeModal(reminder) {
  postponeTarget.value = reminder;
  postponeMonths.value = 3;
  showPostponeModal.value = true;
}

async function confirmPostpone() {
  if (!postponeTarget.value?.schedule_id) return;
  scheduleActionLoading.value = true;
  try {
    const response = await authenticatedFetch(
      `${API_URL}/api/service-schedules/${postponeTarget.value.schedule_id}/postpone`,
      {
        method: 'POST',
        body: JSON.stringify({ months: postponeMonths.value }),
      }
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się odłożyć terminu.');
    toast.success(`Termin przesunięty o ${postponeMonths.value} mies.`);
    showPostponeModal.value = false;
    postponeTarget.value = null;
    await fetchServiceReminders();
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'Błąd operacji.');
  } finally {
    scheduleActionLoading.value = false;
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
    await Promise.all([fetchServiceReminders(), fetchLowStockItems(), fetchVehicleReminders(), getStatsForMonth()]);
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
          <div
            v-for="reminder in serviceReminders"
            :key="reminder.schedule_id || `${reminder.client_id}-${reminder.miejscowosc}`"
            class="reminder-item service-reminder"
            :class="{ 'reminder-item--expired': reminder.status === 'expired' }"
          >
            <div class="reminder-icon">⚠️</div>
            <div class="reminder-details">
              <strong>
                {{ reminder.client_name || 'Klient' }} ({{ reminder.client_phone }})
                <em v-if="reminder.status" :class="reminder.status">({{ serviceReminderLabel(reminder.status) }})</em>
              </strong>
              <span>
                <strong>Lokalizacja:</strong> {{ reminder.miejscowosc || '—' }}
                · co {{ reminder.service_interval_months || 12 }} mies.
              </span>
              <span>
                Ostatni serwis: {{ formatDate(reminder.last_service_date || reminder.last_event_date) }}
                · Następny: {{ formatDate(reminder.next_service_due) }}
                <template v-if="reminder.days_until_due !== null && reminder.days_until_due !== undefined">
                  (za {{ reminder.days_until_due }} dni)
                </template>
              </span>
              <div class="reminder-actions">
                <RouterLink :to="`/klienci/${reminder.client_id}`" class="reminder-link">Karta klienta →</RouterLink>
                <RouterLink :to="jobsLinkForReminder(reminder)" class="reminder-link">Zlecenia →</RouterLink>
                <RouterLink v-if="userRole !== 'viewer'" :to="quickServiceLink(reminder)" class="reminder-link reminder-link--primary">
                  Dodaj serwis →
                </RouterLink>
              </div>
              <div v-if="userRole !== 'viewer'" class="reminder-buttons">
                <button
                  type="button"
                  class="btn-mini"
                  :disabled="scheduleActionLoading"
                  @click="markScheduleServiced(reminder)"
                >
                  Wykonano
                </button>
                <button type="button" class="btn-mini btn-mini--secondary" :disabled="scheduleActionLoading" @click="openPostponeModal(reminder)">
                  Odłóż…
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak pilnych powiadomień serwisowych.</p>
        </div>
      </div>

      <div class="dashboard-widget">
        <h2 class="widget-title"><span class="icon">🚗</span> Pojazdy — przegląd / OC</h2>
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        <div v-else-if="vehicleReminders.length > 0" class="reminders-list">
          <div v-for="vehicle in vehicleReminders" :key="vehicle.id" class="reminder-item vehicle-reminder">
            <div class="reminder-icon">🚗</div>
            <div class="reminder-details">
              <strong>{{ vehicle.registration_number }} — {{ [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Pojazd' }}</strong>
              <span v-if="vehicle.inspection_status === 'expired' || vehicle.inspection_status === 'warning'">
                Przegląd: {{ formatDate(vehicle.inspection_valid_until) }}
                <em :class="vehicle.inspection_status">({{ vehicleReminderLabel(vehicle.inspection_status) }})</em>
              </span>
              <span v-if="vehicle.insurance_status === 'expired' || vehicle.insurance_status === 'warning'">
                OC: {{ formatDate(vehicle.insurance_valid_until) }}
                <em :class="vehicle.insurance_status">({{ vehicleReminderLabel(vehicle.insurance_status) }})</em>
              </span>
              <RouterLink to="/pojazdy" class="reminder-link">Przejdź do pojazdów →</RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="empty-message">
          <p>Brak pilnych terminów przeglądu lub OC.</p>
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

    <div v-if="showPostponeModal" class="modal-backdrop" @click.self="showPostponeModal = false">
      <div class="modal-content modal-content--small">
        <h3>Odłóż termin serwisu</h3>
        <p v-if="postponeTarget">
          {{ postponeTarget.client_name }} — {{ postponeTarget.miejscowosc }}
        </p>
        <label>
          Przesuń o liczbę miesięcy:
          <input v-model.number="postponeMonths" type="number" min="1" max="60" step="1" />
        </label>
        <div class="postpone-presets">
          <button type="button" class="btn-mini" @click="postponeMonths = 1">1 m-c</button>
          <button type="button" class="btn-mini" @click="postponeMonths = 3">3 m-ce</button>
          <button type="button" class="btn-mini" @click="postponeMonths = 6">6 m-cy</button>
          <button type="button" class="btn-mini" @click="postponeMonths = 12">12 m-cy</button>
        </div>
        <div class="modal-actions-inline">
          <button type="button" class="btn-mini btn-mini--secondary" @click="showPostponeModal = false">Anuluj</button>
          <button type="button" class="btn-mini" :disabled="scheduleActionLoading" @click="confirmPostpone">Zapisz</button>
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
.reminder-item.vehicle-reminder {
  background-color: #eef6ff;
  border-color: #b3d4fc;
  border-left-color: #0d6efd;
}
.reminder-item.service-reminder {
  align-items: flex-start;
}
.reminder-item.reminder-item--expired {
  background-color: #fff3f3;
  border-color: #fdb8b8;
  border-left-color: #dc3545;
}
.reminder-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}
.reminder-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.reminder-link--primary {
  font-weight: 600;
}
.reminder-details em.expired,
.reminder-details em.warning {
  margin-left: 6px;
}
.btn-mini {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--blue);
  background: var(--blue);
  color: #fff;
  cursor: pointer;
}
.btn-mini:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-mini--secondary {
  background: #fff;
  color: var(--text-color);
  border-color: var(--border-color);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content--small {
  background: var(--background-light);
  padding: 24px;
  border-radius: 8px;
  min-width: 320px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-content--small h3 {
  margin: 0;
}
.postpone-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.modal-actions-inline {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.reminder-link {
  font-size: 13px;
  color: var(--blue);
  margin-top: 4px;
}
.reminder-details em.expired {
  color: #c0392b;
  font-style: normal;
  font-weight: 600;
}
.reminder-details em.warning {
  color: #b8860b;
  font-style: normal;
  font-weight: 600;
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
