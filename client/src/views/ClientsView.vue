<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import PaginationControls from '../components/PaginationControls.vue';
import { getAuthHeaders, removeToken, getUserRole } from '../auth/auth.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================

/** @const {string} Bazowy URL do API. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** Dostęp do instancji routera Vue. */
const router = useRouter();

/** Rola zalogowanego użytkownika, pobierana z tokenu. */
const userRole = getUserRole();

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================

// --- Stan interfejsu ---
const isLoading = ref(true);
const showAddModal = ref(false);
const showEditModal = ref(false);

// --- Stan danych ---
const clients = ref([]);
const newClientData = ref(initializeNewClient());
const editedClientData = ref(null);

// --- Stan paginacji, sortowania i wyszukiwania ---
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const searchQuery = ref('');
const sortBy = ref('name');
const sortOrder = ref('asc');

// ================================================================================================
// 헬 FUNKCJE POMOCNICZE
// ================================================================================================

/**
 * Tworzy i zwraca pusty obiekt klienta.
 * @returns {object} Obiekt z polami nowego klienta.
 */
function initializeNewClient() {
  return {
    name: '',
    phone_number: '',
    address: '',
    notes: '',
    email: '',
  };
}

/**
 * Obsługuje wylogowanie użytkownika przez usunięcie tokenu i przekierowanie do strony logowania.
 */
const handleLogout = () => {
  removeToken();
  router.push('/login');
};

/**
 * Centralna obsługa błędów autoryzacji. Jeśli błąd to 401/403, wylogowuje użytkownika.
 * @param {Error} error - Obiekt błędu.
 * @returns {boolean} `true` jeśli błąd został obsłużony, w przeciwnym razie `false`.
 */
const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    handleLogout();
    return true;
  }
  return false;
};

// ================================================================================================
// 🔄 LOGIKA CRUD (Create, Read, Update, Delete)
// ================================================================================================

/**
 * Asynchronicznie pobiera listę klientów z API na podstawie aktualnych filtrów,
 * sortowania i paginacji.
 */
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

/**
 * Wysyła dane nowego klienta do API.
 */
async function handleAddClient() {
  if (!newClientData.value.phone_number) {
    alert('Numer telefonu jest polem wymaganym.');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newClientData.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania klienta.');

    // Po dodaniu odświeżamy listę, aby zachować spójność danych.
    await fetchClients();
    showAddModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

/**
 * Wysyła zaktualizowane dane klienta do API.
 */
async function handleUpdateClient() {
  if (!editedClientData.value) return;
  try {
    const client = editedClientData.value;
    const response = await fetch(`${API_URL}/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(client),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji klienta.');

    // Zamiast pobierać całą listę od nowa, podmieniamy tylko zaktualizowany element.
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

/**
 * Wysyła żądanie usunięcia klienta do API.
 * @param {number} clientId - ID klienta do usunięcia.
 */
async function handleDeleteClient(clientId) {
  if (!confirm('Czy na pewno chcesz usunąć tego klienta? Usunięcie go skasuje również WSZYSTKIE jego zlecenia.')) return;

  try {
    const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć klienta.');
    }
    // Po usunięciu odświeżamy listę.
    await fetchClients();
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

// ================================================================================================
// ⚡ OBSŁUGA ZDARZEŃ
// ================================================================================================

/** Pokazuje modal dodawania nowego klienta. */
function handleShowAddModal() {
  newClientData.value = initializeNewClient();
  showAddModal.value = true;
}

/**
 * Pokazuje modal edycji i wypełnia go danymi wybranego klienta.
 * @param {object} client - Obiekt klienta do edycji.
 */
function handleShowEditModal(client) {
  // Tworzymy kopię obiektu, aby uniknąć mutacji oryginalnych danych w tabeli.
  editedClientData.value = { ...client };
  showEditModal.value = true;
}

/**
 * Aktualizuje stan paginacji po kliknięciu w kontrolkach.
 * @param {number} newPage - Nowy numer strony.
 */
function handlePageChange(newPage) {
  currentPage.value = newPage;
}

/**
 * Zmienia kryterium sortowania lub jego porządek (rosnąco/malejąco).
 * @param {string} key - Klucz (kolumna) do sortowania, np. 'name' lub 'address'.
 */
function changeSort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'asc';
  }
}

// ================================================================================================
// 👀 WATCHERS (OBSERWATORZY)
// ================================================================================================

/** Obserwuje zmiany w paginacji i sortowaniu, a następnie pobiera dane na nowo. */
watch([currentPage, sortBy, sortOrder], fetchClients);

/**
 * Obserwuje zmiany w polu wyszukiwania. Używa "debounce" (opóźnienia),
 * aby uniknąć wysyłania żądań do API po każdej wpisanej literze.
 */
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1; // Resetuj do pierwszej strony przy nowym wyszukiwaniu
    fetchClients();
  }, 300); // Czeka 300ms po ostatniej zmianie przed wysłaniem żądania
});

// ================================================================================================
// 🚀 CYKL ŻYCIA KOMPONENTU
// ================================================================================================

/** Pobiera początkową listę klientów po zamontowaniu komponentu. */
onMounted(() => {
  fetchClients();
  if (route.query.action === 'new') {
    handleShowAddModal();
  }
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Klienci ({{ totalItems }})</h1>
      <button v-if="userRole === 'admin' || userRole === 'editor'" class="add-new-btn" @click="handleShowAddModal" :disabled="isLoading">&#43; Dodaj Klienta</button>
    </div>

    <div class="search-container">
      <input type="text" v-model="searchQuery" placeholder="Szukaj po nazwie, telefonie, adresie..." />
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
                <th>Email</th>
                <th>Notatki</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!clients.length && !isLoading">
                <td colspan="6" class="empty-table-message">
                  <p>Brak klientów w bazie. Dodaj pierwszego, aby rozpocząć.</p>
                </td>
              </tr>
              <tr v-for="client in clients" :key="client.id">
                <td data-label="Nazwa Klienta">{{ client.name || '-' }}</td>
                <td data-label="Telefon">{{ client.phone_number }}</td>
                <td data-label="Adres">{{ client.address || '-' }}</td>
                <td data-label="Email">{{ client.email || '-' }}</td>
                <td data-label="Notatki" class="col-informacje">{{ client.notes || '-' }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <RouterLink :to="`/zlecenia?clientId=${client.id}`">
                    <button class="pokaż">Zlecenia</button>
                  </RouterLink>
                  <button v-if="userRole === 'admin' || userRole === 'editor'" class="edytuj" @click="handleShowEditModal(client)">Edytuj</button>
                  <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteClient(client.id)">Usuń</button>
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
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowego klienta</h3>
        <button class="close-button" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddClient">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="clientName">Nazwa klienta (opcjonalnie)</label>
            <input type="text" id="clientName" v-model="newClientData.name" />
          </div>
          <div class="form-group">
            <label for="clientPhone">Numer telefonu (wymagane)</label>
            <input type="text" id="clientPhone" v-model="newClientData.phone_number" required />
          </div>
          <div class="form-group">
            <label for="clientAddress">Adres</label>
            <input type="text" id="clientAddress" v-model="newClientData.address" />
          </div>
          <div class="form-group">
            <label for="clientEmail">Adres e-mail</label>
            <input type="email" id="clientEmail" v-model="newClientData.email" />
          </div>
          <div class="form-group">
            <label for="clientNotes">Notatki</label>
            <textarea id="clientNotes" v-model="newClientData.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj Klienta</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
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
      <form v-if="editedClientData" @submit.prevent="handleUpdateClient">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="editClientName">Nazwa klienta (opcjonalnie)</label>
            <input type="text" id="editClientName" v-model="editedClientData.name" />
          </div>
          <div class="form-group">
            <label for="editClientPhone">Numer telefonu (wymagane)</label>
            <input type="text" id="editClientPhone" v-model="editedClientData.phone_number" required />
          </div>
          <div class="form-group">
            <label for="editClientAddress">Adres</label>
            <input type="text" id="editClientAddress" v-model="editedClientData.address" />
          </div>
          <div class="form-group">
            <label for="editClientEmail">Adres e-mail</label>
            <input type="email" id="editClientEmail" v-model="editedClientData.email" />
          </div>
          <div class="form-group">
            <label for="editClientNotes">Notatki</label>
            <textarea id="editClientNotes" v-model="editedClientData.notes" rows="3"></textarea>
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
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.main-content-wrapper {
  position: relative;
  min-height: 300px; /* Zapobiega "skakaniu" layoutu podczas ładowania */
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
  background-color: rgba(255, 255, 255, 0.5); /* Lekkie tło dla lepszego efektu */
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
</style>
