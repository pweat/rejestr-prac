<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, computed, onMounted, watch } from 'vue';
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
const activeMetric = ref(null);

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

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `${number.toFixed(2)} zł`;
}

function metricLabel(metric) {
  const labels = {
    meters: 'Suma metrów',
    well_drilling: 'Studnie',
    connection: 'Podłączenia',
    treatment_station: 'Stacje',
    service: 'Serwisy',
    revenue: 'Przychód',
    costs: 'Wydatki',
    profit: 'Dochód',
  };
  return labels[metric] || 'Szczegóły';
}

function toggleMetric(metric) {
  if (!monthlyStats.value) return;
  activeMetric.value = activeMetric.value === metric ? null : metric;
}

function monthDateRange() {
  const [yearStr, monthStr] = (selectedMonth.value || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return { dateFrom: '', dateTo: '' };
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const end = new Date(nextMonthDate.getTime() - 1).toISOString().split('T')[0];
  return { dateFrom: start, dateTo: end };
}

function jobsLinkForMonth(jobType) {
  const { dateFrom, dateTo } = monthDateRange();
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (jobType) params.set('jobTypes', jobType);
  return `/zlecenia?${params.toString()}`;
}

function activeJobTypeBreakdown() {
  const type = activeMetric.value;
  if (!type || !monthlyStats.value?.breakdown?.jobTypes) return null;
  return monthlyStats.value.breakdown.jobTypes.find((item) => item.key === type) || null;
}

const FINANCE_METRICS = ['revenue', 'costs', 'profit'];
const OPS_METRICS = ['meters', 'well_drilling', 'connection', 'treatment_station', 'service'];

function isFinanceMetric(metric) {
  return FINANCE_METRICS.includes(metric);
}

function isOpsMetric(metric) {
  return OPS_METRICS.includes(metric);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0%';
  if (number < 1) return '<1%';
  return `${Math.round(number)}%`;
}

const financeShares = computed(() => {
  const revenue = Math.max(0, Number(monthlyStats.value?.totalRevenue) || 0);
  const costs = Math.max(0, Number(monthlyStats.value?.totalCosts) || 0);
  const total = revenue + costs;
  if (total <= 0) return { total: 0, revenuePct: 0, costsPct: 0 };
  const revenuePct = (revenue / total) * 100;
  return { total, revenuePct, costsPct: 100 - revenuePct };
});

const expenseCategories = computed(() => {
  const list = monthlyStats.value?.breakdown?.financials?.costCategories || [];
  if (!list.length) return [];
  const max = list.reduce((acc, item) => Math.max(acc, Number(item.amount) || 0), 0);
  return list.map((item) => {
    const amount = Number(item.amount) || 0;
    const shareOfMax = max > 0 ? (amount / max) * 100 : 0;
    return {
      ...item,
      amount,
      shareOfAllCostsPercent: Number(item.shareOfAllCostsPercent) || 0,
      shareOfMaxPercent: shareOfMax,
    };
  });
});

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
watch(selectedMonth, () => {
  activeMetric.value = null;
  getStatsForMonth();
});

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
      <template v-else-if="monthlyStats">
        <div class="finance-hero">
          <div class="finance-hero-grid">
            <button
              type="button"
              class="finance-card finance-card--revenue"
              :class="{ active: activeMetric === 'revenue' }"
              @click="toggleMetric('revenue')"
            >
              <span class="finance-card-label">Przychód</span>
              <strong class="finance-card-value">{{ formatCurrency(monthlyStats.totalRevenue) }}</strong>
            </button>
            <button
              type="button"
              class="finance-card finance-card--costs"
              :class="{ active: activeMetric === 'costs' }"
              @click="toggleMetric('costs')"
            >
              <span class="finance-card-label">Wydatki</span>
              <strong class="finance-card-value">{{ formatCurrency(monthlyStats.totalCosts) }}</strong>
            </button>
            <button
              type="button"
              class="finance-card finance-card--profit"
              :class="{ active: activeMetric === 'profit' }"
              @click="toggleMetric('profit')"
            >
              <span class="finance-card-label">Dochód miesiąca</span>
              <strong
                class="finance-card-value finance-card-value--profit"
                :class="monthlyStats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'"
              >
                {{ formatCurrency(monthlyStats.totalProfit) }}
              </strong>
            </button>
          </div>
          <div class="finance-bar" v-if="financeShares.total > 0">
            <div class="finance-bar-track" aria-hidden="true">
              <div
                class="finance-bar-segment finance-bar-segment--revenue"
                :style="{ width: financeShares.revenuePct + '%' }"
              ></div>
              <div
                class="finance-bar-segment finance-bar-segment--costs"
                :style="{ width: financeShares.costsPct + '%' }"
              ></div>
            </div>
            <div class="finance-bar-legend">
              <span class="finance-bar-legend-item">
                <span class="finance-bar-dot finance-bar-dot--revenue"></span>
                Przychód · {{ formatPercent(financeShares.revenuePct) }}
              </span>
              <span class="finance-bar-legend-item">
                <span class="finance-bar-dot finance-bar-dot--costs"></span>
                Wydatki · {{ formatPercent(financeShares.costsPct) }}
              </span>
            </div>
          </div>
          <p v-else class="finance-bar-empty">Brak ruchu finansowego w wybranym miesiącu.</p>
        </div>

        <div v-if="isFinanceMetric(activeMetric) && monthlyStats.breakdown" class="stats-drilldown-panel">
          <div class="stats-drilldown-header">
            <h3>{{ metricLabel(activeMetric) }} — szczegóły</h3>
            <button type="button" class="btn-mini btn-mini--secondary" @click="activeMetric = null">Zamknij</button>
          </div>

          <div v-if="activeMetric === 'revenue'" class="stats-drilldown-content">
            <div class="stats-subtitle">Przychód według typu zlecenia</div>
            <div class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Przychód</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in monthlyStats.breakdown.financials.byJobType" :key="`rev-${item.key}`">
                    <td>{{ item.label }}</td>
                    <td>{{ formatCurrency(item.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-else-if="activeMetric === 'costs'" class="stats-drilldown-content">
            <div class="stats-subtitle">Źródła kosztów</div>
            <div class="stats-mini-grid">
              <div v-for="source in monthlyStats.breakdown.financials.sources" :key="source.key">
                <strong>{{ source.label }}:</strong> {{ formatCurrency(source.amount) }}
              </div>
            </div>
            <div class="stats-subtitle">Kategorie wydatków</div>
            <div v-if="expenseCategories.length" class="expense-bars">
              <div
                v-for="item in expenseCategories"
                :key="item.key"
                class="expense-bar"
              >
                <div class="expense-bar-head">
                  <span class="expense-bar-label">{{ item.label }}</span>
                  <span class="expense-bar-value">
                    {{ formatCurrency(item.amount) }}
                    <span class="expense-bar-share">· {{ formatPercent(item.shareOfAllCostsPercent) }}</span>
                  </span>
                </div>
                <div class="expense-bar-track" aria-hidden="true">
                  <div
                    class="expense-bar-fill"
                    :class="{ 'expense-bar-fill--accent': item.key === 'weekly_settlements' }"
                    :style="{ width: Math.max(2, Math.min(100, item.shareOfMaxPercent)) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
            <p v-else class="empty-message">Brak wydatków w tym miesiącu.</p>
          </div>

          <div v-else-if="activeMetric === 'profit'" class="stats-drilldown-content">
            <div class="stats-mini-grid">
              <div><strong>Przychód:</strong> {{ formatCurrency(monthlyStats.totalRevenue) }}</div>
              <div><strong>Wydatki:</strong> {{ formatCurrency(monthlyStats.totalCosts) }}</div>
              <div><strong>Dochód:</strong> {{ formatCurrency(monthlyStats.totalProfit) }}</div>
            </div>
            <div class="stats-subtitle">Dochód według typu zlecenia</div>
            <div class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th>Przychód</th>
                    <th>Koszty</th>
                    <th>Dochód</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in monthlyStats.breakdown.financials.byJobType" :key="`profit-${item.key}`">
                    <td>{{ item.label }}</td>
                    <td>{{ formatCurrency(item.revenue) }}</td>
                    <td>{{ formatCurrency(item.costs) }}</td>
                    <td>{{ formatCurrency(item.profit) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="ops-grid">
          <button
            type="button"
            class="ops-card"
            :class="{ active: activeMetric === 'meters' }"
            @click="toggleMetric('meters')"
          >
            <span class="ops-card-label">Metry</span>
            <strong class="ops-card-value">{{ monthlyStats.totalMeters || 0 }} m</strong>
          </button>
          <button
            type="button"
            class="ops-card"
            :class="{ active: activeMetric === 'well_drilling' }"
            @click="toggleMetric('well_drilling')"
          >
            <span class="ops-card-label">Studnie</span>
            <strong class="ops-card-value">{{ monthlyStats.jobCounts.well_drilling || 0 }}</strong>
          </button>
          <button
            type="button"
            class="ops-card"
            :class="{ active: activeMetric === 'connection' }"
            @click="toggleMetric('connection')"
          >
            <span class="ops-card-label">Podłączenia</span>
            <strong class="ops-card-value">{{ monthlyStats.jobCounts.connection || 0 }}</strong>
          </button>
          <button
            type="button"
            class="ops-card"
            :class="{ active: activeMetric === 'treatment_station' }"
            @click="toggleMetric('treatment_station')"
          >
            <span class="ops-card-label">Stacje</span>
            <strong class="ops-card-value">{{ monthlyStats.jobCounts.treatment_station || 0 }}</strong>
          </button>
          <button
            type="button"
            class="ops-card"
            :class="{ active: activeMetric === 'service' }"
            @click="toggleMetric('service')"
          >
            <span class="ops-card-label">Serwisy</span>
            <strong class="ops-card-value">{{ monthlyStats.jobCounts.service || 0 }}</strong>
          </button>
        </div>

        <div v-if="isOpsMetric(activeMetric) && monthlyStats.breakdown" class="stats-drilldown-panel">
          <div class="stats-drilldown-header">
            <h3>{{ metricLabel(activeMetric) }} — szczegóły</h3>
            <button type="button" class="btn-mini btn-mini--secondary" @click="activeMetric = null">Zamknij</button>
          </div>

          <div v-if="activeMetric === 'meters'" class="stats-drilldown-content">
            <div class="stats-mini-grid">
              <div><strong>Suma metrów:</strong> {{ monthlyStats.breakdown.meters.totalMeters || 0 }} m</div>
              <div><strong>Liczba studni:</strong> {{ monthlyStats.breakdown.meters.wellJobsCount || 0 }}</div>
              <div><strong>Średnio / studnię:</strong> {{ (monthlyStats.breakdown.meters.avgMetersPerWell || 0).toFixed(2) }} m</div>
            </div>
            <div class="stats-subtitle">Największe realizacje studni w miesiącu</div>
            <div v-if="monthlyStats.breakdown.meters.topWells?.length" class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Klient</th>
                    <th>Miejscowość</th>
                    <th>Metry</th>
                    <th>Szac. przychód</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="well in monthlyStats.breakdown.meters.topWells" :key="well.id">
                    <td>{{ well.jobDate }}</td>
                    <td>{{ well.clientName }}</td>
                    <td>{{ well.miejscowosc }}</td>
                    <td>{{ well.meters }}</td>
                    <td>{{ formatCurrency(well.estimatedRevenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="empty-message">Brak odwiertów w tym miesiącu.</p>
          </div>

          <div v-else class="stats-drilldown-content">
            <template v-if="activeJobTypeBreakdown()">
              <div class="stats-mini-grid">
                <div><strong>Liczba zleceń:</strong> {{ activeJobTypeBreakdown().count }}</div>
                <div><strong>Udział w miesiącu:</strong> {{ (activeJobTypeBreakdown().sharePercent || 0).toFixed(1) }}%</div>
                <div><strong>Przychód:</strong> {{ formatCurrency(activeJobTypeBreakdown().revenue) }}</div>
                <div><strong>Koszty:</strong> {{ formatCurrency(activeJobTypeBreakdown().costs) }}</div>
                <div><strong>Dochód:</strong> {{ formatCurrency(activeJobTypeBreakdown().profit) }}</div>
              </div>
              <RouterLink :to="jobsLinkForMonth(activeMetric)" class="widget-see-all">Przejdź do listy zleceń tego typu →</RouterLink>
            </template>
            <p v-else class="empty-message">Brak danych dla wybranego typu zlecenia.</p>
          </div>
        </div>
      </template>
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

.finance-hero {
  background: linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.finance-hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr;
  gap: 12px;
}

.finance-card {
  background: var(--background-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.finance-card:hover {
  border-color: var(--blue);
  box-shadow: 0 1px 4px rgba(13, 110, 253, 0.08);
}

.finance-card.active {
  border-color: var(--blue);
  background: #eef6ff;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15);
}

.finance-card-label {
  font-size: 13px;
  color: var(--grey);
  font-weight: 600;
}

.finance-card-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-color);
}

.finance-card--profit {
  background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
}

.finance-card-value--profit {
  font-size: 28px;
}

.finance-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finance-bar-track {
  display: flex;
  height: 12px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  background: #e9ecef;
}

.finance-bar-segment {
  height: 100%;
  transition: width 0.25s ease;
}

.finance-bar-segment--revenue {
  background: linear-gradient(90deg, #198754 0%, #2bb673 100%);
}

.finance-bar-segment--costs {
  background: linear-gradient(90deg, #dc3545 0%, #f06b78 100%);
}

.finance-bar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.finance-bar-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.finance-bar-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.finance-bar-dot--revenue {
  background: #198754;
}

.finance-bar-dot--costs {
  background: #dc3545;
}

.finance-bar-empty {
  margin: 0;
  font-size: 13px;
  color: var(--grey);
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.ops-card {
  background: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.ops-card:hover {
  border-color: var(--blue);
  box-shadow: 0 1px 4px rgba(13, 110, 253, 0.08);
}

.ops-card.active {
  border-color: var(--blue);
  background: #eef6ff;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.15);
}

.ops-card-label {
  font-size: 12px;
  color: var(--grey);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.ops-card-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-color);
}

.expense-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expense-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expense-bar-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}

.expense-bar-label {
  font-weight: 600;
  color: var(--text-color);
}

.expense-bar-value {
  color: var(--text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.expense-bar-share {
  color: var(--grey);
  font-weight: 500;
}

.expense-bar-track {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e9ecef;
  overflow: hidden;
}

.expense-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0d6efd 0%, #4ea1ff 100%);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.expense-bar-fill--accent {
  background: linear-gradient(90deg, #fd7e14 0%, #ffaa5c 100%);
}

.stats-drilldown-panel {
  margin-top: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-light-secondary);
  padding: 14px;
}
.stats-drilldown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.stats-drilldown-header h3 {
  margin: 0;
  font-size: 15px;
}
.stats-drilldown-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stats-subtitle {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-color-secondary);
}
.stats-mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 14px;
  font-size: 14px;
}
.stats-table-wrap {
  overflow-x: auto;
}
.stats-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--background-light);
  border: 1px solid var(--border-color);
}
.stats-table th,
.stats-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
}
.stats-table th {
  font-weight: 700;
  color: var(--text-color-secondary);
}
.stats-table tbody tr:last-child td {
  border-bottom: 0;
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

@media (max-width: 900px) {
  .finance-hero-grid {
    grid-template-columns: 1fr 1fr;
  }
  .finance-card--profit {
    grid-column: 1 / -1;
  }
  .ops-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .stats-drilldown-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .stats-mini-grid {
    grid-template-columns: 1fr;
  }
  .finance-hero {
    padding: 14px 14px;
  }
  .finance-hero-grid {
    grid-template-columns: 1fr;
  }
  .finance-card-value {
    font-size: 20px;
  }
  .finance-card-value--profit {
    font-size: 24px;
  }
  .ops-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .ops-card-value {
    font-size: 18px;
  }
  .expense-bar-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}

@media (max-width: 420px) {
  .ops-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
