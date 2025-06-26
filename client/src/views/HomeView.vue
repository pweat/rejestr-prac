<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue';
import { getAuthHeaders, removeToken, isAuthenticated } from '../auth/auth.js';

const router = useRouter();

const handleLogout = () => {
  removeToken();
  router.push('/login');
}

const isLoading = ref(true);

function formatDate(dateString) {
  if (!dateString) return '-';
  return dateString.split('T')[0];
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
watch(searchQuery, () => {
  currentPage.value = 1;
  pobierzPrace();
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
      <input type="text" v-model="searchQuery" placeholder="Szukaj..." :disabled="isLoading">
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
              <th @click="changeSort('od_kogo')" class="sortable">Od kogo <span v-if="sortBy === 'od_kogo'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
              <th class="col-pracownicy">Pracownicy</th>
              <th class="col-telefon">Telefon</th>
              <th @click="changeSort('miejscowosc')" class="sortable">Miejscowość <span v-if="sortBy === 'miejscowosc'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
              <th class="col-informacje">Informacje</th>
              <th>Data Rozp.</th>
              <th @click="changeSort('data_zakonczenia')" class="sortable">Data Zakoń. <span v-if="sortBy === 'data_zakonczenia'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span></th>
              <th>Średnica Ø</th>
              <th>L. statyczne</th>
              <th>L. dynamiczne</th>
              <th>Wydajność</th>
              <th>Metry</th>
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
        <div v-if="!prace.length" class="empty-table-message"><p>Brak pasujących wyników.</p></div>
      </div>

      <div v-if="totalPages > 1" class="pagination-controls">
        <button @click="currentPage--" :disabled="currentPage === 1">&laquo; Poprzednia</button>
        <span>Strona {{ currentPage }} z {{ totalPages }}</span>
        <button @click="currentPage++" :disabled="currentPage === totalPages">Następna &raquo;</button>
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header"><h3>Dodaj nową pracę</h3><button class="close-button" @click="handleCancelAdd">&times;</button></div>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
            <div class="form-group"><label>Od kogo:</label><input type="text" v-model="nowaPraca.od_kogo" required></div>
            <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="nowaPraca.pracownicy"></div>
            <div class="form-group">
              <label>Numer tel.:</label>
              <input type="text" v-model="nowaPraca.numer_tel" @input="validateForm(nowaPraca)">
              <p v-if="validationErrors.numer_tel" class="error-message">{{ validationErrors.numer_tel }}</p>
            </div>
            <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="nowaPraca.miejscowosc"></div>
            <div class="form-group full-width"><label>Informacje:</label><textarea v-model="nowaPraca.informacje" rows="3"></textarea></div>
            <div class="form-group"><label>Data rozpoczęcia:</label><input type="date" v-model="nowaPraca.data_rozpoczecia"></div>
            <div class="form-group">
              <label>Data zakończenia:</label>
              <input type="date" v-model="nowaPraca.data_zakonczenia" @input="validateForm(nowaPraca)" required>
              <p v-if="validationErrors.data_zakonczenia" class="error-message">{{ validationErrors.data_zakonczenia }}</p>
            </div>
            <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="nowaPraca.srednica"></div>
            <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="nowaPraca.ilosc_metrow"></div>
            <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="nowaPraca.lustro_statyczne"></div>
            <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="nowaPraca.lustro_dynamiczne"></div>
            <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="nowaPraca.wydajnosc"></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz" :disabled="isFormInvalid">Zapisz pracę</button><button type="button" class="anuluj" @click="handleCancelAdd">Anuluj</button></div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header"><h3>Edytuj wpis #{{ edytowaneDane.id }}</h3><button class="close-button" @click="handleCancelEdit">&times;</button></div>
      <form @submit.prevent="handleUpdate">
        <div class="form-grid">
            <div class="form-group"><label>Od kogo:</label><input type="text" v-model="edytowaneDane.od_kogo" required></div>
            <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="edytowaneDane.pracownicy"></div>
            <div class="form-group">
              <label>Numer tel.:</label>
              <input type="text" v-model="edytowaneDane.numer_tel" @input="validateForm(edytowaneDane)">
              <p v-if="validationErrors.numer_tel" class="error-message">{{ validationErrors.numer_tel }}</p>
            </div>
            <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="edytowaneDane.miejscowosc"></div>
            <div class="form-group full-width"><label>Informacje:</label><textarea v-model="edytowaneDane.informacje" rows="3"></textarea></div>
            <div class="form-group"><label>Data rozpoczęcia:</label><input type="date" v-model="edytowaneDane.data_rozpoczecia"></div>
            <div class="form-group">
              <label>Data zakończenia:</label>
              <input type="date" v-model="edytowaneDane.data_zakonczenia" @input="validateForm(edytowaneDane)" required>
              <p v-if="validationErrors.data_zakonczenia" class="error-message">{{ validationErrors.data_zakonczenia }}</p>
            </div>
            <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="edytowaneDane.srednica"></div>
            <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="edytowaneDane.ilosc_metrow"></div>
            <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="edytowaneDane.lustro_statyczne"></div>
            <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="edytowaneDane.lustro_dynamiczne"></div>
            <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="edytowaneDane.wydajnosc"></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz" :disabled="isFormInvalid">Zapisz zmiany</button><button type="button" class="anuluj" @click="handleCancelEdit">Anuluj</button></div>
      </form>
    </div>
  </div>
</template>

<style>
  :root{--text-color:#2c3e50;--border-color:#e0e0e0;--background-light:#fff;--background-page:#f4f7f9;--header-background:#f8f9fa;--green:#28a745;--red:#dc3545;--blue:#007bff;--grey:#6c757d;--white:#fff;--shadow:0 4px 12px rgba(0,0,0,.08)}
  html{box-sizing:border-box}*,:after,:before{box-sizing:inherit}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text-color);background-color:var(--background-page);margin:0}
  #app{width:100%}
  .container{width:98%;max-width:none;box-sizing:border-box;margin:30px auto;padding:20px 30px;background-color:var(--background-light);border-radius:8px;box-shadow:var(--shadow)}
  .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color)}
  .header h1{margin:0;font-size:24px}
  .header-actions{display:flex;gap:15px}
  .add-new-btn{background-color:var(--green);font-size:16px;padding:12px 20px}
  .logout-btn{background-color:var(--grey)}
  .search-container{margin-bottom:1.5rem}
  .search-container input{width:100%;padding:12px 15px;font-size:16px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box}
  .loading-container{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:300px;color:var(--grey)}
  .spinner{border:4px solid #f3f3f3;border-top:4px solid var(--blue);border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin-bottom:15px}
  @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
  .table-container{width:100%;overflow-x:auto}
  table{width:100%;border-collapse:collapse;margin-top:1rem}
  th,td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--border-color);vertical-align:middle}
  th{background-color:var(--header-background);font-weight:600}
  th.sortable{cursor:pointer;user-select:none}
  th.sortable:hover{background-color:#e9ecef}
  td{color:#555}
  .col-pracownicy,.col-informacje{white-space:normal;word-break:break-word;min-width:200px}
  .empty-table-message{padding:30px;text-align:center;color:var(--grey)}
  .actions-cell{white-space:nowrap}.actions-cell>*{margin-right:8px}.actions-cell>*:last-child{margin-right:0}
  button{padding:8px 12px;color:#fff;border:none;border-radius:6px;cursor:pointer;margin:0;font-size:14px;font-weight:500;transition:all .2s}
  button:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}
  button.pokaż{background-color:#17a2b8}
  button.usun{background-color:var(--red)}
  button.edytuj{background-color:var(--blue)}
  button.zapisz{background-color:var(--green)}
  button.anuluj{background-color:var(--grey)}
  button:disabled{background-color:var(--grey);cursor:not-allowed;opacity:.7;transform:none;box-shadow:none}
  .pagination-controls{display:flex;justify-content:center;align-items:center;margin-top:1.5rem;gap:1rem}
  .pagination-controls button{background-color:var(--blue)}
  .pagination-controls span{font-weight:600;color:var(--grey)}
  .modal-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000}
  .modal-content{width:90%;max-width:1000px;max-height:90vh;overflow-y:auto;background-color:var(--background-light);border-radius:8px;box-shadow:var(--shadow)}
  .modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 25px;border-bottom:1px solid var(--border-color)}
  .modal-header h3{border-bottom:none;padding-bottom:0;margin:0}
  .close-button{background:0 0;border:none;font-size:28px;font-weight:300;color:var(--grey);cursor:pointer;padding:0;line-height:1}
  .modal-content form{padding:25px;border:none}
  .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}
  .form-group{display:flex;flex-direction:column}
  .form-group.full-width{grid-column:1/-1}
  .form-group label{margin-bottom:8px;font-weight:600;font-size:14px}
  .form-group input,.form-group textarea{padding:12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;transition:border-color .3s,box-shadow .3s}
  .form-group input:focus,.form-group textarea:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,123,255,.2)}
  .modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}
  .error-message{color:var(--red);font-size:13px;margin-top:5px;margin-bottom:0}

  @media screen and (max-width: 768px) {
    .table-container table thead {border:none;clip:rect(0 0 0 0);height:1px;margin:-1px;overflow:hidden;padding:0;position:absolute;width:1px}
    .table-container table tr {display:block;margin-bottom:.625em;border:1px solid #ddd;border-radius:6px;padding:15px}
    .table-container table td {display:block;text-align:left;border-bottom:1px dotted #ccc;padding:8px 0}
    .table-container table td:last-child {border-bottom:0}
    .table-container table td::before {content:attr(data-label);display:block;font-weight:700;text-transform:uppercase;font-size:11px;color:#6c757d;margin-bottom:4px}
    .actions-cell {padding-top:15px;margin-top:10px}
    .actions-cell::before {display:none}
    .header {flex-direction:column;gap:15px}
    .modal-content {width:95%;padding:15px}
    .form-grid {grid-template-columns:1fr;gap:15px}
  }
</style>