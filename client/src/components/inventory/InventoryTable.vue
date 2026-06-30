<script setup>
import { ref } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';
import { formatDate } from '../../utils/formatters.js';
import PaginationControls from '../PaginationControls.vue';

const props = defineProps({
  userRole: { type: String, required: true },
});

const emit = defineEmits(['edit', 'history', 'delete']);

const store = useInventoryStore();
const toast = useToast();

const vFocus = {
  mounted(el) {
    el.focus();
    el.select();
  },
};

// Stan inline edycji ilości
const editingQuantityId = ref(null);
const editingQuantityValue = ref('');

function getItemStatus(item) {
  let text = '';
  let cls = '';
  if (item.quantity <= 0) {
    text = 'Brak towaru';
    cls = 'status-out';
  } else if (item.min_stock_level > 0 && item.quantity <= item.min_stock_level) {
    text = 'Niski stan';
    cls = 'status-low';
  } else {
    text = 'W magazynie';
    cls = 'status-ok';
  }
  if (item.is_ordered) text += ' (Zamówione)';
  return { text, cls };
}

// ── Inline editing ilości ─────────────────────────────────────────────────

function startEditQuantity(item) {
  if (props.userRole === 'viewer') return;
  editingQuantityId.value = item.id;
  editingQuantityValue.value = String(item.quantity);
}

async function confirmEditQuantity(item) {
  const newQty = parseFloat(editingQuantityValue.value);
  editingQuantityId.value = null;

  if (isNaN(newQty) || newQty === item.quantity) return;

  const diff = newQty - item.quantity;
  const opType = diff >= 0 ? 'delivery' : 'withdrawal';
  const absQty = Math.abs(diff);

  try {
    await store.performOperation(item.id, opType, absQty);
    const verb = diff >= 0 ? 'Przyjęto' : 'Wydano';
    toast.success(`${verb} ${absQty} ${item.unit} — ${item.name}`);
  } catch (error) {
    toast.error(error.message);
  }
}

function cancelEditQuantity() {
  editingQuantityId.value = null;
}

function onQuantityKeydown(event, item) {
  if (event.key === 'Enter') {
    event.preventDefault();
    confirmEditQuantity(item);
  } else if (event.key === 'Escape') {
    cancelEditQuantity();
  }
}

// ── Sortowanie ────────────────────────────────────────────────────────────
function getSortIcon(key) {
  if (store.sortBy !== key) return '';
  return store.sortOrder === 'asc' ? ' ▲' : ' ▼';
}
</script>

<template>
  <div class="table-and-pagination" :class="{ 'is-loading': store.isLoading }">
    <div v-if="store.isLoading" class="loading-overlay"><div class="spinner"></div></div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th @click="store.setSort('name')" class="sortable">
              Nazwa{{ getSortIcon('name') }}
            </th>
            <th @click="store.setSort('quantity')" class="sortable qty-col">
              Ilość{{ getSortIcon('quantity') }}
            </th>
            <th @click="store.setSort('unit')" class="sortable">
              Jedn.{{ getSortIcon('unit') }}
            </th>
            <th @click="store.setSort('min_stock_level')" class="sortable">
              Min{{ getSortIcon('min_stock_level') }}
            </th>
            <th class="cat-col">Kategoria</th>
            <th>Ostatnia dostawa</th>
            <th>Status</th>
            <th v-if="userRole !== 'viewer'">Akcje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.items.length && !store.isLoading">
            <td :colspan="userRole !== 'viewer' ? 8 : 7" class="empty-table-message">
              <p>Brak przedmiotów spełniających kryteria.</p>
            </td>
          </tr>

          <tr
            v-for="item in store.items"
            :key="item.id"
            :class="{
              'status-row-low': getItemStatus(item).cls === 'status-low',
              'status-row-out': getItemStatus(item).cls === 'status-out',
            }"
          >
            <!-- Nazwa -->
            <td data-label="Nazwa">
              <span class="item-name">{{ item.name }}</span>
            </td>

            <!-- Ilość — inline edycja -->
            <td data-label="Ilość" class="quantity-cell">
              <template v-if="editingQuantityId === item.id">
                <input
                  v-model="editingQuantityValue"
                  type="number"
                  step="any"
                  class="inline-qty-input"
                  @keydown="onQuantityKeydown($event, item)"
                  @blur="confirmEditQuantity(item)"
                  v-focus
                />
              </template>
              <template v-else>
                <span
                  class="qty-value"
                  :class="{
                    'qty-ok': getItemStatus(item).cls === 'status-ok',
                    'qty-low': getItemStatus(item).cls === 'status-low',
                    'qty-out': getItemStatus(item).cls === 'status-out',
                  }"
                  :title="userRole !== 'viewer' ? 'Kliknij, aby edytować ilość' : ''"
                  @click="startEditQuantity(item)"
                >{{ item.quantity }}</span>
              </template>
            </td>

            <!-- Jednostka -->
            <td data-label="Jednostka">{{ item.unit }}</td>

            <!-- Min stan -->
            <td data-label="Min. stan">{{ item.min_stock_level > 0 ? item.min_stock_level : '—' }}</td>

            <!-- Kategoria -->
            <td data-label="Kategoria" class="cat-col">
              <span v-if="item.category_name" class="cat-badge">{{ item.category_name }}</span>
              <span v-else class="no-cat">—</span>
            </td>

            <!-- Ostatnia dostawa -->
            <td data-label="Ostatnia dostawa" class="date-col">
              <span v-if="item.last_delivery_date" class="date-text">{{ formatDate(item.last_delivery_date) }}</span>
              <span v-else class="no-cat">—</span>
            </td>

            <!-- Status -->
            <td data-label="Status" class="status-col">
              <span class="status-badge" :class="getItemStatus(item).cls">
                {{ getItemStatus(item).text }}
              </span>
              <button
                v-if="userRole !== 'viewer'"
                type="button"
                class="btn-ordered-toggle"
                :class="{ 'btn-ordered-toggle--active': item.is_ordered }"
                @click="store.toggleOrdered(item)"
              >
                {{ item.is_ordered ? '✓ Zamówione' : 'Zamów' }}
              </button>
            </td>

            <!-- Akcje -->
            <td v-if="userRole !== 'viewer'" data-label="Akcje" class="actions-cell">
              <div class="actions-cell-inner">
                <button class="pokaż" @click="emit('history', item)">Historia</button>
                <button class="edytuj" @click="emit('edit', item)">Edytuj</button>
                <button v-if="userRole === 'admin'" class="usun" @click="emit('delete', item.id)">Usuń</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationControls
      v-if="store.totalPages > 1"
      :current-page="store.currentPage"
      :total-pages="store.totalPages"
      @page-changed="store.setPage"
    />
  </div>
</template>


<style scoped>
.table-and-pagination {
  position: relative;
}
.table-and-pagination.is-loading {
  opacity: 0.4;
  pointer-events: none;
  transition: opacity 0.3s ease-in-out;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
  z-index: 10;
}

/* Status rows */
.status-row-low td {
  background-color: #fffbe6 !important;
}
.status-row-out td {
  background-color: #fff2f2 !important;
}

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
}
.status-ok { background-color: var(--green); }
.status-low { background-color: #ffc107; color: #333; }
.status-out { background-color: var(--red); }

/* Quantity cell */
.quantity-cell {
  min-width: 80px;
}
.qty-value {
  font-weight: 700;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background 0.15s;
  display: inline-block;
}
.qty-value:hover {
  background: rgba(0, 123, 255, 0.08);
}
.qty-ok { color: var(--green); }
.qty-low { color: #e69500; }
.qty-out { color: var(--red); }

.inline-qty-input {
  width: 80px;
  padding: 4px 8px;
  border: 2px solid var(--blue);
  border-radius: 5px;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}

/* Kategoria badge */
.cat-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #e9ecef;
  border-radius: 10px;
  font-size: 12px;
  color: #495057;
}
.no-cat { color: var(--grey); }

/* Data */
.date-text { font-size: 13px; color: var(--text-color-secondary); }

/* Ordered toggle */
.btn-ordered-toggle {
  display: block;
  margin-top: 5px;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: #fff;
  cursor: pointer;
  color: var(--text-color);
}
.btn-ordered-toggle--active {
  background: #e8f4fd;
  border-color: var(--blue);
  color: var(--blue);
  font-weight: 600;
}

.item-name {
  font-weight: 500;
}

/* Column widths */
.qty-col { text-align: center; }
.cat-col { min-width: 100px; }
.date-col { white-space: nowrap; }
.status-col { white-space: nowrap; }

@media (max-width: 850px) {
  .cat-col, .date-col { display: none; }
}
</style>
