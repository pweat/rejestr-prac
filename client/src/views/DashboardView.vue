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

/** Lista produktów z niskim stanem magazynowym (widok pulpitu). */
const lowStockItems = ref([]);
const lowStockTotalCount = ref(0);
const lowStockHasMore = ref(false);
const LOW_STOCK_LIMIT = 12;

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
    const response = await authenticatedFetch(`${API_URL}/api/inventory/low-stock?limit=${LOW_STOCK_LIMIT}`);
    if (!response.ok) throw new Error('Błąd pobierania danych o niskim stanie magazynowym');
    const result = await response.json();
    lowStockItems.value = result.items || [];
    lowStockTotalCount.value = result.totalCount ?? lowStockItems.value.length;
    lowStockHasMore.value = result.hasMore ?? lowStockTotalCount.value > lowStockItems.value.length;
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

const inventoryAlertLink = '/magazyn?lowStockOnly=true&alertOnly=true&hideOrdered=true';

function lowStockMoreCount() {
  return Math.max(0, lowStockTotalCount.value - lowStockItems.value.length);
}

function stockItemBadge(item) {
  if (item.is_critical || item.quantity <= 0) return { text: 'Brak', class: 'badge-critical' };
  return { text: 'Niski', class: 'badge-low' };
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

    <section class="dashboard-alerts">
      <div class="dashboard-widget">
        <div class="widget-title-row">
          <h2 class="widget-title"><span class="icon">🔔</span> Powiadomienia Serwisowe <span v-if="!isLoading" class="widget-count">({{ serviceReminders.length }})</span></h2>
          <RouterLink to="/zlecenia" class="widget-see-all">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="isLoading" class="loading-container loading-container--compact">
          <div class="spinner"></div>
        </div>
        <div v-else-if="serviceReminders.length > 0" class="widget-body widget-body--scroll">
          <div
            v-for="reminder in serviceReminders"
            :key="reminder.schedule_id || `${reminder.client_id}-${reminder.miejscowosc}`"
            class="alert-row"
            :class="{ 'alert-row--expired': reminder.status === 'expired' }"
          >
            <div class="alert-row-main">
              <strong class="alert-row-title">{{ reminder.client_name || 'Klient' }}</strong>
              <span v-if="reminder.status" class="status-pill" :class="reminder.status">{{ serviceReminderLabel(reminder.status) }}</span>
            </div>
            <p class="alert-row-detail">
              {{ reminder.miejscowosc || '—' }} · nast. {{ formatDate(reminder.next_service_due) }}
              <template v-if="reminder.days_until_due !== null && reminder.days_until_due !== undefined"> (za {{ reminder.days_until_due }} dni)</template>
            </p>
            <div v-if="userRole !== 'viewer'" class="alert-row-actions">
              <button type="button" class="btn-mini" :disabled="scheduleActionLoading" @click="markScheduleServiced(reminder)">Wykonano</button>
              <button type="button" class="btn-mini btn-mini--secondary" :disabled="scheduleActionLoading" @click="openPostponeModal(reminder)">Odłóż</button>
              <RouterLink :to="quickServiceLink(reminder)" class="btn-mini btn-mini--link">Serwis</RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="empty-message empty-message--compact">
          <p>Brak pilnych powiadomień serwisowych.</p>
        </div>
      </div>

      <div class="dashboard-widget">
        <div class="widget-title-row">
          <h2 class="widget-title"><span class="icon">🚗</span> Pojazdy <span v-if="!isLoading" class="widget-count">({{ vehicleReminders.length }})</span></h2>
          <RouterLink to="/pojazdy" class="widget-see-all">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="isLoading" class="loading-container loading-container--compact">
          <div class="spinner"></div>
        </div>
        <div v-else-if="vehicleReminders.length > 0" class="widget-body widget-body--scroll">
          <div v-for="vehicle in vehicleReminders" :key="vehicle.id" class="alert-row alert-row--vehicle">
            <div class="alert-row-main">
              <strong class="alert-row-title">{{ vehicle.registration_number }}</strong>
              <span v-if="vehicle.inspection_status === 'expired' || vehicle.inspection_status === 'warning'" class="status-pill" :class="vehicle.inspection_status">
                Przegląd {{ vehicleReminderLabel(vehicle.inspection_status) }}
              </span>
            </div>
            <p class="alert-row-detail">
              {{ [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Pojazd' }}
              <template v-if="vehicle.insurance_status === 'expired' || vehicle.insurance_status === 'warning'">
                · OC {{ formatDate(vehicle.insurance_valid_until) }} ({{ vehicleReminderLabel(vehicle.insurance_status) }})
              </template>
            </p>
          </div>
        </div>
        <div v-else class="empty-message empty-message--compact">
          <p>Brak pilnych terminów przeglądu lub OC.</p>
        </div>
      </div>

      <div class="dashboard-widget">
        <div class="widget-title-row">
          <h2 class="widget-title"><span class="icon">📦</span> Magazyn <span v-if="!isLoading" class="widget-count">({{ lowStockTotalCount }})</span></h2>
          <RouterLink :to="inventoryAlertLink" class="widget-see-all">Przejdź do magazynu →</RouterLink>
        </div>
        <div v-if="isLoading" class="loading-container loading-container--compact">
          <div class="spinner"></div>
        </div>
        <div v-else-if="lowStockItems.length > 0" class="widget-body widget-body--scroll">
          <div
            v-for="item in lowStockItems"
            :key="item.id"
            class="alert-row alert-row--stock"
            :class="{ 'alert-row--critical': item.is_critical || item.quantity <= 0 }"
          >
            <div class="alert-row-main">
              <strong class="alert-row-title">{{ item.name }}</strong>
              <span class="status-pill" :class="stockItemBadge(item).class">{{ stockItemBadge(item).text }}</span>
            </div>
            <p class="alert-row-detail">
              {{ item.quantity }} / {{ item.min_stock_level }} {{ item.unit }}
              <template v-if="item.category_name"> · {{ item.category_name }}</template>
            </p>
          </div>
          <p v-if="lowStockHasMore" class="widget-more">
            i {{ lowStockMoreCount() }} więcej —
            <RouterLink :to="inventoryAlertLink">pokaż w magazynie</RouterLink>
          </p>
        </div>
        <div v-else class="empty-message empty-message--compact">
          <p>Brak pilnych alertów magazynowych.</p>
        </div>
      </div>
    </section>

    <section class="dashboard-stats">
      <div class="stats-header">
        <h2 class="widget-title"><span class="icon">📊</span> Statystyki miesiąca</h2>
        <div class="month-picker-inline">
          <label for="month-picker">Miesiąc:</label>
          <input type="month" id="month-picker" v-model="selectedMonth" />
        </div>
      </div>
      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
      </div>
      <div v-else-if="monthlyStats" class="stats-kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Suma metrów</span>
          <strong class="kpi-value">{{ monthlyStats.totalMeters || 0 }} m</strong>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Studnie</span>
          <strong class="kpi-value">{{ monthlyStats.jobCounts.well_drilling || 0 }}</strong>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Podłączenia</span>
          <strong class="kpi-value">{{ monthlyStats.jobCounts.connection || 0 }}</strong>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Stacje</span>
          <strong class="kpi-value">{{ monthlyStats.jobCounts.treatment_station || 0 }}</strong>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Serwisy</span>
          <strong class="kpi-value">{{ monthlyStats.jobCounts.service || 0 }}</strong>
        </div>
        <div class="kpi-card kpi-card--profit">
          <span class="kpi-label">Dochód w tym miesiącu</span>
          <strong class="kpi-value" :class="monthlyStats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'">
            {{ (monthlyStats.totalProfit || 0).toFixed(2) }} zł
          </strong>
        </div>
      </div>
      <div v-else class="empty-message">
        <p>Brak danych do wyświetlenia.</p>
      </div>
    </section>

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
.dashboard-alerts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

@media (max-width: 1100px) {
  .dashboard-alerts {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .dashboard-alerts {
    grid-template-columns: 1fr;
  }
}

.dashboard-widget,
.dashboard-stats {
  background-color: var(--background-light);
  border: 1px solid var(--border-color);
  padding: 16px 18px;
  border-radius: 8px;
}

.dashboard-widget {
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.widget-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.widget-title {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.widget-count {
  font-weight: normal;
  color: var(--grey);
  font-size: 14px;
}

.widget-see-all {
  font-size: 12px;
  color: var(--blue);
  white-space: nowrap;
  flex-shrink: 0;
}

.widget-body--scroll {
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.alert-row {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #ffe58f;
  border-left: 4px solid #ffc107;
  background: #fffbe6;
}

.alert-row--expired,
.alert-row--critical {
  background: #fff3f3;
  border-color: #fdb8b8;
  border-left-color: #dc3545;
}

.alert-row--vehicle {
  background: #eef6ff;
  border-color: #b3d4fc;
  border-left-color: #0d6efd;
}

.alert-row--stock {
  background: #fff8f0;
  border-color: #ffd8a8;
  border-left-color: #fd7e14;
}

.alert-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.alert-row-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-row-detail {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--grey);
  line-height: 1.35;
}

.alert-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.status-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.status-pill.expired,
.status-pill.badge-critical {
  background: #fde8e8;
  color: #c0392b;
}

.status-pill.warning,
.status-pill.badge-low {
  background: #fff3cd;
  color: #856404;
}

.widget-more {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--grey);
  text-align: center;
}

.widget-more a {
  color: var(--blue);
}

.dashboard-stats {
  padding: 20px 22px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.stats-header .widget-title {
  margin: 0;
  border: none;
  padding: 0;
}

.month-picker-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-picker-inline label {
  font-weight: 600;
  font-size: 14px;
}

.month-picker-inline input[type='month'] {
  font-size: 14px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-light);
  color: var(--text-color);
}

.stats-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 14px;
}

.kpi-card {
  background: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kpi-card--profit {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%);
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

@media (min-width: 900px) {
  .kpi-card--profit {
    grid-column: span 2;
  }
}

.kpi-label {
  font-size: 13px;
  color: var(--grey);
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
}

.kpi-card--profit .kpi-value {
  font-size: 26px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.loading-container--compact {
  min-height: 80px;
  flex: 1;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 36px;
  height: 36px;
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

.btn-mini {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--blue);
  background: var(--blue);
  color: #fff;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
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

.btn-mini--link {
  background: #fff;
  color: var(--blue);
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

.profit-positive {
  color: var(--green);
}

.profit-negative {
  color: var(--red);
}

.empty-message {
  text-align: center;
  color: var(--grey);
  padding: 24px 12px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-message--compact {
  padding: 16px 8px;
  font-size: 13px;
}
</style>
