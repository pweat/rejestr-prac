<script setup>
import { ref, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import PaginationControls from '../components/PaginationControls.vue';
import { getAuthHeaders, removeToken, getUserRole } from '../auth/auth.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter();
const userRole = getUserRole();

const isLoading = ref(true);
const clients = ref([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const edytowanyKlient = ref(null);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const sortBy = ref('name');
const sortOrder = ref('asc');

const inicjalizujNowegoKlienta = () => ({
  name: '',
  phone_number: '',
  address: '',
  notes: '',
});

const nowyKlient = ref(inicjalizujNowegoKlienta());

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

async function fetchClients() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 15,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    const response = await fetch(`${API_URL}/api/clients?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania listy klientów');
    clients.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;
  } catch (error) {
    console.error('Błąd podczas pobierania klientów:', error);
    if (!handleAuthError(error)) {
      alert(`Nie udało się pobrać listy klientów: ${error.message}`);
    }
  } finally {
    isLoading.value = false;
  }
}

function handleShowAddModal() {
  nowyKlient.value = inicjalizujNowegoKlienta();
  showAddModal.value = true;
}

async function handleAddClient() {
  if (!nowyKlient.value.phone_number) {
    alert('Numer telefonu jest polem wymaganym.');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(nowyKlient.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania klienta.');
    // Zamiast odświeżać całą listę, po prostu dodajemy nowego klienta do istniejącej
    // i sortujemy, lub po prostu przeładowujemy dane dla spójności
    await fetchClients();
    showAddModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

function handleShowEditModal(client) {
  edytowanyKlient.value = { ...client };
  showEditModal.value = true;
}

async function handleUpdateClient() {
  if (!edytowanyKlient.value) return;
  try {
    const client = edytowanyKlient.value;
    const response = await fetch(`${API_URL}/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(client),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji klienta.');

    // Inteligentna aktualizacja: podmieniamy tylko jeden element na liście
    const index = clients.value.findIndex((c) => c.id === result.id);
    if (index !== -1) {
      clients.value[index] = result;
    }

    showEditModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

async function handleDeleteClient(clientId) {
  if (
    !confirm(
      'Czy na pewno chcesz usunąć tego klienta? Usunięcie go skasuje również WSZYSTKIE jego zlecenia.'
    )
  )
    return;
  try {
    const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error('Nie udało się usunąć klienta.');
    }
    // Po usunięciu, odświeżamy dane
    await fetchClients();
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
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
    sortOrder.value = 'asc';
  }
}

watch([currentPage, sortBy, sortOrder], fetchClients);

let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchClients();
  }, 300);
});

onMounted(() => {
  fetchClients();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Klienci ({{ totalItems }})</h1>
      <button
        v-if="userRole === 'admin' || userRole === 'editor'"
        class="add-new-btn"
        @click="handleShowAddModal"
        :disabled="isLoading"
      >
        &#43; Dodaj Klienta
      </button>
    </div>

    <div class="search-container">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Szukaj po nazwie, telefonie, adresie..."
      />
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
                <th @click="changeSort('name')" class="sortable">
                  Nazwa Klienta
                  <span v-if="sortBy === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Telefon</th>
                <th @click="changeSort('address')" class="sortable">
                  Adres
                  <span v-if="sortBy === 'address'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Notatki</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in clients" :key="client.id">
                <td data-label="Nazwa Klienta">{{ client.name || '-' }}</td>
                <td data-label="Telefon">{{ client.phone_number }}</td>
                <td data-label="Adres">{{ client.address || '-' }}</td>
                <td data-label="Notatki" class="col-informacje">{{ client.notes || '-' }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <RouterLink :to="`/zlecenia?clientId=${client.id}`"
                    ><button class="pokaż">Zlecenia</button></RouterLink
                  >
                  <button
                    v-if="userRole === 'admin' || userRole === 'editor'"
                    class="edytuj"
                    @click="handleShowEditModal(client)"
                  >
                    Edytuj
                  </button>
                  <button
                    v-if="userRole === 'admin'"
                    class="usun"
                    @click="handleDeleteClient(client.id)"
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!clients.length && !isLoading" class="empty-table-message">
            <p>Brak klientów w bazie. Dodaj pierwszego, aby rozpocząć.</p>
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

  <div v-if="showAddModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowego klienta</h3>
        <button class="close-button" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddClient">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="clientName">Nazwa klienta (opcjonalnie)</label
            ><input type="text" id="clientName" v-model="nowyKlient.name" />
          </div>
          <div class="form-group">
            <label for="clientPhone">Numer telefonu (wymagane)</label
            ><input type="text" id="clientPhone" v-model="nowyKlient.phone_number" required />
          </div>
          <div class="form-group">
            <label for="clientAddress">Adres</label
            ><input type="text" id="clientAddress" v-model="nowyKlient.address" />
          </div>
          <div class="form-group">
            <label for="clientNotes">Notatki</label
            ><textarea id="clientNotes" v-model="nowyKlient.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj Klienta</button
          ><button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj klienta</h3>
        <button class="close-button" @click="showEditModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleUpdateClient">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="editClientName">Nazwa klienta (opcjonalnie)</label
            ><input type="text" id="editClientName" v-model="edytowanyKlient.name" />
          </div>
          <div class="form-group">
            <label for="editClientPhone">Numer telefonu (wymagane)</label
            ><input
              type="text"
              id="editClientPhone"
              v-model="edytowanyKlient.phone_number"
              required
            />
          </div>
          <div class="form-group">
            <label for="editClientAddress">Adres</label
            ><input type="text" id="editClientAddress" v-model="edytowanyKlient.address" />
          </div>
          <div class="form-group">
            <label for="editClientNotes">Notatki</label
            ><textarea id="editClientNotes" v-model="edytowanyKlient.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz zmiany</button
          ><button type="button" class="anuluj" @click="showEditModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.main-content-wrapper {
  position: relative;
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
