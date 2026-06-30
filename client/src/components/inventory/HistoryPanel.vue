<script setup>
import { ref, watch } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';
import { formatDate } from '../../utils/formatters.js';

const props = defineProps({
  item: { type: Object, required: true },
});

const emit = defineEmits(['close']);

const store = useInventoryStore();
const toast = useToast();

const history = ref([]);
const isLoading = ref(false);

function formatOperationType(type) {
  if (type === 'delivery') return 'Przyjęcie';
  if (type === 'withdrawal') return 'Wydanie';
  if (type === 'adjustment') return 'Korekta ilości';
  if (type.includes('status_changed_to_true')) return 'Oznaczono jako zamówione';
  if (type.includes('status_changed_to_false')) return 'Anulowano zamówienie';
  return type;
}

async function loadHistory() {
  isLoading.value = true;
  try {
    history.value = await store.fetchHistory(props.item.id);
  } catch (error) {
    toast.error('Nie udało się pobrać historii operacji.');
    emit('close');
  } finally {
    isLoading.value = false;
  }
}

watch(() => props.item, loadHistory, { immediate: true });
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <div>
          <h3>Historia: {{ item.name }}</h3>
          <span class="history-subtitle">Aktualna ilość: <strong>{{ item.quantity }} {{ item.unit }}</strong></span>
        </div>
        <button class="close-button" @click="emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="isLoading" class="modal-loading-spinner"><div class="spinner"></div></div>

        <div v-else-if="!history.length" class="empty-history">
          Brak zapisanych operacji dla tego przedmiotu.
        </div>

        <div v-else class="history-list">
          <div
            v-for="(entry, idx) in history"
            :key="idx"
            class="history-entry"
            :class="{
              'entry-delivery': entry.change_quantity > 0,
              'entry-withdrawal': entry.change_quantity < 0,
            }"
          >
            <div class="entry-icon">
              <span v-if="entry.change_quantity > 0">↑</span>
              <span v-else-if="entry.change_quantity < 0">↓</span>
              <span v-else>≡</span>
            </div>
            <div class="entry-info">
              <strong class="entry-type">{{ formatOperationType(entry.operation_type) }}</strong>
              <span class="entry-meta">{{ entry.username || 'Brak danych' }} · {{ formatDate(entry.operation_date, true) }}</span>
            </div>
            <div v-if="entry.change_quantity !== 0" class="entry-qty" :class="entry.change_quantity > 0 ? 'qty-positive' : 'qty-negative'">
              {{ entry.change_quantity > 0 ? '+' : '' }}{{ entry.change_quantity }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-subtitle {
  font-size: 13px;
  color: var(--grey);
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

.empty-history {
  text-align: center;
  color: var(--grey);
  padding: 30px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 4px;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #fff;
}

.entry-delivery {
  border-left: 3px solid var(--green);
}
.entry-withdrawal {
  border-left: 3px solid var(--red);
}

.entry-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
  background: #f0f0f0;
  color: #555;
}

.entry-delivery .entry-icon {
  background: #d4edda;
  color: #155724;
}
.entry-withdrawal .entry-icon {
  background: #f8d7da;
  color: #721c24;
}

.entry-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.entry-type {
  font-size: 15px;
  color: var(--text-color);
}
.entry-meta {
  font-size: 13px;
  color: var(--grey);
}

.entry-qty {
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
}
.qty-positive { color: var(--green); }
.qty-negative { color: var(--red); }

.modal-lg {
  max-width: 700px;
}
</style>
