<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';

const store = useInventoryStore();
const toast = useToast();

const searchText = ref('');
const selectedItem = ref(null);
const quantity = ref('');
const isDropdownOpen = ref(false);
const highlightedIndex = ref(-1);
const isSubmitting = ref(false);

const searchInputRef = ref(null);
const quantityInputRef = ref(null);

defineExpose({ focusSearch });

const filteredItems = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return store.allItems.slice(0, 8);
  return store.allItems
    .filter((item) => item.name.toLowerCase().includes(q) || (item.category_name && item.category_name.toLowerCase().includes(q)))
    .slice(0, 10);
});

function getItemStatus(item) {
  if (item.quantity <= 0) return 'out';
  if (item.min_stock_level > 0 && item.quantity <= item.min_stock_level) return 'low';
  return 'ok';
}

function openDropdown() {
  isDropdownOpen.value = true;
  highlightedIndex.value = -1;
}

function closeDropdown() {
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;
}

function selectItem(item) {
  selectedItem.value = item;
  searchText.value = item.name;
  closeDropdown();
  nextTick(() => {
    quantityInputRef.value?.focus();
    quantityInputRef.value?.select();
  });
}

function clearSelection() {
  selectedItem.value = null;
  searchText.value = '';
  quantity.value = '';
  nextTick(() => searchInputRef.value?.focus());
}

function onSearchInput() {
  selectedItem.value = null;
  openDropdown();
}

function onSearchKeydown(event) {
  if (!isDropdownOpen.value && event.key !== 'Escape') {
    openDropdown();
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredItems.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (highlightedIndex.value >= 0 && filteredItems.value[highlightedIndex.value]) {
      selectItem(filteredItems.value[highlightedIndex.value]);
    } else if (filteredItems.value.length === 1) {
      selectItem(filteredItems.value[0]);
    }
  } else if (event.key === 'Escape') {
    closeDropdown();
  }
}

function onQuantityKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    // Enter w polu ilości = Dostawa (najczęstsza operacja)
    submitOperation('delivery');
  } else if (event.key === 'Escape') {
    clearSelection();
  }
}

async function submitOperation(type) {
  if (!selectedItem.value) {
    toast.warn('Wybierz najpierw przedmiot z listy.');
    searchInputRef.value?.focus();
    return;
  }
  const qty = parseFloat(quantity.value);
  if (!qty || qty <= 0) {
    toast.warn('Podaj ilość większą od zera.');
    quantityInputRef.value?.focus();
    return;
  }

  isSubmitting.value = true;
  try {
    await store.performOperation(selectedItem.value.id, type, qty);
    const verb = type === 'delivery' ? 'Przyjęto' : 'Wydano';
    const unit = selectedItem.value.unit;
    toast.success(`${verb} ${qty} ${unit} — ${selectedItem.value.name}`);
    clearSelection();
  } catch (error) {
    toast.error(error.message);
  } finally {
    isSubmitting.value = false;
  }
}

function focusSearch() {
  searchInputRef.value?.focus();
}

onMounted(() => {
  focusSearch();
});

watch(searchText, (val) => {
  if (!val.trim()) {
    selectedItem.value = null;
  }
});
</script>

<template>
  <div class="quick-op-bar">
    <div class="quick-op-label">Szybka operacja</div>

    <div class="quick-op-fields">
      <!-- Wyszukiwarka przedmiotu -->
      <div class="search-wrapper" :class="{ 'has-selection': selectedItem }">
        <div class="search-input-row">
          <input
            ref="searchInputRef"
            v-model="searchText"
            type="text"
            class="qob-input qob-search"
            :placeholder="store.isAllItemsLoading ? 'Ładowanie...' : 'Wpisz nazwę przedmiotu...'"
            autocomplete="off"
            @input="onSearchInput"
            @focus="openDropdown"
            @blur="setTimeout(closeDropdown, 150)"
            @keydown="onSearchKeydown"
          />
          <button
            v-if="selectedItem"
            type="button"
            class="clear-btn"
            @click="clearSelection"
            title="Wyczyść wybór"
          >×</button>
        </div>

        <!-- Dropdown z wynikami -->
        <div v-if="isDropdownOpen && filteredItems.length" class="qob-dropdown">
          <div
            v-for="(item, idx) in filteredItems"
            :key="item.id"
            class="qob-option"
            :class="{
              'is-highlighted': idx === highlightedIndex,
              'is-low': getItemStatus(item) === 'low',
              'is-out': getItemStatus(item) === 'out',
            }"
            @mousedown.prevent="selectItem(item)"
          >
            <span class="option-name">{{ item.name }}</span>
            <span class="option-meta">
              <span class="option-qty" :class="`qty-${getItemStatus(item)}`">{{ item.quantity }} {{ item.unit }}</span>
              <span v-if="item.category_name" class="option-cat">{{ item.category_name }}</span>
            </span>
          </div>
          <div v-if="filteredItems.length === 0" class="qob-option qob-empty">Brak wyników</div>
        </div>
      </div>

      <!-- Ilość -->
      <input
        ref="quantityInputRef"
        v-model="quantity"
        type="number"
        class="qob-input qob-qty"
        placeholder="Ilość"
        min="0.01"
        step="any"
        inputmode="decimal"
        @keydown="onQuantityKeydown"
      />

      <!-- Przyciski -->
      <button
        type="button"
        class="qob-btn qob-btn--delivery"
        :disabled="isSubmitting"
        @click="submitOperation('delivery')"
        title="Przyjęcie dostawy (Enter)"
      >
        + Dostawa
      </button>
      <button
        type="button"
        class="qob-btn qob-btn--withdrawal"
        :disabled="isSubmitting"
        @click="submitOperation('withdrawal')"
        title="Wydanie z magazynu"
      >
        − Wydanie
      </button>
    </div>

    <!-- Podpowiedź dla wybranego przedmiotu -->
    <div v-if="selectedItem" class="qob-selected-hint">
      Wybrany: <strong>{{ selectedItem.name }}</strong>
      &nbsp;·&nbsp; Stan: <strong :class="`qty-${getItemStatus(selectedItem)}`">{{ selectedItem.quantity }} {{ selectedItem.unit }}</strong>
      <span v-if="selectedItem.min_stock_level > 0"> &nbsp;·&nbsp; Min: {{ selectedItem.min_stock_level }}</span>
    </div>
    <div v-else class="qob-hint">
      Wpisz nazwę, wybierz strzałkami lub kliknij → wpisz ilość → <kbd>Enter</kbd> = Dostawa
    </div>
  </div>
</template>

<style scoped>
.quick-op-bar {
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f7ff 100%);
  border: 1px solid #bee3f8;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 1.5rem;
}

.quick-op-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4a90d9;
  margin-bottom: 10px;
}

.quick-op-fields {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-wrap: wrap;
}

/* Wyszukiwarka */
.search-wrapper {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
}

.search-input-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.qob-input {
  padding: 11px 14px;
  border: 2px solid #c3daf0;
  border-radius: 8px;
  font-size: 15px;
  background: #fff;
  color: var(--text-color);
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}

.qob-input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.18);
}

.search-wrapper.has-selection .qob-search {
  border-color: #28a745;
  padding-right: 36px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 20px;
  color: #6c757d;
  padding: 0 4px;
  cursor: pointer;
  line-height: 1;
  z-index: 1;
}
.clear-btn:hover {
  color: var(--red);
  transform: translateY(-50%) scale(1.1);
  box-shadow: none;
}

/* Ilość */
.qob-qty {
  width: 110px;
  flex-shrink: 0;
}

/* Przyciski operacji */
.qob-btn {
  padding: 11px 18px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}

.qob-btn--delivery {
  background-color: #28a745;
  color: #fff;
}
.qob-btn--delivery:hover:not(:disabled) {
  background-color: #218838;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(40, 167, 69, 0.35);
}

.qob-btn--withdrawal {
  background-color: #dc3545;
  color: #fff;
}
.qob-btn--withdrawal:hover:not(:disabled) {
  background-color: #c82333;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(220, 53, 69, 0.35);
}

.qob-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Dropdown */
.qob-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.13);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
}

.qob-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.1s;
  border-bottom: 1px solid #f0f0f0;
}
.qob-option:last-child {
  border-bottom: none;
}
.qob-option:hover,
.qob-option.is-highlighted {
  background-color: #e8f4fd;
}
.qob-option.is-low {
  background-color: #fffbe6;
}
.qob-option.is-out {
  background-color: #fff2f2;
}
.qob-option.is-low.is-highlighted,
.qob-option.is-low:hover {
  background-color: #fff3cd;
}
.qob-option.is-out.is-highlighted,
.qob-option.is-out:hover {
  background-color: #f8d7da;
}
.qob-empty {
  color: var(--grey);
  font-style: italic;
  cursor: default;
}

.option-name {
  font-weight: 600;
  color: var(--text-color);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 10px;
  font-size: 13px;
}

.option-qty {
  font-weight: 700;
}
.option-cat {
  color: var(--grey);
  font-size: 12px;
}

/* Kolory stanu */
.qty-ok {
  color: #28a745;
}
.qty-low {
  color: #e69500;
}
.qty-out {
  color: #dc3545;
}

/* Podpowiedź */
.qob-selected-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.qob-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6c8eae;
}

kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 11px;
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 3px;
  font-family: inherit;
  color: var(--text-color);
}

/* Mobile */
@media (max-width: 640px) {
  .quick-op-fields {
    gap: 8px;
  }

  .qob-qty {
    width: 80px;
  }

  .qob-btn {
    flex: 1 1 calc(50% - 5px);
    padding: 14px 10px;
    font-size: 15px;
  }

  .search-wrapper {
    flex: 1 1 100%;
  }
}
</style>
