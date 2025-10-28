<script setup>
// ================================================================================================
// 📜 IMPORTS
// ================================================================================================
import { ref, onMounted, watch } from 'vue';
import { getAuthHeaders, getUserRole } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';
import PaginationControls from '../components/PaginationControls.vue';
import { authenticatedFetch } from '../api/api.js';
import vSelect from 'vue-select';

// ================================================================================================
// ⚙️ KONFIGURACJA I INICJALIZACJA
// ================================================================================================

/** @const {string} Bazowy URL do API. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** Rola zalogowanego użytkownika. */
const userRole = getUserRole();

// ================================================================================================
// ✨ STAN KOMPONENTU (REFS)
// ================================================================================================

// --- Stan UI ---
const isLoading = ref(true);
const isHistoryLoading = ref(false);
const showAddItemModal = ref(false);
const showEditItemModal = ref(false);
const showOperationModal = ref(false);
const showHistoryModal = ref(false);

// --- Stan danych ---
const inventoryItems = ref([]);
const itemHistory = ref([]);

// --- Stan formularzy i operacji ---
const newItemData = ref(initializeNewItem());
const editedItemData = ref(null);
const currentOperationItem = ref(null);
const operationType = ref('delivery');
const operationQuantity = ref(null);
const currentItemForHistory = ref(null);

// --- Stan listy (Paginacja, Sortowanie, Wyszukiwanie) ---
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const searchQuery = ref('');
const sortBy = ref('name');
const sortOrder = ref('asc');

// NOWE: Stan dla kategorii
const categories = ref([]); // Lista wszystkich kategorii
const selectedCategoryId = ref(null); // ID wybranej kategorii do filtrowania
const showCategoryModal = ref(false); // Widoczność modala zarządzania kategoriami
const newCategoryName = ref(''); // Nazwa nowej kategorii
const editingCategory = ref(null); // Kategoria w trakcie edycji

// ================================================================================================
// 헬 FUNKCJE POMOCNICZE
// ================================================================================================

/**
 * Tworzy i zwraca pusty obiekt nowego przedmiotu.
 * @returns {object} Obiekt z polami nowego przedmiotu.
 */
function initializeNewItem() {
  return {
    name: '',
    quantity: 0,
    unit: 'szt.',
    min_stock_level: 0,
    category_id: null, // Dodano category_id
  };
}

/**
 * Przetwarza odpowiedź API z paginacją i aktualizuje stan komponentu.
 * @param {object} result - Obiekt odpowiedzi z API zawierający `data` i `pagination`.
 */
function processPaginatedResponse(result) {
  inventoryItems.value = result.data;
  totalPages.value = result.pagination.totalPages;
  currentPage.value = result.pagination.currentPage;
  totalItems.value = result.pagination.totalItems;
}

/**
 * Formatuje nazwę typu operacji magazynowej na czytelny dla użytkownika tekst.
 * @param {string} type - Typ operacji z API.
 * @returns {string} Sformatowana nazwa.
 */
function formatOperationType(type) {
  if (type === 'delivery') return 'Przyjęcie';
  if (type === 'withdrawal') return 'Wydanie';
  if (type.includes('status_changed_to_true')) return 'Oznaczono jako zamówione';
  if (type.includes('status_changed_to_false')) return 'Anulowano zamówienie';
  return 'Korekta';
}

/**
 * Zwraca obiekt statusu (tekst i klasę CSS) dla danego przedmiotu.
 * @param {object} item - Przedmiot z magazynu.
 * @returns {{text: string, class: string}} Obiekt statusu.
 */
const getItemStatus = (item) => {
  let status = { text: '', class: '' };
  if (item.quantity <= 0) {
    status = { text: 'Brak towaru', class: 'status-out' };
  } else if (item.quantity <= item.min_stock_level && item.min_stock_level > 0) {
    status = { text: 'Niski stan', class: 'status-low' };
  } else {
    status = { text: 'W magazynie', class: 'status-ok' };
  }
  if (item.is_ordered) {
    status.text += ' (Zamówione)';
  }
  return status;
};

// ================================================================================================
// 🔄 LOGIKA API (CRUD i Operacje)
// ================================================================================================

/**
 * Pobiera listę kategorii z API.
 */
async function fetchCategories() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories`);
    if (!response.ok) throw new Error('Błąd pobierania kategorii');
    categories.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania kategorii:', error);
    // Nie alertujemy, żeby nie spamować przy każdym ładowaniu
  }
}

/**
 * Dodaje nową kategorię.
 */
async function handleAddCategory() {
  if (!newCategoryName.value.trim()) {
    alert('Nazwa kategorii nie może być pusta.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: newCategoryName.value.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd dodawania kategorii.');
    await fetchCategories(); // Odśwież listę
    newCategoryName.value = ''; // Wyczyść pole
  } catch (error) {
    console.error('Błąd podczas dodawania kategorii:', error);
    alert(error.message);
  }
}

/**
 * Aktualizuje nazwę kategorii.
 */
async function handleUpdateCategory() {
  if (!editingCategory.value || !editingCategory.value.name.trim()) {
    alert('Nazwa kategorii nie może być pusta.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories/${editingCategory.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editingCategory.value.name.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd aktualizacji kategorii.');
    await fetchCategories(); // Odśwież listę
    editingCategory.value = null; // Zakończ edycję
  } catch (error) {
    console.error('Błąd podczas aktualizacji kategorii:', error);
    alert(error.message);
  }
}

/**
 * Usuwa kategorię.
 */
async function handleDeleteCategory(categoryId) {
  if (!confirm('Czy na pewno chcesz usunąć tę kategorię? Przedmioty z tej kategorii nie zostaną usunięte, ale stracą przypisanie.')) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories/${categoryId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
       const result = await response.json();
       throw new Error(result.error || 'Nie udało się usunąć kategorii.');
    }
    await fetchCategories(); // Odśwież listę
    // Jeśli usunięto aktualnie wybraną kategorię, zresetuj filtr
    if (selectedCategoryId.value === categoryId) {
      selectedCategoryId.value = null;
    }
  } catch (error) {
    console.error('Błąd podczas usuwania kategorii:', error);
    alert(error.message);
  }
}

/**
 * Pobiera przedmioty z magazynu na podstawie aktualnych filtrów.
 */
async function fetchItems() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: 30,
      search: searchQuery.value,
      categoryId: selectedCategoryId.value || '', // Dodano categoryId
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    });
    const response = await authenticatedFetch(`${API_URL}/api/inventory?${params.toString()}`);
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

/**
 * Dodaje nowy przedmiot do magazynu.
 */
async function handleAddItem() {
  if (!newItemData.value.name || !newItemData.value.unit) {
    alert('Nazwa i jednostka miary są wymagane.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory`, {
      method: 'POST',
      body: JSON.stringify(newItemData.value),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania przedmiotu.');
    // Po dodaniu pobieramy listę od nowa, aby mieć pewność co do sortowania i paginacji
    await fetchItems();
    showAddItemModal.value = false;
  } catch (error) {
    console.error('Błąd podczas dodawania przedmiotu:', error);
    alert(error.message);
  }
}

/**
 * Aktualizuje istniejący przedmiot.
 */
async function handleUpdateItem() {
  if (!editedItemData.value) return;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${editedItemData.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(editedItemData.value),
    });
    const updatedItem = await response.json();
    if (!response.ok) throw new Error(updatedItem.error || 'Błąd podczas aktualizacji przedmiotu.');

    // Zamiast przeładowywać całą listę, podmieniamy tylko jeden element
    const index = inventoryItems.value.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
    showEditItemModal.value = false;
  } catch (error) {
    console.error('Błąd podczas aktualizacji przedmiotu:', error);
    alert(error.message);
  }
}

/**
 * Usuwa przedmiot z magazynu.
 * @param {number} itemId - ID przedmiotu do usunięcia.
 */
async function handleDeleteItem(itemId) {
  if (!confirm('Czy na pewno chcesz trwale usunąć ten przedmiot z magazynu? Usunie to również całą jego historię operacji.')) return;

  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${itemId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć przedmiotu.');
    }
    await fetchItems(); // Odśwież listę po usunięciu
  } catch (error) {
    console.error('Błąd podczas usuwania przedmiotu:', error);
    alert(error.message);
  }
}

/**
 * Przetwarza operację magazynową (przyjęcie, wydanie, zmiana statusu).
 */
async function handleProcessOperation() {
  if ((operationType.value === 'delivery' || operationType.value === 'withdrawal') && (!operationQuantity.value || operationQuantity.value <= 0)) {
    alert('Proszę podać dodatnią ilość dla tej operacji.');
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/operation`, {
      method: 'POST',
      body: JSON.stringify({
        itemId: currentOperationItem.value.id,
        operationType: operationType.value,
        quantity: operationQuantity.value || 0,
      }),
    });
    const updatedItem = await response.json();
    if (!response.ok) throw new Error(updatedItem.error || 'Błąd podczas wykonywania operacji.');

    const index = inventoryItems.value.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      inventoryItems.value[index] = updatedItem;
    }
    showOperationModal.value = false;
  } catch (error) {
    console.error('Błąd podczas operacji magazynowej:', error);
    alert(error.message);
  }
}

/**
 * Pobiera i wyświetla historię operacji dla wybranego przedmiotu.
 * @param {object} item - Przedmiot, którego historia ma być wyświetlona.
 */
async function handleShowHistory(item) {
  currentItemForHistory.value = item;
  itemHistory.value = [];
  isHistoryLoading.value = true;
  showHistoryModal.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${item.id}/history`);
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

// ================================================================================================
// ⚡ OBSŁUGA ZDARZEŃ UI
// ================================================================================================

/** Pokazuje modal dodawania nowego przedmiotu. */
function handleShowAddItemModal() {
  newItemData.value = initializeNewItem();
  showAddItemModal.value = true;
}

/** Pokazuje modal edycji przedmiotu. */
function handleShowEditModal(item) {
  editedItemData.value = { ...item };
  showEditItemModal.value = true;
}

/** Pokazuje modal operacji magazynowych. */
function handleShowOperationModal(item) {
  currentOperationItem.value = item;
  operationQuantity.value = null;
  operationType.value = 'delivery';
  showOperationModal.value = true;
}

/** Aktualizuje bieżącą stronę. */
function handlePageChange(newPage) {
  currentPage.value = newPage;
}

/** Zmienia kryterium sortowania. */
function changeSort(key) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    sortOrder.value = 'asc';
  }
}

// ================================================================================================
// 👀 WATCHERS & CYKL ŻYCIA
// ================================================================================================

watch(selectedCategoryId, () => {
    currentPage.value = 1; // Wróć na 1 stronę po zmianie kategorii
    fetchItems();
});

/** Obserwuje zmiany w paginacji i sortowaniu, by odświeżyć listę. */
watch([currentPage, sortBy, sortOrder], fetchItems);

/** Obserwuje pole wyszukiwania z opóźnieniem (debounce). */
let searchTimeout = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1; // Reset do pierwszej strony przy nowym szukaniu
    fetchItems();
  }, 300);
});

/** Pobiera dane po zamontowaniu komponentu. */
onMounted(() => {
  fetchItems();
  fetchCategories(); // Dodano pobieranie kategorii przy starcie
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Stan Magazynowy ({{ totalItems }})</h1>
      <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="handleShowAddItemModal" :disabled="isLoading">&#43; Dodaj Przedmiot</button>
    </div>

    <div class="search-container">
      <input type="text" v-model="searchQuery" placeholder="Szukaj po nazwie lub jednostce..." />
    </div>

    <div class="filter-container">
  <div class="form-group">
    <label for="categoryFilter">Filtruj wg kategorii:</label>
    <select id="categoryFilter" v-model="selectedCategoryId">
      <option :value="null">-- Wszystkie kategorie --</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.name }}
      </option>
    </select>
  </div>
  <button class="btn-secondary" @click="showCategoryModal = true">Zarządzaj Kategoriami</button>
</div>

    <div class="main-content-wrapper">
      <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
      <div class="table-and-pagination" :class="{ 'is-loading': isLoading }">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Kategoria</th>
                <th @click="changeSort('name')" class="sortable">
                  Nazwa Przedmiotu
                  <span v-if="sortBy === 'name'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('quantity')" class="sortable">
                  Ilość
                  <span v-if="sortBy === 'quantity'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="changeSort('unit')" class="sortable">
                  Jednostka
                  <span v-if="sortBy === 'unit'">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Status</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!inventoryItems.length && !isLoading">
                <td colspan="5" class="empty-table-message">
                  <p>Brak przedmiotów w magazynie.</p>
                </td>
              </tr>
              <tr v-for="item in inventoryItems" :key="item.id" :class="getItemStatus(item).class.replace('status', 'status-row')">
                <td data-label="Kategoria">{{ item.category_name || '-' }}</td>
                <td data-label="Nazwa Przedmiotu">{{ item.name }}</td>
                <td data-label="Ilość" class="quantity-cell">{{ item.quantity }}</td>
                <td data-label="Jednostka">{{ item.unit }}</td>
                <td data-label="Status">
                  <span class="status-badge" :class="getItemStatus(item).class">{{ getItemStatus(item).text }}</span>
                </td>
                <td data-label="Akcje" class="actions-cell">
                  <button v-if="userRole !== 'viewer'" class="btn-secondary" @click="handleShowOperationModal(item)">Operacje</button>
                  <button v-if="userRole !== 'viewer'" class="pokaż" @click="handleShowHistory(item)">Historia</button>
                  <button v-if="userRole !== 'viewer'" class="edytuj" @click="handleShowEditModal(item)">Edytuj</button>
                  <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteItem(item.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
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
          <div class="form-group">
            <label for="itemName">Nazwa przedmiotu</label>
            <input type="text" id="itemName" v-model="newItemData.name" required />
          </div>
          <div class="form-group">
            <label for="itemUnit">Jednostka miary</label>
            <input type="text" id="itemUnit" v-model="newItemData.unit" placeholder="np. szt., m, kg" required />
          </div>
          <div class="form-group">
            <label for="itemQuantity">Ilość początkowa</label>
            <input type="number" step="any" id="itemQuantity" v-model.number="newItemData.quantity" required />
          </div>
          <div class="form-group">
            <label for="itemMinStock">Minimalny stan magazynowy (próg alertu)</label>
            <input type="number" step="any" id="itemMinStock" v-model.number="newItemData.min_stock_level" required />
          </div>
          <div class="form-group">
  <label for="itemCategory">Kategoria (opcjonalnie)</label>
  <select id="itemCategory" v-model="newItemData.category_id">
    <option :value="null">-- Brak kategorii --</option>
    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
      {{ cat.name }}
    </option>
  </select>
</div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Dodaj przedmiot</button>
          <button type="button" class="anuluj" @click="showAddItemModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditItemModal" class="modal-backdrop">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edytuj przedmiot</h3>
        <button class="close-button" @click="showEditItemModal = false">&times;</button>
      </div>
      <form v-if="editedItemData" @submit.prevent="handleUpdateItem">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="editItemName">Nazwa przedmiotu</label>
            <input type="text" id="editItemName" v-model="editedItemData.name" required />
          </div>
          <div class="form-group">
            <label for="editItemUnit">Jednostka miary</label>
            <input type="text" id="editItemUnit" v-model="editedItemData.unit" required />
          </div>
          <div class="form-group">
            <label for="editItemQuantity">Ilość</label>
            <input type="number" step="any" id="editItemQuantity" v-model.number="editedItemData.quantity" required />
          </div>
          <div class="form-group">
            <label for="editItemMinStock">Minimalny stan magazynowy</label>
            <input type="number" step="any" id="editItemMinStock" v-model.number="editedItemData.min_stock_level" required />
          </div>
          <div class="form-group">
  <label for="editItemCategory">Kategoria (opcjonalnie)</label>
  <select id="editItemCategory" v-model="editedItemData.category_id">
    <option :value="null">-- Brak kategorii --</option>
    <option v-for="cat in categories" :key="cat.id" :value="cat.id">
      {{ cat.name }}
    </option>
  </select>
</div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Zapisz zmiany</button>
          <button type="button" class="anuluj" @click="showEditItemModal = false">Anuluj</button>
        </div>
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
            Aktualna ilość:
            <strong>{{ currentOperationItem.quantity }} {{ currentOperationItem.unit }}</strong>
          </p>
          <div class="form-group operation-type-group">
            <label>Typ operacji:</label>
            <div><input type="radio" id="op_delivery" value="delivery" v-model="operationType" /><label for="op_delivery">Przyjęcie (Dostawa)</label></div>
            <div><input type="radio" id="op_withdrawal" value="withdrawal" v-model="operationType" /><label for="op_withdrawal">Wydanie</label></div>
            <div>
              <input type="radio" id="op_toggle_ordered" value="toggle_ordered" v-model="operationType" /><label for="op_toggle_ordered"
                >Zmień status 'Zamówione' (aktualnie: {{ currentOperationItem.is_ordered ? 'Tak' : 'Nie' }})</label
              >
            </div>
          </div>
          <div v-if="operationType === 'delivery' || operationType === 'withdrawal'" class="form-group">
            <label for="opQuantity">Ilość:</label>
            <input type="number" step="any" id="opQuantity" v-model.number="operationQuantity" min="0.01" />
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="zapisz">Wykonaj operację</button>
          <button type="button" class="anuluj" @click="showOperationModal = false">Anuluj</button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showHistoryModal" class="modal-backdrop">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h3>Historia dla: {{ currentItemForHistory.name }}</h3>
        <button class="close-button" @click="showHistoryModal = false">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="isHistoryLoading" class="modal-loading-spinner"><div class="spinner"></div></div>
        <div v-else-if="!itemHistory.length">Brak historii operacji dla tego przedmiotu.</div>
        <div v-else class="history-list">
          <div v-for="(entry, index) in itemHistory" :key="index" class="history-entry">
            <div class="history-details">
              <strong>{{ formatOperationType(entry.operation_type) }}</strong>
              <span>przez: {{ entry.username || 'Brak danych' }}</span>
              <span>dnia: {{ formatDate(entry.operation_date, true) }}</span>
            </div>
            <div v-if="entry.change_quantity !== 0" class="history-quantity" :class="entry.change_quantity > 0 ? 'delivery' : 'withdrawal'">
              {{ entry.change_quantity > 0 ? '+' : '' }}{{ entry.change_quantity }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showCategoryModal" class="modal-backdrop">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Zarządzaj Kategoriami Magazynu</h3>
      <button class="close-button" @click="showCategoryModal = false">&times;</button>
    </div>
    <div class="modal-body">
      <div class="category-manager">
        <form @submit.prevent="handleAddCategory" class="add-category-form">
          <input type="text" v-model="newCategoryName" placeholder="Nazwa nowej kategorii..." required>
          <button type="submit" class="zapisz">Dodaj</button>
        </form>

        <ul class="category-list">
          <li v-for="cat in categories" :key="cat.id">
            <template v-if="editingCategory && editingCategory.id === cat.id">
              <input type="text" v-model="editingCategory.name" required>
              <button class="zapisz" @click="handleUpdateCategory">Zapisz</button>
              <button class="anuluj" @click="editingCategory = null">Anuluj</button>
            </template>
            <template v-else>
              <span>{{ cat.name }}</span>
              <div class="category-actions">
                <button class="edytuj" @click="editingCategory = { ...cat }">Edytuj</button>
                <button class="usun" @click="handleDeleteCategory(cat.id)">Usuń</button>
              </div>
            </template>
          </li>
          <li v-if="!categories.length">Brak zdefiniowanych kategorii.</li>
        </ul>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
/* Status rows */
.status-row-low td {
  background-color: #fffbe6 !important;
}
.status-row-out td {
  background-color: #fff2f2 !important;
  color: #a30000;
  font-weight: bold;
}

/* Status badge in table */
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

/* History modal styles */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
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
.history-quantity.withdrawal {
  color: var(--red);
}

/* General modal and form styles */
.modal-lg {
  max-width: 800px;
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
.operation-type-group div {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}
.operation-type-group input[type='radio'] {
  margin-right: 10px;
}
/* Style dla filtrowania i zarządzania kategoriami */
.filter-container {
  display: flex;
  gap: 15px;
  align-items: flex-end; /* Wyrównuje label i przycisk do dołu */
  margin-bottom: 1.5rem;
  padding: 15px;
  background-color: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.filter-container .form-group {
  margin-bottom: 0; /* Usuwamy domyślny margines z form-group */
  flex-grow: 1; /* Pozwala selectowi zająć dostępną przestrzeń */
}

.filter-container label {
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 14px;
}

.filter-container select {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  font-size: 14px;
}

.category-manager {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.add-category-form {
  display: flex;
  gap: 10px;
}

.add-category-form input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
}

.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 40vh;
  overflow-y: auto;
}

.category-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}
.category-list li:last-child {
  border-bottom: none;
}

.category-list input {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  flex-grow: 1;
  margin-right: 10px;
}

.category-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0; /* Zapobiega kurczeniu się przycisków */
}

/* Dostosowanie marginesów dla przycisków wewnątrz listy kategorii */
.category-list button {
  margin: 0;
}
</style>
