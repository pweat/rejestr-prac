<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { getAuthHeaders } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const isLoading = ref(true);
const jobs = ref([]);
const showAddJobModal = ref(false);
const availableClients = ref([]);
const newJobData = ref({});
const showDetailsModal = ref(false);
const selectedJobDetails = ref(null);
const isDetailsLoading = ref(false);
const showEditJobModal = ref(false);
const editedJobData = ref(null);

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

async function fetchJobs() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/api/jobs`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania listy zleceń');
    jobs.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania zleceń:', error);
    alert('Nie udało się pobrać listy zleceń.');
  } finally {
    isLoading.value = false;
  }
}

async function fetchClientsForSelect() {
  try {
    const response = await fetch(`${API_URL}/api/clients`, {
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
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd podczas tworzenia zlecenia.');
    }
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
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      headers: getAuthHeaders(),
    });
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

// Zastąp całą tę funkcję
const calculatedProfit = computed(() => {
  if (selectedJobDetails.value && (selectedJobDetails.value.job_type === 'connection' || selectedJobDetails.value.job_type === 'treatment_station') && selectedJobDetails.value.details) {
    const details = selectedJobDetails.value.details;

    // Używamy parseFloat, aby mieć 100% pewności, że operujemy na liczbach
    const revenue = parseFloat(details.revenue) || 0;
    const casing_cost = parseFloat(details.casing_cost) || 0;
    const equipment_cost = parseFloat(details.equipment_cost) || 0;
    const labor_cost = parseFloat(details.labor_cost) || 0;
    const wholesale_materials_cost = parseFloat(details.wholesale_materials_cost) || 0;

    const totalCost = casing_cost + equipment_cost + labor_cost + wholesale_materials_cost;
    return revenue - totalCost;
  }
  return null;
});

async function handleShowEditModal(job) {
  editedJobData.value = null;
  isDetailsLoading.value = true;
  showEditJobModal.value = true;
  try {
    const response = await fetch(`${API_URL}/api/jobs/${job.id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Błąd pobierania pełnych danych zlecenia do edycji');
    const fullJobData = await response.json();
    editedJobData.value = fullJobData;
    editedJobData.value.job_date = formatDate(editedJobData.value.job_date);
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
    const updatedJobData = await response.json();
    const index = jobs.value.findIndex((j) => j.id === updatedJobData.id);
    if (index !== -1) {
      jobs.value[index] = {
        id: updatedJobData.id,
        job_type: updatedJobData.job_type,
        job_date: updatedJobData.job_date,
        client_name: updatedJobData.client_name,
        client_phone: updatedJobData.client_phone,
      };
    }
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
      <h1>Rejestr Zleceń ({{ jobs.length }})</h1>
      <button class="add-new-btn" @click="handleShowAddJobModal" :disabled="isLoading">&#43; Dodaj Zlecenie</button>
    </div>
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>Ładowanie danych...</p>
    </div>
    <div v-else>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Klient</th>
              <th>Telefon Klienta</th>
              <th>Typ Zlecenia</th>
              <th>Data</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td data-label="Klient">{{ job.client_name || '-' }}</td>
              <td data-label="Telefon Klienta">{{ job.client_phone }}</td>
              <td data-label="Typ Zlecenia">
                <span class="job-type-badge" :class="job.job_type">
                  {{ translateJobType(job.job_type) }}
                </span>
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
        <div v-if="!jobs.length" class="empty-table-message">
          <p>Brak zleceń w bazie. Dodaj pierwsze, aby rozpocząć.</p>
        </div>
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
            <label for="clientSelect">1. Wybierz klienta</label
            ><select id="clientSelect" v-model="newJobData.clientId" required>
              <option :value="null" disabled>-- Wybierz z listy --</option>
              <option v-for="client in availableClients" :key="client.id" :value="client.id">{{ client.name }} ({{ client.phone_number }})</option>
            </select>
          </div>
          <div class="form-group"><label for="jobDate">2. Data zlecenia</label><input type="date" id="jobDate" v-model="newJobData.jobDate" required /></div>
          <div class="form-group">
            <label for="jobTypeSelect">3. Typ zlecenia</label
            ><select id="jobTypeSelect" v-model="newJobData.jobType">
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
              <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="newJobData.details.miejscowosc" /></div>
              <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="newJobData.details.pracownicy" /></div>
              <div class="form-group full-width"><label>Informacje:</label><textarea v-model="newJobData.details.informacje" rows="2"></textarea></div>
              <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="newJobData.details.srednica" /></div>
              <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="newJobData.details.ilosc_metrow" /></div>
              <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="newJobData.details.lustro_statyczne" /></div>
              <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="newJobData.details.lustro_dynamiczne" /></div>
              <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="newJobData.details.wydajnosc" /></div>
            </div>
            <div v-else-if="newJobData.jobType === 'connection'" class="form-grid">
              <div class="form-group"><label>Głębokość studni (m):</label><input type="number" step="any" v-model.number="newJobData.details.well_depth" /></div>
              <div class="form-group"><label>Średnica (cal):</label><input type="number" step="any" v-model.number="newJobData.details.diameter" /></div>
              <div class="form-group"><label>Na ilu metrach pompa:</label><input type="number" step="any" v-model.number="newJobData.details.pump_depth" /></div>
              <div class="form-group"><label>Jaka pompa:</label><input type="text" v-model="newJobData.details.pump_model" /></div>
              <div class="form-group"><label>Jaki sterownik:</label><input type="text" v-model="newJobData.details.controller_model" /></div>
              <div class="form-group"><label>Jaki hydrofor:</label><input type="text" v-model="newJobData.details.hydrophore_model" /></div>
              <div class="form-group"><label>Link do faktury za materiały:</label><input type="text" v-model="newJobData.details.materials_invoice_url" /></div>
              <div class="form-group"><label>Link do oferty dla klienta:</label><input type="text" v-model="newJobData.details.client_offer_url" /></div>
              <hr class="full-width-hr" />
              <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="newJobData.details.revenue" /></div>
              <div class="form-group"><label>Koszt obudowy:</label><input type="number" step="any" v-model.number="newJobData.details.casing_cost" /></div>
              <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="newJobData.details.equipment_cost" /></div>
              <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="newJobData.details.labor_cost" /></div>
              <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="newJobData.details.wholesale_materials_cost" /></div>
            </div>
            <div v-else-if="newJobData.jobType === 'treatment_station'" class="form-grid">
              <div class="form-group"><label>Model stacji:</label><input type="text" v-model="newJobData.details.station_model" /></div>
              <div class="form-group"><label>Model lampy UV:</label><input type="text" v-model="newJobData.details.uv_lamp_model" /></div>
              <div class="form-group"><label>Filtr węglowy:</label><input type="text" v-model="newJobData.details.carbon_filter" /></div>
              <div class="form-group"><label>Rodzaje złóż:</label><input type="text" v-model="newJobData.details.filter_types" /></div>
              <div class="form-group"><label>Link do faktury za materiały:</label><input type="text" v-model="newJobData.details.materials_invoice_url" /></div>
              <div class="form-group"><label>Link do oferty dla klienta:</label><input type="text" v-model="newJobData.details.client_offer_url" /></div>
              <hr class="full-width-hr" />
              <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="newJobData.details.revenue" /></div>
              <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="newJobData.details.equipment_cost" /></div>
              <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="newJobData.details.labor_cost" /></div>
              <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="newJobData.details.wholesale_materials_cost" /></div>
            </div>
          </div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz">Zapisz Zlecenie</button><button type="button" class="anuluj" @click="showAddJobModal = false">Anuluj</button></div>
      </form>
    </div>
  </div>

  <div v-if="showDetailsModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Szczegóły zlecenia #{{ selectedJobDetails ? selectedJobDetails.id : '' }}</h3>
        <button class="close-button" @click="showDetailsModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isDetailsLoading" class="modal-loading-spinner">
          <div class="spinner"></div>
        </div>
        <div v-else-if="selectedJobDetails" class="details-view-grid">
          <div class="details-section">
            <h4>Dane Klienta</h4>
            <p>
              <strong>Nazwa:</strong>
              {{ selectedJobDetails.client_name || '-' }}
            </p>
            <p><strong>Telefon:</strong> {{ selectedJobDetails.client_phone }}</p>
            <p>
              <strong>Adres:</strong>
              {{ selectedJobDetails.client_address || '-' }}
            </p>
            <p>
              <strong>Notatki o kliencie:</strong>
              {{ selectedJobDetails.client_notes || '-' }}
            </p>
          </div>
          <div class="details-section">
            <h4>Dane Główne Zlecenia</h4>
            <p>
              <strong>Typ zlecenia:</strong>
              {{ translateJobType(selectedJobDetails.job_type) }}
            </p>
            <p>
              <strong>Data zlecenia:</strong>
              {{ formatDate(selectedJobDetails.job_date) }}
            </p>
          </div>
          <div v-if="selectedJobDetails.job_type === 'well_drilling'" class="details-section full-width">
            <h4>Szczegóły Wykonania Studni</h4>
            <div class="details-grid-inner">
              <p>
                <strong>Miejscowość:</strong>
                {{ selectedJobDetails.details.miejscowosc || '-' }}
              </p>
              <p>
                <strong>Pracownicy:</strong>
                {{ selectedJobDetails.details.pracownicy || '-' }}
              </p>
              <p>
                <strong>Ilość metrów:</strong>
                {{ selectedJobDetails.details.ilosc_metrow || '-' }}
              </p>
              <p>
                <strong>Średnica Ø:</strong>
                {{ selectedJobDetails.details.srednica || '-' }}
              </p>
              <p>
                <strong>L. statyczne:</strong>
                {{ selectedJobDetails.details.lustro_statyczne || '-' }}
              </p>
              <p>
                <strong>L. dynamiczne:</strong>
                {{ selectedJobDetails.details.lustro_dynamiczne || '-' }}
              </p>
              <p>
                <strong>Wydajność:</strong>
                {{ selectedJobDetails.details.wydajnosc || '-' }}
              </p>
              <p class="full-width-p">
                <strong>Informacje:</strong>
                {{ selectedJobDetails.details.informacje || '-' }}
              </p>
            </div>
          </div>
          <div v-else-if="selectedJobDetails.job_type === 'connection'" class="details-section full-width">
            <h4>Szczegóły Instalacji i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p>
                <strong>Głęb. studni:</strong>
                {{ selectedJobDetails.details.well_depth || '-' }} m
              </p>
              <p>
                <strong>Średnica:</strong>
                {{ selectedJobDetails.details.diameter || '-' }} cal
              </p>
              <p>
                <strong>Pompa na (m):</strong>
                {{ selectedJobDetails.details.pump_depth || '-' }} m
              </p>
              <p>
                <strong>Model pompy:</strong>
                {{ selectedJobDetails.details.pump_model || '-' }}
              </p>
              <p>
                <strong>Model sterownika:</strong>
                {{ selectedJobDetails.details.controller_model || '-' }}
              </p>
              <p>
                <strong>Model hydroforu:</strong>
                {{ selectedJobDetails.details.hydrophore_model || '-' }}
              </p>
              <p class="full-width-p">
                <strong>Faktura (materiały):</strong>
                <a v-if="selectedJobDetails.details.materials_invoice_url" :href="selectedJobDetails.details.materials_invoice_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <p class="full-width-p">
                <strong>Oferta (klient):</strong>
                <a v-if="selectedJobDetails.details.client_offer_url" :href="selectedJobDetails.details.client_offer_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <hr class="full-width-hr" />
              <p>
                <strong>Przychód:</strong>
                {{ selectedJobDetails.details.revenue || 0 }} zł
              </p>
              <p>
                <strong>Koszt obudowy:</strong>
                {{ selectedJobDetails.details.casing_cost || 0 }} zł
              </p>
              <p>
                <strong>Koszt osprzętu:</strong>
                {{ selectedJobDetails.details.equipment_cost || 0 }} zł
              </p>
              <p>
                <strong>Wypłaty:</strong>
                {{ selectedJobDetails.details.labor_cost || 0 }} zł
              </p>
              <p>
                <strong>Mat. z hurtowni:</strong>
                {{ selectedJobDetails.details.wholesale_materials_cost || 0 }}
                zł
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong>
                <span :class="calculatedProfit >= 0 ? 'profit-positive' : 'profit-negative'">{{ calculatedProfit !== null ? calculatedProfit.toFixed(2) + ' zł' : 'Brak danych' }}</span>
              </p>
            </div>
          </div>
          <div v-else-if="selectedJobDetails.job_type === 'treatment_station'" class="details-section full-width">
            <h4>Szczegóły Stacji Uzdatniania i Rozliczenie</h4>
            <div class="details-grid-inner">
              <p>
                <strong>Model stacji:</strong>
                {{ selectedJobDetails.details.station_model || '-' }}
              </p>
              <p>
                <strong>Model lampy UV:</strong>
                {{ selectedJobDetails.details.uv_lamp_model || '-' }}
              </p>
              <p>
                <strong>Filtr węglowy:</strong>
                {{ selectedJobDetails.details.carbon_filter || '-' }}
              </p>
              <p>
                <strong>Rodzaje złóż:</strong>
                {{ selectedJobDetails.details.filter_types || '-' }}
              </p>
              <p class="full-width-p">
                <strong>Faktura (materiały):</strong>
                <a v-if="selectedJobDetails.details.materials_invoice_url" :href="selectedJobDetails.details.materials_invoice_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <p class="full-width-p">
                <strong>Oferta (klient):</strong>
                <a v-if="selectedJobDetails.details.client_offer_url" :href="selectedJobDetails.details.client_offer_url" target="_blank" rel="noopener noreferrer" class="link-btn">LINK</a><span v-else>-</span>
              </p>
              <hr class="full-width-hr" />
              <p>
                <strong>Przychód:</strong>
                {{ selectedJobDetails.details.revenue || 0 }} zł
              </p>
              <p>
                <strong>Koszt osprzętu:</strong>
                {{ selectedJobDetails.details.equipment_cost || 0 }} zł
              </p>
              <p>
                <strong>Wypłaty:</strong>
                {{ selectedJobDetails.details.labor_cost || 0 }} zł
              </p>
              <p>
                <strong>Mat. z hurtowni:</strong>
                {{ selectedJobDetails.details.wholesale_materials_cost || 0 }}
                zł
              </p>
              <p class="full-width-p profit-summary">
                <strong>Dochód:</strong>
                <span :class="calculatedProfit >= 0 ? 'profit-positive' : 'profit-negative'">{{ calculatedProfit !== null ? calculatedProfit.toFixed(2) + ' zł' : 'Brak danych' }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showEditJobModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj zlecenie #{{ editedJobData ? editedJobData.id : '' }}</h3>
        <button class="close-button" @click="showEditJobModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isDetailsLoading" class="modal-loading-spinner">
          <div class="spinner"></div>
        </div>
        <form v-else-if="editedJobData" @submit.prevent="handleUpdateJob">
          <div class="form-grid-single-col">
            <div class="form-group">
              <label>Klient:</label>
              <p>
                <strong>{{ editedJobData.client_name }} ({{ editedJobData.client_phone }})</strong>
              </p>
            </div>
            <div class="form-group">
              <label for="editJobDate">Data zlecenia</label>
              <input type="date" id="editJobDate" v-model="editedJobData.job_date" required />
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
                <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="editedJobData.details.miejscowosc" /></div>
                <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="editedJobData.details.pracownicy" /></div>
                <div class="form-group full-width"><label>Informacje:</label><textarea v-model="editedJobData.details.informacje" rows="2"></textarea></div>
                <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="editedJobData.details.srednica" /></div>
                <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="editedJobData.details.ilosc_metrow" /></div>
                <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="editedJobData.details.lustro_statyczne" /></div>
                <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="editedJobData.details.lustro_dynamiczne" /></div>
                <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="editedJobData.details.wydajnosc" /></div>
              </div>

              <div v-else-if="editedJobData.job_type === 'connection'" class="form-grid">
                <div class="form-group"><label>Głębokość studni (m):</label><input type="number" step="any" v-model.number="editedJobData.details.well_depth" /></div>
                <div class="form-group"><label>Średnica (cal):</label><input type="number" step="any" v-model.number="editedJobData.details.diameter" /></div>
                <div class="form-group"><label>Na ilu metrach pompa:</label><input type="number" step="any" v-model.number="editedJobData.details.pump_depth" /></div>
                <div class="form-group"><label>Jaka pompa:</label><input type="text" v-model="editedJobData.details.pump_model" /></div>
                <div class="form-group"><label>Jaki sterownik:</label><input type="text" v-model="editedJobData.details.controller_model" /></div>
                <div class="form-group"><label>Jaki hydrofor:</label><input type="text" v-model="editedJobData.details.hydrophore_model" /></div>
                <div class="form-group"><label>Link do faktury za materiały:</label><input type="text" v-model="editedJobData.details.materials_invoice_url" /></div>
                <div class="form-group"><label>Link do oferty dla klienta:</label><input type="text" v-model="editedJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="editedJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt obudowy:</label><input type="number" step="any" v-model.number="editedJobData.details.casing_cost" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="editedJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="editedJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="editedJobData.details.wholesale_materials_cost" /></div>
              </div>

              <div v-else-if="editedJobData.job_type === 'treatment_station'" class="form-grid">
                <div class="form-group"><label>Model stacji:</label><input type="text" v-model="editedJobData.details.station_model" /></div>
                <div class="form-group"><label>Model lampy UV:</label><input type="text" v-model="editedJobData.details.uv_lamp_model" /></div>
                <div class="form-group"><label>Filtr węglowy:</label><input type="text" v-model="editedJobData.details.carbon_filter" /></div>
                <div class="form-group"><label>Rodzaje złóż:</label><input type="text" v-model="editedJobData.details.filter_types" /></div>
                <div class="form-group"><label>Link do faktury za materiały:</label><input type="text" v-model="editedJobData.details.materials_invoice_url" /></div>
                <div class="form-group"><label>Link do oferty dla klienta:</label><input type="text" v-model="editedJobData.details.client_offer_url" /></div>
                <hr class="full-width-hr" />
                <div class="form-group"><label>Przychód:</label><input type="number" step="any" v-model.number="editedJobData.details.revenue" /></div>
                <div class="form-group"><label>Koszt osprzętu:</label><input type="number" step="any" v-model.number="editedJobData.details.equipment_cost" /></div>
                <div class="form-group"><label>Wypłaty:</label><input type="number" step="any" v-model.number="editedJobData.details.labor_cost" /></div>
                <div class="form-group"><label>Materiały z hurtowni:</label><input type="number" step="any" v-model.number="editedJobData.details.wholesale_materials_cost" /></div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="submit" class="zapisz">Zapisz zmiany</button>
            <button type="button" class="anuluj" @click="showEditJobModal = false">Anuluj</button>
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
</style>
