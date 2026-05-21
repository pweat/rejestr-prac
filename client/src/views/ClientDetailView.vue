<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { getUserRole } from '../auth/auth.js';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const route = useRoute();
const toast = useToast();
const userRole = getUserRole();

const isLoading = ref(true);
const data = ref(null);
const serviceSchedules = ref([]);
const schedulesLoading = ref(false);
const showAddScheduleModal = ref(false);
const showEditScheduleModal = ref(false);
const scheduleForm = ref({
  miejscowosc: '',
  serviceIntervalMonths: 12,
  lastServiceDate: '',
  notes: '',
});
const editingSchedule = ref(null);
const postponeScheduleId = ref(null);
const postponeMonths = ref(3);

const JOB_TYPE_LABELS = {
  well_drilling: 'Wykonanie Studni',
  connection: 'Podłączenie',
  treatment_station: 'Stacja Uzdatniania',
  service: 'Serwis',
};
const OFFER_STATUS_LABELS = {
  draft: 'Robocza',
  sent: 'Wysłana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
};
const offerTypeLabels = ref({});

const translateJobType = (t) => JOB_TYPE_LABELS[t] || t || '-';
const translateOfferStatus = (s) => OFFER_STATUS_LABELS[s] || s || '-';
const translateOfferType = (t) => offerTypeLabels.value[t] || t || '-';

async function fetchOfferTypeLabels() {
  try {
    const res = await authenticatedFetch(`${API_URL}/api/offer-templates/labels`);
    if (res.ok) offerTypeLabels.value = await res.json();
  } catch (e) {
    console.error(e);
  }
}

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
};

const clientId = computed(() => route.params.id);

async function fetchData() {
  isLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/clients/${clientId.value}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Nie udało się pobrać danych klienta.');
    }
    data.value = await response.json();
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'Błąd pobierania danych klienta.');
  } finally {
    isLoading.value = false;
  }
}

function scheduleStatusLabel(status) {
  if (status === 'expired') return 'Wygasło';
  if (status === 'warning') return 'Wkrótce';
  return 'OK';
}

async function fetchServiceSchedules() {
  schedulesLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules/client/${clientId.value}`);
    if (!response.ok) throw new Error('Błąd pobierania harmonogramów');
    serviceSchedules.value = await response.json();
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'Nie udało się pobrać harmonogramów serwisowych.');
  } finally {
    schedulesLoading.value = false;
  }
}

function resetScheduleForm() {
  scheduleForm.value = {
    miejscowosc: '',
    serviceIntervalMonths: 12,
    lastServiceDate: '',
    notes: '',
  };
}

function openAddScheduleModal() {
  resetScheduleForm();
  showAddScheduleModal.value = true;
}

function openEditScheduleModal(schedule) {
  editingSchedule.value = schedule;
  scheduleForm.value = {
    miejscowosc: schedule.miejscowosc === '—' ? '' : schedule.miejscowosc,
    serviceIntervalMonths: schedule.service_interval_months,
    lastServiceDate: schedule.last_service_date || '',
    notes: schedule.notes || '',
  };
  showEditScheduleModal.value = true;
}

async function saveNewSchedule() {
  if (!scheduleForm.value.miejscowosc?.trim()) {
    toast.warn('Podaj miejscowość / lokalizację.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules`, {
      method: 'POST',
      body: JSON.stringify({
        clientId: Number(clientId.value),
        miejscowosc: scheduleForm.value.miejscowosc.trim(),
        serviceIntervalMonths: scheduleForm.value.serviceIntervalMonths,
        lastServiceDate: scheduleForm.value.lastServiceDate || null,
        notes: scheduleForm.value.notes || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się utworzyć harmonogramu.');
    toast.success('Harmonogram dodany.');
    showAddScheduleModal.value = false;
    await fetchServiceSchedules();
  } catch (error) {
    toast.error(error.message);
  }
}

async function saveEditSchedule() {
  if (!editingSchedule.value) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules/${editingSchedule.value.schedule_id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        miejscowosc: scheduleForm.value.miejscowosc.trim(),
        serviceIntervalMonths: scheduleForm.value.serviceIntervalMonths,
        lastServiceDate: scheduleForm.value.lastServiceDate || null,
        notes: scheduleForm.value.notes || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nie udało się zapisać zmian.');
    toast.success('Harmonogram zaktualizowany.');
    showEditScheduleModal.value = false;
    editingSchedule.value = null;
    await fetchServiceSchedules();
  } catch (error) {
    toast.error(error.message);
  }
}

async function markScheduleServiced(schedule) {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules/${schedule.schedule_id}/mark-serviced`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Operacja nie powiodła się.');
    toast.success('Oznaczono jako wykonany.');
    await fetchServiceSchedules();
  } catch (error) {
    toast.error(error.message);
  }
}

function openPostponeForSchedule(schedule) {
  postponeScheduleId.value = schedule.schedule_id;
  postponeMonths.value = 3;
}

async function confirmSchedulePostpone() {
  if (!postponeScheduleId.value) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/service-schedules/${postponeScheduleId.value}/postpone`, {
      method: 'POST',
      body: JSON.stringify({ months: postponeMonths.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Operacja nie powiodła się.');
    toast.success(`Termin przesunięty o ${postponeMonths.value} mies.`);
    postponeScheduleId.value = null;
    await fetchServiceSchedules();
  } catch (error) {
    toast.error(error.message);
  }
}

function quickServiceLink(schedule) {
  const params = new URLSearchParams({
    clientId: String(clientId.value),
    jobType: 'service',
    action: 'new',
  });
  if (schedule.miejscowosc && schedule.miejscowosc !== '—') {
    params.set('miejscowosc', schedule.miejscowosc);
  }
  return `/zlecenia?${params.toString()}`;
}

watch(clientId, () => {
  fetchData();
  fetchServiceSchedules();
});
onMounted(() => {
  fetchOfferTypeLabels();
  fetchData();
  fetchServiceSchedules();
});

const summary = computed(() => data.value?.summary || null);
</script>

<template>
  <div class="container">
    <div class="page-header">
      <div class="breadcrumbs">
        <RouterLink to="/klienci" class="breadcrumb-link">← Klienci</RouterLink>
      </div>
      <div class="header-actions">
        <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="btn btn-secondary">Zlecenia klienta</RouterLink>
        <RouterLink :to="`/oferty?clientId=${clientId}`" class="btn btn-secondary">Oferty klienta</RouterLink>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state"><div class="spinner"></div></div>

    <div v-else-if="!data" class="empty-state">
      <p>Nie znaleziono klienta.</p>
    </div>

    <template v-else>
      <section class="client-card">
        <div class="client-card-main">
          <h1>{{ data.client.name || 'Bez nazwy' }}</h1>
          <div class="client-card-meta">
            <span v-if="data.client.phone_number"><strong>Telefon:</strong> {{ data.client.phone_number }}</span>
            <span v-if="data.client.email"><strong>Email:</strong> {{ data.client.email }}</span>
            <span v-if="data.client.address"><strong>Adres:</strong> {{ data.client.address }}</span>
          </div>
          <p v-if="data.client.notes" class="client-notes">{{ data.client.notes }}</p>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Zlecenia</div>
          <div class="stat-value">{{ summary.jobs_count }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Oferty łącznie</div>
          <div class="stat-value">{{ summary.offers_total }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_total) }} netto</div>
        </div>
        <div class="stat-card stat--draft">
          <div class="stat-label">Robocze</div>
          <div class="stat-value">{{ summary.offers_by_status.draft }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.draft) }}</div>
        </div>
        <div class="stat-card stat--sent">
          <div class="stat-label">Wysłane</div>
          <div class="stat-value">{{ summary.offers_by_status.sent }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.sent) }}</div>
        </div>
        <div class="stat-card stat--accepted">
          <div class="stat-label">Zaakceptowane</div>
          <div class="stat-value">{{ summary.offers_by_status.accepted }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.accepted) }}</div>
        </div>
        <div class="stat-card stat--rejected">
          <div class="stat-label">Odrzucone</div>
          <div class="stat-value">{{ summary.offers_by_status.rejected }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.rejected) }}</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Harmonogramy serwisowe ({{ serviceSchedules.length }})</h2>
          <button v-if="userRole !== 'viewer'" type="button" class="btn btn-small" @click="openAddScheduleModal">+ Dodaj harmonogram</button>
        </div>
        <div v-if="schedulesLoading" class="empty-mini">Ładowanie harmonogramów…</div>
        <div v-else-if="!serviceSchedules.length" class="empty-mini">Brak harmonogramów. Dodaj przy instalacji stacji lub ręcznie.</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Miejscowość</th>
                <th>Interwał</th>
                <th>Ostatni serwis</th>
                <th>Następny termin</th>
                <th>Status</th>
                <th v-if="userRole !== 'viewer'">Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="schedule in serviceSchedules" :key="schedule.schedule_id">
                <td data-label="Miejscowość">{{ schedule.miejscowosc || '—' }}</td>
                <td data-label="Interwał">co {{ schedule.service_interval_months }} mies.</td>
                <td data-label="Ostatni">{{ formatDate(schedule.last_service_date) }}</td>
                <td data-label="Następny">{{ formatDate(schedule.next_service_due) }}</td>
                <td data-label="Status">
                  <span class="badge" :class="`badge--schedule-${schedule.status}`">{{ scheduleStatusLabel(schedule.status) }}</span>
                </td>
                <td v-if="userRole !== 'viewer'" data-label="Akcje" class="actions-cell schedule-actions">
                  <div class="actions-cell-inner">
                    <RouterLink :to="quickServiceLink(schedule)" class="link">Serwis</RouterLink>
                    <button type="button" class="link-btn" @click="markScheduleServiced(schedule)">Wykonano</button>
                    <button type="button" class="link-btn" @click="openPostponeForSchedule(schedule)">Odłóż</button>
                    <button type="button" class="link-btn" @click="openEditScheduleModal(schedule)">Edytuj</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="postponeScheduleId && userRole !== 'viewer'" class="postpone-inline">
          <label>
            Odłóż o (mies.):
            <input v-model.number="postponeMonths" type="number" min="1" max="60" />
          </label>
          <button type="button" class="btn btn-small" @click="confirmSchedulePostpone">Zapisz</button>
          <button type="button" class="btn btn-small btn-secondary" @click="postponeScheduleId = null">Anuluj</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Zlecenia ({{ data.jobs.length }})</h2>
          <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="link">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="!data.jobs.length" class="empty-mini">Brak zleceń dla tego klienta.</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Typ</th>
                <th>Miejscowość</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in data.jobs" :key="job.id">
                <td data-label="Data">{{ formatDate(job.job_date) }}</td>
                <td data-label="Typ">
                  <span class="badge" :class="`badge--job-${job.job_type}`">{{ translateJobType(job.job_type) }}</span>
                </td>
                <td data-label="Miejscowość">{{ job.miejscowosc || '-' }}</td>
                <td data-label="Akcje">
                  <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="link">Otwórz →</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Oferty ({{ data.offers.length }})</h2>
          <RouterLink :to="`/oferty?clientId=${clientId}`" class="link">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="!data.offers.length" class="empty-mini">Brak ofert dla tego klienta.</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Numer</th>
                <th>Data</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Wartość netto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="offer in data.offers" :key="offer.id">
                <td data-label="Numer">{{ offer.offer_number }}</td>
                <td data-label="Data">{{ formatDate(offer.issue_date) }}</td>
                <td data-label="Typ">{{ translateOfferType(offer.offer_type) }}</td>
                <td data-label="Status">
                  <span class="badge" :class="`badge--status-${offer.status}`">{{ translateOfferStatus(offer.status) }}</span>
                </td>
                <td data-label="Wartość netto">{{ formatCurrency(offer.total_net_value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div v-if="showAddScheduleModal" class="modal-backdrop" @click.self="showAddScheduleModal = false">
      <div class="modal-box">
        <h3>Nowy harmonogram serwisowy</h3>
        <div class="form-grid">
          <label>Miejscowość / lokalizacja<input v-model="scheduleForm.miejscowosc" type="text" /></label>
          <label>Interwał (mies.)<input v-model.number="scheduleForm.serviceIntervalMonths" type="number" min="1" /></label>
          <label>Ostatni serwis (opcj.)<input v-model="scheduleForm.lastServiceDate" type="date" /></label>
          <label class="full">Notatki<textarea v-model="scheduleForm.notes" rows="2" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="showAddScheduleModal = false">Anuluj</button>
          <button type="button" class="btn" @click="saveNewSchedule">Zapisz</button>
        </div>
      </div>
    </div>

    <div v-if="showEditScheduleModal" class="modal-backdrop" @click.self="showEditScheduleModal = false">
      <div class="modal-box">
        <h3>Edycja harmonogramu</h3>
        <div class="form-grid">
          <label>Miejscowość<input v-model="scheduleForm.miejscowosc" type="text" /></label>
          <label>Interwał (mies.)<input v-model.number="scheduleForm.serviceIntervalMonths" type="number" min="1" /></label>
          <label>Ostatni serwis<input v-model="scheduleForm.lastServiceDate" type="date" /></label>
          <label class="full">Notatki<textarea v-model="scheduleForm.notes" rows="2" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="showEditScheduleModal = false">Anuluj</button>
          <button type="button" class="btn" @click="saveEditSchedule">Zapisz</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}
.breadcrumbs {
  font-size: 14px;
}
.breadcrumb-link {
  color: var(--blue);
  text-decoration: none;
}
.breadcrumb-link:hover {
  text-decoration: underline;
}
.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.btn {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  color: #fff;
  background-color: var(--blue);
}
.btn-secondary {
  background-color: var(--grey);
}
.btn:hover {
  filter: brightness(1.08);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-color-secondary);
}

.client-card {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #eef2f5 100%);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}
.client-card h1 {
  margin: 0 0 8px;
  font-size: 26px;
  color: var(--text-color);
}
.client-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  color: var(--text-color-secondary);
  font-size: 14px;
}
.client-card-meta strong {
  color: var(--text-color);
}
.client-notes {
  margin-top: 10px;
  padding: 10px 12px;
  background-color: #fff;
  border-left: 3px solid var(--blue);
  border-radius: 4px;
  color: var(--text-color);
  font-size: 14px;
  white-space: pre-line;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  padding: 14px 16px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  border-top: 3px solid var(--grey);
}
.stat--draft {
  border-top-color: #6c757d;
}
.stat--sent {
  border-top-color: #007bff;
}
.stat--accepted {
  border-top-color: #28a745;
}
.stat--rejected {
  border-top-color: #dc3545;
}
.stat-label {
  font-size: 12px;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color);
}
.stat-subtitle {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.panel {
  margin-bottom: 20px;
  padding: 18px 20px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}
.panel-header h2 {
  margin: 0;
  font-size: 18px;
}
.link {
  color: var(--blue);
  text-decoration: none;
  font-size: 14px;
}
.link:hover {
  text-decoration: underline;
}
.empty-mini {
  padding: 16px;
  color: var(--text-color-secondary);
  font-style: italic;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background-color: var(--grey);
}
.badge--job-well_drilling {
  background-color: #007bff;
}
.badge--job-connection {
  background-color: #28a745;
}
.badge--job-treatment_station {
  background-color: #ffc107;
  color: #333;
}
.badge--job-service {
  background-color: #6c757d;
}
.badge--status-draft {
  background-color: #6c757d;
}
.badge--status-sent {
  background-color: #007bff;
}
.badge--status-accepted {
  background-color: #28a745;
}
.badge--status-rejected {
  background-color: #dc3545;
}
.badge--schedule-expired {
  background-color: #fdecea;
  color: #c0392b;
}
.badge--schedule-warning {
  background-color: #fff8e1;
  color: #b8860b;
}
.badge--schedule-ok {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.btn-small {
  font-size: 13px;
  padding: 6px 12px;
}
.link-btn {
  background: none;
  border: none;
  color: var(--blue);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  text-decoration: underline;
}
.postpone-inline {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
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
.modal-box {
  background: var(--background-light);
  padding: 24px;
  border-radius: 8px;
  min-width: 360px;
  max-width: 95vw;
}
.modal-box h3 {
  margin-top: 0;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}
.form-grid label.full {
  grid-column: 1 / -1;
}
.form-grid input,
.form-grid textarea {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
