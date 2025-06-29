<script setup>
import { ref, onMounted, watch } from 'vue';
import { getAuthHeaders } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const isLoading = ref(true);
const jobs = ref([]);
const showAddJobModal = ref(false);
const availableClients = ref([]);

const inicjalizujNoweZlecenie = () => ({
  clientId: null,
  jobType: 'well_drilling',
  jobDate: new Date().toISOString().slice(0, 10),
  details: {},
});

const newJobData = ref(inicjalizujNoweZlecenie());

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
  if (
    !newJobData.value.clientId ||
    !newJobData.value.jobDate ||
    !newJobData.value.jobType
  ) {
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
      <button
        class="add-new-btn"
        @click="handleShowAddJobModal"
        :disabled="isLoading"
      >
        &#43; Dodaj Zlecenie
      </button>
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
              <th>ID Zlecenia</th>
              <th>Typ Zlecenia</th>
              <th>Data</th>
              <th>Klient</th>
              <th>Telefon Klienta</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id">
              <td data-label="ID Zlecenia">#{{ job.id }}</td>
              <td data-label="Typ Zlecenia">
                <span class="job-type-badge" :class="job.job_type">
                  {{ translateJobType(job.job_type) }}
                </span>
              </td>
              <td data-label="Data">{{ formatDate(job.job_date) }}</td>
              <td data-label="Klient">{{ job.client_name || '-' }}</td>
              <td data-label="Telefon Klienta">{{ job.client_phone }}</td>
              <td data-label="Akcje" class="actions-cell">
                <button class="pokaż">Pokaż szczegóły</button>
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
        <button class="close-button" @click="showAddJobModal = false">
          &times;
        </button>
      </div>
      <form @submit.prevent="handleAddJob">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="clientSelect">1. Wybierz klienta</label>
            <select id="clientSelect" v-model="newJobData.clientId" required>
              <option :value="null" disabled>-- Wybierz z listy --</option>
              <option
                v-for="client in availableClients"
                :key="client.id"
                :value="client.id"
              >
                {{ client.name }} ({{ client.phone_number }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="jobDate">2. Data zlecenia</label>
            <input
              type="date"
              id="jobDate"
              v-model="newJobData.jobDate"
              required
            />
          </div>

          <div class="form-group">
            <label for="jobTypeSelect">3. Typ zlecenia</label>
            <select id="jobTypeSelect" v-model="newJobData.jobType">
              <option value="well_drilling">Wykonanie Studni</option>
              <option value="connection">Podłączenie</option>
              <option value="treatment_station">Stacja Uzdatniania</option>
              <option value="service">Serwis</option>
            </select>
          </div>

          <div class="details-section">
            <hr />
            <h4>4. Wprowadź szczegóły zlecenia</h4>

            <div
              v-if="newJobData.jobType === 'well_drilling'"
              class="form-grid"
            >
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
                ><textarea
                  v-model="newJobData.details.informacje"
                  rows="2"
                ></textarea>
              </div>
              <div class="form-group">
                <label>Średnica Ø:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.srednica"
                />
              </div>
              <div class="form-group">
                <label>Ilość metrów:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.ilosc_metrow"
                />
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
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.wydajnosc"
                />
              </div>
            </div>

            <div
              v-else-if="newJobData.jobType === 'connection'"
              class="form-grid"
            >
              <div class="form-group">
                <label>Głębokość studni:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.well_depth"
                />
              </div>
              <div class="form-group">
                <label>Średnica:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.diameter"
                />
              </div>
              <div class="form-group">
                <label>Na ilu pompa:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.pump_depth"
                />
              </div>
              <div class="form-group">
                <label>Jaka pompa:</label
                ><input type="text" v-model="newJobData.details.pump_model" />
              </div>
              <div class="form-group">
                <label>Jaki sterownik:</label
                ><input
                  type="text"
                  v-model="newJobData.details.controller_model"
                />
              </div>
              <div class="form-group">
                <label>Jaki hydrofor:</label
                ><input
                  type="text"
                  v-model="newJobData.details.hydrophore_model"
                />
              </div>
              <div class="form-group">
                <label>Link do faktury za materiały:</label
                ><input
                  type="text"
                  v-model="newJobData.details.materials_invoice_url"
                />
              </div>
              <div class="form-group">
                <label>Link do oferty dla klienta:</label
                ><input
                  type="text"
                  v-model="newJobData.details.client_offer_url"
                />
              </div>
              <div class="form-group">
                <label>Przychód:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.revenue"
                />
              </div>
              <div class="form-group">
                <label>Koszt obudowy:</label
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.casing_cost"
                />
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
                ><input
                  type="number"
                  step="any"
                  v-model.number="newJobData.details.labor_cost"
                />
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

            <div
              v-else-if="newJobData.jobType === 'treatment_station'"
              class="form-grid"
            >
              <div class="form-group">
                <label>Model stacji:</label
                ><input
                  type="text"
                  v-model="newJobData.details.station_model"
                />
              </div>
              <div class="form-group">
                <label>Model lampy UV:</label
                ><input
                  type="text"
                  v-model="newJobData.details.uv_lamp_model"
                />
              </div>
              <div class="form-group">
                <label>Filtr węglowy:</label
                ><input
                  type="text"
                  v-model="newJobData.details.carbon_filter"
                />
              </div>
              <div class="form-group">
                <label>Rodzaje złóż:</label
                ><input type="text" v-model="newJobData.details.filter_types" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz Zlecenie</button>
          <button type="button" class="anuluj" @click="showAddJobModal = false">
            Anuluj
          </button>
        </div>
      </form>
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
</style>
