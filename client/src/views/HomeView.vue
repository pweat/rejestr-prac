<script setup>
import { RouterLink } from 'vue-router'
import { ref, onMounted, computed, watch } from 'vue';

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

const isFormInvalid = computed(() => Object.keys(validationErrors.value).length > 0);

const filteredPrace = computed(() => {
  if (!searchQuery.value) { return prace.value; }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return prace.value.filter(praca => {
    return (
      praca.od_kogo?.toLowerCase().includes(lowerCaseQuery) ||
      praca.miejscowosc?.toLowerCase().includes(lowerCaseQuery) ||
      praca.pracownicy?.toLowerCase().includes(lowerCaseQuery) ||
      praca.numer_tel?.toString().includes(lowerCaseQuery)
    );
  });
});

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

async function pobierzPrace() {
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: itemsPerPage.value,
      search: searchQuery.value
    });
    const response = await fetch(`http://localhost:3000/api/prace?${params.toString()}`);
    if (!response.ok) throw new Error(`Błąd sieci! Status: ${response.status}`);
    const result = await response.json();
    prace.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
  } catch (error) {
    console.error('Błąd w pobierzPrace():', error);
    alert(`Błąd ładowania danych: ${error.message}`);
  }
}

watch(currentPage, pobierzPrace);
watch(searchQuery, () => {
  currentPage.value = 1;
  pobierzPrace();
});

async function handleSubmit() {
  validateForm(nowaPraca.value);
  if (isFormInvalid.value) return;
  try {
    const response = await fetch('http://localhost:3000/api/prace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nowaPraca.value) });
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
  edytowaneDane.value = { ...praca };
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
    const response = await fetch(`http://localhost:3000/api/prace/${edytowaneDane.value.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edytowaneDane.value) });
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
    const response = await fetch(`http://localhost:3000/api/prace/${idPracy}`, { method: 'DELETE' });
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
      <button class="add-new-btn" @click="handleShowAddModal">&#43; Dodaj nową pracę</button>
    </div>
    <div class="search-container">
      <input type="text" v-model="searchQuery" placeholder="Szukaj po kliencie, miejscowości, pracowniku...">
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Od kogo</th><th>Pracownicy</th><th>Telefon</th><th>Miejscowość</th><th>Informacje</th><th>Data Rozp.</th><th>Data Zakoń.</th><th>Średnica Ø</th><th>L. statyczne</th><th>L. dynamiczne</th><th>Wydajność</th><th>Metry</th><th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="praca in prace" :key="praca.id">
            <td>{{ praca.od_kogo }}</td><td>{{ praca.pracownicy }}</td><td>{{ praca.numer_tel }}</td><td>{{ praca.miejscowosc }}</td><td>{{ praca.informacje }}</td><td>{{ praca.data_rozpoczecia }}</td><td>{{ praca.data_zakonczenia }}</td><td>{{ praca.srednica }}</td><td>{{ praca.lustro_statyczne }}</td><td>{{ praca.lustro_dynamiczne }}</td><td>{{ praca.wydajnosc }}</td><td>{{ praca.ilosc_metrow }}</td>
            <td class="actions-cell">
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
  .pagination-controls{display:flex;justify-content:center;align-items:center;margin-top:1.5rem;gap:1rem}.pagination-controls button{background-color:var(--blue)}.pagination-controls span{font-weight:600;color:var(--grey)}.search-container{margin-bottom:1.5rem}.search-container input{width:100%;padding:12px 15px;font-size:16px;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box}.error-message{color:var(--red);font-size:13px;margin-top:5px;margin-bottom:0}button:disabled{background-color:var(--grey);cursor:not-allowed;opacity:.7;transform:none;box-shadow:none}:root{--text-color:#2c3e50;--border-color:#e0e0e0;--background-light:#fff;--background-page:#f4f7f9;--header-background:#f8f9fa;--green:#28a745;--red:#dc3545;--blue:#007bff;--grey:#6c757d;--white:#fff;--shadow:0 4px 12px rgba(0,0,0,.08)}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text-color);background-color:var(--background-page);margin:0}#app{display:flex;justify-content:center;width:100%}.container{width:99%;max-width:none;box-sizing:border-box;margin:30px 0;padding:20px 30px;background-color:var(--background-light);border-radius:8px;box-shadow:var(--shadow)}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color)}.header h1{margin:0;font-size:24px}.add-new-btn{background-color:var(--green);font-size:16px;padding:12px 20px}.actions-cell>*{margin-right:8px}.actions-cell>*:last-child{margin-right:0}h2{margin-top:2rem}.table-container{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--border-color);white-space:nowrap}th{background-color:var(--header-background);font-weight:600}td{color:#555}.empty-table-message{padding:30px;text-align:center;color:var(--grey)}button{padding:8px 12px;color:#fff;border:none;border-radius:6px;cursor:pointer;margin:0;font-size:14px;font-weight:500;transition:all .2s}button:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.1)}button.pokaż{background-color:#17a2b8}button.usun{background-color:var(--red)}button.edytuj{background-color:var(--blue)}button.zapisz{background-color:var(--green)}button.anuluj{background-color:var(--grey)}.modal-backdrop{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000}.modal-content{width:90%;max-width:1000px;max-height:90vh;overflow-y:auto;background-color:var(--background-light);border-radius:8px;box-shadow:var(--shadow)}.modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 25px;border-bottom:1px solid var(--border-color)}.modal-header h3{border-bottom:none;padding-bottom:0;margin:0}.close-button{background:0 0;border:none;font-size:28px;font-weight:300;color:var(--grey);cursor:pointer;padding:0;line-height:1}.modal-content form{padding:25px;border:none}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.form-group{display:flex;flex-direction:column}.form-group.full-width{grid-column:1/-1}.form-group label{margin-bottom:8px;font-weight:600;font-size:14px}.form-group input,.form-group textarea{padding:12px;border:1px solid var(--border-color);border-radius:6px;font-size:14px;transition:border-color .3s,box-shadow .3s}.form-group input:focus,.form-group textarea:focus{outline:0;border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,123,255,.2)}.modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)}
</style>