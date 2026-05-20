<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PaginationControls from '../components/PaginationControls.vue';
import { removeToken, getUserRole } from '../auth/auth.js';
import { authenticatedFetch } from '../api/api.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter();
const route = useRoute();
const userRole = getUserRole();

const isLoading = ref(true);
const showAddModal = ref(false);
const showEditModal = ref(false);
const vehicles = ref([]);
const newVehicleData = ref(initializeNewVehicle());
const editedVehicleData = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const searchQuery = ref('');
const sortBy = ref('registration_number');
const sortOrder = ref('asc');

function initializeNewVehicle() {
  return {
    registration_number: '',
    make: '',
    model: '',
    production_year: null,
    vin: '',
    fuel_type: '',
    engine_capacity: '',
    mileage: null,
    inspection_valid_until: '',
    insurance_valid_until: '',
    notes: '',
    is_active: true,
  };
}

function getDateStatus(dateStr) {
  if (!dateStr) return 'unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'warning';
  return 'ok';
}

function getDateStatusLabel(status) {
  if (status === 'expired') return 'Wygasło';
  if (status === 'warning') return 'Wkrótce';
  if (status === 'ok') return 'OK';
  return 'Brak daty';
}

const handleLogout = () => {
  removeToken();
  router.push('/login');
};

const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    handleLogout();
    return true;
  }
  return false;
};

async function fetchVehicles() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 15,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    const response = await authenticatedFetch(`${API_URL}/api/vehicles?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania listy pojazdów');
    vehicles.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;
  } catch (error) {
    console.error('Błąd podczas pobierania pojazdów:', error);
    if (!handleAuthError(error)) {
      alert(`Nie udało się pobrać listy pojazdów: ${error.message}`);
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleAddVehicle() {
  if (!newVehicleData.value.registration_number?.trim()) {
    alert('Numer rejestracyjny jest polem wymaganym.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/vehicles`, {
      method: 'POST',
      body: JSON.stringify(preparePayload(newVehicleData.value)),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania pojazdu.');
    await fetchVehicles();
    showAddModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania pojazdu:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

async function handleUpdateVehicle() {
  if (!editedVehicleData.value) return;
  try {
    const vehicle = editedVehicleData.value;
    const response = await authenticatedFetch(`${API_URL}/api/vehicles/${vehicle.id}`, {
      method: 'PUT',
      body: JSON.stringify(preparePayload(vehicle)),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji pojazdu.');
    const index = vehicles.value.findIndex((v) => v.id === result.id);
    if (index !== -1) {
      vehicles.value[index] = result;
    }
    showEditModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji pojazdu:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

async function handleDeleteVehicle(vehicleId) {
  if (!confirm('Czy na pewno chcesz usunąć ten pojazd?')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć pojazdu.');
    }
    await fetchVehicles();
  } catch (error) {
    console.error('Błąd podczas usuwania pojazdu:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

function preparePayload(data) {
  return {
    ...data,
    registration_number: data.registration_number?.trim(),
    production_year: data.production_year || null,
    mileage: data.mileage || null,
    inspection_valid_until: data.inspection_valid_until || null,
    insurance_valid_until: data.insurance_valid_until || null,
  };
}

function handleShowAddModal() {
  newVehicleData.value = initializeNewVehicle();
  showAddModal.value = true;
}

function handleShowEditModal(vehicle) {
  editedVehicleData.value = { ...vehicle };
  showEditModal.value = true;
}

function handlePageChange(newPage) {
  currentPage.value = newPage;
}

function changeSort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'asc';
  }
}

function vehicleLabel(vehicle) {
  const parts = [vehicle.registration_number];
  if (vehicle.make || vehicle.model) {
    parts.push(`(${[vehicle.make, vehicle.model].filter(Boolean).join(' ')})`);
  }
  return parts.join(' ');
}

watch([currentPage, sortBy, sortOrder], fetchVehicles);

let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchVehicles();
  }, 300);
});

onMounted(() => {
  fetchVehicles();
  if (route.query.action === 'new') {
    handleShowAddModal();
  }
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Pojazdy ({{ totalItems }})</h1>
      <button v-if="userRole === 'admin' || userRole === 'editor'" class="add-new-btn" @click="handleShowAddModal" :disabled="isLoading">&#43; Dodaj Pojazd</button>
    </div>

    <div class="search-container">
      <input type="text" v-model="searchQuery" placeholder="Szukaj po numerze rejestracyjnym, marce, modelu, VIN..." />
    </div>

    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
      </div>

      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th @click="changeSort('registration_number')" class="sortable">
                  Nr rejestracyjny
                  <span v-if="sortBy === 'registration_number'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('make')" class="sortable">
                  Marka / Model
                  <span v-if="sortBy === 'make'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Rok</th>
                <th>Przebieg</th>
                <th @click="changeSort('inspection_valid_until')" class="sortable">
                  Przegląd do
                  <span v-if="sortBy === 'inspection_valid_until'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('insurance_valid_until')" class="sortable">
                  OC do
                  <span v-if="sortBy === 'insurance_valid_until'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!vehicles.length && !isLoading">
                <td colspan="8" class="empty-table-message">
                  <p>Brak pojazdów w bazie. Dodaj pierwszy, aby rozpocząć.</p>
                </td>
              </tr>
              <tr v-for="vehicle in vehicles" :key="vehicle.id" :class="{ 'row-inactive': !vehicle.is_active }">
                <td data-label="Nr rejestracyjny">
                  <strong>{{ vehicle.registration_number }}</strong>
                </td>
                <td data-label="Marka / Model">{{ [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-' }}</td>
                <td data-label="Rok">{{ vehicle.production_year || '-' }}</td>
                <td data-label="Przebieg">{{ vehicle.mileage != null ? `${vehicle.mileage} km` : '-' }}</td>
                <td data-label="Przegląd do">
                  <span class="date-badge" :class="getDateStatus(vehicle.inspection_valid_until)">
                    {{ formatDate(vehicle.inspection_valid_until) }}
                    <small v-if="vehicle.inspection_valid_until">{{ getDateStatusLabel(getDateStatus(vehicle.inspection_valid_until)) }}</small>
                  </span>
                </td>
                <td data-label="OC do">
                  <span class="date-badge" :class="getDateStatus(vehicle.insurance_valid_until)">
                    {{ formatDate(vehicle.insurance_valid_until) }}
                    <small v-if="vehicle.insurance_valid_until">{{ getDateStatusLabel(getDateStatus(vehicle.insurance_valid_until)) }}</small>
                  </span>
                </td>
                <td data-label="Status">
                  <span v-if="vehicle.is_active" class="status-active">Aktywny</span>
                  <span v-else class="status-inactive">Nieaktywny</span>
                </td>
                <td data-label="Akcje" class="actions-cell">
                  <button v-if="userRole === 'admin' || userRole === 'editor'" class="edytuj" @click="handleShowEditModal(vehicle)">Edytuj</button>
                  <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteVehicle(vehicle.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-backdrop">
    <div class="modal-content modal-content-wide">
      <div class="modal-header">
        <h3>Dodaj pojazd</h3>
        <button class="close-button" aria-label="Zamknij" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddVehicle">
        <div class="form-grid">
          <div class="form-group form-group-highlight">
            <label for="regNumber">Numer rejestracyjny (wymagane)</label>
            <input type="text" id="regNumber" v-model="newVehicleData.registration_number" required placeholder="np. WA 12345" />
          </div>
          <div class="form-group">
            <label for="make">Marka</label>
            <input type="text" id="make" v-model="newVehicleData.make" placeholder="np. Ford" />
          </div>
          <div class="form-group">
            <label for="model">Model</label>
            <input type="text" id="model" v-model="newVehicleData.model" placeholder="np. Transit" />
          </div>
          <div class="form-group">
            <label for="year">Rok produkcji</label>
            <input type="number" id="year" v-model.number="newVehicleData.production_year" min="1900" max="2100" />
          </div>
          <div class="form-group">
            <label for="vin">VIN</label>
            <input type="text" id="vin" v-model="newVehicleData.vin" />
          </div>
          <div class="form-group">
            <label for="fuel">Rodzaj paliwa</label>
            <input type="text" id="fuel" v-model="newVehicleData.fuel_type" placeholder="np. Diesel" />
          </div>
          <div class="form-group">
            <label for="engine">Pojemność silnika</label>
            <input type="text" id="engine" v-model="newVehicleData.engine_capacity" placeholder="np. 2.0" />
          </div>
          <div class="form-group">
            <label for="mileage">Przebieg (km)</label>
            <input type="number" id="mileage" v-model.number="newVehicleData.mileage" min="0" />
          </div>
          <div class="form-group form-group-highlight">
            <label for="inspection">Przegląd ważny do</label>
            <input type="date" id="inspection" v-model="newVehicleData.inspection_valid_until" />
          </div>
          <div class="form-group form-group-highlight">
            <label for="insurance">OC ważne do</label>
            <input type="date" id="insurance" v-model="newVehicleData.insurance_valid_until" />
          </div>
          <div class="form-group form-group-full">
            <label>
              <input type="checkbox" v-model="newVehicleData.is_active" />
              Pojazd aktywny
            </label>
          </div>
          <div class="form-group form-group-full">
            <label for="notes">Notatki</label>
            <textarea id="notes" v-model="newVehicleData.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj Pojazd</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-content modal-content-wide">
      <div class="modal-header">
        <h3>Edytuj pojazd — {{ editedVehicleData ? vehicleLabel(editedVehicleData) : '' }}</h3>
        <button class="close-button" aria-label="Zamknij" @click="showEditModal = false">&times;</button>
      </div>
      <form v-if="editedVehicleData" @submit.prevent="handleUpdateVehicle">
        <div class="form-grid">
          <div class="form-group form-group-highlight">
            <label for="editRegNumber">Numer rejestracyjny (wymagane)</label>
            <input type="text" id="editRegNumber" v-model="editedVehicleData.registration_number" required />
          </div>
          <div class="form-group">
            <label for="editMake">Marka</label>
            <input type="text" id="editMake" v-model="editedVehicleData.make" />
          </div>
          <div class="form-group">
            <label for="editModel">Model</label>
            <input type="text" id="editModel" v-model="editedVehicleData.model" />
          </div>
          <div class="form-group">
            <label for="editYear">Rok produkcji</label>
            <input type="number" id="editYear" v-model.number="editedVehicleData.production_year" min="1900" max="2100" />
          </div>
          <div class="form-group">
            <label for="editVin">VIN</label>
            <input type="text" id="editVin" v-model="editedVehicleData.vin" />
          </div>
          <div class="form-group">
            <label for="editFuel">Rodzaj paliwa</label>
            <input type="text" id="editFuel" v-model="editedVehicleData.fuel_type" />
          </div>
          <div class="form-group">
            <label for="editEngine">Pojemność silnika</label>
            <input type="text" id="editEngine" v-model="editedVehicleData.engine_capacity" />
          </div>
          <div class="form-group">
            <label for="editMileage">Przebieg (km)</label>
            <input type="number" id="editMileage" v-model.number="editedVehicleData.mileage" min="0" />
          </div>
          <div class="form-group form-group-highlight">
            <label for="editInspection">Przegląd ważny do</label>
            <input type="date" id="editInspection" v-model="editedVehicleData.inspection_valid_until" />
          </div>
          <div class="form-group form-group-highlight">
            <label for="editInsurance">OC ważne do</label>
            <input type="date" id="editInsurance" v-model="editedVehicleData.insurance_valid_until" />
          </div>
          <div class="form-group form-group-full">
            <label>
              <input type="checkbox" v-model="editedVehicleData.is_active" />
              Pojazd aktywny
            </label>
          </div>
          <div class="form-group form-group-full">
            <label for="editNotes">Notatki</label>
            <textarea id="editNotes" v-model="editedVehicleData.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz zmiany</button>
          <button type="button" class="anuluj" @click="showEditModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.actions-cell {
  display: flex;
  gap: 8px;
}
.actions-cell button {
  margin: 0;
}
.main-content-wrapper {
  position: relative;
  min-height: 300px;
}
.table-and-pagination.is-loading {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.3s ease-in-out;
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
.empty-table-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-secondary);
}
.row-inactive {
  opacity: 0.55;
}
.date-badge {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.date-badge small {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.date-badge.expired {
  background: #fde8e8;
  color: #c0392b;
}
.date-badge.warning {
  background: #fff8e6;
  color: #b8860b;
}
.date-badge.ok {
  background: #e8f8ef;
  color: #1e7e34;
}
.date-badge.unknown {
  color: var(--grey);
}
.status-active {
  color: var(--green);
  font-weight: 600;
}
.status-inactive {
  color: var(--grey);
}
.modal-content-wide {
  max-width: 720px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.form-group-full {
  grid-column: 1 / -1;
}
.form-group-highlight label {
  font-weight: 700;
  color: var(--blue);
}
@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
