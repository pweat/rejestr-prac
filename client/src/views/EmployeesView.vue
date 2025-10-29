<script setup>
import { ref, onMounted } from 'vue';
import { authenticatedFetch } from '../api/api.js';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================
const isLoading = ref(true);
const employees = ref([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const newEmployeeData = ref(initializeNewEmployee());
const editedEmployeeData = ref(null);

// ================================================================================================
// 헬 FUNKCJE POMOCNICZE
// ================================================================================================
function initializeNewEmployee() {
  return {
    name: '',
    hourly_rate: 0,
    is_active: true,
    notes: '',
  };
}

// ================================================================================================
// 🔄 LOGIKA API (CRUD)
// ================================================================================================
async function fetchEmployees() {
  isLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees`); // Na razie pobieramy wszystkich
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania listy pracowników');
    employees.value = result;
  } catch (error) {
    console.error('Błąd podczas pobierania pracowników:', error);
    alert(`Nie udało się pobrać listy pracowników: ${error.message}`);
  } finally {
    isLoading.value = false;
  }
}

async function handleAddEmployee() {
  if (!newEmployeeData.value.name) {
    alert('Imię i nazwisko pracownika jest wymagane.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees`, {
      method: 'POST',
      body: JSON.stringify(newEmployeeData.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania pracownika.');
    await fetchEmployees(); // Odśwież listę
    showAddModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania pracownika:', error);
    alert(error.message);
  }
}

async function handleUpdateEmployee() {
  if (!editedEmployeeData.value) return;
  try {
    const employee = editedEmployeeData.value;
    const response = await authenticatedFetch(`${API_URL}/api/employees/${employee.id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji pracownika.');

    // Podmień element na liście
    const index = employees.value.findIndex((e) => e.id === result.id);
    if (index !== -1) {
      employees.value[index] = result;
    }
    showEditModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji pracownika:', error);
    alert(error.message);
  }
}

async function handleDeleteEmployee(employeeId) {
  if (!confirm('Czy na pewno chcesz usunąć tego pracownika? Usunięcie go skasuje również WSZYSTKIE jego rozliczenia.')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees/${employeeId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć pracownika.');
    }
    await fetchEmployees(); // Odśwież listę
  } catch (error) {
    console.error('Błąd podczas usuwania pracownika:', error);
    alert(error.message);
  }
}

// ================================================================================================
// ⚡ OBSŁUGA ZDARZEŃ UI
// ================================================================================================
function handleShowAddModal() {
  newEmployeeData.value = initializeNewEmployee();
  showAddModal.value = true;
}

function handleShowEditModal(employee) {
  editedEmployeeData.value = { ...employee }; // Kopia obiektu
  showEditModal.value = true;
}

// ================================================================================================
// 🚀 CYKL ŻYCIA KOMPONENTU
// ================================================================================================
onMounted(() => {
  fetchEmployees();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Pracownicy ({{ employees.length }})</h1>
      <button class="add-new-btn" @click="handleShowAddModal" :disabled="isLoading">&#43; Dodaj Pracownika</button>
    </div>

    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Imię i Nazwisko</th>
                <th>Stawka /h (zł)</th>
                <th>Status</th>
                <th>Notatki</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!employees.length && !isLoading">
                <td colspan="5" class="empty-table-message">
                  <p>Brak pracowników w bazie.</p>
                </td>
              </tr>
              <tr v-for="employee in employees" :key="employee.id">
                <td data-label="Imię i Nazwisko">{{ employee.name }}</td>
                <td data-label="Stawka /h">{{ employee.hourly_rate?.toFixed(2) || '0.00' }}</td>
                <td data-label="Status">
                  <span class="status-badge" :class="employee.is_active ? 'status-ok' : 'status-inactive'">
                    {{ employee.is_active ? 'Aktywny' : 'Nieaktywny' }}
                  </span>
                </td>
                <td data-label="Notatki" class="col-informacje">{{ employee.notes || '-' }}</td>
                <td data-label="Akcje" class="actions-cell">
                  <button class="edytuj" @click="handleShowEditModal(employee)">Edytuj</button>
                  <button class="usun" @click="handleDeleteEmployee(employee.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowego pracownika</h3>
        <button class="close-button" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddEmployee">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="empName">Imię i Nazwisko</label>
            <input type="text" id="empName" v-model="newEmployeeData.name" required />
          </div>
          <div class="form-group">
            <label for="empRate">Stawka godzinowa (zł)</label>
            <input type="number" step="0.01" id="empRate" v-model.number="newEmployeeData.hourly_rate" />
          </div>
          <div class="form-group">
            <label for="empNotes">Notatki</label>
            <textarea id="empNotes" v-model="newEmployeeData.notes" rows="3"></textarea>
          </div>
          <div class="form-group checkbox-item">
            <input type="checkbox" id="empActiveAdd" v-model="newEmployeeData.is_active" />
            <label for="empActiveAdd">Pracownik aktywny</label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj Pracownika</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj dane pracownika</h3>
        <button class="close-button" @click="showEditModal = false">&times;</button>
      </div>
      <form v-if="editedEmployeeData" @submit.prevent="handleUpdateEmployee">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="editEmpName">Imię i Nazwisko</label>
            <input type="text" id="editEmpName" v-model="editedEmployeeData.name" required />
          </div>
          <div class="form-group">
            <label for="editEmpRate">Stawka godzinowa (zł)</label>
            <input type="number" step="0.01" id="editEmpRate" v-model.number="editedEmployeeData.hourly_rate" />
          </div>
          <div class="form-group">
            <label for="editEmpNotes">Notatki</label>
            <textarea id="editEmpNotes" v-model="editedEmployeeData.notes" rows="3"></textarea>
          </div>
          <div class="form-group checkbox-item">
            <input type="checkbox" id="editEmpActive" v-model="editedEmployeeData.is_active" />
            <label for="editEmpActive">Pracownik aktywny</label>
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
/* Style specyficzne dla tego widoku */
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 12px;
  color: white;
  white-space: nowrap;
}
.status-ok {
  background-color: var(--green);
}
.status-inactive {
  background-color: var(--grey);
}

.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.col-informacje {
  /* Używamy tej samej klasy co w ClientsView */
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dostosowanie stylów mobilnych dla tej tabeli */
@media screen and (max-width: 768px) {
  .table-container table td[data-label='Akcje'] {
    /* Na mobilnych przyciski mogą być węższe */
    white-space: normal;
  }
}
</style>
