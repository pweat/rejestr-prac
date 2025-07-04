<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getAuthHeaders } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import vSelect from 'vue-select';
import PaginationControls from '../components/PaginationControls.vue';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const route = useRoute();

const isLoading = ref(true);
const jobs = ref([]);
const availableClients = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const searchQuery = ref('');
const sortBy = ref('job_date');
const sortOrder = ref('desc');
const showAddJobModal = ref(false);
const showDetailsModal = ref(false);
const showEditJobModal = ref(false);
const newJobData = ref({});
const selectedJobDetails = ref(null);
const editedJobData = ref(null);
const isDetailsLoading = ref(false);

const inicjalizujNoweZlecenie = () => ({
  clientId: null,
  jobType: 'well_drilling',
  jobDate: new Date().toISOString().slice(0, 10),
  details: {},
});

function translateJobType(type) {
  const types = {
    well_drilling: 'Wykonanie Studni',
    connection: 'Podłączenie',
    treatment_station: 'Stacja Uzdatniania',
    service: 'Serwis',
  };
  return types[type] || type;
}

const wellDrillingProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { revenue: null, totalCost: null, profit: null };

  const revenue = (parseFloat(details.ilosc_metrow) || 0) * (parseFloat(details.cena_za_metr) || 0);
  const totalCost =
    (parseFloat(details.wyplaty) || 0) +
    (parseFloat(details.rury) || 0) +
    (parseFloat(details.inne_koszta) || 0);
  const profit = revenue - totalCost;

  return { revenue, totalCost, profit };
});

const connectionProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { profit: null, totalCost: null };

  const revenue = parseFloat(details.revenue) || 0;
  const totalCost =
    (parseFloat(details.casing_cost) || 0) +
    (parseFloat(details.equipment_cost) || 0) +
    (parseFloat(details.labor_cost) || 0) +
    (parseFloat(details.wholesale_materials_cost) || 0);
  const profit = revenue - totalCost;
  return { profit, totalCost };
});

const stationProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { profit: null, totalCost: null };

  const revenue = parseFloat(details.revenue) || 0;
  const totalCost =
    (parseFloat(details.equipment_cost) || 0) +
    (parseFloat(details.labor_cost) || 0) +
    (parseFloat(details.wholesale_materials_cost) || 0);
  const profit = revenue - totalCost;
  return { profit, totalCost };
});

const serviceProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details || details.is_warranty) return { profit: 0, totalCost: 0 };
  const revenue = parseFloat(details.revenue) || 0;
  const totalCost = parseFloat(details.labor_cost) || 0;
  return { profit: revenue - totalCost, totalCost };
});

const filterClients = (options, search) => {
  const lowerSearch = search.toLowerCase();
  return options.filter((client) => {
    const nameMatch = client.name && client.name.toLowerCase().includes(lowerSearch);
    const phoneMatch = client.phone_number && client.phone_number.includes(lowerSearch);
    return nameMatch || phoneMatch;
  });
};

async function fetchJobs() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 15,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    if (route.query.clientId) {
      params.append('clientId', route.query.clientId);
    }
    const response = await fetch(`${API_URL}/api/jobs?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania listy zleceń');
    const result = await response.json();
    jobs.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;
  } catch (error) {
    console.error('Błąd podczas pobierania zleceń:', error);
    alert('Nie udało się pobrać listy zleceń.');
  } finally {
    isLoading.value = false;
  }
}

async function fetchClientsForSelect() {
  try {
    const response = await fetch(`${API_URL}/api/clients-for-select`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania listy klientów');
    availableClients.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania klientów do formularza:', error);
  }
}

function handleShowAddJobModal() {
  newJobData.value = inicjalizujNoweZlecenie();
  showAddJobModal.value = true;
}

async function handleAddJob() {
  if (!newJobData.value.clientId || !newJobData.value.jobDate || !newJobData.value.jobType) {
    alert('Klient, data i typ zlecenia są wymagane.');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newJobData.value),
    });
    const newJob = await response.json();
    if (!response.ok) throw new Error(newJob.error || 'Błąd podczas tworzenia zlecenia.');
    await fetchJobs();
    showAddJobModal.value = false;
  } catch (error) {
    console.error('Błąd w handleAddJob():', error);
    alert(error.message);
  }
}

async function handleShowDetails(jobId) {
  selectedJobDetails.value = null;
  isDetailsLoading.value = true;
  showDetailsModal.value = true;
  try {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Błąd pobierania szczegółów zlecenia');
    selectedJobDetails.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów zlecenia:', error);
    alert(error.message);
    showDetailsModal.value = false;
  } finally {
    isDetailsLoading.value = false;
  }
}

async function handleShowEditModal(job) {
  editedJobData.value = null;
  isDetailsLoading.value = true;
  showEditJobModal.value = true;
  try {
    const response = await fetch(`${API_URL}/api/jobs/${job.id}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Błąd pobierania pełnych danych zlecenia do edycji');
    const fullJobData = await response.json();
    editedJobData.value = fullJobData;
  } catch (error) {
    console.error('Błąd w handleShowEditModal:', error);
    alert(error.message);
    showEditJobModal.value = false;
  } finally {
    isDetailsLoading.value = false;
  }
}

async function handleUpdateJob() {
  if (!editedJobData.value) return;
  try {
    const payload = {
      clientId: editedJobData.value.client_id,
      jobDate: editedJobData.value.job_date,
      details: editedJobData.value.details,
    };
    const response = await fetch(`${API_URL}/api/jobs/${editedJobData.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd podczas aktualizacji zlecenia.');
    }
    await fetchJobs();
    showEditJobModal.value = false;
  } catch (error) {
    console.error('Błąd w handleUpdateJob():', error);
    alert(error.message);
  }
}

async function handleDeleteJob(jobId) {
  if (!confirm('Czy na pewno chcesz usunąć to zlecenie? Tej operacji nie można cofnąć.')) return;
  try {
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error('Nie udało się usunąć zlecenia.');
    }
    await fetchJobs();
  } catch (error) {
    console.error('Błąd w handleDeleteJob():', error);
    alert(error.message);
  }
}

function handlePageChange(newPage) {
  currentPage.value = newPage;
}

function changeSort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'desc';
  }
}

watch([currentPage, sortBy, sortOrder], fetchJobs);
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchJobs();
  }, 300);
});
watch(
  () => newJobData.value.jobType,
  (newType, oldType) => {
    if (newType !== oldType) {
      newJobData.value.details = {};
    }
  }
);
onMounted(() => {
  fetchJobs();
  fetchClientsForSelect();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Rejestr Zleceń ({{ totalItems }})</h1>
      <button class="add-new-btn" @click="handleShowAddJobModal" :disabled="isLoading">
        &#43; Dodaj Zlecenie
      </button>
    </div>
    <div class="search-container">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Szukaj po kliencie, telefonie, miejscowości..."
      />
    </div>
    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th @click="changeSort('client_name')" class="sortable">
                  Klient
                  <span v-if="sortBy === 'client_name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Telefon Klienta</th>
                <th @click="changeSort('miejscowosc')" class="sortable">
                  Miejscowość
                  <span v-if="sortBy === 'miejscowosc'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Typ Zlecenia</th>
                <th @click="changeSort('job_date')" class="sortable">
                  Data
                  <span v-if="sortBy === 'job_date'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in jobs" :key="job.id">
                <td data-label="Klient">{{ job.client_name || '-' }}</td>
                <td data-label="Telefon Klienta">{{ job.client_phone }}</td>
                <td data-label="Miejscowość">{{ job.miejscowosc || '-' }}</td>
                <td data-label="Typ Zlecenia">
                  <span class="job-type-badge" :class="job.job_type">{{
                    translateJobType(job.job_type)
                  }}</span>
                </td>
                <td data-label="Data">{{ formatDate(job.job_date) }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <button class="pokaż" @click="handleShowDetails(job.id)">Szczegóły</button>
                  <button class="edytuj" @click="handleShowEditModal(job)">Edytuj</button>
                  <button class="usun" @click="handleDeleteJob(job.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!jobs.length && !isLoading" class="empty-table-message">
            <p>Brak zleceń w bazie lub pasujących do wyszukiwania.</p>
          </div>
        </div>
        <PaginationControls
          v-if="totalPages > 1"
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-changed="handlePageChange"
        />
      </div>
    </div>
  </div>

  <div v-if="showAddJobModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowe zlecenie</h3>
        <button class="close-button" @click="showAddJobModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddJob">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label>1. Wybierz klienta</label
            ><v-select
              :options="availableClients"
              :get-option-label="(option) => option.name || 'Brak Nazwy'"
              :filter="filterClients"
              :reduce="(client) => client.id"
              v-model="newJobData.clientId"
              placeholder="-- Wyszukaj klienta --"
              ><template #option="{ name, phone_number }"
                ><div>
                  <strong>{{ name || 'Brak nazwy' }}</strong
                  ><br /><small>{{ phone_number }}</small>
                </div></template
              ><template #selected-option="{ name, phone_number }"
                ><div>
                  <strong>{{ name || 'Brak nazwy' }}</strong
                  ><br /><small>{{ phone_number }}</small>
                </div></template
              ></v-select
            >
          </div>
          <div class="form-group">
            <label>2. Data zlecenia</label
            ><input type="date" v-model="newJobData.jobDate" required />
          </div>
          <div class="form-group">
            <label>3. Typ zlecenia</label
            ><select v-model="newJobData.jobType">
              <option value="well_drilling">Wykonanie Studni</option>
              <option value="connection">Podłączenie</option>
              <option value="treatment_station">Stacja Uzdatniania</option>
              <option value="service">Serwis</option>
            </select>
          </div>
          <div class="details-section">
            <hr />
            <h4>4. Wprowadź szczegóły zlecenia</h4>
            <div v-if="newJobData.jobType === 'well_drilling'" class="form-grid">
              <div class="form-group">
                <label>Miejscowość:</label
                ><input type="text" v-model="newJobData.details.miejscowosc" />
              </div>
              <div class="form-group">
                <label>Pracownicy:</label
                ><input type="text" v-model="newJobData.details.pracownicy" />
              </div>
              <div class="form-group full-width">
                <label>Informacje:</label
                ><textarea v-model="newJobData.details.informacje" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label>Średnica Ø:</label
                ><input type="number" step="any" v-model.number="newJobData.details.srednica" />
              </div>
              <div class="form-group">
                <label>Ilość metrów:</label
                ><input type="number" step="any" v-model.number="newJobData.details.ilosc_metrow" />
              </div>
              <div class="form-group">
                <label>Cena za metr:</label
                ><input type="number" step="any" v-model.number="newJobData.details.cena_za_metr" />
              </div>
              <div class="form-group">
                <label>Lustro statyczne:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.lustro_statyczne"
                />
              </div>
              <div class="form-group">
                <label>Lustro dynamiczne:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.lustro_dynamiczne"
                />
              </div>
              <div class="form-group">
                <label>Wydajność (m³/h):</label
                ><input type="number" step="any" v-model.number="newJobData.details.wydajnosc" />
              </div>
              <hr class="full-width-hr" />
              <div class="form-group">
                <label>Koszt: Rury</label
                ><input type="number" step="any" v-model.number="newJobData.details.rury" />
              </div>
              <div class="form-group">
                <label>Koszt: Wypłaty</label
                ><input type="number" step="any" v-model.number="newJobData.details.wyplaty" />
              </div>
              <div class="form-group">
                <label>Koszt: Inne</label
                ><input type="number" step="any" v-model.number="newJobData.details.inne_koszta" />
              </div>
            </div>
            <div v-else-if="newJobData.jobType === 'connection'" class="form-grid">
              <div class="form-group">
                <label>Głębokość studni (m):</label
                ><input type="number" step="any" v-model.number="newJobData.details.well_depth" />
              </div>
              <div class="form-group">
                <label>Średnica (cal):</label
                ><input type="number" step="any" v-model.number="newJobData.details.diameter" />
              </div>
              <div class="form-group">
                <label>Na ilu metrach pompa:</label
                ><input type="number" step="any" v-model.number="newJobData.details.pump_depth" />
              </div>
              <div class="form-group">
                <label>Jaka pompa:</label
                ><input type="text" v-model="newJobData.details.pump_model" />
              </div>
              <div class="form-group">
                <label>Jaki sterownik:</label
                ><input type="text" v-model="newJobData.details.controller_model" />
              </div>
              <div class="form-group">
                <label>Jaki hydrofor:</label
                ><input type="text" v-model="newJobData.details.hydrophore_model" />
              </div>
              <div class="form-group">
                <label>Link do faktury za materiały:</label
                ><input type="text" v-model="newJobData.details.materials_invoice_url" />
              </div>
              <div class="form-group">
                <label>Link do oferty dla klienta:</label
                ><input type="text" v-model="newJobData.details.client_offer_url" />
              </div>
              <hr class="full-width-hr" />
              <div class="form-group">
                <label>Przychód:</label
                ><input type="number" step="any" v-model.number="newJobData.details.revenue" />
              </div>
              <div class="form-group">
                <label>Koszt obudowy:</label
                ><input type="number" step="any" v-model.number="newJobData.details.casing_cost" />
              </div>
              <div class="form-group">
                <label>Koszt osprzętu:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.equipment_cost"
                />
              </div>
              <div class="form-group">
                <label>Wypłaty:</label
                ><input type="number" step="any" v-model.number="newJobData.details.labor_cost" />
              </div>
              <div class="form-group">
                <label>Materiały z hurtowni:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.wholesale_materials_cost"
                />
              </div>
            </div>

            <div v-else-if="newJobData.jobType === 'treatment_station'" class="form-grid">
              <div class="form-group">
                <label>Model stacji:</label
                ><input type="text" v-model="newJobData.details.station_model" />
              </div>
              <div class="form-group">
                <label>Model lampy UV:</label
                ><input type="text" v-model="newJobData.details.uv_lamp_model" />
              </div>
              <div class="form-group">
                <label>Filtr węglowy:</label
                ><input type="text" v-model="newJobData.details.carbon_filter" />
              </div>
              <div class="form-group">
                <label>Rodzaje złóż:</label
                ><input type="text" v-model="newJobData.details.filter_types" />
              </div>
              <div class="form-group">
                <label>Interwał serwisowy (w miesiącach):</label
                ><input
                  type="number"
                  step="1"
                  v-model.number="newJobData.details.service_interval_months"
                  placeholder="Domyślnie: 12"
                />
              </div>
              <hr class="full-width-hr" />
              <div class="form-group">
                <label>Link do faktury za materiały:</label
                ><input type="text" v-model="newJobData.details.materials_invoice_url" />
              </div>
              <div class="form-group">
                <label>Link do oferty dla klienta:</label
                ><input type="text" v-model="newJobData.details.client_offer_url" />
              </div>
              <hr class="full-width-hr" />
              <div class="form-group">
                <label>Przychód:</label
                ><input type="number" step="any" v-model.number="newJobData.details.revenue" />
              </div>
              <div class="form-group">
                <label>Koszt osprzętu:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.equipment_cost"
                />
              </div>
              <div class="form-group">
                <label>Wypłaty:</label
                ><input type="number" step="any" v-model.number="newJobData.details.labor_cost" />
              </div>
              <div class="form-group">
                <label>Materiały z hurtowni:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.wholesale_materials_cost"
                />
              </div>
            </div>

            <div v-else-if="newJobData.jobType === 'service'" class="form-grid-single-col">
              <div class="form-group full-width">
                <label>Opis wykonanych prac serwisowych:</label>
                <textarea v-model="newJobData.details.description" rows="4"></textarea>
              </div>
              <div class="form-group checkbox-item">
                <input
                  type="checkbox"
                  id="is_warranty_add"
                  v-model="newJobData.details.is_warranty"
                />
                <label for="is_warranty_add">Serwis gwarancyjny (bezpłatny)</label>
              </div>
              <template v-if="!newJobData.details.is_warranty">
                <div class="form-group">
                  <label>Przychód:</label
                  ><input type="number" step="any" v-model.number="newJobData.details.revenue" />
                </div>
                <div class="form-group">
                  <label>Wypłaty:</label
                  ><input type="number" step="any" v-model.number="newJobData.details.labor_cost" />
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz Zlecenie</button
          ><button type="button" class="anuluj" @click="showAddJobModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showDetailsModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Szczegóły zlecenia #{{ selectedJobDetails?.id }}</h3>
        <button class="close-button" @click="showDetailsModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isDetailsLoading" class="modal-loading-spinner"><div class="spinner"></div></div>
        <div v-else-if="selectedJobDetails" class="details-view-grid">
          <div class="details-section">
            <h4>Dane Klienta</h4>
            <p><strong>Nazwa:</strong> {{ selectedJobDetails.client_name || '-' }}</p>
            <p><strong>Telefon:</strong> {{ selectedJobDetails.client_phone }}</p>
          </div>
          <div class="details-section">
            <h4>Dane Główne Zlecenia</h4>
            <p><strong>Typ:</strong> {{ translateJobType(selectedJobDetails.job_type) }}</p>
            <p><strong>Data:</strong> {{ formatDate(selectedJobDetails.job_date) }}</p>
          </div>

          <div
            v-if="selectedJobDetails.job_type === 'well_drilling'"
            class="details-section full-width"
          >
            <h4>Szczegóły i Rozliczenie Studni</h4>
            <div class="details-grid-inner">
              <p>
                <strong>Miejscowość:</strong> {{ selectedJobDetails.details.miejscowosc || '-' }}
              </p>
              <p><strong>Pracownicy:</strong> {{ selectedJobDetails.details.pracownicy || '-' }}</p>
              <p>
                <strong>Ilość metrów:</strong>
                {{ selectedJobDetails.details.ilosc_metrow || '-' }} m
              </p>
              <p>
                <strong>Cena za metr:</strong>
                {{ selectedJobDetails.details.cena_za_metr || '-' }} zł
              </p>
              <hr class="full-width-hr" />
              <p>
                <strong>Przychód:</strong> {{ wellDrillingProfit.revenue?.toFixed(2) || '0.00' }} zł
              </p>
              <p><strong>Koszt rur:</strong> {{ selectedJobDetails.details.rury || '0' }} zł</p>
              <p>
                <strong>Koszt wypłat:</strong> {{ selectedJobDetails.details.wyplaty || '0' }} zł
              </p>
              <p>
                <strong>Inne koszta:</strong> {{ selectedJobDetails.details.inne_koszta || '0' }} zł
              </p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong>
                <span>{{ wellDrillingProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong>
                <span
                  :class="wellDrillingProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'"
                  >{{ wellDrillingProfit.profit?.toFixed(2) || '0.00' }} zł</span
                >
              </p>
            </div>
          </div>

          <div
            v-else-if="selectedJobDetails.job_type === 'connection'"
            class="details-section full-width"
          >
            <h4>Szczegóły Instalacji i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p><strong>Przychód:</strong> {{ selectedJobDetails.details.revenue || 0 }} zł</p>
              <p>
                <strong>Koszt osprzętu:</strong>
                {{ selectedJobDetails.details.equipment_cost || 0 }} zł
              </p>
              <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
              <p>
                <strong>Mat. z hurtowni:</strong>
                {{ selectedJobDetails.details.wholesale_materials_cost || 0 }} zł
              </p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong>
                <span>{{ connectionProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong>
                <span :class="connectionProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'"
                  >{{ connectionProfit.profit?.toFixed(2) || '0.00' }} zł</span
                >
              </p>
            </div>
          </div>

          <div
            v-else-if="selectedJobDetails.job_type === 'treatment_station'"
            class="details-section full-width"
          >
            <h4>Szczegóły Stacji i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p><strong>Przychód:</strong> {{ selectedJobDetails.details.revenue || 0 }} zł</p>
              <p>
                <strong>Koszt osprzętu:</strong>
                {{ selectedJobDetails.details.equipment_cost || 0 }} zł
              </p>
              <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
              <p>
                <strong>Mat. z hurtowni:</strong>
                {{ selectedJobDetails.details.wholesale_materials_cost || 0 }} zł
              </p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong>
                <span>{{ stationProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong>
                <span :class="stationProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'"
                  >{{ stationProfit.profit?.toFixed(2) || '0.00' }} zł</span
                >
              </p>
            </div>
          </div>
          <div
            v-else-if="selectedJobDetails.job_type === 'service'"
            class="details-section full-width"
          >
            <h4>Szczegóły Serwisu</h4>
            <div class="details-grid-inner">
              <p class="full-width-p">
                <strong>Opis wykonanych prac:</strong>
                {{ selectedJobDetails.details.description || '-' }}
              </p>
              <hr class="full-width-hr" />
              <p>
                <strong>Serwis gwarancyjny:</strong>
                {{ selectedJobDetails.details.is_warranty ? 'Tak' : 'Nie' }}
              </p>
              <template v-if="!selectedJobDetails.details.is_warranty">
                <p><strong>Przychód:</strong> {{ selectedJobDetails.details.revenue || 0 }} zł</p>
                <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
                <p class="full-width-p profit-summary">
                  <strong>Dochód:</strong>
                  <span :class="serviceProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'"
                    >{{ serviceProfit.profit?.toFixed(2) || '0.00' }} zł</span
                  >
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showEditJobModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj zlecenie #{{ editedJobData?.id }}</h3>
        <button class="close-button" @click="showEditJobModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isDetailsLoading" class="modal-loading-spinner"><div class="spinner"></div></div>
        <form v-else-if="editedJobData" @submit.prevent="handleUpdateJob">
          <div class="form-grid-single-col">
            <div class="form-group">
              <label>Klient:</label>
              <p>
                <strong>{{ editedJobData.client_name }} ({{ editedJobData.client_phone }})</strong>
              </p>
            </div>
            <div class="form-group">
              <label>Data zlecenia</label
              ><input type="date" v-model="editedJobData.job_date" required />
            </div>
            <div class="form-group">
              <label>Typ zlecenia:</label>
              <p>
                <strong>{{ translateJobType(editedJobData.job_type) }}</strong>
              </p>
            </div>
            <div class="details-section">
              <hr />
              <h4>Szczegóły zlecenia</h4>
              <div v-if="editedJobData.job_type === 'well_drilling'" class="form-grid">
                <div class="form-group">
                  <label>Miejscowość:</label
                  ><input type="text" v-model="editedJobData.details.miejscowosc" />
                </div>
                <div class="form-group">
                  <label>Pracownicy:</label
                  ><input type="text" v-model="editedJobData.details.pracownicy" />
                </div>
                <div class="form-group full-width">
                  <label>Informacje:</label
                  ><textarea v-model="editedJobData.details.informacje" rows="2"></textarea>
                </div>
                <div class="form-group">
                  <label>Średnica Ø:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.srednica"
                  />
                </div>
                <div class="form-group">
                  <label>Ilość metrów:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.ilosc_metrow"
                  />
                </div>
                <div class="form-group">
                  <label>Cena za metr:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.cena_za_metr"
                  />
                </div>
                <div class="form-group">
                  <label>Lustro statyczne:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.lustro_statyczne"
                  />
                </div>
                <div class="form-group">
                  <label>Lustro dynamiczne:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.lustro_dynamiczne"
                  />
                </div>
                <div class="form-group">
                  <label>Wydajność (m³/h):</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.wydajnosc"
                  />
                </div>
                <hr class="full-width-hr" />
                <div class="form-group">
                  <label>Koszt: Rury</label
                  ><input type="number" step="any" v-model.number="editedJobData.details.rury" />
                </div>
                <div class="form-group">
                  <label>Koszt: Wypłaty</label
                  ><input type="number" step="any" v-model.number="editedJobData.details.wyplaty" />
                </div>
                <div class="form-group">
                  <label>Koszt: Inne</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.inne_koszta"
                  />
                </div>
              </div>
              <div v-else-if="editedJobData.job_type === 'connection'" class="form-grid">
                <div class="form-group">
                  <label>Głębokość studni (m):</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.well_depth"
                  />
                </div>
                <div class="form-group">
                  <label>Średnica (cal):</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.diameter"
                  />
                </div>
                <div class="form-group">
                  <label>Na ilu metrach pompa:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.pump_depth"
                  />
                </div>
                <div class="form-group">
                  <label>Jaka pompa:</label
                  ><input type="text" v-model="editedJobData.details.pump_model" />
                </div>
                <div class="form-group">
                  <label>Jaki sterownik:</label
                  ><input type="text" v-model="editedJobData.details.controller_model" />
                </div>
                <div class="form-group">
                  <label>Jaki hydrofor:</label
                  ><input type="text" v-model="editedJobData.details.hydrophore_model" />
                </div>
                <div class="form-group">
                  <label>Link do faktury za materiały:</label
                  ><input type="text" v-model="editedJobData.details.materials_invoice_url" />
                </div>
                <div class="form-group">
                  <label>Link do oferty dla klienta:</label
                  ><input type="text" v-model="editedJobData.details.client_offer_url" />
                </div>
                <hr class="full-width-hr" />
                <div class="form-group">
                  <label>Przychód:</label
                  ><input type="number" step="any" v-model.number="editedJobData.details.revenue" />
                </div>
                <div class="form-group">
                  <label>Koszt obudowy:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.casing_cost"
                  />
                </div>
                <div class="form-group">
                  <label>Koszt osprzętu:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.equipment_cost"
                  />
                </div>
                <div class="form-group">
                  <label>Wypłaty:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.labor_cost"
                  />
                </div>
                <div class="form-group">
                  <label>Materiały z hurtowni:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.wholesale_materials_cost"
                  />
                </div>
              </div>

              <div v-else-if="editedJobData.job_type === 'treatment_station'" class="form-grid">
                <div class="form-group">
                  <label>Model stacji:</label
                  ><input type="text" v-model="editedJobData.details.station_model" />
                </div>
                <div class="form-group">
                  <label>Model lampy UV:</label
                  ><input type="text" v-model="editedJobData.details.uv_lamp_model" />
                </div>
                <div class="form-group">
                  <label>Filtr węglowy:</label
                  ><input type="text" v-model="editedJobData.details.carbon_filter" />
                </div>
                <div class="form-group">
                  <label>Rodzaje złóż:</label
                  ><input type="text" v-model="editedJobData.details.filter_types" />
                </div>
                <div class="form-group">
                  <label>Interwał serwisowy (w miesiącach):</label
                  ><input
                    type="number"
                    step="1"
                    v-model.number="editedJobData.details.service_interval_months"
                  />
                </div>
                <hr class="full-width-hr" />
                <div class="form-group">
                  <label>Link do faktury za materiały:</label
                  ><input type="text" v-model="editedJobData.details.materials_invoice_url" />
                </div>
                <div class="form-group">
                  <label>Link do oferty dla klienta:</label
                  ><input type="text" v-model="editedJobData.details.client_offer_url" />
                </div>
                <hr class="full-width-hr" />
                <div class="form-group">
                  <label>Przychód:</label
                  ><input type="number" step="any" v-model.number="editedJobData.details.revenue" />
                </div>
                <div class="form-group">
                  <label>Koszt osprzętu:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.equipment_cost"
                  />
                </div>
                <div class="form-group">
                  <label>Wypłaty:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.labor_cost"
                  />
                </div>
                <div class="form-group">
                  <label>Materiały z hurtowni:</label
                  ><input
                    type="number"
                    step="any"
                    v-model.number="editedJobData.details.wholesale_materials_cost"
                  />
                </div>
              </div>

              <div v-else-if="editedJobData.jobType === 'service'" class="form-grid-single-col">
                <div class="form-group full-width">
                  <label>Opis wykonanych prac serwisowych:</label>
                  <textarea v-model="editedJobData.details.description" rows="4"></textarea>
                </div>
                <div class="form-group checkbox-item">
                  <input
                    type="checkbox"
                    id="is_warranty_add"
                    v-model="editedJobData.details.is_warranty"
                  />
                  <label for="is_warranty_edit">Serwis gwarancyjny (bezpłatny)</label>
                </div>
                <template v-if="!editedJobData.details.is_warranty">
                  <div class="form-group">
                    <label>Przychód:</label
                    ><input
                      type="number"
                      step="any"
                      v-model.number="editedJobData.details.revenue"
                    />
                  </div>
                  <div class="form-group">
                    <label>Wypłaty:</label
                    ><input
                      type="number"
                      step="any"
                      v-model.number="editedJobData.details.labor_cost"
                    />
                  </div>
                </template>
              </div>
              <div v-else-if="editedJobData.job_type === 'service'" class="form-grid-single-col">
                <div class="form-group full-width">
                  <label>Opis wykonanych prac serwisowych:</label>
                  <textarea v-model="editedJobData.details.description" rows="4"></textarea>
                </div>
                <div class="form-group checkbox-item">
                  <input
                    type="checkbox"
                    id="is_warranty_edit"
                    v-model="editedJobData.details.is_warranty"
                  />
                  <label for="is_warranty_edit">Serwis gwarancyjny (bezpłatny)</label>
                </div>
                <template v-if="!editedJobData.details.is_warranty">
                  <div class="form-group">
                    <label>Przychód:</label>
                    <input
                      type="number"
                      step="any"
                      v-model.number="editedJobData.details.revenue"
                    />
                  </div>
                  <div class="form-group">
                    <label>Wypłaty:</label>
                    <input
                      type="number"
                      step="any"
                      v-model.number="editedJobData.details.labor_cost"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="submit" class="zapisz">Zapisz zmiany</button
            ><button type="button" class="anuluj" @click="showEditJobModal = false">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-type-badge {
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-transform: uppercase;
  display: inline-block;
}
.well_drilling {
  background-color: #007bff;
}
.connection {
  background-color: #28a745;
}
.treatment_station {
  background-color: #ffc107;
  color: #333;
}
.service {
  background-color: #6c757d;
}
.details-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
.details-section h4 {
  margin-top: 0;
  margin-bottom: 20px;
}
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.modal-body {
  padding: 25px;
}
.modal-loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
.details-view-grid {
  display: grid;
  gap: 20px;
}
.details-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
}
.details-section h4 {
  margin-top: 0;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.details-section p {
  margin: 0 0 10px;
}
.details-section p:last-child {
  margin-bottom: 0;
}
.details-grid-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 20px;
}
.full-width-p {
  grid-column: 1 / -1;
}
.full-width-hr {
  grid-column: 1 / -1;
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 10px 0;
}
.link-btn {
  display: inline-block;
  padding: 2px 10px;
  background-color: var(--blue);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
}
.profit-summary {
  grid-column: 1 / -1;
  font-size: 1.2em;
  text-align: right;
  margin-top: 10px;
}
.profit-summary span {
  font-weight: bold;
}
.profit-positive {
  color: var(--green);
}
.profit-negative {
  color: var(--red);
}
.total-cost-summary {
  grid-column: 1 / -1;
  text-align: right;
  color: var(--red);
}
.total-cost-summary span {
  font-weight: bold;
}
.checkbox-item {
  display: flex;
  flex-direction: row; /* Układamy elementy w rzędzie, a nie w kolumnie */
  align-items: center; /* Wyrównujemy w pionie do środka */
  gap: 10px; /* Mały odstęp między checkboxem a etykietą */
}
.checkbox-item label {
  margin-bottom: 0; /* Usuwamy domyślny margines z etykiety w tej grupie */
  cursor: pointer;
}
.checkbox-item input[type='checkbox'] {
  width: auto; /* Pozwalamy, by checkbox miał swoją naturalną szerokość */
  margin: 0; /* Zerujemy domyślne marginesy */
}
</style>
