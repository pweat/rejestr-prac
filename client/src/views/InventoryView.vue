<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getUserRole } from '../auth/auth.js';
import { useInventoryStore } from '../stores/inventoryStore.js';
import { useToast } from '../composables/useToast.js';

import QuickOperationBar from '../components/inventory/QuickOperationBar.vue';
import InventoryTable from '../components/inventory/InventoryTable.vue';
import InventoryCard from '../components/inventory/InventoryCard.vue';
import AddItemModal from '../components/inventory/AddItemModal.vue';
import HistoryPanel from '../components/inventory/HistoryPanel.vue';
import CategoryManager from '../components/inventory/CategoryManager.vue';

const route = useRoute();
const store = useInventoryStore();
const toast = useToast();
const userRole = getUserRole();

// Wykrywanie szerokości ekranu do przełączania między tabelą a kartami
const isMobile = ref(window.innerWidth <= 850);
function onResize() { isMobile.value = window.innerWidth <= 850; }

// Stan modali
const showAddModal = ref(false);
const editingItem = ref(null);
const historyItem = ref(null);
const showCategoryManager = ref(false);

// ── Obsługa akcji ──────────────────────────────────────────────────────────

function handleEdit(item) {
  editingItem.value = item;
}

async function handleDelete(itemId) {
  if (!confirm('Trwale usunąć ten przedmiot wraz z całą historią operacji?')) return;
  try {
    await store.deleteItem(itemId);
  } catch (error) {
    toast.error(error.message);
  }
}

// ── Wyszukiwanie z debounce ────────────────────────────────────────────────
let searchTimeout = null;
watch(() => store.searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    store.currentPage = 1;
    store.fetchItems();
  }, 300);
});

// ── Filtrowanie ────────────────────────────────────────────────────────────
watch([
  () => store.selectedCategoryId,
  () => store.filterLowStock,
  () => store.filterAlertOnly,
  () => store.filterHideOrdered,
], () => {
  store.currentPage = 1;
  store.fetchItems();
});

// ── Inicjalizacja ─────────────────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('resize', onResize);

  // Inicjuj filtry z query params (link z dashboardu)
  if (route.query.lowStockOnly === 'true') store.filterLowStock = true;
  if (route.query.alertOnly === 'true') store.filterAlertOnly = true;
  if (route.query.hideOrdered === 'true') store.filterHideOrdered = true;

  store.fetchItems();
  store.fetchCategories();
  store.fetchAllItems();
});

import { onUnmounted } from 'vue';
onUnmounted(() => window.removeEventListener('resize', onResize));

const activeFiltersCount = computed(() => {
  let n = 0;
  if (store.filterLowStock) n++;
  if (store.filterAlertOnly) n++;
  if (store.filterHideOrdered) n++;
  if (store.selectedCategoryId) n++;
  return n;
});
</script>

<template>
  <div class="container">
    <!-- Nagłówek -->
    <div class="header">
      <h1>Magazyn <span class="item-count">({{ store.totalItems }})</span></h1>
      <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="showAddModal = true">
        + Dodaj przedmiot
      </button>
    </div>

    <!-- Pasek szybkich operacji -->
    <QuickOperationBar v-if="userRole !== 'viewer'" />

    <!-- Filtrowanie i wyszukiwanie -->
    <div class="controls-bar">
      <div class="search-wrapper">
        <input
          v-model="store.searchQuery"
          type="search"
          placeholder="Szukaj po nazwie..."
          class="search-input"
        />
      </div>

      <div class="filters-row">
        <!-- Kategoria -->
        <select v-model="store.selectedCategoryId" class="filter-select">
          <option :value="null">Wszystkie kategorie</option>
          <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>

        <!-- Filtry checkboxowe -->
        <label class="filter-chip" :class="{ active: store.filterLowStock }">
          <input type="checkbox" v-model="store.filterLowStock" />
          Niski stan
        </label>
        <label class="filter-chip" :class="{ active: store.filterAlertOnly }">
          <input type="checkbox" v-model="store.filterAlertOnly" />
          Alert na pulpicie
        </label>
        <label class="filter-chip" :class="{ active: store.filterHideOrdered }">
          <input type="checkbox" v-model="store.filterHideOrdered" />
          Ukryj zamówione
        </label>

        <!-- Reset filtrów -->
        <button
          v-if="activeFiltersCount > 0"
          class="btn-reset-filters"
          @click="store.resetFilters"
          :title="`Wyczyść ${activeFiltersCount} aktywne filtry`"
        >
          × Resetuj ({{ activeFiltersCount }})
        </button>

        <!-- Zarządzaj kategoriami -->
        <button class="btn-secondary manage-cat-btn" @click="showCategoryManager = true">
          Kategorie
        </button>
      </div>
    </div>

    <!-- Lista przedmiotów — tabela na desktop, karty na mobile -->
    <InventoryTable
      v-if="!isMobile"
      :user-role="userRole"
      @edit="handleEdit"
      @history="historyItem = $event"
      @delete="handleDelete"
    />
    <InventoryCard
      v-else
      :user-role="userRole"
      @edit="handleEdit"
      @history="historyItem = $event"
      @delete="handleDelete"
    />
  </div>

  <!-- Modal dodawania/edycji -->
  <AddItemModal
    v-if="showAddModal || editingItem"
    :item="editingItem"
    @close="showAddModal = false; editingItem = null"
  />

  <!-- Panel historii -->
  <HistoryPanel
    v-if="historyItem"
    :item="historyItem"
    @close="historyItem = null"
  />

  <!-- Zarządzanie kategoriami -->
  <CategoryManager
    v-if="showCategoryManager"
    @close="showCategoryManager = false"
  />
</template>

<style scoped>
.item-count {
  font-size: 18px;
  font-weight: 400;
  color: var(--grey);
}

/* Controls bar */
.controls-bar {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-wrapper {
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  min-width: 160px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  transition: all 0.15s;
  user-select: none;
}
.filter-chip input {
  margin: 0;
  cursor: pointer;
}
.filter-chip:hover {
  background: #f0f4ff;
  border-color: #aac4ee;
}
.filter-chip.active {
  background: #e8f0fe;
  border-color: var(--blue);
  color: var(--blue);
  font-weight: 600;
}

.btn-reset-filters {
  padding: 7px 12px;
  background: #fff3f3;
  border: 1px solid #f5c6cb;
  border-radius: 20px;
  font-size: 13px;
  color: var(--red);
  cursor: pointer;
  font-weight: 600;
}
.btn-reset-filters:hover {
  background: var(--red);
  color: #fff;
  border-color: var(--red);
}

.manage-cat-btn {
  margin-left: auto;
  padding: 7px 14px;
  font-size: 13px;
}

@media (max-width: 640px) {
  .filters-row {
    gap: 6px;
  }
  .manage-cat-btn {
    margin-left: 0;
  }
}
</style>
