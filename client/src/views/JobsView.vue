<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { getUserRole } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import vSelect from 'vue-select';
import PaginationControls from '../components/PaginationControls.vue';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const route = useRoute();
const router = useRouter();
const userRole = getUserRole();
const toast = useToast();

const JOB_TYPE_OPTIONS = [
  { value: 'well_drilling', label: 'Wykonanie Studni' },
  { value: 'connection', label: 'Podłączenie' },
  { value: 'treatment_station', label: 'Stacja Uzdatniania' },
  { value: 'service', label: 'Serwis' },
];

// ================================================================================================
// 헬 FUNKCJE POMOCNICZE
// ================================================================================================
function initializeNewJob() {
  return {
    clientId: null,
    jobType: 'well_drilling',
    jobDate: new Date().toISOString().slice(0, 10),
    miejscowosc: '',
    details: {},
  };
}

function translateJobType(type) {
  const opt = JOB_TYPE_OPTIONS.find((o) => o.value === type);
  return opt ? opt.label : type;
}

const filterClients = (options, search) => {
  const lowerSearch = search.toLowerCase();
  return options.filter((client) => {
    const nameMatch = client.name && client.name.toLowerCase().includes(lowerSearch);
    const phoneMatch = client.phone_number && client.phone_number.toLowerCase().includes(lowerSearch);
    const townMatch = client.last_miejscowosc && client.last_miejscowosc.toLowerCase().includes(lowerSearch);
    const addressMatch = client.address && client.address.toLowerCase().includes(lowerSearch);
    return nameMatch || phoneMatch || townMatch || addressMatch;
  });
};

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================
const isLoading = ref(true);
const isDetailsLoading = ref(false);
const showAddJobModal = ref(false);
const showDetailsModal = ref(false);
const showEditJobModal = ref(false);
const jobs = ref([]);
const availableClients = ref([]);
const totalItems = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const searchQuery = ref('');
const sortBy = ref('job_date');
const sortOrder = ref('desc');
const newJobData = ref(initializeNewJob());
const clientJobsPreview = ref([]);
const isClientJobsPreviewLoading = ref(false);
const clientJobsPreviewError = ref('');
const selectedClientPreviewJobId = ref(null);
const selectedClientPreviewJobDetails = ref(null);
const isClientPreviewDetailsLoading = ref(false);
const clientPreviewDetailsError = ref('');
const editedJobData = ref(null);
const selectedJobDetails = ref(null);

// Filtry
const selectedJobTypes = ref([]); // wartości: 'well_drilling', ...
const dateFrom = ref('');
const dateTo = ref('');
const showFilters = ref(false);

// Klient z chip-filtra ?clientId=...
const clientChipName = ref('');

// ================================================================================================
// 🧮 WŁAŚCIWOŚCI OBLICZENIOWE (COMPUTED)
// ================================================================================================
const wellDrillingProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { revenue: 0, totalCost: 0, profit: 0 };
  const revenue = (parseFloat(details.ilosc_metrow) || 0) * (parseFloat(details.cena_za_metr) || 0);
  const totalCost = (parseFloat(details.wyplaty) || 0) + (parseFloat(details.rury) || 0) + (parseFloat(details.inne_koszta) || 0);
  return { revenue, totalCost, profit: revenue - totalCost };
});

const connectionProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { profit: 0, totalCost: 0 };
  const revenue = parseFloat(details.revenue) || 0;
  const totalCost = (parseFloat(details.casing_cost) || 0) + (parseFloat(details.equipment_cost) || 0) + (parseFloat(details.labor_cost) || 0) + (parseFloat(details.wholesale_materials_cost) || 0);
  return { profit: revenue - totalCost, totalCost };
});

const stationProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { profit: 0, totalCost: 0 };
  const revenue = parseFloat(details.revenue) || 0;
  const totalCost = (parseFloat(details.equipment_cost) || 0) + (parseFloat(details.labor_cost) || 0) + (parseFloat(details.wholesale_materials_cost) || 0);
  return { profit: revenue - totalCost, totalCost };
});

const serviceProfit = computed(() => {
  const details = selectedJobDetails.value?.details;
  if (!details) return { profit: 0, totalCost: 0 };
  const revenue = details.is_warranty ? 0 : parseFloat(details.revenue) || 0;
  const totalCost = parseFloat(details.labor_cost) || 0;
  return { profit: revenue - totalCost, totalCost };
});

const isAnyModalOpen = computed(() => showAddJobModal.value || showEditJobModal.value || showDetailsModal.value);

const isAnyFilterActive = computed(() => {
  return Boolean(searchQuery.value || selectedJobTypes.value.length || dateFrom.value || dateTo.value || route.query.clientId);
});

// ================================================================================================
// 🔄 LOGIKA API (CRUD)
// ================================================================================================
async function fetchJobs() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    if (route.query.clientId) params.append('clientId', route.query.clientId);
    if (selectedJobTypes.value.length) params.append('jobTypes', selectedJobTypes.value.join(','));
    if (dateFrom.value) params.append('dateFrom', dateFrom.value);
    if (dateTo.value) params.append('dateTo', dateTo.value);

    const response = await authenticatedFetch(`${API_URL}/api/jobs?${params.toString()}`);
    if (!response.ok) throw new Error('Błąd pobierania listy zleceń');
    const result = await response.json();
    jobs.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;

    if (route.query.clientId && jobs.value.length) {
      clientChipName.value = jobs.value[0].client_name || `Klient #${route.query.clientId}`;
    } else if (!route.query.clientId) {
      clientChipName.value = '';
    }
  } catch (error) {
    console.error('Błąd podczas pobierania zleceń:', error);
    toast.error('Nie udało się pobrać listy zleceń.');
  } finally {
    isLoading.value = false;
  }
}

async function fetchClientsForSelect() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/clients-for-select`);
    if (!response.ok) throw new Error('Błąd pobierania listy klientów');
    availableClients.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania klientów do formularza:', error);
  }
}

async function fetchClientJobsPreview(clientId) {
  if (!clientId) {
    clientJobsPreview.value = [];
    clientJobsPreviewError.value = '';
    selectedClientPreviewJobId.value = null;
    selectedClientPreviewJobDetails.value = null;
    clientPreviewDetailsError.value = '';
    return;
  }
  isClientJobsPreviewLoading.value = true;
  clientJobsPreviewError.value = '';
  try {
    const params = new URLSearchParams({
      clientId: String(clientId),
      page: '1',
      limit: '5',
      sortBy: 'job_date',
      sortOrder: 'desc',
    });
    const response = await authenticatedFetch(`${API_URL}/api/jobs?${params.toString()}`);
    if (!response.ok) throw new Error('Nie udało się pobrać historii zleceń klienta.');
    const result = await response.json();
    clientJobsPreview.value = Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Błąd podczas pobierania podglądu zleceń klienta:', error);
    clientJobsPreview.value = [];
    clientJobsPreviewError.value = 'Nie udało się pobrać historii zleceń klienta.';
  } finally {
    isClientJobsPreviewLoading.value = false;
  }
}

async function handleSelectClientPreviewJob(jobId) {
  if (!jobId) return;
  selectedClientPreviewJobId.value = jobId;
  selectedClientPreviewJobDetails.value = null;
  clientPreviewDetailsError.value = '';
  isClientPreviewDetailsLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs/${jobId}`);
    if (!response.ok) throw new Error('Nie udało się pobrać szczegółów tego zlecenia.');
    selectedClientPreviewJobDetails.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów podglądu klienta:', error);
    clientPreviewDetailsError.value = 'Nie udało się pobrać szczegółów tego zlecenia.';
  } finally {
    isClientPreviewDetailsLoading.value = false;
  }
}

async function openSelectedPreviewAsFullDetails() {
  if (!selectedClientPreviewJobId.value) return;
  showAddJobModal.value = false;
  await nextTick();
  await handleShowDetails(selectedClientPreviewJobId.value);
}

async function handleAddJob() {
  if (!newJobData.value.clientId || !newJobData.value.jobType || !newJobData.value.jobDate) {
    toast.warn('Klient, data i typ zlecenia są wymagane.');
    return;
  }
  if (
    (newJobData.value.jobType === 'service' || newJobData.value.jobType === 'treatment_station') &&
    !newJobData.value.miejscowosc?.trim()
  ) {
    toast.warn('Podaj miejscowość — harmonogram serwisowy jest przypisany do lokalizacji.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      body: JSON.stringify(newJobData.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas tworzenia zlecenia.');

    await fetchJobs();
    showAddJobModal.value = false;
    toast.success('Zlecenie dodane.');
  } catch (error) {
    console.error('Błąd w handleAddJob():', error);
    toast.error(error.message);
  }
}

async function handleUpdateJob() {
  if (!editedJobData.value) return;

  const payload = {
    clientId: editedJobData.value.client_id,
    jobDate: editedJobData.value.job_date,
    miejscowosc: editedJobData.value.miejscowosc,
    details: editedJobData.value.details,
  };

  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs/${editedJobData.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd podczas aktualizacji zlecenia.');
    }
    await fetchJobs();
    showEditJobModal.value = false;
    toast.success('Zmiany zapisane.');
  } catch (error) {
    console.error('Błąd w handleUpdateJob():', error);
    toast.error(error.message);
  }
}

async function handleDeleteJob(jobId) {
  if (!confirm('Czy na pewno chcesz usunąć to zlecenie? Tej operacji nie można cofnąć.')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs/${jobId}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      throw new Error('Nie udało się usunąć zlecenia.');
    }
    await fetchJobs();
    toast.success('Zlecenie usunięte.');
  } catch (error) {
    console.error('Błąd w handleDeleteJob():', error);
    toast.error(error.message);
  }
}

// ================================================================================================
// ⚡ OBSŁUGA ZDARZEŃ UI
// ================================================================================================
function applyAddJobQueryParams() {
  newJobData.value = initializeNewJob();
  if (route.query.clientId) {
    newJobData.value.clientId = Number(route.query.clientId) || route.query.clientId;
  }
  if (route.query.jobType && JOB_TYPE_OPTIONS.some((o) => o.value === route.query.jobType)) {
    newJobData.value.jobType = route.query.jobType;
    newJobData.value.details = {};
  }
  if (route.query.miejscowosc) {
    newJobData.value.miejscowosc = String(route.query.miejscowosc);
  }
}

function handleShowAddJobModal() {
  applyAddJobQueryParams();
  showAddJobModal.value = true;
}

async function handleShowDetails(jobId) {
  selectedJobDetails.value = null;
  isDetailsLoading.value = true;
  showDetailsModal.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs/${jobId}`);
    if (!response.ok) throw new Error('Błąd pobierania szczegółów zlecenia');
    selectedJobDetails.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów zlecenia:', error);
    showDetailsModal.value = false;
    toast.error(error.message);
  } finally {
    isDetailsLoading.value = false;
  }
}

async function handleShowEditModal(job) {
  editedJobData.value = null;
  isDetailsLoading.value = true;
  showEditJobModal.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/jobs/${job.id}`);
    if (!response.ok) throw new Error('Błąd pobierania danych do edycji');
    editedJobData.value = await response.json();
  } catch (error) {
    console.error('Błąd w handleShowEditModal:', error);
    toast.error(error.message);
    showEditJobModal.value = false;
  } finally {
    isDetailsLoading.value = false;
  }
}

function closeAllModals() {
  showAddJobModal.value = false;
  showEditJobModal.value = false;
  showDetailsModal.value = false;
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

function toggleJobType(type) {
  const idx = selectedJobTypes.value.indexOf(type);
  if (idx === -1) selectedJobTypes.value.push(type);
  else selectedJobTypes.value.splice(idx, 1);
  currentPage.value = 1;
}

function clearAllFilters() {
  searchQuery.value = '';
  selectedJobTypes.value = [];
  dateFrom.value = '';
  dateTo.value = '';
  if (route.query.clientId) {
    router.replace({ query: { ...route.query, clientId: undefined } });
  }
  currentPage.value = 1;
  nextTick(fetchJobs);
}

function clearClientFilter() {
  const q = { ...route.query };
  delete q.clientId;
  router.replace({ query: q });
}

// ================================================================================================
// 👀 WATCHERS & CYKL ŻYCIA
// ================================================================================================
watch([currentPage, sortBy, sortOrder], fetchJobs);

let searchTimeout = null;
watch([searchQuery, selectedJobTypes, dateFrom, dateTo], () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchJobs();
  }, 300);
}, { deep: true });

watch(
  () => newJobData.value.jobType,
  () => {
    newJobData.value.details = {};
  }
);

watch(
  () => [showAddJobModal.value, newJobData.value.clientId],
  ([isOpen, clientId], [prevOpen, prevClientId]) => {
    if (!isOpen) {
      clientJobsPreview.value = [];
      clientJobsPreviewError.value = '';
      selectedClientPreviewJobId.value = null;
      selectedClientPreviewJobDetails.value = null;
      clientPreviewDetailsError.value = '';
      return;
    }
    if (!prevOpen || clientId !== prevClientId) {
      selectedClientPreviewJobId.value = null;
      selectedClientPreviewJobDetails.value = null;
      clientPreviewDetailsError.value = '';
    }
    fetchClientJobsPreview(clientId);
  },
  { immediate: true }
);

watch(
  () => route.query.clientId,
  () => {
    currentPage.value = 1;
    fetchJobs();
  }
);

// Skróty klawiaturowe globalne dla modali
function handleKeydown(e) {
  if (!isAnyModalOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAllModals();
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (showAddJobModal.value) handleAddJob();
    else if (showEditJobModal.value) handleUpdateJob();
  }
}

watch(
  () => [route.query.action, route.query.clientId, route.query.jobType, route.query.miejscowosc],
  () => {
    if (route.query.action === 'new') {
      applyAddJobQueryParams();
      showAddJobModal.value = true;
    }
  }
);

onMounted(() => {
  fetchJobs();
  fetchClientsForSelect();
  if (route.query.action === 'new') {
    applyAddJobQueryParams();
    showAddJobModal.value = true;
  }
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Rejestr Zleceń ({{ totalItems }})</h1>
      <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="handleShowAddJobModal">&#43; Dodaj Zlecenie</button>
    </div>

    <!-- Toolbar z wyszukiwarką i filtrami -->
    <div class="toolbar">
      <div class="toolbar-row">
        <input
          type="text"
          class="search-input"
          v-model="searchQuery"
          placeholder="Szukaj po kliencie, telefonie, miejscowości..."
        />
        <button
          type="button"
          class="filters-toggle"
          :class="{ active: showFilters }"
          @click="showFilters = !showFilters"
        >
          {{ showFilters ? '▲ Ukryj filtry' : '▼ Filtry' }}
          <span v-if="selectedJobTypes.length || dateFrom || dateTo" class="filter-count">
            {{ (selectedJobTypes.length ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) }}
          </span>
        </button>
      </div>

      <transition name="filters-slide">
        <div v-if="showFilters" class="filters-panel">
          <div class="filter-group">
            <label>Typ zlecenia:</label>
            <div class="chip-group">
              <button
                v-for="opt in JOB_TYPE_OPTIONS"
                :key="opt.value"
                type="button"
                class="chip"
                :class="[opt.value, { selected: selectedJobTypes.includes(opt.value) }]"
                @click="toggleJobType(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="filter-group date-group">
            <label>Zakres dat:</label>
            <div class="date-row">
              <input type="date" v-model="dateFrom" placeholder="Od" />
              <span class="date-separator">—</span>
              <input type="date" v-model="dateTo" placeholder="Do" />
            </div>
          </div>
        </div>
      </transition>

      <div v-if="isAnyFilterActive" class="active-filters">
        <span
          v-if="route.query.clientId"
          class="active-chip client-chip"
          @click="clearClientFilter"
          title="Usuń filtr klienta"
        >
          👤 {{ clientChipName || `Klient #${route.query.clientId}` }} ✕
        </span>
        <button type="button" class="clear-btn" @click="clearAllFilters">Wyczyść filtry</button>
      </div>
    </div>

    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table class="jobs-table">
            <thead>
              <tr>
                <th @click="changeSort('client_name')" class="sortable">
                  Klient
                  <span v-if="sortBy === 'client_name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Telefon</th>
                <th @click="changeSort('miejscowosc')" class="sortable">
                  Miejscowość
                  <span v-if="sortBy === 'miejscowosc'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('job_type')" class="sortable">
                  Typ
                  <span v-if="sortBy === 'job_type'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('job_date')" class="sortable">
                  Data
                  <span v-if="sortBy === 'job_date'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!jobs.length && !isLoading">
                <td colspan="6" class="empty-table-message">
                  <p>Brak zleceń w bazie lub pasujących do filtrów.</p>
                </td>
              </tr>
              <tr v-for="job in jobs" :key="job.id">
                <td data-label="Klient">
                  <RouterLink v-if="job.client_id" :to="`/klienci/${job.client_id}`" class="client-link">
                    {{ job.client_name || '-' }}
                  </RouterLink>
                  <span v-else>{{ job.client_name || '-' }}</span>
                </td>
                <td data-label="Telefon">{{ job.client_phone }}</td>
                <td data-label="Miejscowość">{{ job.miejscowosc || '-' }}</td>
                <td data-label="Typ">
                  <span class="job-type-badge" :class="job.job_type">{{ translateJobType(job.job_type) }}</span>
                </td>
                <td data-label="Data">{{ formatDate(job.job_date) }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <div class="actions-cell-inner">
                    <button v-if="userRole !== 'viewer'" class="pokaż" @click="handleShowDetails(job.id)">Szczegóły</button>
                    <button v-if="userRole !== 'viewer'" class="edytuj" @click="handleShowEditModal(job)">Edytuj</button>
                    <RouterLink v-if="job.client_id" :to="`/klienci/${job.client_id}`" class="action-link">
                      <button class="karta">Karta klienta</button>
                    </RouterLink>
                    <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteJob(job.id)">Usuń</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
      </div>
    </div>
  </div>

  <!-- Modal: Dodaj zlecenie -->
  <div v-if="showAddJobModal" class="modal-backdrop" @click.self="showAddJobModal = false">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowe zlecenie</h3>
        <button class="close-button" @click="showAddJobModal = false">&times;</button>
      </div>
      <form class="modal-body-form" @submit.prevent="handleAddJob">
        <div class="modal-body">
          <div class="form-grid-single-col">
            <div class="form-group">
              <label>1. Wybierz klienta</label>
              <v-select
                :options="availableClients"
                :get-option-label="(option) => option.name || 'Brak Nazwy'"
                :filter="filterClients"
                :reduce="(client) => client.id"
                v-model="newJobData.clientId"
                placeholder="-- Wyszukaj klienta (nazwa, telefon, miejscowość) --"
              >
                <template #option="{ name, phone_number, last_miejscowosc }">
                  <div>
                    <strong>{{ name || 'Brak nazwy' }}</strong><br />
                    <small>{{ phone_number }}</small>
                    <small v-if="last_miejscowosc"> • {{ last_miejscowosc }}</small>
                  </div>
                </template>
                <template #selected-option="{ name, phone_number, last_miejscowosc }">
                  <div>
                    <strong>{{ name || 'Brak nazwy' }}</strong>
                    <small>({{ phone_number }})</small>
                    <small v-if="last_miejscowosc"> - {{ last_miejscowosc }}</small>
                  </div>
                </template>
              </v-select>
            </div>
            <div v-if="newJobData.clientId" class="client-preview-card">
              <div class="client-preview-header">
                <h5>Ostatnie zlecenia klienta</h5>
                <small>Podgląd 5 najnowszych</small>
              </div>
              <div v-if="isClientJobsPreviewLoading" class="client-preview-state">Ładowanie historii...</div>
              <div v-else-if="clientJobsPreviewError" class="client-preview-state error">{{ clientJobsPreviewError }}</div>
              <div v-else-if="!clientJobsPreview.length" class="client-preview-state">Brak wcześniejszych zleceń dla tego klienta.</div>
              <ul v-else class="client-preview-list">
                <li v-for="job in clientJobsPreview" :key="job.id">
                  <button
                    type="button"
                    class="client-preview-item"
                    :class="{ active: selectedClientPreviewJobId === job.id }"
                    @click="handleSelectClientPreviewJob(job.id)"
                  >
                    <span class="preview-item-date">{{ formatDate(job.job_date) }}</span>
                    <span class="preview-item-type">{{ translateJobType(job.job_type) }}</span>
                    <span class="preview-item-town">{{ job.miejscowosc || '-' }}</span>
                    <span class="preview-item-action">Podgląd</span>
                  </button>
                </li>
              </ul>
              <div v-if="selectedClientPreviewJobId" class="client-preview-details-panel">
                <div v-if="isClientPreviewDetailsLoading" class="client-preview-state">Wczytywanie szczegółów...</div>
                <div v-else-if="clientPreviewDetailsError" class="client-preview-state error">{{ clientPreviewDetailsError }}</div>
                <template v-else-if="selectedClientPreviewJobDetails">
                  <div class="client-preview-details-head">
                    <strong>{{ translateJobType(selectedClientPreviewJobDetails.job_type) }}</strong>
                    <small>{{ formatDate(selectedClientPreviewJobDetails.job_date) }} | {{ selectedClientPreviewJobDetails.miejscowosc || '-' }}</small>
                  </div>

                  <div v-if="selectedClientPreviewJobDetails.job_type === 'well_drilling'" class="client-preview-details-grid">
                    <span>Średnica: {{ selectedClientPreviewJobDetails.details.srednica || '-' }}</span>
                    <span>Ilość metrów: {{ selectedClientPreviewJobDetails.details.ilosc_metrow || '-' }} m</span>
                    <span>Lustro statyczne: {{ selectedClientPreviewJobDetails.details.lustro_statyczne || '-' }} m</span>
                    <span>Wydajność: {{ selectedClientPreviewJobDetails.details.wydajnosc || '-' }} m³/h</span>
                  </div>
                  <div v-else-if="selectedClientPreviewJobDetails.job_type === 'connection'" class="client-preview-details-grid">
                    <span>Głębokość studni: {{ selectedClientPreviewJobDetails.details.well_depth || '-' }} m</span>
                    <span>Średnica: {{ selectedClientPreviewJobDetails.details.diameter || '-' }} mm</span>
                    <span>Pompa na: {{ selectedClientPreviewJobDetails.details.pump_depth || '-' }} m</span>
                    <span>Model pompy: {{ selectedClientPreviewJobDetails.details.pump_model || '-' }}</span>
                  </div>
                  <div v-else-if="selectedClientPreviewJobDetails.job_type === 'treatment_station'" class="client-preview-details-grid">
                    <span>Model stacji: {{ selectedClientPreviewJobDetails.details.station_model || '-' }}</span>
                    <span>Lampa UV: {{ selectedClientPreviewJobDetails.details.uv_lamp_model || '-' }}</span>
                    <span>Filtr węglowy: {{ selectedClientPreviewJobDetails.details.carbon_filter || '-' }}</span>
                    <span>Interwał serwisu: {{ selectedClientPreviewJobDetails.details.service_interval_months || '12' }} mies.</span>
                  </div>
                  <div v-else-if="selectedClientPreviewJobDetails.job_type === 'service'" class="client-preview-details-grid service">
                    <span>Gwarancyjny: {{ selectedClientPreviewJobDetails.details.is_warranty ? 'Tak' : 'Nie' }}</span>
                    <span class="full">Opis: {{ selectedClientPreviewJobDetails.details.description || '-' }}</span>
                  </div>

                  <div class="client-preview-details-actions">
                    <button type="button" class="client-preview-open-full" @click="openSelectedPreviewAsFullDetails">
                      Otwórz pełne szczegóły
                    </button>
                  </div>
                </template>
              </div>
            </div>
            <div class="form-grid two-col">
              <div class="form-group">
                <label>2. Data zlecenia</label>
                <input type="date" v-model="newJobData.jobDate" required />
              </div>
              <div class="form-group">
                <label>3. Typ zlecenia</label>
                <select v-model="newJobData.jobType">
                  <option v-for="opt in JOB_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <div class="details-section">
              <h4>4. Szczegóły zlecenia</h4>
              <div v-if="newJobData.jobType === 'well_drilling'" class="form-grid">
                <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="newJobData.miejscowosc" /></div>
                <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="newJobData.details.pracownicy" /></div>
                <div class="form-group full-width"><label>Informacje:</label><textarea v-model="newJobData.details.informacje" rows="3"></textarea></div>
                <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="newJobData.details.srednica" /></div>
                <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="newJobData.details.ilosc_metrow" /></div>
                <div class="form-group"><label>Cena za metr:</label><input type="number" step="any" v-model.number="newJobData.details.cena_za_metr" /></div>
                <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="newJobData.details.lustro_statyczne" /></div>
                <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="newJobData.details.lustro_dynamiczne" /></div>
                <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="newJobData.details.wydajnosc" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Koszt: Rury</label><input type="number" step="any" v-model.number="newJobData.details.rury" /></div>
                <div class="form-group"><label>Koszt: Wypłaty</label><input type="number" step="any" v-model.number="newJobData.details.wyplaty" /></div>
                <div class="form-group"><label>Koszt: Inne</label><input type="number" step="any" v-model.number="newJobData.details.inne_koszta" /></div>
              </div>
              <div v-else-if="newJobData.jobType === 'connection'" class="form-grid">
                <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="newJobData.miejscowosc" /></div>
                <div class="form-group"><label>Głębokość studni (m):</label><input type="number" step="any" v-model.number="newJobData.details.well_depth" /></div>
                <div class="form-group"><label>Średnica (mm):</label><input type="number" step="any" v-model.number="newJobData.details.diameter" /></div>
                <div class="form-group"><label>Na ilu metrach pompa:</label><input type="number" step="any" v-model.number="newJobData.details.pump_depth" /></div>
                <div class="form-group"><label>Jaka pompa:</label><input type="text" v-model="newJobData.details.pump_model" /></div>
                <div class="form-group"><label>Jaki sterownik:</label><input type="text" v-model="newJobData.details.controller_model" /></div>
                <div class="form-group"><label>Jaki hydrofor:</label><input type="text" v-model="newJobData.details.hydrophore_model" /></div>
                <div class="form-group full-width"><label>Link do faktury za materiały:</label><input type="text" v-model="newJobData.details.materials_invoice_url" /></div>
                <div class="form-group full-width"><label>Link do oferty dla klienta:</label><input type="text" v-model="newJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="newJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt obudowy:</label><input type="number" step="any" v-model.number="newJobData.details.casing_cost" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="newJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="newJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="newJobData.details.wholesale_materials_cost" /></div>
              </div>
              <div v-else-if="newJobData.jobType === 'treatment_station'" class="form-grid">
                <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="newJobData.miejscowosc" /></div>
                <div class="form-group"><label>Model stacji:</label><input type="text" v-model="newJobData.details.station_model" /></div>
                <div class="form-group"><label>Model lampy UV:</label><input type="text" v-model="newJobData.details.uv_lamp_model" /></div>
                <div class="form-group"><label>Filtr węglowy:</label><input type="text" v-model="newJobData.details.carbon_filter" /></div>
                <div class="form-group"><label>Rodzaje złóż:</label><input type="text" v-model="newJobData.details.filter_types" /></div>
                <div class="form-group"><label>Interwał serwisu (m-cy):</label><input type="number" step="1" v-model.number="newJobData.details.service_interval_months" placeholder="Domyślnie: 12" /></div>
                <div class="form-group full-width"><label>Link do faktury za materiały:</label><input type="text" v-model="newJobData.details.materials_invoice_url" /></div>
                <div class="form-group full-width"><label>Link do oferty dla klienta:</label><input type="text" v-model="newJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="newJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="newJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="newJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="newJobData.details.wholesale_materials_cost" /></div>
              </div>
              <div v-else-if="newJobData.jobType === 'service'" class="form-grid">
                <div class="form-group full-width"><label>Miejscowość:</label><input type="text" v-model="newJobData.miejscowosc" /></div>
                <div class="form-group full-width"><label>Opis wykonanych prac serwisowych:</label><textarea v-model="newJobData.details.description" rows="4"></textarea></div>
                <div class="form-group checkbox-item full-width">
                  <input type="checkbox" id="is_warranty_add" v-model="newJobData.details.is_warranty" />
                  <label for="is_warranty_add">Serwis gwarancyjny (bezpłatny)</label>
                </div>
                <template v-if="!newJobData.details.is_warranty">
                  <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="newJobData.details.revenue" /></div>
                </template>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="newJobData.details.labor_cost" /></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <span class="hint">💡 Ctrl+S aby zapisać, Esc aby anulować</span>
          <div class="modal-actions-buttons">
            <button type="button" class="anuluj" @click="showAddJobModal = false">Anuluj</button>
            <button type="submit" class="zapisz">Zapisz Zlecenie</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Szczegóły -->
  <div v-if="showDetailsModal" class="modal-backdrop" @click.self="showDetailsModal = false">
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
            <p><strong>Adres:</strong> {{ selectedJobDetails.client_address || '-' }}</p>
            <p><strong>Notatki o kliencie:</strong> {{ selectedJobDetails.client_notes || '-' }}</p>
            <RouterLink v-if="selectedJobDetails.client_id" :to="`/klienci/${selectedJobDetails.client_id}`" class="link">
              → Karta klienta
            </RouterLink>
          </div>

          <div class="details-section">
            <h4>Dane Główne Zlecenia</h4>
            <p><strong>Typ:</strong> {{ translateJobType(selectedJobDetails.job_type) }}</p>
            <p><strong>Data:</strong> {{ formatDate(selectedJobDetails.job_date) }}</p>
            <p><strong>Miejscowość:</strong> {{ selectedJobDetails.miejscowosc || '-' }}</p>
          </div>

          <div v-if="selectedJobDetails.job_type === 'well_drilling'" class="details-section full-width">
            <h4>Szczegóły i Rozliczenie Studni</h4>
            <div class="details-grid-inner">
              <p><strong>Pracownicy:</strong> {{ selectedJobDetails.details.pracownicy || '-' }}</p>
              <p><strong>Ilość metrów:</strong> {{ selectedJobDetails.details.ilosc_metrow || '-' }} m</p>
              <p><strong>Średnica Ø:</strong> {{ selectedJobDetails.details.srednica || '-' }}</p>
              <p><strong>L. statyczne:</strong> {{ selectedJobDetails.details.lustro_statyczne || '-' }} m</p>
              <p><strong>L. dynamiczne:</strong> {{ selectedJobDetails.details.lustro_dynamiczne || '-' }} m</p>
              <p><strong>Wydajność:</strong> {{ selectedJobDetails.details.wydajnosc ? selectedJobDetails.details.wydajnosc + ' m³/h' : '-' }}</p>
              <p><strong>Cena za metr:</strong> {{ selectedJobDetails.details.cena_za_metr || '0' }} zł</p>
              <div class="full-width-p">
                <strong>Informacje:</strong>
                <p class="info-text">{{ selectedJobDetails.details.informacje || '-' }}</p>
              </div>
              <hr class="full-width-hr" />
              <p><strong>Przychód (obliczony):</strong> {{ wellDrillingProfit.revenue?.toFixed(2) || '0.00' }} zł</p>
              <p><strong>Koszt rur:</strong> {{ selectedJobDetails.details.rury || '0' }} zł</p>
              <p><strong>Koszt wypłat:</strong> {{ selectedJobDetails.details.wyplaty || '0' }} zł</p>
              <p><strong>Inne koszta:</strong> {{ selectedJobDetails.details.inne_koszta || '0' }} zł</p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong> <span>{{ wellDrillingProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong><span :class="wellDrillingProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'">{{ wellDrillingProfit.profit?.toFixed(2) || '0.00' }} zł</span>
              </p>
            </div>
          </div>

          <div v-else-if="selectedJobDetails.job_type === 'connection'" class="details-section full-width">
            <h4>Szczegóły Instalacji i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p><strong>Głęb. studni:</strong> {{ selectedJobDetails.details.well_depth || '-' }} m</p>
              <p><strong>Średnica:</strong> {{ selectedJobDetails.details.diameter || '-' }} cal</p>
              <p><strong>Pompa na (m):</strong> {{ selectedJobDetails.details.pump_depth || '-' }} m</p>
              <p><strong>Model pompy:</strong> {{ selectedJobDetails.details.pump_model || '-' }}</p>
              <p><strong>Model sterownika:</strong> {{ selectedJobDetails.details.controller_model || '-' }}</p>
              <p><strong>Model hydroforu:</strong> {{ selectedJobDetails.details.hydrophore_model || '-' }}</p>
              <p class="full-width-p">
                <strong>Faktura (materiały):</strong>
                <a v-if="selectedJobDetails.details.materials_invoice_url" :href="selectedJobDetails.details.materials_invoice_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <p class="full-width-p">
                <strong>Oferta (klient):</strong>
                <a v-if="selectedJobDetails.details.client_offer_url" :href="selectedJobDetails.details.client_offer_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <hr class="full-width-hr" />
              <p><strong>Przychód:</strong> {{ selectedJobDetails.details.revenue || 0 }} zł</p>
              <p><strong>Koszt obudowy:</strong> {{ selectedJobDetails.details.casing_cost || 0 }} zł</p>
              <p><strong>Koszt osprzętu:</strong> {{ selectedJobDetails.details.equipment_cost || 0 }} zł</p>
              <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
              <p><strong>Mat. z hurtowni:</strong> {{ selectedJobDetails.details.wholesale_materials_cost || 0 }} zł</p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong> <span>{{ connectionProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong> <span :class="connectionProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'">{{ connectionProfit.profit?.toFixed(2) || '0.00' }} zł</span>
              </p>
            </div>
          </div>

          <div v-else-if="selectedJobDetails.job_type === 'treatment_station'" class="details-section full-width">
            <h4>Szczegóły Stacji i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p><strong>Model stacji:</strong> {{ selectedJobDetails.details.station_model || '-' }}</p>
              <p><strong>Model lampy UV:</strong> {{ selectedJobDetails.details.uv_lamp_model || '-' }}</p>
              <p><strong>Filtr węglowy:</strong> {{ selectedJobDetails.details.carbon_filter || '-' }}</p>
              <p><strong>Rodzaje złóż:</strong> {{ selectedJobDetails.details.filter_types || '-' }}</p>
              <p><strong>Interwał serwisu:</strong> {{ selectedJobDetails.details.service_interval_months || '12' }} mies.</p>
              <p class="full-width-p">
                <strong>Faktura (materiały):</strong>
                <a v-if="selectedJobDetails.details.materials_invoice_url" :href="selectedJobDetails.details.materials_invoice_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <p class="full-width-p">
                <strong>Oferta (klient):</strong>
                <a v-if="selectedJobDetails.details.client_offer_url" :href="selectedJobDetails.details.client_offer_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <hr class="full-width-hr" />
              <p><strong>Przychód:</strong> {{ selectedJobDetails.details.revenue || 0 }} zł</p>
              <p><strong>Koszt osprzętu:</strong> {{ selectedJobDetails.details.equipment_cost || 0 }} zł</p>
              <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
              <p><strong>Mat. z hurtowni:</strong> {{ selectedJobDetails.details.wholesale_materials_cost || 0 }} zł</p>
              <p class="full-width-p total-cost-summary">
                <strong>Suma Kosztów:</strong> <span>{{ stationProfit.totalCost?.toFixed(2) || '0.00' }} zł</span>
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong> <span :class="stationProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'">{{ stationProfit.profit?.toFixed(2) || '0.00' }} zł</span>
              </p>
            </div>
          </div>

          <div v-else-if="selectedJobDetails.job_type === 'service'" class="details-section full-width">
            <h4>Szczegóły Serwisu</h4>
            <div class="details-grid-inner">
              <p class="full-width-p"><strong>Opis wykonanych prac:</strong> {{ selectedJobDetails.details.description || '-' }}</p>
              <hr class="full-width-hr" />
              <p><strong>Serwis gwarancyjny:</strong> {{ selectedJobDetails.details.is_warranty ? 'Tak' : 'Nie' }}</p>
              <p><strong>Przychód:</strong> {{ selectedJobDetails.details.is_warranty ? 0 : selectedJobDetails.details.revenue || 0 }} zł</p>
              <p><strong>Wypłaty:</strong> {{ selectedJobDetails.details.labor_cost || 0 }} zł</p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong> <span :class="serviceProfit.profit >= 0 ? 'profit-positive' : 'profit-negative'">{{ serviceProfit.profit?.toFixed(2) || '0.00' }} zł</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Edytuj zlecenie -->
  <div v-if="showEditJobModal" class="modal-backdrop" @click.self="showEditJobModal = false">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj zlecenie #{{ editedJobData?.id }}</h3>
        <button class="close-button" @click="showEditJobModal = false">&times;</button>
      </div>
      <div v-if="isDetailsLoading" class="modal-body"><div class="modal-loading-spinner"><div class="spinner"></div></div></div>
      <form v-else-if="editedJobData" class="modal-body-form" @submit.prevent="handleUpdateJob">
        <div class="modal-body">
          <div class="form-grid-single-col">
            <div class="form-group readonly-block">
              <label>Klient:</label>
              <div class="readonly-value">
                <strong>{{ editedJobData.client_name }}</strong> <small>({{ editedJobData.client_phone }})</small>
                <RouterLink v-if="editedJobData.client_id" :to="`/klienci/${editedJobData.client_id}`" class="link inline-link">→ Karta</RouterLink>
              </div>
            </div>
            <div class="form-grid two-col">
              <div class="form-group">
                <label>Data zlecenia</label>
                <input type="date" v-model="editedJobData.job_date" required />
              </div>
              <div class="form-group readonly-block">
                <label>Typ zlecenia:</label>
                <div class="readonly-value"><strong>{{ translateJobType(editedJobData.job_type) }}</strong></div>
              </div>
            </div>

            <div class="details-section">
              <h4>Szczegóły zlecenia</h4>
              <div v-if="editedJobData.job_type === 'well_drilling'" class="form-grid">
                <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="editedJobData.miejscowosc" /></div>
                <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="editedJobData.details.pracownicy" /></div>
                <div class="form-group full-width"><label>Informacje:</label><textarea v-model="editedJobData.details.informacje" rows="3"></textarea></div>
                <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="editedJobData.details.srednica" /></div>
                <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="editedJobData.details.ilosc_metrow" /></div>
                <div class="form-group"><label>Cena za metr:</label><input type="number" step="any" v-model.number="editedJobData.details.cena_za_metr" /></div>
                <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="editedJobData.details.lustro_statyczne" /></div>
                <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="editedJobData.details.lustro_dynamiczne" /></div>
                <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="editedJobData.details.wydajnosc" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Koszt: Rury</label><input type="number" step="any" v-model.number="editedJobData.details.rury" /></div>
                <div class="form-group"><label>Koszt: Wypłaty</label><input type="number" step="any" v-model.number="editedJobData.details.wyplaty" /></div>
                <div class="form-group"><label>Koszt: Inne</label><input type="number" step="any" v-model.number="editedJobData.details.inne_koszta" /></div>
              </div>
              <div v-else-if="editedJobData.job_type === 'connection'" class="form-grid">
                <div class="form-group"><label>Miejscowość</label><input type="text" v-model="editedJobData.miejscowosc" /></div>
                <div class="form-group"><label>Głębokość studni (m):</label><input type="number" step="any" v-model.number="editedJobData.details.well_depth" /></div>
                <div class="form-group"><label>Średnica (cal):</label><input type="number" step="any" v-model.number="editedJobData.details.diameter" /></div>
                <div class="form-group"><label>Na ilu metrach pompa:</label><input type="number" step="any" v-model.number="editedJobData.details.pump_depth" /></div>
                <div class="form-group"><label>Jaka pompa:</label><input type="text" v-model="editedJobData.details.pump_model" /></div>
                <div class="form-group"><label>Jaki sterownik:</label><input type="text" v-model="editedJobData.details.controller_model" /></div>
                <div class="form-group"><label>Jaki hydrofor:</label><input type="text" v-model="editedJobData.details.hydrophore_model" /></div>
                <div class="form-group full-width"><label>Link do faktury za materiały:</label><input type="text" v-model="editedJobData.details.materials_invoice_url" /></div>
                <div class="form-group full-width"><label>Link do oferty dla klienta:</label><input type="text" v-model="editedJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="editedJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt obudowy:</label><input type="number" step="any" v-model.number="editedJobData.details.casing_cost" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="editedJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="editedJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="editedJobData.details.wholesale_materials_cost" /></div>
              </div>
              <div v-else-if="editedJobData.job_type === 'treatment_station'" class="form-grid">
                <div class="form-group"><label>Miejscowość</label><input type="text" v-model="editedJobData.miejscowosc" /></div>
                <div class="form-group"><label>Model stacji:</label><input type="text" v-model="editedJobData.details.station_model" /></div>
                <div class="form-group"><label>Model lampy UV:</label><input type="text" v-model="editedJobData.details.uv_lamp_model" /></div>
                <div class="form-group"><label>Filtr węglowy:</label><input type="text" v-model="editedJobData.details.carbon_filter" /></div>
                <div class="form-group"><label>Rodzaje złóż:</label><input type="text" v-model="editedJobData.details.filter_types" /></div>
                <div class="form-group"><label>Interwał serwisu (m-cy):</label><input type="number" step="1" v-model.number="editedJobData.details.service_interval_months" /></div>
                <div class="form-group full-width"><label>Link do faktury za materiały:</label><input type="text" v-model="editedJobData.details.materials_invoice_url" /></div>
                <div class="form-group full-width"><label>Link do oferty dla klienta:</label><input type="text" v-model="editedJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="editedJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="editedJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="editedJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="editedJobData.details.wholesale_materials_cost" /></div>
              </div>
              <div v-else-if="editedJobData.job_type === 'service'" class="form-grid">
                <div class="form-group full-width"><label>Miejscowość</label><input type="text" v-model="editedJobData.miejscowosc" /></div>
                <div class="form-group full-width"><label>Opis wykonanych prac serwisowych:</label><textarea v-model="editedJobData.details.description" rows="4"></textarea></div>
                <div class="form-group checkbox-item full-width">
                  <input type="checkbox" id="is_warranty_edit" v-model="editedJobData.details.is_warranty" />
                  <label for="is_warranty_edit">Serwis gwarancyjny (bezpłatny)</label>
                </div>
                <template v-if="!editedJobData.details.is_warranty">
                  <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="editedJobData.details.revenue" /></div>
                </template>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="editedJobData.details.labor_cost" /></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <span class="hint">💡 Ctrl+S aby zapisać, Esc aby anulować</span>
          <div class="modal-actions-buttons">
            <button type="button" class="anuluj" @click="showEditJobModal = false">Anuluj</button>
            <button type="submit" class="zapisz">Zapisz zmiany</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ===== Toolbar ===== */
.toolbar {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
.search-input {
  flex: 1;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.filters-toggle {
  background-color: var(--background-light-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.filters-toggle:hover:not(:disabled) {
  transform: none;
  background-color: #e9ecef;
  box-shadow: none;
}
.filters-toggle.active {
  background-color: var(--blue);
  color: #fff;
  border-color: var(--blue);
}
.filter-count {
  background-color: var(--red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 7px;
  min-width: 18px;
  text-align: center;
}
.filters-panel {
  background-color: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}
.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  background-color: #fff;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  border-color: var(--blue);
}
.chip.selected.well_drilling {
  background-color: #cfe2ff;
  border-color: #3d8bfd;
  color: #084298;
}
.chip.selected.connection {
  background-color: #d1f0d8;
  border-color: #48bb6f;
  color: #1c6d35;
}
.chip.selected.treatment_station {
  background-color: #fff3cd;
  border-color: #ffc107;
  color: #856404;
}
.chip.selected.service {
  background-color: #e2e3e5;
  border-color: #6c757d;
  color: #383d41;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.date-row input[type='date'] {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
}
.date-separator {
  color: var(--text-color-secondary);
}

.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.client-chip {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
.client-chip:hover {
  background-color: #c1e7ed;
}
.clear-btn {
  background-color: transparent;
  color: var(--text-color-secondary);
  border: 1px dashed var(--border-color);
  padding: 6px 12px;
  font-size: 13px;
}
.clear-btn:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  color: var(--red);
  border-color: var(--red);
}

/* ===== Tabela: badge stonowany + hover + sticky header ===== */
.jobs-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}
.jobs-table tbody tr {
  transition: background-color 0.15s ease;
}
.jobs-table tbody tr:hover {
  background-color: #f8f9fa;
}
.client-link {
  color: var(--text-color);
  text-decoration: none;
  border-bottom: 1px dotted var(--border-color);
}
.client-link:hover {
  color: var(--blue);
  border-bottom-color: var(--blue);
}

.job-type-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  display: inline-block;
  letter-spacing: 0.02em;
}
.well_drilling {
  background-color: #3d8bfd;
}
.connection {
  background-color: #48bb6f;
}
.treatment_station {
  background-color: #ffc107;
  color: #333;
}
.service {
  background-color: #6c757d;
}

/* ===== Akcje ===== */
.action-link {
  display: inline-block;
}
button.karta {
  background-color: #8a2be2;
}
.empty-table-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-secondary);
}

/* ===== Modal: scroll wewnątrz + szersze pola ===== */
.modal-backdrop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 15px 30px;
  text-align: left;
}
.modal-content {
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  width: 100%;
  max-height: calc(100vh - 100px);
  margin: 0;
}
.modal-body-form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}
.modal-body {
  padding: 25px;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}
.modal-loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.form-grid.two-col {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.client-preview-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #fff;
}
.client-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
}
.client-preview-header h5 {
  margin: 0;
  font-size: 14px;
}
.client-preview-header small {
  color: var(--text-color-secondary);
}
.client-preview-state {
  padding: 12px;
  color: var(--text-color-secondary);
  font-size: 14px;
}
.client-preview-state.error {
  color: var(--red);
}
.client-preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.client-preview-item {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--border-color);
  border-radius: 0;
  background: transparent;
  text-align: left;
  display: grid;
  grid-template-columns: 120px 1fr 1fr auto;
  gap: 10px;
  padding: 12px;
  color: var(--text-color);
}
.client-preview-item:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  background-color: #f8f9fa;
}
.client-preview-item.active {
  background-color: #eef4ff;
}
.client-preview-list li:last-child .client-preview-item {
  border-bottom: 0;
}
.preview-item-date {
  font-weight: 600;
  grid-area: date;
}
.preview-item-type,
.preview-item-town {
  color: var(--text-color-secondary);
}
.preview-item-type {
  grid-area: type;
}
.preview-item-town {
  grid-area: town;
}
.preview-item-action {
  grid-area: action;
  color: var(--blue);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.client-preview-details-panel {
  border-top: 1px solid var(--border-color);
  background: #fcfdff;
}
.client-preview-details-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px;
}
.client-preview-details-head small {
  color: var(--text-color-secondary);
}
.client-preview-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px 14px;
  padding: 0 12px 12px;
  color: var(--text-color-secondary);
}
.client-preview-details-grid.service .full {
  grid-column: 1 / -1;
}
.client-preview-details-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0 12px 12px;
}
.client-preview-open-full {
  background-color: var(--background-light-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  font-size: 13px;
}
.client-preview-open-full:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  border-color: var(--blue);
  color: var(--blue);
}
.readonly-block .readonly-value {
  padding: 10px 12px;
  background-color: var(--background-light-secondary);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
}
.inline-link {
  margin-left: 12px;
}
.link {
  color: var(--blue);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

.details-section {
  padding: 18px;
  background-color: #f8f9fa;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.details-section h4 {
  margin: 0 0 14px;
  font-size: 16px;
  color: var(--text-color);
}
.full-width {
  grid-column: 1 / -1;
}
.full-width-hr {
  grid-column: 1 / -1;
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 6px 0;
}
.checkbox-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.checkbox-item label {
  margin-bottom: 0;
  cursor: pointer;
}
.checkbox-item input[type='checkbox'] {
  width: auto;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 15px 25px;
  background-color: var(--background-light-secondary);
  border-top: 1px solid var(--border-color);
  border-radius: 0 0 8px 8px;
}
.modal-actions-buttons {
  display: flex;
  gap: 10px;
}
.hint {
  font-size: 12px;
  color: var(--text-color-secondary);
}

/* ===== Details view ===== */
.details-view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.details-view-grid .details-section.full-width {
  grid-column: 1 / -1;
}
.details-section p {
  margin: 0 0 8px;
}
.details-section p:last-child {
  margin-bottom: 0;
}
.details-grid-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
}
.full-width-p {
  grid-column: 1 / -1;
}
.info-text {
  margin: 4px 0 0;
  padding: 8px 12px;
  background-color: #fff;
  border-left: 3px solid var(--blue);
  border-radius: 4px;
  white-space: pre-line;
}
.link-btn {
  display: inline-block;
  padding: 2px 10px;
  background-color: var(--blue);
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  margin-left: 6px;
}
.profit-summary {
  grid-column: 1 / -1;
  font-size: 1.15em;
  text-align: right;
  margin-top: 6px;
}
.profit-summary span {
  font-weight: bold;
  margin-left: 8px;
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

/* ===== Animacja paska filtrów ===== */
.filters-slide-enter-from,
.filters-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

/* ===== Responsywność ===== */
@media screen and (max-width: 850px) {
  .toolbar-row {
    flex-direction: column;
  }
  .filters-toggle {
    width: 100%;
    justify-content: center;
    padding: 12px;
  }
  .details-view-grid {
    grid-template-columns: 1fr;
  }
  .modal-content {
    max-height: calc(100vh - 80px);
  }
  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .modal-actions-buttons {
    justify-content: flex-end;
  }
  .hint {
    text-align: center;
  }

  .client-preview-item {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'date action'
      'type action'
      'town action';
    align-items: center;
  }
  .preview-item-action {
    align-self: center;
  }
  .client-preview-details-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
