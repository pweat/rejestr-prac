<script setup>
import { ref, watch, computed } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';

const props = defineProps({
  /** null = tryb dodawania, obiekt = tryb edycji */
  item: { type: Object, default: null },
});

const emit = defineEmits(['close']);

const store = useInventoryStore();
const toast = useToast();

const isEditMode = computed(() => props.item !== null);
const isSaving = ref(false);

function initForm() {
  if (props.item) {
    return {
      name: props.item.name,
      unit: props.item.unit,
      quantity: props.item.quantity,
      min_stock_level: props.item.min_stock_level,
      alert_on_dashboard: props.item.alert_on_dashboard,
      category_id: props.item.category_id ?? null,
    };
  }
  return {
    name: '',
    unit: 'szt.',
    quantity: 0,
    min_stock_level: 0,
    alert_on_dashboard: false,
    category_id: null,
  };
}

const form = ref(initForm());

watch(
  () => props.item,
  () => {
    form.value = initForm();
  }
);

function onMinStockInput() {
  const min = parseFloat(form.value.min_stock_level) || 0;
  if (min <= 0) form.value.alert_on_dashboard = false;
}

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.unit.trim()) {
    toast.warn('Nazwa i jednostka miary są wymagane.');
    return;
  }
  isSaving.value = true;
  try {
    if (isEditMode.value) {
      await store.updateItem(props.item.id, form.value);
    } else {
      await store.addItem(form.value);
    }
    emit('close');
  } catch (error) {
    toast.error(error.message);
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ isEditMode ? 'Edytuj przedmiot' : 'Dodaj nowy przedmiot' }}</h3>
        <button class="close-button" @click="emit('close')">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-grid-single-col">
          <div class="form-group">
            <label for="ai-name">Nazwa przedmiotu</label>
            <input id="ai-name" v-model="form.name" type="text" required autofocus />
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="ai-unit">Jednostka miary</label>
              <input id="ai-unit" v-model="form.unit" type="text" placeholder="szt., m, kg, l…" required />
            </div>
            <div class="form-group">
              <label for="ai-qty">{{ isEditMode ? 'Ilość (korekta)' : 'Ilość początkowa' }}</label>
              <input id="ai-qty" v-model.number="form.quantity" type="number" step="any" required />
              <small v-if="isEditMode" class="field-hint">Zmiana ilości zostanie zapisana jako korekta w historii.</small>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="ai-min">Minimalny stan</label>
              <input
                id="ai-min"
                v-model.number="form.min_stock_level"
                type="number"
                step="any"
                min="0"
                @input="onMinStockInput"
              />
              <small class="field-hint">0 = brak progu, brak alertów.</small>
            </div>
            <div class="form-group">
              <label for="ai-cat">Kategoria</label>
              <select id="ai-cat" v-model="form.category_id">
                <option :value="null">— Brak kategorii —</option>
                <option v-for="cat in store.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>

          <div v-if="form.min_stock_level > 0" class="form-group form-group--checkbox">
            <label>
              <input type="checkbox" v-model="form.alert_on_dashboard" />
              Pokazuj alert na pulpicie gdy stan jest niski
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="submit" class="zapisz" :disabled="isSaving">
            {{ isSaving ? 'Zapisywanie…' : (isEditMode ? 'Zapisz zmiany' : 'Dodaj przedmiot') }}
          </button>
          <button type="button" class="anuluj" @click="emit('close')">Anuluj</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--grey);
}

.form-group--checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
  cursor: pointer;
}

@media (max-width: 600px) {
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
