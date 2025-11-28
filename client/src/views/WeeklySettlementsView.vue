<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { authenticatedFetch } from '../api/api.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- STAN ---
const isLoading = ref(false);
const employees = ref([]);
const selectedEmployeeId = ref(null);
const settlementsData = ref(null);

const showWorkModal = ref(false);
const showPaymentModal = ref(false);
const expandedMonths = ref({});

// --- DANE DO FORMULARZY ---
const availableWeeks = computed(() => {
  const weeks = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 12 * 7);

  for (let i = 0; i < 24; i++) {
    const monday = new Date(start);
    monday.setDate(monday.getDate() + i * 7);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const label = `${monday.getDate().toString().padStart(2, '0')}.${(monday.getMonth() + 1).toString().padStart(2, '0')} - ${sunday.getDate().toString().padStart(2, '0')}.${(sunday.getMonth() + 1).toString().padStart(2, '0')}.${sunday.getFullYear()}`;
    const value = monday.toISOString().split('T')[0];

    weeks.push({ label, value });
  }
  return weeks.reverse();
});

const currentMonday = (() => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
})();

const newWork = ref({
  week_monday: currentMonday,
  hours: 0,
  hourly_rate: 0,
  meters: 0,
  meter_rate: 0,
  connections_amount: 0,
  bonus_amount: 0,
  notes: '',
});

const newPayment = ref({
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  notes: '',
});

// --- COMPUTED ---
const selectedEmployee = computed(() => employees.value.find((e) => e.id === selectedEmployeeId.value));
const currentBalance = computed(() => settlementsData.value?.summary?.balance || 0);

const sortedSettlements = computed(() => {
  if (!settlementsData.value?.months) return [];
  return settlementsData.value.months.map((month) => {
    return {
      ...month,
      entries: [...month.entries].sort((a, b) => new Date(b.date) - new Date(a.date)),
      payments: [...month.payments].sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  });
});

const calculatedWorkAmount = computed(() => {
  const h = parseFloat(newWork.value.hours) || 0;
  const h_rate = parseFloat(newWork.value.hourly_rate) || 0;
  const m = parseFloat(newWork.value.meters) || 0;
  const m_rate = parseFloat(newWork.value.meter_rate) || 0;
  const c = parseFloat(newWork.value.connections_amount) || 0;
  const b = parseFloat(newWork.value.bonus_amount) || 0;
  return h * h_rate + m * m_rate + c + b;
});

function formatWeekRange(dateString) {
  if (!dateString) return '-';
  const start = new Date(dateString);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const f = (d) => `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${f(start)} - ${f(end)}`;
}

// --- API ---
async function fetchEmployees() {
  try {
    const res = await authenticatedFetch(`${API_URL}/api/employees`);
    employees.value = await res.json();
    if (employees.value.length > 0 && !selectedEmployeeId.value) {
      selectedEmployeeId.value = employees.value[0].id;
    }
  } catch (err) {
    console.error(err);
  }
}

async function fetchSettlements() {
  if (!selectedEmployeeId.value) return;
  isLoading.value = true;
  try {
    const res = await authenticatedFetch(`${API_URL}/api/settlements/dashboard/${selectedEmployeeId.value}`);
    if (!res.ok) throw new Error('Błąd pobierania');
    settlementsData.value = await res.json();

    if (settlementsData.value?.months?.length > 0) {
      const newestMonth = settlementsData.value.months[0].month;
      expandedMonths.value[newestMonth] = true;
    }
  } catch (err) {
    console.error(err);
    settlementsData.value = { months: [], summary: { balance: 0 } };
  } finally {
    isLoading.value = false;
  }
}

async function handleAddWork() {
  try {
    const payload = { ...newWork.value, date: newWork.value.week_monday, employee_id: selectedEmployeeId.value };
    const res = await authenticatedFetch(`${API_URL}/api/work-entries`, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Błąd');
    showWorkModal.value = false;
    newWork.value.hours = 0;
    newWork.value.meters = 0;
    newWork.value.connections_amount = 0;
    newWork.value.bonus_amount = 0;
    newWork.value.notes = '';
    fetchSettlements();
  } catch (err) {
    alert('Nie udało się zapisać pracy');
  }
}

async function handleAddPayment() {
  try {
    const payload = { ...newPayment.value, employee_id: selectedEmployeeId.value };
    const res = await authenticatedFetch(`${API_URL}/api/employee-payments`, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error('Błąd');
    showPaymentModal.value = false;
    newPayment.value.amount = 0;
    newPayment.value.notes = '';
    fetchSettlements();
  } catch (err) {
    alert('Nie udało się zapisać wypłaty');
  }
}

async function handleDeleteEntry(type, id) {
  if (!confirm('Usunąć?')) return;
  const endpoint = type === 'work' ? 'work-entries' : 'employee-payments';
  await authenticatedFetch(`${API_URL}/api/${endpoint}/${id}`, { method: 'DELETE' });
  fetchSettlements();
}

function toggleMonth(month) {
  expandedMonths.value[month] = !expandedMonths.value[month];
}

function openWorkModal() {
  if (selectedEmployee.value) {
    newWork.value.hourly_rate = selectedEmployee.value.hourly_rate || 0;
    newWork.value.meter_rate = selectedEmployee.value.meter_rate || 0;
  }
  showWorkModal.value = true;
}

function printReport() {
  window.print();
}

watch(selectedEmployeeId, fetchSettlements);
onMounted(fetchEmployees);
</script>

<template>
  <div class="container">
    <div class="header-controls no-print">
      <div class="employee-select">
        <label>Pracownik:</label>
        <div class="select-group">
          <select v-model="selectedEmployeeId">
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
          <button class="btn-print" @click="printReport" title="Drukuj widoczny raport">🖨️ Drukuj Raport</button>
        </div>
        <div v-if="selectedEmployee" class="rates-info">
          <small>Domyślne: {{ selectedEmployee.hourly_rate }}zł/h | {{ selectedEmployee.meter_rate }}zł/m</small>
        </div>
      </div>

      <div
        class="balance-display"
        :class="{
          negative: currentBalance > 0,
          positive: currentBalance < 0,
          zero: currentBalance == 0,
        }"
      >
        <small>SALDO CAŁKOWITE</small>
        <span>{{ currentBalance.toFixed(2) }} zł</span>
      </div>
    </div>

    <div class="actions-bar no-print">
      <button class="btn-add-work" @click="openWorkModal">👷 Dodaj Pracę (Należność)</button>
      <button class="btn-add-payment" @click="showPaymentModal = true">💰 Dodaj Wypłatę</button>
    </div>

    <div class="print-only print-report-header">
      <h1>Raport Rozliczeń</h1>
      <div class="print-meta">
        <p><strong>Pracownik:</strong> {{ selectedEmployee?.name }}</p>
        <p><strong>Data wygenerowania:</strong> {{ new Date().toLocaleDateString() }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading">Ładowanie danych...</div>

    <div v-else class="waterfall-container">
      <div v-for="month in sortedSettlements" :key="month.month" class="month-card">
        <div class="month-header" @click="toggleMonth(month.month)" :class="[month.status, { 'print-expanded': expandedMonths[month.month] }]">
          <div class="month-title">
            <strong>{{ month.month }}</strong>
            <span class="status-pill no-print" :class="month.status">
              {{ month.status === 'paid' ? 'OPŁACONY' : month.status === 'partial' ? 'CZĘŚCIOWO' : 'NIEOPŁACONY' }}
            </span>
          </div>
          <div class="month-finance">
            <div class="finance-item">
              Zarobek: <strong>{{ month.totalEarnings.toFixed(2) }}</strong>
            </div>
            <div class="finance-item remaining no-print" v-if="month.remaining > 0">
              Do zapłaty: <strong>{{ month.remaining.toFixed(2) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="expandedMonths[month.month]" class="month-details">
          <div class="details-column works-column">
            <div class="col-header">🛠️ Wykonane Prace</div>
            <table class="inner-table">
              <thead>
                <tr>
                  <th>Tydzień</th>
                  <th>Szczegóły</th>
                  <th class="text-right">Kwota</th>
                  <th class="no-print"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in month.entries" :key="'w' + entry.id">
                  <td class="date-cell">{{ formatWeekRange(entry.date) }}</td>
                  <td class="desc-cell">
                    <div v-if="entry.hours > 0">
                      🕒 {{ entry.hours }}h <span class="tiny-rate">({{ entry.hourly_rate_snapshot }}zł)</span>
                    </div>
                    <div v-if="entry.meters > 0">
                      📏 {{ entry.meters }}m <span class="tiny-rate">({{ entry.meter_rate_snapshot }}zł)</span>
                    </div>
                    <div v-if="entry.connections_amount > 0">🔌 Podłącz.: {{ entry.connections_amount }}</div>
                    <div v-if="entry.bonus_amount > 0">🎁 Dodatek: {{ entry.bonus_amount }}</div>
                    <div v-if="entry.notes" class="notes">{{ entry.notes }}</div>
                  </td>
                  <td class="amount-plus text-right">+{{ entry.final_amount }}</td>
                  <td class="action-cell no-print"><button class="btn-del" @click="handleDeleteEntry('work', entry.id)">×</button></td>
                </tr>
                <tr v-if="month.entries.length === 0">
                  <td colspan="4" class="empty-cell">Brak wpisów</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="details-column payments-column">
            <div class="col-header">💸 Otrzymane Wypłaty</div>
            <table class="inner-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Opis</th>
                  <th class="text-right">Kwota</th>
                  <th class="no-print"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in month.payments" :key="'p' + payment.id" class="row-payment">
                  <td class="date-cell">{{ formatDate(payment.date) }}</td>
                  <td class="desc-cell">
                    <strong>Wypłata</strong>
                    <div v-if="payment.notes" class="notes">{{ payment.notes }}</div>
                  </td>
                  <td class="amount-minus text-right">-{{ payment.amount }}</td>
                  <td class="action-cell no-print"><button class="btn-del" @click="handleDeleteEntry('payment', payment.id)">×</button></td>
                </tr>
                <tr v-if="month.payments.length === 0">
                  <td colspan="4" class="empty-cell">Brak wpisów</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="print-only print-summary">
        <hr />
        <div class="print-total">
          <span>Saldo końcowe:</span>
          <strong>{{ currentBalance.toFixed(2) }} zł</strong>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showWorkModal" class="modal-backdrop">
    <div class="modal-content modal-work">
      <div class="modal-header-clean"><h3>Dodaj Pracę</h3></div>
      <div class="form-group date-group">
        <label>Wybierz Tydzień:</label>
        <select v-model="newWork.week_monday">
          <option v-for="week in availableWeeks" :key="week.value" :value="week.value">{{ week.label }}</option>
        </select>
      </div>
      <div class="work-grid">
        <div class="wg-header">Typ</div>
        <div class="wg-header">Ilość</div>
        <div class="wg-header">Stawka (zł)</div>
        <div class="wg-label">🕒 Godziny</div>
        <div><input type="number" v-model.number="newWork.hours" placeholder="0" /></div>
        <div><input type="number" v-model.number="newWork.hourly_rate" placeholder="0" /></div>
        <div class="wg-label">📏 Metry</div>
        <div><input type="number" v-model.number="newWork.meters" placeholder="0" /></div>
        <div><input type="number" v-model.number="newWork.meter_rate" placeholder="0" /></div>
      </div>
      <hr class="subtle-hr" />
      <div class="extras-grid">
        <div class="form-group"><label>🔌 Podłączenia (kwota):</label><input type="number" v-model.number="newWork.connections_amount" /></div>
        <div class="form-group"><label>🎁 Dodatek / Premia:</label><input type="number" v-model.number="newWork.bonus_amount" /></div>
      </div>
      <div class="form-group"><label>Notatki:</label><textarea v-model="newWork.notes" rows="2"></textarea></div>
      <div class="live-calc-box">
        <span>Razem:</span><strong>{{ calculatedWorkAmount.toFixed(2) }} zł</strong>
      </div>
      <div class="modal-actions"><button @click="handleAddWork" class="btn-confirm">Zapisz</button><button @click="showWorkModal = false" class="btn-cancel">Anuluj</button></div>
    </div>
  </div>

  <div v-if="showPaymentModal" class="modal-backdrop">
    <div class="modal-content modal-sm">
      <h3>Dodaj Wypłatę</h3>
      <div class="form-group"><label>Data:</label><input type="date" v-model="newPayment.date" /></div>
      <div class="form-group"><label>Kwota (zł):</label><input type="number" v-model.number="newPayment.amount" class="input-lg" /></div>
      <div class="form-group"><label>Opis:</label><input type="text" v-model="newPayment.notes" placeholder="np. Zaliczka" /></div>
      <div class="modal-actions"><button @click="handleAddPayment" class="btn-confirm">Zapisz</button><button @click="showPaymentModal = false" class="btn-cancel">Anuluj</button></div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 98%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', sans-serif;
}
.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.select-group {
  display: flex;
  gap: 10px;
  align-items: center;
}
.employee-select select {
  padding: 8px;
  font-size: 16px;
  width: 200px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.btn-print {
  padding: 8px 12px;
  background: #34495e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 10px;
  transition: background 0.2s;
}
.btn-print:hover {
  background: #2c3e50;
}
.rates-info {
  font-size: 0.8em;
  color: #666;
  margin-top: 5px;
}
.balance-display span {
  font-size: 24px;
  font-weight: bold;
}
.balance-display.negative span {
  color: #e74c3c;
}
.balance-display.positive span {
  color: #3498db;
}
.balance-display.zero span {
  color: #2ecc71;
}

.actions-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.actions-bar button {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 15px;
  color: white;
  cursor: pointer;
}
.btn-add-work {
  background: linear-gradient(135deg, #f39c12, #e67e22);
}
.btn-add-payment {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.waterfall-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.month-card {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}
.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}
.month-header:hover {
  background: #f0f0f0;
}
.month-title strong {
  font-size: 1.1em;
}
.status-pill {
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  margin-left: 10px;
  text-transform: uppercase;
}
.status-pill.paid {
  background: #2ecc71;
}
.status-pill.partial {
  background: #f39c12;
}
.status-pill.unpaid {
  background: #e74c3c;
}
.remaining {
  color: #e74c3c;
  margin-left: 15px;
}

/* TABELA DWUKOLUMNOWA */
.month-details {
  display: flex;
  border-top: 1px solid #eee;
}
.details-column {
  flex: 1;
  padding: 0;
  border-right: 1px solid #eee;
}
.details-column:last-child {
  border-right: none;
}
.col-header {
  background: #f1f2f6;
  padding: 8px 15px;
  font-weight: bold;
  color: #555;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  border-bottom: 1px solid #ddd;
}
.works-column .col-header {
  background: #fff8e1;
  color: #b8860b;
}
.payments-column .col-header {
  background: #e8f8f5;
  color: #27ae60;
}

.inner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}
.inner-table td,
.inner-table th {
  padding: 10px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: top;
}
.inner-table th {
  text-align: left;
  color: #777;
  font-size: 0.85em;
  background: #fdfdfd;
}
.inner-table tr:last-child td {
  border-bottom: none;
}

.date-cell {
  width: 110px;
  color: #555;
  font-weight: 600;
  font-size: 0.85em;
}
.amount-plus {
  color: #2ecc71;
  font-weight: bold;
  white-space: nowrap;
}
.amount-minus {
  color: #e74c3c;
  font-weight: bold;
  white-space: nowrap;
}
.text-right {
  text-align: right;
}
.action-cell {
  width: 30px;
  text-align: center;
}
.tiny-rate {
  font-size: 0.8em;
  color: #aaa;
}
.notes {
  display: block;
  color: #888;
  font-style: italic;
  font-size: 0.85em;
  margin-top: 2px;
}
.empty-cell {
  text-align: center;
  color: #ccc;
  padding: 20px;
  font-style: italic;
}
.btn-del {
  background: none;
  border: none;
  color: #ddd;
  font-size: 1.2em;
  cursor: pointer;
}
.btn-del:hover {
  color: #e74c3c;
}

/* STYLE DO DRUKU */
.print-only {
  display: none;
}

@media print {
  @page {
    size: A4;
    margin: 1.5cm;
  }
  body * {
    visibility: hidden;
  }

  /* Pokazujemy tylko kontener i jego zawartość */
  .container,
  .waterfall-container,
  .waterfall-container * {
    visibility: visible;
  }

  .container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
    padding: 0;
    margin: 0;
  }

  /* Ukrywamy elementy nawigacyjne i przyciski */
  .no-print,
  .btn-del,
  .header-controls,
  .actions-bar,
  .status-pill,
  .remaining {
    display: none !important;
  }

  /* Pokazujemy nagłówek raportu */
  .print-only {
    display: block;
    visibility: visible;
  }
  .print-report-header {
    text-align: center;
    margin-bottom: 30px;
    border-bottom: 2px solid #333;
    padding-bottom: 10px;
  }
  .print-report-header h2 {
    margin: 0 0 5px 0;
    font-size: 24px;
  }
  .print-meta p {
    margin: 0;
    font-size: 14px;
    color: #555;
  }

  /* Stylizacja kart miesięcy */
  .month-card {
    border: 1px solid #999;
    box-shadow: none;
    margin-bottom: 20px;
    page-break-inside: avoid; /* Unikamy łamania tabeli w połowie */
  }

  .month-header {
    background: #eee !important;
    border-bottom: 1px solid #999;
    font-weight: bold;
    padding: 10px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Wymuszamy widoczność szczegółów (nawet jeśli zwinięte na ekranie) */
  .month-details {
    display: flex !important;
  }

  .col-header {
    background: #f0f0f0 !important;
    border-bottom: 1px solid #999;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .details-column {
    border-right: 1px solid #999;
  }
  .inner-table td,
  .inner-table th {
    border-bottom: 1px solid #ccc;
  }

  /* Podsumowanie końcowe */
  .print-summary {
    margin-top: 30px;
    text-align: right;
    font-size: 1.2em;
  }
}

/* STYLE MODALI - bez zmian */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-work {
  width: 500px;
  max-width: 95%;
}
.modal-sm {
  width: 350px;
}
.modal-header-clean {
  text-align: center;
  margin-bottom: 20px;
}
.work-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}
.wg-header {
  font-size: 0.8em;
  font-weight: bold;
  color: #777;
  text-align: center;
}
.wg-label {
  font-weight: 600;
  color: #444;
}
.work-grid input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-align: center;
}
.extras-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}
.subtle-hr {
  border: 0;
  border-top: 1px solid #eee;
  margin: 15px 0;
}
.live-calc-box {
  background: #f3f9ff;
  padding: 15px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1em;
  color: #2c3e50;
  border: 1px solid #dbeafe;
  margin-bottom: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  font-size: 0.9em;
  color: #555;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-sizing: border-box;
}
.input-lg {
  font-size: 1.2em;
  font-weight: bold;
  color: #2ecc71;
}
.modal-actions {
  display: flex;
  gap: 10px;
}
.btn-confirm {
  flex: 2;
  background: #3498db;
  color: white;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}
.btn-cancel {
  flex: 1;
  background: #f1f2f6;
  color: #333;
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}
</style>
