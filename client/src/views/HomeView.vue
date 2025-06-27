<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue';
import { getAuthHeaders, removeToken, isAuthenticated } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const isLoading = ref(true);
const router = useRouter();

const handleLogout = () => {
  removeToken();
  router.push('/login');
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const inicjalizujPustaPrace = () => ({
  od_kogo: '', pracownicy: '', numer_tel: '', miejscowosc: '',
  informacje: '', srednica: null, data_rozpoczecia: '', data_zakonczenia: '', lustro_statyczne: null,
  lustro_dynamiczne: null, wydajnosc: null, ilosc_metrow: null
});

const prace = ref([]);
const nowaPraca = ref(inicjalizujPustaPrace());
const showAddModal = ref(false); 
const showEditModal = ref(false); 
const edytowaneDane = ref(inicjalizujPustaPrace());
const searchQuery = ref('');
const validationErrors = ref({});
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const itemsPerPage = ref(15);
const sortBy = ref('data_zakonczenia');
const sortOrder = ref('desc');

const isFormInvalid = computed(() => Object.keys(validationErrors.value).length > 0);

async function pobierzPrace() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    });
    const response = await fetch(`${API_URL}/api/prace?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error(`Błąd sieci! Status: ${response.status}`);
    const result = await response.json();
    prace.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
  } catch (error) {
    console.error('Błąd w pobierzPrace():', error);
    if (error.message.includes('401') || error.message.includes('403')) {
      prace.value = [];
      totalItems.value = 0;
    } else {
      alert(`Błąd ładowania danych: ${error.message}`);
    }
  } finally {
    isLoading.value = false;
  }
}

watch([currentPage, sortBy, sortOrder], pobierzPrace);

// ZMIANA: Dodajemy opóźnienie (debounce) do wyszukiwania
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    pobierzPrace();
  }, 300); // Czeka 300ms po ostatnim wciśnięciu klawisza
});


function changeSort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'desc';
  }
}

function validateForm(formData) {
  const errors = {};
  if (formData.numer_tel && formData.numer_tel.length > 0) {
    const phoneDigits = formData.numer_tel.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(phoneDigits)) {
      errors.numer_tel = 'Numer telefonu musi składać się z 9 cyfr.';
    }
  }
  if (!formData.data_zakonczenia) {
    errors.data_zakonczenia = 'Data zakończenia jest wymagana.';
  }
  validationErrors.value = errors;
}

async function handleSubmit() {
  validateForm(nowaPraca.value);
  if (isFormInvalid.value) return;
  try {
    const response = await fetch(`${API_URL}/api/prace`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, 
      body: JSON.stringify(nowaPraca.value) 
    });
    if (!response.ok) throw new Error('Błąd podczas zapisywania');
    await pobierzPrace();
    nowaPraca.value = inicjalizujPustaPrace();
    showAddModal.value = false; 
  } catch (error) {
    console.error('Błąd w handleSubmit():', error);
    alert(`Nie udało się zapisać pracy: ${error.message}`);
  }
}

function handleShowAddModal() {
  validationErrors.value = {};
  nowaPraca.value = inicjalizujPustaPrace();
  showAddModal.value = true;
}
function handleCancelAdd() {
  showAddModal.value = false;
}

function handleEdit(praca) {
  validationErrors.value = {};
  edytowaneDane.value = { 
    ...praca, 
    data_rozpoczecia: formatDate(praca.data_rozpoczecia),
    data_zakonczenia: formatDate(praca.data_zakonczenia)
  };
  showEditModal.value = true;
}
function handleCancelEdit() {
  showEditModal.value = false;
}

async function handleUpdate() {
  validateForm(edytowaneDane.value);
  if (isFormInvalid.value) return;
  if (!edytowaneDane.value.id) return;
  try {
    const response = await fetch(`${API_URL}/api/prace/${edytowaneDane.value.id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, 
      body: JSON.stringify(edytowaneDane.value) 
    });
    if (!response.ok) throw new Error('Błąd podczas aktualizacji');
    await pobierzPrace();
    showEditModal.value = false;
  } catch (error) {
    console.error("Błąd w handleUpdate():", error);
    alert(`Nie udało się zaktualizować wpisu: ${error.message}`);
  }
}

async function handleDelete(idPracy) {
  if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
  try {
    const response = await fetch(`${API_URL}/api/prace/${idPracy}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Błąd podczas usuwania');
    if (prace.value.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    } else {
      await pobierzPrace();
    }
  } catch (error) {
    console.error('Błąd w handleDelete():', error);
    alert(`Nie udało się usunąć wpisu: ${error.message}`);
  }
}

onMounted(() => {
  pobierzPrace();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Ilość studni: {{ totalItems }}</h1>
      <div class="header-actions">
        <button class="add-new-btn" @click="handleShowAddModal" :disabled="isLoading">&#43; Dodaj nową pracę</button>
        <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">Wyloguj</button>
      </div>
    </div>
    <div class="search-container">
      <input type="text" v-model="searchQuery" placeholder="Szukaj...">
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
                <th @click="changeSort('od_kogo')" class="sortable">Od kogo <span v-if="sortBy === 'od_kogo'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
                <th class="col-pracownicy">Pracownicy</th>
                <th class="col-telefon">Telefon</th>
                <th @click="changeSort('miejscowosc')" class="sortable">Miejscowość <span v-if="sortBy === 'miejscowosc'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
                <th class="col-informacje">Informacje</th>
                <th>Data Rozp.</th>
                <th @click="changeSort('data_zakonczenia')" class="sortable">Data Zakoń. <span v-if="sortBy === 'data_zakonczenia'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
                <th>Średnica Ø</th><th>L. statyczne</th><th>L. dynamiczne</th><th>Wydajność</th><th>Metry</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="praca in prace" :key="praca.id">
                <td data-label="Od kogo">{{ praca.od_kogo || '-' }}</td>
                <td data-label="Pracownicy" class="col-pracownicy">{{ praca.pracownicy || '-' }}</td>
                <td data-label="Telefon" class="col-telefon">{{ praca.numer_tel || '-' }}</td>
                <td data-label="Miejscowość">{{ praca.miejscowosc || '-' }}</td>
                <td data-label="Informacje" class="col-informacje">{{ praca.informacje || '-' }}</td>
                <td data-label="Data Rozp.">{{ formatDate(praca.data_rozpoczecia) }}</td>
                <td data-label="Data Zakoń.">{{ formatDate(praca.data_zakonczenia) }}</td>
                <td data-label="Średnica Ø">{{ praca.srednica || '-' }}</td>
                <td data-label="L. statyczne">{{ praca.lustro_statyczne || '-' }}</td>
                <td data-label="L. dynamiczne">{{ praca.lustro_dynamiczne || '-' }}</td>
                <td data-label="Wydajność">{{ praca.wydajnosc || '-' }}</td>
                <td data-label="Metry">{{ praca.ilosc_metrow || '-' }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <RouterLink :to="`/praca/${praca.id}`"><button class="pokaż">Pokaż</button></RouterLink>
                  <button class="edytuj" @click="handleEdit(praca)">Edytuj</button>
                  <button class="usun" @click="handleDelete(praca.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!prace.length && !isLoading" class="empty-table-message"><p>Brak pasujących wyników.</p></div>
        </div>

        <div v-if="totalPages > 1" class="pagination-controls">
          <button @click="currentPage--" :disabled="currentPage === 1">&laquo; Poprzednia</button>
          <span>Strona {{ currentPage }} z {{ totalPages }}</span>
          <button @click="currentPage++" :disabled="currentPage === totalPages">Następna &raquo;</button>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-backdrop">...</div>
  <div v-if="showEditModal" class="modal-backdrop">...</div>
</template>

<style>
/* ... Poprzednie style ... */

/* ZMIANA: Nowe style do obsługi nakładki ładowania */
.main-content-wrapper {
  position: relative;
}

.table-and-pagination.is-loading {
  opacity: 0.4;
  pointer-events: none; /* Zapobiega klikaniu w tabelę podczas ładowania */
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
  align-items: center;
  z-index: 10;
  padding-top: 50px; /* Lekko obniżamy spinner, żeby nie był na nagłówku */
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
/* ... reszta stylów bez zmian ... */
</style>