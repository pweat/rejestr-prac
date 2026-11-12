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
const showMonthlyCostsPanel = ref(false);
const isSavingMonthlyExpenses = ref(false);
const monthlyExpensesForm = ref({
  totalPayroll: '',
  fuelCost: 0,
  taxesCost: 0,
  otherCosts: 0,
  notes: '',
});

const currentMonthValue = computed(() => new Date().toISOString().slice(0, 7));
const isCurrentMonthSelected = computed(() => selectedMonth.value === currentMonthValue.value);

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

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0%';
  if (number < 1) return '<1%';
  return `${Math.round(number)}%`;
}

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
  if (reminder.source_job_id) {
    params.set('stationJobId', String(reminder.source_job_id));
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
function syncMonthlyExpensesFormFromStats() {
  const stats = monthlyStats.value;
  const rawPayroll = stats?.monthlyTotalPayroll;
  monthlyExpensesForm.value = {
    totalPayroll:
      rawPayroll !== null && rawPayroll !== undefined && Number(rawPayroll) > 0 ? Number(rawPayroll) : '',
    fuelCost: Number(stats?.monthlyFuelCost) || 0,
    taxesCost: Number(stats?.monthlyTaxesCost) || 0,
    otherCosts: Number(stats?.monthlyOtherCosts) || 0,
    notes: stats?.monthlyNotes || '',
  };
}

async function getStatsForMonth() {
  try {
    const [year, month] = selectedMonth.value.split('-');
    const params = new URLSearchParams({ year, month });
    const response = await authenticatedFetch(`${API_URL}/api/stats/monthly-summary?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania statystyk');
    monthlyStats.value = await response.json();
    syncMonthlyExpensesFormFromStats();
  } catch (error) {
    console.error('Błąd podczas pobierania statystyk:', error);
    if (!handleAuthError(error)) {
      // alert('Nie udało się pobrać statystyk dla wybranego miesiąca.');
    }
  }
}

function shiftSelectedMonth(deltaMonths) {
  const [yearStr, monthStr] = (selectedMonth.value || '').split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);
  if (!year || !month) return;
  month += deltaMonths;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  selectedMonth.value = `${year}-${String(month).padStart(2, '0')}`;
}

function goToCurrentMonth() {
  selectedMonth.value = currentMonthValue.value;
}

function formatDeltaPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) < 0.05) return '0%';
  const rounded = Math.round(number);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function momArrow(value) {
  const number = Number(value) || 0;
  if (number > 0.5) return '↑';
  if (number < -0.5) return '↓';
  return '→';
}

function deltaClass(value, invert = false) {
  let number = Number(value) || 0;
  if (invert) number = -number;
  if (number > 0.5) return 'delta-positive';
  if (number < -0.5) return 'delta-negative';
  return 'delta-neutral';
}

const marginComparison = computed(() => {
  const comparison = monthlyStats.value?.comparison;
  const current = Number(monthlyStats.value?.kpis?.profitMarginPercent);
  const prevRevenue = Number(comparison?.prevRevenue) || 0;
  if (!comparison || !Number.isFinite(current) || prevRevenue <= 0) return null;
  const previous = (Number(comparison.prevProfit) / prevRevenue) * 100;
  return { previous, delta: current - previous };
});

async function saveMonthlyExpenses() {
  if (userRole === 'viewer' || isSavingMonthlyExpenses.value) return;
  const [yearStr, monthStr] = (selectedMonth.value || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return;

  isSavingMonthlyExpenses.value = true;
  try {
    const rawPayroll = monthlyExpensesForm.value.totalPayroll;
    const totalPayroll =
      rawPayroll === '' || rawPayroll === null || rawPayroll === undefined || Number(rawPayroll) <= 0
        ? null
        : Math.max(0, Number(rawPayroll) || 0);
    const payload = {
      year,
      month,
      totalPayroll,
      fuelCost: Math.max(0, Number(monthlyExpensesForm.value.fuelCost) || 0),
      taxesCost: Math.max(0, Number(monthlyExpensesForm.value.taxesCost) || 0),
      otherCosts: Math.max(0, Number(monthlyExpensesForm.value.otherCosts) || 0),
      notes: monthlyExpensesForm.value.notes || '',
    };
    const response = await authenticatedFetch(`${API_URL}/api/stats/monthly-expenses`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać kosztów miesiąca.');
    toast.success('Zapisano koszty miesiąca.');
    await getStatsForMonth();
  } catch (error) {
    console.error('Błąd zapisu kosztów miesiąca:', error);
    toast.error(error.message || 'Błąd zapisu kosztów miesiąca.');
  } finally {
    isSavingMonthlyExpenses.value = false;
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
        <div class="stats-header-controls">
          <div class="month-nav">
            <button type="button" class="btn-mini btn-mini--secondary" title="Poprzedni miesiąc" @click="shiftSelectedMonth(-1)">◀</button>
            <input type="month" id="month-picker" v-model="selectedMonth" aria-label="Wybierz miesiąc" />
            <button type="button" class="btn-mini btn-mini--secondary" title="Następny miesiąc" @click="shiftSelectedMonth(1)">▶</button>
            <button
              v-if="!isCurrentMonthSelected"
              type="button"
              class="btn-mini"
              @click="goToCurrentMonth"
            >
              Bieżący
            </button>
          </div>
          <div class="costs-toggle">
            <button
              type="button"
              class="btn-mini btn-mini--secondary"
              :class="{ active: showMonthlyCostsPanel }"
              @click="showMonthlyCostsPanel = !showMonthlyCostsPanel"
            >
              Koszty firmy
            </button>
            <p v-if="monthlyStats" class="costs-summary-line">
              Wypłaty {{ formatCurrency(monthlyStats.effectiveTotalPayroll || 0) }}
              · Paliwo {{ formatCurrency(monthlyStats.monthlyFuelCost || 0) }}
              · Podatki {{ formatCurrency(monthlyStats.monthlyTaxesCost || 0) }}
              · Inne {{ formatCurrency(monthlyStats.monthlyOtherCosts || 0) }}
            </p>
          </div>
        </div>
      </div>
      <p v-if="monthlyStats?.monthlyNotes" class="stats-month-note">{{ monthlyStats.monthlyNotes }}</p>

      <div v-if="showMonthlyCostsPanel" class="monthly-costs-panel" @keydown.enter.prevent="saveMonthlyExpenses">
        <div class="monthly-costs-grid">
          <label class="monthly-cost-field">
            <span title="Całkowite wypłaty za ten miesiąc (zawierają już wypłaty ze zleceń — nie będą dublowane)">Wypłaty razem</span>
            <template v-if="userRole !== 'viewer'">
              <div class="monthly-cost-input-row">
                <input
                  type="number"
                  step="any"
                  min="0"
                  v-model.number="monthlyExpensesForm.totalPayroll"
                  :placeholder="formatCurrency(monthlyStats?.totalJobLaborCosts || 0)"
                />
                <span class="fuel-unit">zł</span>
              </div>
            </template>
            <strong v-else>{{ formatCurrency(monthlyStats?.effectiveTotalPayroll || 0) }}</strong>
            <small v-if="monthlyStats" class="payroll-sub-hint">
              ze zleceń: {{ formatCurrency(monthlyStats.totalJobLaborCosts || 0) }}
            </small>
          </label>
          <label class="monthly-cost-field">
            <span>Paliwo</span>
            <template v-if="userRole !== 'viewer'">
              <div class="monthly-cost-input-row">
                <input type="number" step="any" min="0" v-model.number="monthlyExpensesForm.fuelCost" placeholder="0.00" />
                <span class="fuel-unit">zł</span>
              </div>
            </template>
            <strong v-else>{{ formatCurrency(monthlyStats?.monthlyFuelCost || 0) }}</strong>
          </label>
          <label class="monthly-cost-field">
            <span>Podatki</span>
            <template v-if="userRole !== 'viewer'">
              <div class="monthly-cost-input-row">
                <input type="number" step="any" min="0" v-model.number="monthlyExpensesForm.taxesCost" placeholder="0.00" />
                <span class="fuel-unit">zł</span>
              </div>
            </template>
            <strong v-else>{{ formatCurrency(monthlyStats?.monthlyTaxesCost || 0) }}</strong>
          </label>
          <label class="monthly-cost-field">
            <span>Inne koszty firmy</span>
            <template v-if="userRole !== 'viewer'">
              <div class="monthly-cost-input-row">
                <input type="number" step="any" min="0" v-model.number="monthlyExpensesForm.otherCosts" placeholder="0.00" />
                <span class="fuel-unit">zł</span>
              </div>
            </template>
            <strong v-else>{{ formatCurrency(monthlyStats?.monthlyOtherCosts || 0) }}</strong>
          </label>
        </div>
        <label class="monthly-cost-notes">
          <span>Notatka do miesiąca</span>
          <textarea
            v-if="userRole !== 'viewer'"
            v-model="monthlyExpensesForm.notes"
            rows="2"
            maxlength="1000"
            placeholder="np. księgowość, leasing, naprawy…"
          ></textarea>
          <p v-else class="monthly-notes-readonly">{{ monthlyStats?.monthlyNotes || 'Brak notatki.' }}</p>
        </label>
        <div v-if="userRole !== 'viewer'" class="monthly-costs-actions">
          <button
            type="button"
            class="btn-mini"
            :disabled="isSavingMonthlyExpenses"
            @click="saveMonthlyExpenses"
          >
            {{ isSavingMonthlyExpenses ? 'Zapisywanie…' : 'Zapisz koszty miesiąca' }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-container">
        <div class="spinner"></div>
      </div>
      <template v-else-if="monthlyStats">
        <div class="result-grid">
          <div class="result-tile result-tile--profit">
            <span class="result-label">Dochód</span>
            <strong
              class="result-value"
              :class="monthlyStats.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'"
            >
              {{ formatCurrency(monthlyStats.totalProfit) }}
            </strong>
            <span
              v-if="monthlyStats.comparison"
              class="mom-line"
              :class="deltaClass(monthlyStats.comparison.profitDeltaPct)"
            >
              {{ momArrow(monthlyStats.comparison.profitDeltaPct) }}
              {{ formatDeltaPct(monthlyStats.comparison.profitDeltaPct) }}
              · było {{ formatCurrency(monthlyStats.comparison.prevProfit) }}
            </span>
          </div>
          <div class="result-tile">
            <span class="result-label">Marża</span>
            <strong class="result-value">{{ (monthlyStats.kpis?.profitMarginPercent || 0).toFixed(1) }}%</strong>
            <span
              v-if="marginComparison"
              class="mom-line"
              :class="deltaClass(marginComparison.delta)"
            >
              {{ momArrow(marginComparison.delta) }}
              {{ marginComparison.delta > 0 ? '+' : '' }}{{ marginComparison.delta.toFixed(1) }} pp
              · było {{ marginComparison.previous.toFixed(1) }}%
            </span>
          </div>
          <div class="result-tile">
            <span class="result-label">Przychód</span>
            <strong class="result-value">{{ formatCurrency(monthlyStats.totalRevenue) }}</strong>
            <span
              v-if="monthlyStats.comparison"
              class="mom-line"
              :class="deltaClass(monthlyStats.comparison.revenueDeltaPct)"
            >
              {{ momArrow(monthlyStats.comparison.revenueDeltaPct) }}
              {{ formatDeltaPct(monthlyStats.comparison.revenueDeltaPct) }}
              · było {{ formatCurrency(monthlyStats.comparison.prevRevenue) }}
            </span>
          </div>
          <div class="result-tile">
            <span class="result-label">Wydatki</span>
            <strong class="result-value">{{ formatCurrency(monthlyStats.totalCosts) }}</strong>
            <span
              v-if="monthlyStats.comparison"
              class="mom-line"
              :class="deltaClass(monthlyStats.comparison.costsDeltaPct, true)"
            >
              {{ momArrow(monthlyStats.comparison.costsDeltaPct) }}
              {{ formatDeltaPct(monthlyStats.comparison.costsDeltaPct) }}
              · było {{ formatCurrency(monthlyStats.comparison.prevCosts) }}
            </span>
          </div>
        </div>
        <p class="result-caption">Dochód to przychód minus wydatki. Marża to dochód podzielony przez przychód.</p>

        <div class="analysis-grid">
          <section class="stats-block">
            <h3 class="stats-block-title">Według typu zlecenia</h3>
            <div class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Typ</th>
                    <th class="num">Liczba</th>
                    <th class="num">Przychód</th>
                    <th class="num">Koszty</th>
                    <th class="num">Dochód</th>
                    <th class="num">Marża</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in monthlyStats.breakdown?.financials?.byJobType || []" :key="item.key">
                    <td>
                      <RouterLink :to="jobsLinkForMonth(item.key)" class="job-type-link">{{ item.label }}</RouterLink>
                    </td>
                    <td class="num">{{ item.count || 0 }}</td>
                    <td class="num">{{ formatCurrency(item.revenue) }}</td>
                    <td class="num">{{ formatCurrency(item.costs) }}</td>
                    <td class="num" :class="(item.profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'">
                      {{ formatCurrency(item.profit) }}
                    </td>
                    <td class="num">{{ (item.marginPercent || 0).toFixed(1) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="stats-block">
            <h3 class="stats-block-title">Wydatki</h3>
            <div v-if="monthlyStats.breakdown?.financials?.payrollSummary" class="payroll-line">
              <span>Łącznie <strong>{{ formatCurrency(monthlyStats.breakdown.financials.payrollSummary.effectiveTotalPayroll) }}</strong></span>
              <span>Ze zleceń <strong>{{ formatCurrency(monthlyStats.breakdown.financials.payrollSummary.jobLaborCosts) }}</strong></span>
              <span>Pozostałe <strong>{{ formatCurrency(monthlyStats.breakdown.financials.payrollSummary.extraPayrollCosts) }}</strong></span>
            </div>
            <div v-if="expenseCategories.length" class="expense-bars">
              <div v-for="item in expenseCategories" :key="item.key" class="expense-bar">
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
            <p v-else class="stats-empty">Brak wydatków w tym miesiącu.</p>
          </section>
        </div>

        <section class="stats-block realization">
          <h3 class="stats-block-title">Realizacja</h3>
          <div class="realization-grid">
            <div class="realization-card">
              <h4>Metry</h4>
              <strong class="realization-value">{{ monthlyStats.breakdown?.meters?.totalMeters || monthlyStats.totalMeters || 0 }} m</strong>
              <span
                v-if="monthlyStats.comparison"
                class="mom-line"
                :class="deltaClass(monthlyStats.comparison.metersDeltaPct)"
              >
                {{ momArrow(monthlyStats.comparison.metersDeltaPct) }}
                {{ formatDeltaPct(monthlyStats.comparison.metersDeltaPct) }}
                · było {{ monthlyStats.comparison.prevMeters || 0 }} m
              </span>
              <dl class="metric-list">
                <div>
                  <dt>Średnio / studnię</dt>
                  <dd>{{ (monthlyStats.breakdown?.meters?.avgMetersPerWell || 0).toFixed(2) }} m</dd>
                </div>
                <div>
                  <dt>Cena / m</dt>
                  <dd>{{ formatCurrency(monthlyStats.breakdown?.meters?.avgPricePerMeter) }}</dd>
                </div>
                <div>
                  <dt>Koszt / m</dt>
                  <dd>{{ formatCurrency(monthlyStats.breakdown?.meters?.avgCostPerMeter) }}</dd>
                </div>
                <div>
                  <dt>Dochód / m</dt>
                  <dd>{{ formatCurrency(monthlyStats.breakdown?.meters?.wellProfitPerMeter) }}</dd>
                </div>
              </dl>
            </div>
            <div class="realization-card" v-if="monthlyStats.kpis?.serviceBreakdown">
              <h4>Serwisy</h4>
              <dl class="metric-list">
                <div>
                  <dt>Płatne</dt>
                  <dd>{{ monthlyStats.kpis.serviceBreakdown.paidCount }}</dd>
                </div>
                <div>
                  <dt>Przychód płatnych</dt>
                  <dd>{{ formatCurrency(monthlyStats.kpis.serviceBreakdown.paidRevenue) }}</dd>
                </div>
                <div>
                  <dt>Koszt płatnych</dt>
                  <dd>{{ formatCurrency(monthlyStats.kpis.serviceBreakdown.paidCosts) }}</dd>
                </div>
                <div>
                  <dt>Gwarancyjne</dt>
                  <dd>{{ monthlyStats.kpis.serviceBreakdown.warrantyCount }}</dd>
                </div>
                <div>
                  <dt>Koszt gwarancyjnych</dt>
                  <dd>{{ formatCurrency(monthlyStats.kpis.serviceBreakdown.warrantyCosts) }}</dd>
                </div>
              </dl>
              <RouterLink :to="jobsLinkForMonth('service')" class="quiet-link">Lista serwisów</RouterLink>
            </div>
          </div>
          <p class="job-count-links">
            <RouterLink :to="jobsLinkForMonth('well_drilling')" class="quiet-link">Studnie · {{ monthlyStats.jobCounts.well_drilling || 0 }}</RouterLink>
            <RouterLink :to="jobsLinkForMonth('connection')" class="quiet-link">Podłączenia · {{ monthlyStats.jobCounts.connection || 0 }}</RouterLink>
            <RouterLink :to="jobsLinkForMonth('treatment_station')" class="quiet-link">Stacje · {{ monthlyStats.jobCounts.treatment_station || 0 }}</RouterLink>
          </p>
          <div v-if="monthlyStats.breakdown?.meters?.topWells?.length" class="top-wells">
            <h4 class="stats-block-subtitle">Największe odwierty</h4>
            <div class="stats-table-wrap">
              <table class="stats-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Klient</th>
                    <th>Miejscowość</th>
                    <th class="num">Metry</th>
                    <th class="num">Szac. przychód</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="well in monthlyStats.breakdown.meters.topWells" :key="well.id">
                    <td>{{ well.jobDate }}</td>
                    <td>{{ well.clientName }}</td>
                    <td>{{ well.miejscowosc }}</td>
                    <td class="num">{{ well.meters }}</td>
                    <td class="num">{{ formatCurrency(well.estimatedRevenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </template>
      <div v-else class="empty-message">
        <p>Brak danych do wyświetlenia.</p>
      </div>
    </section>

    <div v-if="showPostponeModal" class="modal-backdrop">
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
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.stats-header .widget-title {
  margin: 0;
  border: none;
  padding: 0;
}

.stats-header-controls {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px 18px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-nav input[type='month'] {
  font-size: 14px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-light);
  color: var(--text-color);
}

.costs-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  max-width: 520px;
}

.costs-summary-line,
.stats-month-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--grey);
}

.stats-month-note {
  margin: -6px 0 14px;
}

.stats-header + .monthly-costs-panel,
.stats-month-note + .monthly-costs-panel {
  margin-top: 12px;
}

.btn-mini.active {
  border-color: var(--blue);
  background: #eef6ff;
  color: var(--blue);
}

.monthly-costs-panel {
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.monthly-costs-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.monthly-cost-field,
.monthly-cost-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}

.monthly-cost-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.monthly-cost-field input,
.monthly-cost-notes textarea {
  width: 100%;
  font-size: 14px;
  font-weight: 400;
  padding: 7px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-light);
  color: var(--text-color);
  box-sizing: border-box;
}

.monthly-cost-notes textarea {
  resize: vertical;
  min-height: 56px;
}

.monthly-cost-field .fuel-unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--grey);
}

.monthly-notes-readonly {
  margin: 0;
  font-weight: 400;
  color: var(--grey);
}

.monthly-costs-actions {
  display: flex;
  justify-content: flex-end;
}

.payroll-sub-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--grey);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.result-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 108px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
}

.result-tile--profit {
  background: #fff;
  border-color: #d7e3f4;
}

.result-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--grey);
}

.result-value {
  font-size: 22px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  color: var(--text-color);
}

.result-tile--profit .result-value {
  font-size: 26px;
}

.mom-line {
  margin-top: auto;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
}

.delta-positive {
  color: #146c43;
}

.delta-negative {
  color: #b02a37;
}

.delta-neutral {
  color: #5c6770;
}

.result-caption {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--grey);
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-top: 18px;
}

.stats-block {
  min-width: 0;
}

.stats-block-title,
.stats-block-subtitle,
.realization-card h4 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color);
}

.stats-block-subtitle {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.payroll-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.payroll-line strong {
  color: var(--text-color);
  font-variant-numeric: tabular-nums;
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
  white-space: nowrap;
}

.expense-bar-share {
  color: var(--grey);
  font-weight: 500;
}

.expense-bar-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #e9ecef;
  overflow: hidden;
}

.expense-bar-fill {
  height: 100%;
  background: #3b82c4;
  border-radius: 999px;
}

.expense-bar-fill--accent {
  background: #d97706;
}

.stats-empty {
  margin: 0;
  font-size: 13px;
  color: var(--grey);
}

.stats-table-wrap {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--background-light);
}

.stats-table th,
.stats-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  white-space: nowrap;
}

.stats-table th {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--grey);
}

.stats-table tbody tr:last-child td {
  border-bottom: 0;
}

.stats-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.job-type-link,
.quiet-link {
  color: var(--text-color);
  text-decoration: none;
  font-weight: 600;
}

.job-type-link:hover,
.quiet-link:hover {
  color: var(--blue);
  text-decoration: underline;
}

.realization {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.realization-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.realization-card {
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: #f8fafc;
}

.realization-value {
  display: block;
  margin-bottom: 4px;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.metric-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin: 12px 0 0;
}

.metric-list div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-list dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--grey);
}

.metric-list dd {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.realization-card .quiet-link {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--blue);
}

.job-count-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 14px 0 0;
}

.job-count-links .quiet-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-secondary);
}

@media (max-width: 980px) {
  .result-grid,
  .analysis-grid,
  .realization-grid,
  .monthly-costs-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .result-grid,
  .analysis-grid,
  .realization-grid,
  .monthly-costs-grid,
  .metric-list {
    grid-template-columns: 1fr;
  }

  .costs-toggle {
    align-items: flex-start;
  }

  .stats-header-controls {
    justify-content: flex-start;
  }

  .expense-bar-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
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
