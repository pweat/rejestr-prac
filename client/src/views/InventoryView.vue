<script setup>
import { ref, onMounted, watch } from 'vue';
import { getAuthHeaders } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import PaginationControls from '../components/PaginationControls.vue';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const isLoading = ref(true);
const inventoryItems = ref([]);
const showAddItemModal = ref(false);
const showEditItemModal = ref(false);
const edytowanyPrzedmiot = ref(null);
const showOperationModal = ref(false);
const currentOperationItem = ref(null);
const operationType = ref('delivery');
const operationQuantity = ref(null);
const showHistoryModal = ref(false);
const itemHistory = ref([]);
const currentItemForHistory = ref(null);
const isHistoryLoading = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);

const inicjalizujNowyPrzedmiot = () => ({
  name: '',
  quantity: 0,
  unit: 'szt.',
  min_stock_level: 0,
});

const nowyPrzedmiot = ref(inicjalizujNowyPrzedmiot());

function formatOperationType(type) {
  if (type === 'delivery') return 'Przyjęcie';
  if (type === 'withdrawal') return 'Wydanie';
  if (type.includes('status_changed_to_true')) return 'Zamówiono';
  if (type.includes('status_changed_to_false')) return 'Zamówienie dostarczone';
  return 'Korekta';
}

const processPaginatedResponse = (result) => {
  inventoryItems.value = result.data;
  totalPages.value = result.pagination.totalPages;
  currentPage.value = result.pagination.currentPage;
};

async function pobierzPrzedmioty() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({ page: currentPage.value, limit: 15 });
    const response = await fetch(`${API_URL}/api/inventory?${params.toString()}`, { headers: getAuthHeaders() });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania danych z magazynu');
    processPaginatedResponse(result);
  } catch (error) {
    console.error('Błąd podczas pobierania przedmiotów z magazynu:', error);
    alert('Nie udało się pobrać danych z magazynu: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

function handleShowAddItemModal() {
  nowyPrzedmiot.value = inicjalizujNowyPrzedmiot();
  showAddItemModal.value = true;
}

async function handleAddItem() {
  if (!nowyPrzedmiot.value.name || !nowyPrzedmiot.value.unit) {
    alert('Nazwa i jednostka miary są wymagane.');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/inventory?page=${currentPage.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(nowyPrzedmiot.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania przedmiotu.');
    processPaginatedResponse(result);
    showAddItemModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania przedmiotu:', error);
    alert(error.message);
  }
}

function handleShowEditModal(item) {
  edytowanyPrzedmiot.value = { ...item };
  showEditItemModal.value = true;
}

async function handleUpdateItem() {
  if (!edytowanyPrzedmiot.value) return;
  try {
    const response = await fetch(`${API_URL}/api/inventory/${edytowanyPrzedmiot.value.id}?page=${currentPage.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(edytowanyPrzedmiot.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji przedmiotu.');
    processPaginatedResponse(result);
    showEditItemModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji przedmiotu:', error);
    alert(error.message);
  }
}

async function handleDeleteItem(itemId) {
  if (!confirm('Czy na pewno chcesz trwale usunąć ten przedmiot z magazynu? Usunie to również całą jego historię operacji.')) return;
  try {
    const response = await fetch(`${API_URL}/api/inventory/${itemId}?page=${currentPage.value}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok && response.status !== 200) {
      throw new Error(result.error || 'Nie udało się usunąć przedmiotu.');
    }
    processPaginatedResponse(result);
  } catch (error) {
    console.error('Błąd podczas usuwania przedmiotu:', error);
    alert(error.message);
  }
}

function handleShowOperationModal(item) {
  currentOperationItem.value = item;
  operationQuantity.value = null;
  operationType.value = 'delivery';
  showOperationModal.value = true;
}

async function handleProcessOperation() {
  if ((operationType.value === 'delivery' || operationType.value === 'withdrawal') && (!operationQuantity.value || operationQuantity.value <= 0)) {
    alert('Proszę podać dodatnią ilość dla tej operacji.');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/api/inventory/operation?page=${currentPage.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        itemId: currentOperationItem.value.id,
        operationType: operationType.value,
        quantity: operationQuantity.value || 0,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas wykonywania operacji.');
    processPaginatedResponse(result);
    showOperationModal.value = false;
  } catch (error) {
    console.error('Błąd podczas operacji magazynowej:', error);
    alert(error.message);
  }
}

async function handleShowHistory(item) {
  currentItemForHistory.value = item;
  itemHistory.value = [];
  isHistoryLoading.value = true;
  showHistoryModal.value = true;
  try {
    const response = await fetch(`${API_URL}/api/inventory/${item.id}/history`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Błąd pobierania historii operacji');
    itemHistory.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania historii:', error);
    alert('Nie udało się pobrać historii operacji.');
    showHistoryModal.value = false;
  } finally {
    isHistoryLoading.value = false;
  }
}

const getItemStatus = (item) => {
  let status = { text: '', class: '' };
  if (item.quantity <= 0) {
    status = { text: 'Brak towaru', class: 'status-out' };
  } else if (item.quantity < item.min_stock_level) {
    status = { text: 'Niski stan', class: 'status-low' };
  } else {
    status = { text: 'W magazynie', class: 'status-ok' };
  }
  if (item.is_ordered) {
    status.text += ' (Zamówione)';
  }
  return status;
};

function handlePageChange(newPage) {
  currentPage.value = newPage;
}
watch(currentPage, pobierzPrzedmioty);

onMounted(() => {
  pobierzPrzedmioty();
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Stan Magazynowy</h1>
      <button class="add-new-btn" @click="handleShowAddItemModal" :disabled="isLoading">&#43; Dodaj Przedmiot</button>
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
                <th>Nazwa Przedmiotu</th>
                <th>Ilość</th>
                <th>Jednostka</th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in inventoryItems" :key="item.id" :class="{ 'low-stock-row': getItemStatus(item).class === 'status-low', 'out-of-stock-row': getItemStatus(item).class === 'status-out' }">
                <td data-label="Nazwa Przedmiotu">{{ item.name }}</td>
                <td data-label="Ilość" class="quantity-cell">{{ item.quantity }}</td>
                <td data-label="Jednostka">{{ item.unit }}</td>
                <td data-label="Status">
                  <span class="status-badge" :class="getItemStatus(item).class">
                    {{ getItemStatus(item).text }}
                  </span>
                </td>
                <td data-label="Akcje" class="actions-cell">
                  <button class="btn-secondary" @click="handleShowOperationModal(item)">Operacje</button>
                  <button class="pokaż" @click="handleShowHistory(item)">Historia</button>
                  <button class="edytuj" @click="handleShowEditModal(item)">Edytuj</button>
                  <button class="usun" @click="handleDeleteItem(item.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!inventoryItems.length && !isLoading" class="empty-table-message">
            <p>Brak przedmiotów w magazynie. Dodaj pierwszy, aby rozpocząć.</p>
          </div>
        </div>

        <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
      </div>
    </div>
  </div>

  <div v-if="showAddItemModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Dodaj nowy przedmiot do magazynu</h3>
        <button class="close-button" @click="showAddItemModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleAddItem">
        <div class="form-grid-single-col">
          <div class="form-group"><label for="itemName">Nazwa przedmiotu</label><input type="text" id="itemName" v-model="nowyPrzedmiot.name" required /></div>
          <div class="form-group"><label for="itemUnit">Jednostka miary</label><input type="text" id="itemUnit" v-model="nowyPrzedmiot.unit" placeholder="np. szt., m, kg" required /></div>
          <div class="form-group"><label for="itemQuantity">Ilość początkowa</label><input type="number" step="any" id="itemQuantity" v-model.number="nowyPrzedmiot.quantity" required /></div>
          <div class="form-group"><label for="itemMinStock">Minimalny stan magazynowy (próg alertu)</label><input type="number" step="any" id="itemMinStock" v-model.number="nowyPrzedmiot.min_stock_level" required /></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz">Dodaj przedmiot</button><button type="button" class="anuluj" @click="showAddItemModal = false">Anuluj</button></div>
      </form>
    </div>
  </div>

  <div v-if="showEditItemModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj przedmiot</h3>
        <button class="close-button" @click="showEditItemModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleUpdateItem">
        <div class="form-grid-single-col">
          <div class="form-group"><label for="editItemName">Nazwa przedmiotu</label><input type="text" id="editItemName" v-model="edytowanyPrzedmiot.name" required /></div>
          <div class="form-group"><label for="editItemUnit">Jednostka miary</label><input type="text" id="editItemUnit" v-model="edytowanyPrzedmiot.unit" required /></div>
          <div class="form-group"><label for="editItemQuantity">Ilość</label><input type="number" step="any" id="editItemQuantity" v-model.number="edytowanyPrzedmiot.quantity" required /></div>
          <div class="form-group"><label for="editItemMinStock">Minimalny stan magazynowy</label><input type="number" step="any" id="editItemMinStock" v-model.number="edytowanyPrzedmiot.min_stock_level" required /></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz">Zapisz zmiany</button><button type="button" class="anuluj" @click="showEditItemModal = false">Anuluj</button></div>
      </form>
    </div>
  </div>

  <div v-if="showOperationModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Operacja na: {{ currentOperationItem.name }}</h3>
        <button class="close-button" @click="showOperationModal = false">&times;</button>
      </div>
      <form @submit.prevent="handleProcessOperation">
        <div class="form-grid-single-col">
          <p>
            Aktualna ilość: <strong>{{ currentOperationItem.quantity }} {{ currentOperationItem.unit }}</strong>
          </p>
          <div class="form-group operation-type-group">
            <label>Typ operacji:</label>
            <div><input type="radio" id="op_delivery" value="delivery" v-model="operationType" /><label for="op_delivery">Przyjęcie (Dostawa)</label></div>
            <div><input type="radio" id="op_withdrawal" value="withdrawal" v-model="operationType" /><label for="op_withdrawal">Wydanie</label></div>
            <div>
              <input type="radio" id="op_toggle_ordered" value="toggle_ordered" v-model="operationType" /><label for="op_toggle_ordered">Zmień status 'Zamówione' (aktualnie: {{ currentOperationItem.is_ordered ? 'Tak' : 'Nie' }})</label>
            </div>
          </div>
          <div v-if="operationType === 'delivery' || operationType === 'withdrawal'" class="form-group"><label for="opQuantity">Ilość:</label><input type="number" step="any" id="opQuantity" v-model.number="operationQuantity" min="0.01" /></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz">Wykonaj operację</button><button type="button" class="anuluj" @click="showOperationModal = false">Anuluj</button></div>
      </form>
    </div>
  </div>

  <div v-if="showHistoryModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Historia dla: {{ currentItemForHistory.name }}</h3>
        <button class="close-button" @click="showHistoryModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isHistoryLoading" class="modal-loading-spinner"><div class="spinner"></div></div>
        <div v-else-if="!itemHistory.length">Brak historii operacji dla tego przedmiotu.</div>
        <div v-else class="history-list">
          <div v-for="(entry, index) in itemHistory" :key="index" class="history-entry" :class="entry.operation_type.includes('delivery') ? 'delivery' : 'withdrawal'">
            <div class="history-details">
              <strong>{{ formatOperationType(entry.operation_type) }}</strong
              ><span>przez: {{ entry.username || 'Brak danych' }}</span
              ><span>dnia: {{ new Date(entry.operation_date).toLocaleString('pl-PL') }}</span>
            </div>
            <div v-if="entry.change_quantity !== 0" class="history-quantity" :class="entry.change_quantity > 0 ? 'delivery' : 'withdrawal'">{{ entry.change_quantity > 0 ? '+' : '' }}{{ entry.change_quantity }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.low-stock-row td {
  background-color: #fffbe6 !important;
}
.out-of-stock-row td {
  background-color: #fff2f2 !important;
  color: #a30000;
  font-weight: bold;
}
.quantity-cell {
  font-weight: 600;
  font-size: 1.1em;
}
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.btn-secondary {
  background-color: var(--grey);
}
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
.status-low {
  background-color: #ffc107;
  color: #333;
}
.status-out {
  background-color: var(--red);
}
.operation-type-group div {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.operation-type-group input[type='radio'] {
  margin-right: 10px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}
.history-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 14px;
  color: var(--grey);
}
.history-details strong {
  font-size: 16px;
  color: var(--text-color);
}
.history-quantity {
  font-size: 20px;
  font-weight: bold;
}
.history-quantity.delivery {
  color: var(--green);
}
.history-quantity.withdrawal,
.history-entry.withdrawal {
  color: var(--red);
}
.modal-body {
  padding: 10px 25px 25px;
}
.modal-loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}
.main-content-wrapper {
  position: relative;
}
.table-and-pagination.is-loading {
  opacity: 0.4;
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
  align-items: center;
  z-index: 10;
  padding-top: 50px;
}
</style>
