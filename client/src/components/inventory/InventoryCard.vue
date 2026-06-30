<script setup>
import { ref } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';
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
  },
};

// Stan inline quick-qty na kartce
const activeItemId = ref(null);
const quickQty = ref('');

function getItemStatus(item) {
  if (item.quantity <= 0) return { text: 'Brak towaru', cls: 'status-out' };
  if (item.min_stock_level > 0 && item.quantity <= item.min_stock_level) return { text: 'Niski stan', cls: 'status-low' };
  return { text: 'W magazynie', cls: 'status-ok' };
}

function toggleQuickQty(item) {
  if (activeItemId.value === item.id) {
    activeItemId.value = null;
    quickQty.value = '';
  } else {
    activeItemId.value = item.id;
    quickQty.value = '';
  }
}

async function submitCardOperation(item, type) {
  const qty = parseFloat(quickQty.value);
  if (!qty || qty <= 0) {
    toast.warn('Podaj ilość większą od zera.');
    return;
  }
  try {
    await store.performOperation(item.id, type, qty);
    const verb = type === 'delivery' ? 'Przyjęto' : 'Wydano';
    toast.success(`${verb} ${qty} ${item.unit} — ${item.name}`);
    activeItemId.value = null;
    quickQty.value = '';
  } catch (error) {
    toast.error(error.message);
  }
}
</script>

<template>
  <div class="cards-wrapper" :class="{ 'is-loading': store.isLoading }">
    <div v-if="store.isLoading" class="loading-overlay"><div class="spinner"></div></div>

    <div v-if="!store.items.length && !store.isLoading" class="empty-state">
      <p>Brak przedmiotów spełniających kryteria.</p>
    </div>

    <div
      v-for="item in store.items"
      :key="item.id"
      class="inv-card"
      :class="{
        'card-low': getItemStatus(item).cls === 'status-low',
        'card-out': getItemStatus(item).cls === 'status-out',
      }"
    >
      <!-- Nagłówek karty -->
      <div class="card-header">
        <div class="card-title-row">
          <span class="card-name">{{ item.name }}</span>
          <span class="status-badge" :class="getItemStatus(item).cls">{{ getItemStatus(item).text }}</span>
        </div>
        <div v-if="item.category_name" class="card-cat">{{ item.category_name }}</div>
      </div>

      <!-- Stan i dane -->
      <div class="card-body">
        <div class="card-stat">
          <span class="stat-label">Stan</span>
          <span class="stat-value"
            :class="{
              'qty-ok': getItemStatus(item).cls === 'status-ok',
              'qty-low': getItemStatus(item).cls === 'status-low',
              'qty-out': getItemStatus(item).cls === 'status-out',
            }"
          >{{ item.quantity }} {{ item.unit }}</span>
        </div>
        <div v-if="item.min_stock_level > 0" class="card-stat">
          <span class="stat-label">Min</span>
          <span class="stat-value">{{ item.min_stock_level }} {{ item.unit }}</span>
        </div>
        <div v-if="item.last_delivery_date" class="card-stat">
          <span class="stat-label">Ost. dostawa</span>
          <span class="stat-value date-value">{{ item.last_delivery_date?.slice(0, 10) }}</span>
        </div>
      </div>

      <!-- Operacje szybkie (dla edytorów/adminów) -->
      <div v-if="userRole !== 'viewer'" class="card-ops">
        <template v-if="activeItemId === item.id">
          <div class="quick-qty-row">
            <input
              v-model="quickQty"
              type="number"
              step="any"
              min="0.01"
              inputmode="decimal"
              placeholder="Ilość"
              class="card-qty-input"
              @keydown.enter.prevent="submitCardOperation(item, 'delivery')"
              @keydown.escape="activeItemId = null"
              v-focus
            />
            <button class="op-btn op-btn--delivery" @click="submitCardOperation(item, 'delivery')">+ Przyjmij</button>
            <button class="op-btn op-btn--withdrawal" @click="submitCardOperation(item, 'withdrawal')">− Wydaj</button>
            <button class="op-btn op-btn--cancel" @click="activeItemId = null">Anuluj</button>
          </div>
        </template>
        <template v-else>
          <button class="op-btn op-btn--delivery" @click="toggleQuickQty(item)">+ Dostawa / Wydanie</button>
        </template>
      </div>

      <!-- Akcje drugorzędne -->
      <div class="card-actions">
        <button class="btn-sm pokaż" @click="emit('history', item)">Historia</button>
        <button v-if="userRole !== 'viewer'" class="btn-sm edytuj" @click="emit('edit', item)">Edytuj</button>
        <button
          v-if="userRole !== 'viewer'"
          class="btn-sm"
          :class="item.is_ordered ? 'btn-ordered-active' : 'btn-ordered'"
          @click="store.toggleOrdered(item)"
        >
          {{ item.is_ordered ? '✓ Zamówione' : 'Oznacz zamówione' }}
        </button>
        <button v-if="userRole === 'admin'" class="btn-sm usun" @click="emit('delete', item.id)">Usuń</button>
      </div>
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
.cards-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cards-wrapper.is-loading {
  opacity: 0.4;
  pointer-events: none;
}
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 40px;
  z-index: 10;
}
.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--grey);
}

.inv-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.card-low {
  border-left: 4px solid #ffc107;
  background: #fffdf0;
}
.card-out {
  border-left: 4px solid var(--red);
  background: #fff5f5;
}

.card-header { margin-bottom: 10px; }

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-color);
  flex: 1;
}
.card-cat {
  font-size: 12px;
  color: var(--grey);
  margin-top: 3px;
}

.status-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-ok { background-color: var(--green); }
.status-low { background-color: #ffc107; color: #333; }
.status-out { background-color: var(--red); }

.card-body {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.card-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--grey);
  font-weight: 600;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
}
.date-value {
  font-size: 14px;
}
.qty-ok { color: var(--green); }
.qty-low { color: #e69500; }
.qty-out { color: var(--red); }

.card-ops {
  margin-bottom: 10px;
}
.quick-qty-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.card-qty-input {
  width: 90px;
  padding: 10px 12px;
  border: 2px solid var(--blue);
  border-radius: 7px;
  font-size: 16px;
  font-weight: 700;
}

.op-btn {
  padding: 12px 14px;
  border: none;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.op-btn--delivery { background: var(--green); color: #fff; flex: 1; }
.op-btn--withdrawal { background: var(--red); color: #fff; flex: 1; }
.op-btn--cancel { background: var(--grey); color: #fff; }
.op-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
  margin-top: 4px;
}
.btn-sm {
  padding: 6px 12px;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: #fff;
}
.btn-sm.pokaż { background: #17a2b8; }
.btn-sm.edytuj { background: var(--blue); }
.btn-sm.usun { background: var(--red); }
.btn-ordered {
  background: #fff;
  border: 1px solid var(--border-color) !important;
  color: var(--text-color) !important;
}
.btn-ordered-active {
  background: #e8f4fd;
  border: 1px solid var(--blue) !important;
  color: var(--blue) !important;
  font-weight: 600;
}
</style>
