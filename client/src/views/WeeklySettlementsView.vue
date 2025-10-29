<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { authenticatedFetch } from '../api/api.js';
import vSelect from 'vue-select';
import { formatDate } from '../utils/formatters.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================
const isLoading = ref(true);
const settlements = ref([]); // Lista pobranych rozliczeń
const employees = ref([]); // Lista pracowników do wyboru
const selectedEmployeeId = ref(null); // ID wybranego pracownika
const selectedWeekStartDate = ref(getMondayOfCurrentWeek()); // Domyślnie bieżący tydzień
const showAddModal = ref(false); // Widoczność modala dodawania/edycji
const currentSettlementData = ref(initializeNewSettlement()); // Dane dla modala
const selectedMonth = ref(new Date().toISOString().slice(0, 7)); // Domyślnie bieżący miesiąc
const summaryData = ref(null);
const isSummaryLoading = ref(false);

// ================================================================================================
// 헬 FUNKCJE POMOCNICZE
// ================================================================================================
/**
 * Zwraca datę poniedziałku dla bieżącego tygodnia w formacie YYYY-MM-DD.
 */
function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay(); // 0 = niedziela, 1 = poniedziałek, ...
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Dostosuj do poniedziałku
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Inicjalizuje pusty obiekt rozliczenia.
 */
function initializeNewSettlement() {
  return {
    employee_id: selectedEmployeeId.value, // Ustaw domyślnie wybranego
    week_start_date: selectedWeekStartDate.value,
    hours_worked: 0,
    notes: '',
    job_payments: 0,
    connections_payment: 0,
    amount_paid_this_week: 0,
    paid_date: null,
    // Pola obliczane będą uzupełniane przez serwer lub logikę
    id: null,
    hourly_earnings: 0,
    total_earnings: 0,
    previous_week_balance: 0,
    total_due_this_week: 0,
    current_week_balance: 0,
  };
}

/**
 * Znajduje istniejące rozliczenie dla wybranego pracownika i tygodnia.
 * @returns {object|null} Znalezione rozliczenie lub null.
 */
const findExistingSettlement = () => {
  if (!selectedEmployeeId.value || !selectedWeekStartDate.value) return null;
  return settlements.value.find((s) => s.employee_id === selectedEmployeeId.value && s.week_start_date === selectedWeekStartDate.value);
};

const isFormInvalid = computed(() => Object.keys(validationErrors.value).length > 0);

// 👇 TUTAJ WKLEJ NOWY BLOK 👇
const calculatedBalanceForModal = computed(() => {
  if (!currentSettlementData.value) return 0;

  const data = currentSettlementData.value;
  // Pobieramy stawkę z listy pracowników, a nie z 'data', bo 'data' może być nowym wpisem
  const employee = employees.value.find((e) => e.id === data.employee_id);
  const hourlyRate = employee ? employee.hourly_rate : 0;

  const hours = parseFloat(data.hours_worked) || 0;
  const metersPayment = parseFloat(data.job_payments) || 0;
  const connectionsPayment = parseFloat(data.connections_payment) || 0;
  const amountPaid = parseFloat(data.amount_paid_this_week) || 0;

  // Saldo poprzednie jest pobierane z serwera, więc używamy tego z 'data'
  const prevBalance = parseFloat(data.previous_week_balance) || 0;

  const hourlyEarnings = hours * hourlyRate;
  const totalEarnings = hourlyEarnings + metersPayment + connectionsPayment;
  const totalDueThisWeek = totalEarnings + prevBalance;
  const currentWeekBalance = totalDueThisWeek - amountPaid;

  return currentWeekBalance;
});
// 👆 KONIEC NOWEGO BLOKU 👆

// ================================================================================================
// 🔄 LOGIKA API
// ================================================================================================
async function fetchSettlementSummary() {
  if (!selectedEmployeeId.value || !selectedMonth.value) {
    summaryData.value = null;
    return;
  }
  isSummaryLoading.value = true;
  try {
    const params = new URLSearchParams({
      employeeId: selectedEmployeeId.value,
      month: selectedMonth.value,
    });
    const response = await authenticatedFetch(`${API_URL}/api/settlements/summary?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania podsumowania');
    summaryData.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania podsumowania:', error);
    summaryData.value = null;
  } finally {
    isSummaryLoading.value = false;
  }
}
/**
 * Pobiera listę pracowników (tylko aktywnych).
 */
async function fetchEmployees() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees`);
    if (!response.ok) throw new Error('Błąd pobierania pracowników');
    employees.value = await response.json();
    // Jeśli lista nie jest pusta, wybierz pierwszego pracownika domyślnie
    if (employees.value.length > 0 && !selectedEmployeeId.value) {
      selectedEmployeeId.value = employees.value[0].id;
    }
  } catch (error) {
    console.error('Błąd podczas pobierania pracowników:', error);
    alert(error.message);
  }
}

/**
 * Pobiera listę rozliczeń dla wybranego pracownika i zakresu dat (na razie bez zakresu).
 */
async function fetchSettlements() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (selectedEmployeeId.value) {
      params.append('employeeId', selectedEmployeeId.value);
    }
    // W przyszłości można dodać filtrowanie po zakresie dat
    // if (startDate.value) params.append('startDate', startDate.value);
    // if (endDate.value) params.append('endDate', endDate.value);

    const response = await authenticatedFetch(`${API_URL}/api/settlements?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania rozliczeń');
    settlements.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania rozliczeń:', error);
    alert(error.message);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Zapisuje nowe lub aktualizuje istniejące rozliczenie.
 */
async function handleSaveSettlement() {
  const dataToSave = currentSettlementData.value;
  let url = `${API_URL}/api/settlements`;
  let method = 'POST';

  // Jeśli edytujemy istniejący wpis
  if (dataToSave.id) {
    url = `${API_URL}/api/settlements/${dataToSave.id}`;
    method = 'PUT';
  } else {
    // Upewniamy się, że mamy ID pracownika i datę przy tworzeniu
    if (!dataToSave.employee_id || !dataToSave.week_start_date) {
      alert('Proszę wybrać pracownika i tydzień.');
      return;
    }
  }

  try {
    const response = await authenticatedFetch(url, {
      method: method,
      body: JSON.stringify(dataToSave),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Błąd podczas ${method === 'POST' ? 'dodawania' : 'aktualizacji'} rozliczenia.`);

    await fetchSettlements(); // Odśwież listę
    showAddModal.value = false; // Zamknij modal
  } catch (error) {
    console.error(`Błąd w ${method === 'POST' ? 'handleAddSettlement' : 'handleUpdateSettlement'}:`, error);
    alert(error.message);
  }
}

async function handleDeleteSettlement(settlementId) {
  if (!confirm('Czy na pewno chcesz usunąć ten wpis rozliczeniowy? Tej operacji nie można cofnąć i może ona wpłynąć na salda w przyszłych tygodniach.')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/settlements/${settlementId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć rozliczenia.');
    }
    await fetchSettlements(); // Odśwież listę
  } catch (error) {
    console.error('Błąd podczas usuwania rozliczenia:', error);
    alert(error.message);
  }
}

// ================================================================================================
// ⚡ OBSŁUGA ZDARZEŃ UI
// ================================================================================================
/**
 * Otwiera modal do dodania/edycji rozliczenia dla wybranego pracownika i tygodnia.
 */
function handleShowAddEditModal() {
  if (!selectedEmployeeId.value || !selectedWeekStartDate.value) {
    alert('Proszę najpierw wybrać pracownika i tydzień.');
    return;
  }
  const existing = findExistingSettlement();
  if (existing) {
    // Kopia do edycji, formatujemy datę wypłaty jeśli istnieje
    currentSettlementData.value = {
      ...existing,
      paid_date: existing.paid_date ? formatDate(existing.paid_date) : null,
    };
  } else {
    // Nowy wpis, ustawiamy wybranego pracownika i tydzień
    currentSettlementData.value = initializeNewSettlement();
    currentSettlementData.value.employee_id = selectedEmployeeId.value;
    currentSettlementData.value.week_start_date = selectedWeekStartDate.value;
  }
  showAddModal.value = true;
}

// ================================================================================================
// 👀 WATCHERS & CYKL ŻYCIA
// ================================================================================================
// Obserwuj zmianę pracownika lub tygodnia, aby odświeżyć listę rozliczeń
watch(
  [selectedEmployeeId, selectedMonth],
  () => {
    fetchSettlements();
    fetchSettlementSummary();
  },
  { immediate: true }
); // immediate: true - uruchom od razu

onMounted(() => {
  fetchEmployees();
  // fetchSettlements() i fetchSettlementSummary() zostaną wywołane przez watch
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Rozliczenia Tygodniowe</h1>
    </div>

    <div class="filters-container">
      <div class="form-group">
        <label for="employeeSelect">Wybierz pracownika:</label>
        <select id="employeeSelect" v-model="selectedEmployeeId">
          <option :value="null" disabled>-- Proszę wybrać --</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">
            {{ emp.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="weekSelect">Wybierz tydzień (początek):</label>
        <input type="date" id="weekSelect" v-model="selectedWeekStartDate" />
      </div>
      <div class="form-group">
        <label for="monthSelect">Podsumowanie miesiąca:</label>
        <input type="month" id="monthSelect" v-model="selectedMonth" />
      </div>
      <button class="add-new-btn" @click="handleShowAddEditModal" :disabled="!selectedEmployeeId || !selectedWeekStartDate" style="align-self: flex-end">
        {{ findExistingSettlement() ? '📝 Edytuj wpis' : '➕ Dodaj wpis' }}
      </button>
    </div>

    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Tydzień (od)</th>
                <th>Pracownik</th>
                <th>Godziny</th>
                <th>Metry</th>
                <th>Podłączenia</th>
                <th>Zarobki Godz.</th>
                <th>Zarobki Łącznie</th>
                <th>Saldo Poprzednie</th>
                <th>Należność</th>
                <th>Wypłacono</th>
                <th>Saldo Końcowe</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!settlements.length && !isLoading">
                <td colspan="11" class="empty-table-message">
                  <p>Brak rozliczeń dla wybranego pracownika/okresu.</p>
                </td>
              </tr>
              <tr v-for="(settlement, index) in settlements" :key="settlement.id">
                <td data-label="Tydzień (od)">{{ formatDate(settlement.week_start_date) }}</td>
                <td data-label="Pracownik">{{ settlement.employee_name }}</td>
                <td data-label="Godziny">{{ settlement.hours_worked || 0 }}</td>
                <td data-label="Metry">{{ settlement.job_payments || 0 }} zł</td>
                <td data-label="Podłączenia">{{ settlement.connections_payment || 0 }} zł</td>
                <td data-label="Zarobki Godz.">{{ settlement.hourly_earnings || 0 }} zł</td>
                <td data-label="Zarobki Łącznie">{{ settlement.total_earnings || 0 }} zł</td>
                <td data-label="Saldo Poprzednie">{{ settlement.previous_week_balance || 0 }} zł</td>
                <td data-label="Należność">
                  <strong>{{ settlement.total_due_this_week || 0 }} zł</strong>
                </td>
                <td data-label="Wypłacono">{{ settlement.amount_paid_this_week || 0 }} zł</td>
                <td
                  data-label="Saldo Końcowe"
                  :class="{
                    'balance-positive': parseFloat(settlement.current_week_balance) > 0.009,
                    'balance-negative': parseFloat(settlement.current_week_balance) < -0.009,
                  }"
                >
                  <strong>{{ settlement.current_week_balance || 0 }} zł</strong>
                </td>

                <td data-label="Status">
                  <span v-if="parseFloat(settlement.current_week_balance) === 0" class="status-badge status-ok"> ✅ Rozliczony </span>
                  <span v-else-if="parseFloat(settlement.current_week_balance) > 0">
                    <span v-if="index === 0" class="status-badge status-negative"> ⚠️ Bieżąca Zaległość ({{ settlement.current_week_balance }} zł) </span>
                    <span v-else class="status-badge status-neutral"> ➡️ Przeniesiono (+{{ settlement.current_week_balance }} zł) </span>
                  </span>
                  <span v-else class="status-badge status-overpaid"> ✓ Nadpłata ({{ settlement.current_week_balance }} zł) </span>
                </td>
                <td data-label="Akcje" class="actions-cell">
                  <button
                    class="edytuj"
                    @click="
                      selectedWeekStartDate = settlement.week_start_date;
                      handleShowAddEditModal();
                    "
                  >
                    Edytuj
                  </button>
                  <button class="usun" @click="handleDeleteSettlement(settlement.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="summaryData" class="summary-box">
          <h3>Podsumowanie dla: {{ selectedMonth }}</h3>
          <div v-if="isSummaryLoading" class="spinner"></div>
          <div v-else class="summary-grid">
            <div class="summary-item">
              <span>Łączne zarobki:</span>
              <strong>{{ summaryData.sum_earnings }} zł</strong>
            </div>
            <div class="summary-item">
              <span>Łącznie wypłacono:</span>
              <strong>{{ summaryData.sum_paid }} zł</strong>
            </div>
            <div class="summary-item total">
              <span>Saldo na koniec miesiąca:</span>
              <strong
                :class="{
                  'summary-balance-ok': Math.abs(parseFloat(summaryData.final_balance)) < 0.01,
                  'summary-balance-due': parseFloat(summaryData.final_balance) >= 0.01,
                  'summary-balance-overpaid': parseFloat(summaryData.final_balance) <= -0.01,
                }"
              >
                {{ summaryData.final_balance }} zł
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ currentSettlementData.id ? 'Edytuj' : 'Dodaj' }} wpis rozliczeniowy</h3>
        <button class="close-button" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleSaveSettlement">
        <div class="form-grid-single-col">
          <p><strong>Pracownik:</strong> {{ employees.find((e) => e.id === currentSettlementData.employee_id)?.name }}</p>
          <p><strong>Tydzień od:</strong> {{ formatDate(currentSettlementData.week_start_date) }}</p>
          <hr />
          <div class="form-grid">
            <div class="form-group"><label for="hoursWorked">Godziny:</label> <input type="number" step="0.5" id="hoursWorked" v-model.number="currentSettlementData.hours_worked" /></div>
            <div class="form-group"><label for="jobPayments">Metry (wypłata):</label> <input type="number" step="0.01" id="jobPayments" v-model.number="currentSettlementData.job_payments" /></div>
            <div class="form-group">
              <label for="connectionsPayment">Podłączenia (wypłata):</label>
              <input type="number" step="0.01" id="connectionsPayment" v-model.number="currentSettlementData.connections_payment" />
            </div>
          </div>
          <div class="form-group">
            <label for="settlementNotes">Notatki do godzin:</label>
            <textarea id="settlementNotes" v-model="currentSettlementData.notes" rows="2"></textarea>
          </div>
          <hr />
          <div class="settlement-summary">
            <p>
              Saldo z poprzedniego tyg.: <strong>{{ currentSettlementData.previous_week_balance || 0 }} zł</strong>
            </p>
            <p>
              Zarobki godzinowe (obliczone): <strong>{{ currentSettlementData.hourly_earnings || 0 }} zł</strong>
            </p>
            <p>
              Zarobki łączne w tym tyg.: <strong>{{ currentSettlementData.total_earnings || 0 }} zł</strong>
            </p>
            <p class="total-due">
              Należność w tym tyg.: <strong>{{ currentSettlementData.total_due_this_week || 0 }} zł</strong>
            </p>
          </div>
          <hr />
          <div class="form-grid">
            <div class="form-group">
              <label for="amountPaid">Wypłacono w tym tyg.:</label>
              <input type="number" step="0.01" id="amountPaid" v-model.number="currentSettlementData.amount_paid_this_week" required />
            </div>
            <div class="form-group">
              <label for="paidDate">Data wypłaty (opcjonalnie):</label>
              <input type="date" id="paidDate" v-model="currentSettlementData.paid_date" />
            </div>
          </div>
          <p class="final-balance">
            Saldo po wypłacie:
            <strong
              :class="{
                'balance-positive': calculatedBalanceForModal > 0.009,
                'balance-negative': calculatedBalanceForModal < -0.009,
              }"
            >
              {{ calculatedBalanceForModal.toFixed(2) }} zł
            </strong>
          </p>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Style dla statusu rozliczenia */
/* Style dla podsumowania miesięcznego */
.summary-balance-ok {
  color: var(--green);
}
.summary-balance-due {
  color: var(--red);
}
.summary-balance-overpaid {
  color: var(--blue); /* Zostawiamy niebieski dla nadpłaty, tak jak w tabeli */
}
.summary-box {
  margin-top: 2rem;
  padding: 20px;
  background-color: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.summary-box h3 {
  margin-top: 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}
.summary-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 15px;
  background-color: var(--background-light);
  border-radius: 6px;
  border: 1px solid #eee;
}
.summary-item span {
  font-size: 14px;
  color: var(--grey);
}
.summary-item strong {
  font-size: 1.2em;
  font-weight: 600;
}
.summary-item.total strong {
  font-size: 1.3em;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 12px;
  color: white;
  white-space: nowrap;
}
.status-ok {
  background-color: var(--green); /* Zielony */
}
.status-negative {
  background-color: var(--red); /* Czerwony */
}
.status-overpaid {
  background-color: var(--blue); /* Niebieski */
}
.status-neutral {
  background-color: var(--grey); /* Szary */
}

.filters-container {
  display: flex;
  gap: 20px;
  align-items: flex-end; /* Wyrównuje przycisk do dołu */
  margin-bottom: 1.5rem;
  padding: 20px;
  background-color: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.filters-container .form-group {
  margin-bottom: 0;
  flex-grow: 1; /* Pola select i date zajmą dostępną przestrzeń */
}
.filters-container label {
  font-weight: 600;
  margin-bottom: 5px;
}
.filters-container select,
.filters-container input[type='date'] {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 14px;
}

.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.settlement-summary p,
.final-balance {
  margin: 8px 0;
  font-size: 1.1em;
}
.settlement-summary strong,
.final-balance strong {
  font-weight: 600;
}
.total-due {
  font-size: 1.2em;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
  margin-top: 10px;
}
.final-balance {
  font-size: 1.3em;
  text-align: right;
  margin-top: 15px;
}

.balance-positive {
  color: var(--red);
}
.balance-negative {
  color: var(--blue);
}

/* Style dla loading overlay i spinner - można przenieść do globalnych */
.main-content-wrapper {
  position: relative;
  min-height: 200px;
}
.table-and-pagination.is-loading {
  opacity: 0.5;
  pointer-events: none;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 10;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
