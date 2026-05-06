<script setup>
import { ref, onMounted } from 'vue';
import { authenticatedFetch } from '../api/api.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const isLoading = ref(true);
const employees = ref([]);
const showAddModal = ref(false);
const showEditModal = ref(false);
const newEmployeeData = ref(initializeNewEmployee());
const editedEmployeeData = ref(null);

function initializeNewEmployee() {
  return {
    name: '',
    hourly_rate: 0,
    meter_rate: 0, // Nowe pole
    is_active: true,
    notes: '',
  };
}

async function fetchEmployees() {
  isLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania');
    employees.value = result;
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

async function handleAddEmployee() {
  if (!newEmployeeData.value.name) {
    alert('Imię jest wymagane.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees`, {
      method: 'POST',
      body: JSON.stringify(newEmployeeData.value),
    });
    if (!response.ok) throw new Error('Błąd dodawania');
    await fetchEmployees();
    showAddModal.value = false;
  } catch (error) {
    alert(error.message);
  }
}

async function handleUpdateEmployee() {
  if (!editedEmployeeData.value) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees/${editedEmployeeData.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(editedEmployeeData.value),
    });
    if (!response.ok) throw new Error('Błąd edycji');
    const result = await response.json();
    const index = employees.value.findIndex((e) => e.id === result.id);
    if (index !== -1) employees.value[index] = result;
    showEditModal.value = false;
  } catch (error) {
    alert(error.message);
  }
}

async function handleDeleteEmployee(employeeId) {
  if (!confirm('Usunąć pracownika i wszystkie jego rozliczenia?')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/employees/${employeeId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Błąd usuwania');
    await fetchEmployees();
  } catch (error) {
    alert(error.message);
  }
}

function handleShowAddModal() {
  newEmployeeData.value = initializeNewEmployee();
  showAddModal.value = true;
}

function handleShowEditModal(employee) {
  editedEmployeeData.value = { ...employee };
  showEditModal.value = true;
}

onMounted(fetchEmployees);
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
                <th>Stawka /h</th>
                <th>Stawka /m</th>
                <th>Status</th>
                <th>Notatki</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!employees.length && !isLoading">
                <td colspan="6" class="empty-table-message"><p>Brak pracowników.</p></td>
              </tr>
              <tr v-for="employee in employees" :key="employee.id">
                <td data-label="Imię">{{ employee.name }}</td>
                <td data-label="Stawka /h">{{ employee.hourly_rate?.toFixed(2) || '0.00' }} zł</td>
                <td data-label="Stawka /m">{{ employee.meter_rate?.toFixed(2) || '0.00' }} zł</td>
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
        <h3>Dodaj pracownika</h3>
        <button aria-label="Zamknij" class="close-button" @click="showAddModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddEmployee">
        <div class="form-grid-single-col">
          <div class="form-group"><label>Imię i Nazwisko</label><input type="text" v-model="newEmployeeData.name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Stawka (zł/h)</label><input type="number" step="0.01" v-model.number="newEmployeeData.hourly_rate" /></div>
            <div class="form-group"><label>Stawka (zł/m)</label><input type="number" step="0.01" v-model.number="newEmployeeData.meter_rate" /></div>
          </div>
          <div class="form-group"><label>Notatki</label><textarea v-model="newEmployeeData.notes" rows="3"></textarea></div>
          <div class="form-group checkbox-item"><input type="checkbox" id="empActiveAdd" v-model="newEmployeeData.is_active" /><label for="empActiveAdd">Aktywny</label></div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj</button>
          <button type="button" class="anuluj" @click="showAddModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj pracownika</h3>
        <button aria-label="Zamknij" class="close-button" @click="showEditModal = false">&times;</button>
      </div>
      <form v-if="editedEmployeeData" @submit.prevent="handleUpdateEmployee">
        <div class="form-grid-single-col">
          <div class="form-group"><label>Imię i Nazwisko</label><input type="text" v-model="editedEmployeeData.name" required /></div>
          <div class="form-row">
            <div class="form-group"><label>Stawka (zł/h)</label><input type="number" step="0.01" v-model.number="editedEmployeeData.hourly_rate" /></div>
            <div class="form-group"><label>Stawka (zł/m)</label><input type="number" step="0.01" v-model.number="editedEmployeeData.meter_rate" /></div>
          </div>
          <div class="form-group"><label>Notatki</label><textarea v-model="editedEmployeeData.notes" rows="3"></textarea></div>
          <div class="form-group checkbox-item"><input type="checkbox" id="editEmpActive" v-model="editedEmployeeData.is_active" /><label for="editEmpActive">Aktywny</label></div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz</button>
          <button type="button" class="anuluj" @click="showEditModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 12px;
  color: white;
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
  gap: 15px;
}
.form-row {
  display: flex;
  gap: 15px;
}
.form-row .form-group {
  flex: 1;
}
.checkbox-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.checkbox-item input {
  width: auto;
  margin: 0;
}
.col-informacje {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
