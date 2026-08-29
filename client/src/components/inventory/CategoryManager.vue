<script setup>
import { ref } from 'vue';
import { useInventoryStore } from '../../stores/inventoryStore.js';
import { useToast } from '../../composables/useToast.js';
import { getUserRole } from '../../auth/auth.js';

const emit = defineEmits(['close']);

const store = useInventoryStore();
const toast = useToast();
const userRole = getUserRole();

const newCategoryName = ref('');
const editingCategory = ref(null);
const isSaving = ref(false);

async function handleAdd() {
  if (!newCategoryName.value.trim()) {
    toast.warn('Nazwa kategorii nie może być pusta.');
    return;
  }
  isSaving.value = true;
  try {
    await store.addCategory(newCategoryName.value);
    newCategoryName.value = '';
  } catch (error) {
    toast.error(error.message);
  } finally {
    isSaving.value = false;
  }
}

async function handleUpdate() {
  if (!editingCategory.value?.name.trim()) {
    toast.warn('Nazwa kategorii nie może być pusta.');
    return;
  }
  isSaving.value = true;
  try {
    await store.updateCategory(editingCategory.value.id, editingCategory.value.name);
    editingCategory.value = null;
  } catch (error) {
    toast.error(error.message);
  } finally {
    isSaving.value = false;
  }
}

async function handleDelete(cat) {
  if (!confirm(`Usunąć kategorię "${cat.name}"? Przedmioty stracą przypisanie.`)) return;
  try {
    await store.deleteCategory(cat.id);
  } catch (error) {
    toast.error(error.message);
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Kategorie magazynu</h3>
        <button type="button" aria-label="Zamknij" class="close-button" @click="emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Dodawanie nowej kategorii -->
        <form class="add-cat-form" @submit.prevent="handleAdd">
          <input v-model="newCategoryName" type="text" placeholder="Nazwa nowej kategorii…" autofocus />
          <button type="submit" class="zapisz" :disabled="isSaving">Dodaj</button>
        </form>

        <!-- Lista kategorii -->
        <ul class="cat-list">
          <li v-if="!store.categories.length" class="cat-empty">Brak zdefiniowanych kategorii.</li>

          <li v-for="cat in store.categories" :key="cat.id">
            <template v-if="editingCategory && editingCategory.id === cat.id">
              <input v-model="editingCategory.name" type="text" class="cat-edit-input" @keydown.enter.prevent="handleUpdate" @keydown.escape="editingCategory = null" />
              <div class="cat-item-actions">
                <button class="zapisz" :disabled="isSaving" @click="handleUpdate">Zapisz</button>
                <button class="anuluj" @click="editingCategory = null">Anuluj</button>
              </div>
            </template>
            <template v-else>
              <span class="cat-name">{{ cat.name }}</span>
              <div class="cat-item-actions">
                <button class="edytuj" @click="editingCategory = { ...cat }">Edytuj</button>
                <button v-if="userRole === 'admin'" class="usun" @click="handleDelete(cat)">Usuń</button>
              </div>
            </template>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-body {
  padding: 20px 25px 25px;
}

.add-cat-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.add-cat-form input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
}
.add-cat-form input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
}

.cat-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 45vh;
  overflow-y: auto;
}
.cat-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}
.cat-list li:last-child {
  border-bottom: none;
}
.cat-empty {
  color: var(--grey);
  font-style: italic;
  justify-content: center !important;
}

.cat-name {
  font-size: 15px;
  font-weight: 500;
}

.cat-edit-input {
  flex: 1;
  padding: 7px 10px;
  border: 2px solid var(--blue);
  border-radius: 5px;
  font-size: 14px;
}

.cat-item-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}
.cat-item-actions button {
  margin: 0;
}
</style>
