<script setup>
import { ref, onMounted, watch } from 'vue';
import { getAuthHeaders } from '../auth/auth.js';
import { useRouter } from 'vue-router'; // Dodajemy import
import PaginationControls from '../components/PaginationControls.vue';
import { RouterLink } from 'vue-router';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter(); // Tworzymy instancję routera

const isLoading = ref(true);
const clients = ref([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const edytowanyKlient = ref(null);
const currentPage = ref(1);
const totalPages = ref(1);

const inicjalizujNowegoKlienta = () => ({
  name: '',
  phone_number: '',
  address: '',
  notes: '',
});

const nowyKlient = ref(inicjalizujNowegoKlienta());

async function fetchClients() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({ page: currentPage.value, limit: 15 });
    const response = await fetch(`${API_URL}/api/clients?${params.toString()}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Błąd pobierania listy klientów');
    const result = await response.json();
    clients.value = result.data;
    totalPages.value = result.pagination.totalPages;
  } catch (error) {
    if (!handleAuthError(error)) {
      // Zakładając, że masz tu handleAuthError
      alert('Nie udało się pobrać listy klientów.');
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
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd podczas dodawania klienta.');
    }
    await fetchClients(); // Odśwież listę
    showAddModal.value = false; // Zamknij modal
  } catch (error) {
    console.error('Błąd podczas dodawania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

function handleShowEditModal(client) {
  edytowanyKlient.value = { ...client }; // Kopiujemy obiekt
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
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Błąd podczas aktualizacji klienta.');
    }
    await fetchClients();
    showEditModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
}

async function handleDeleteClient(clientId) {
  if (!confirm('Czy na pewno chcesz usunąć tego klienta? Usunięcie go skasuje również WSZYSTKIE jego zlecenia.')) return;
  try {
    const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok && response.status !== 204) {
      throw new Error('Nie udało się usunąć klienta.');
    }
    await fetchClients();
  } catch (error) {
    console.error('Błąd podczas usuwania klienta:', error);
    if (!handleAuthError(error)) {
      alert(error.message);
    }
  }
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

function handlePageChange(newPage) {
  currentPage.value = newPage;
}

watch(currentPage, fetchClients);

onMounted(() => {
  fetchClients();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Klienci ({{ clients.length }})</h1>
      <button class="add-new-btn" @click="handleShowAddModal" :disabled="isLoading">&#43; Dodaj Klienta</button>
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
              <th>Nazwa Klienta</th>
              <th>Telefon</th>
              <th>Adres</th>
              <th>Notatki</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in clients" :key="client.id">
              <td data-label="Nazwa Klienta">{{ client.name || '-' }}</td>
              <td data-label="Telefon">{{ client.phone_number }}</td>
              <td data-label="Adres">{{ client.address || '-' }}</td>
              <td data-label="Notatki" class="col-informacje">
                {{ client.notes || '-' }}
              </td>
              <td data-label="Akcje" class="actions-cell">
                <RouterLink :to="`/zlecenia?clientId=${client.id}`"><button class="pokaż">Zlecenia</button></RouterLink>
                <button class="edytuj" @click="handleShowEditModal(client)">Edytuj</button>
                <button class="usun" @click="handleDeleteClient(client.id)">Usuń</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!clients.length" class="empty-table-message">
          <p>Brak klientów w bazie. Dodaj pierwszego, aby rozpocząć.</p>
        </div>
      </div>
      <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
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
            <label for="editClientName">Nazwa klienta (opcjonalnie)</label>
            <input type="text" id="editClientName" v-model="edytowanyKlient.name" />
          </div>
          <div class="form-group">
            <label for="editClientPhone">Numer telefonu (wymagane)</label>
            <input type="text" id="editClientPhone" v-model="edytowanyKlient.phone_number" required />
          </div>
          <div class="form-group">
            <label for="editClientAddress">Adres</label>
            <input type="text" id="editClientAddress" v-model="edytowanyKlient.address" />
          </div>
          <div class="form-group">
            <label for="editClientNotes">Notatki</label>
            <textarea id="editClientNotes" v-model="edytowanyKlient.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz zmiany</button>
          <button type="button" class="anuluj" @click="showEditModal = false">Anuluj</button>
        </div>
      </form>
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
            <input type="text" id="clientName" v-model="nowyKlient.name" />
          </div>
          <div class="form-group">
            <label for="clientPhone">Numer telefonu (wymagane)</label>
            <input type="text" id="clientPhone" v-model="nowyKlient.phone_number" required />
          </div>
          <div class="form-group">
            <label for="clientAddress">Adres</label>
            <input type="text" id="clientAddress" v-model="nowyKlient.address" />
          </div>
          <div class="form-group">
            <label for="clientNotes">Notatki</label>
            <textarea id="clientNotes" v-model="nowyKlient.notes" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj Klienta</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Te style są specyficzne tylko dla tego widoku, reszta jest globalna w App.vue */
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
