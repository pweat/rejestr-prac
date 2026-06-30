import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const useInventoryStore = defineStore('inventory', () => {
  const toast = useToast();

  // ── Stan ──────────────────────────────────────────────────────────────────
  const items = ref([]);
  const categories = ref([]);
  const allItems = ref([]); // płaski cache do autouzupełniania (bez paginacji)

  const isLoading = ref(false);
  const isAllItemsLoading = ref(false);

  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalItems = ref(0);

  const searchQuery = ref('');
  const sortBy = ref('name');
  const sortOrder = ref('asc');
  const selectedCategoryId = ref(null);
  const filterLowStock = ref(false);
  const filterAlertOnly = ref(false);
  const filterHideOrdered = ref(false);

  // ── Computed ──────────────────────────────────────────────────────────────
  const hasActiveFilters = computed(
    () => filterLowStock.value || filterAlertOnly.value || filterHideOrdered.value || selectedCategoryId.value
  );

  // ── Pobieranie danych ─────────────────────────────────────────────────────

  async function fetchItems() {
    isLoading.value = true;
    try {
      const params = new URLSearchParams({
        page: currentPage.value,
        limit: 30,
        search: searchQuery.value,
        categoryId: selectedCategoryId.value || '',
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      });
      if (filterLowStock.value) params.set('lowStockOnly', 'true');
      if (filterAlertOnly.value) params.set('alertOnly', 'true');
      if (filterHideOrdered.value) params.set('hideOrdered', 'true');

      const response = await authenticatedFetch(`${API_URL}/api/inventory?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Błąd pobierania danych z magazynu');

      items.value = result.data;
      totalPages.value = result.pagination.totalPages;
      currentPage.value = result.pagination.currentPage;
      totalItems.value = result.pagination.totalItems;
    } catch (error) {
      toast.error('Nie udało się pobrać danych z magazynu: ' + error.message);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCategories() {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/inventory/categories`);
      if (!response.ok) throw new Error('Błąd pobierania kategorii');
      categories.value = await response.json();
    } catch (error) {
      console.error('Błąd podczas pobierania kategorii:', error);
    }
  }

  // Cache wszystkich pozycji dla szybkiego autouzupełniania
  async function fetchAllItems() {
    isAllItemsLoading.value = true;
    try {
      const params = new URLSearchParams({ page: 1, limit: 1000, sortBy: 'name', sortOrder: 'asc' });
      const response = await authenticatedFetch(`${API_URL}/api/inventory?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      allItems.value = result.data;
    } catch (error) {
      console.error('Błąd pobierania listy do autouzupełniania:', error);
    } finally {
      isAllItemsLoading.value = false;
    }
  }

  // ── Operacje CRUD ─────────────────────────────────────────────────────────

  async function addItem(itemData) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas dodawania przedmiotu.');
    await fetchItems();
    await fetchAllItems();
    toast.success(`Dodano "${itemData.name}" do magazynu.`);
    return result;
  }

  async function updateItem(id, itemData) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas aktualizacji przedmiotu.');

    // Serwer zwraca teraz obiekt z category_name przez JOIN
    const idx = items.value.findIndex((i) => i.id === id);
    if (idx !== -1) items.value[idx] = result;

    const allIdx = allItems.value.findIndex((i) => i.id === id);
    if (allIdx !== -1) allItems.value[allIdx] = result;

    toast.success('Zmiany zostały zapisane.');
    return result;
  }

  async function deleteItem(itemId) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${itemId}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć przedmiotu.');
    }
    await fetchItems();
    await fetchAllItems();
    toast.success('Przedmiot został usunięty.');
  }

  // ── Operacje magazynowe ───────────────────────────────────────────────────

  async function performOperation(itemId, operationType, quantity) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/operation`, {
      method: 'POST',
      body: JSON.stringify({ itemId, operationType, quantity }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd podczas wykonywania operacji.');

    // Aktualizacja lokalnego stanu
    const idx = items.value.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx], ...result };
    }
    const allIdx = allItems.value.findIndex((i) => i.id === itemId);
    if (allIdx !== -1) {
      allItems.value[allIdx] = { ...allItems.value[allIdx], ...result };
    }
    return result;
  }

  async function toggleOrdered(item) {
    try {
      const result = await performOperation(item.id, 'toggle_ordered', 0);
      const statusText = result.is_ordered ? 'Oznaczono jako zamówione' : 'Anulowano zamówienie';
      toast.info(statusText + `: ${item.name}`);
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  }

  // ── Historia ──────────────────────────────────────────────────────────────

  async function fetchHistory(itemId) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/${itemId}/history`);
    if (!response.ok) throw new Error('Błąd pobierania historii operacji');
    return await response.json();
  }

  // ── Kategorie ─────────────────────────────────────────────────────────────

  async function addCategory(name) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: name.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd dodawania kategorii.');
    await fetchCategories();
    toast.success(`Dodano kategorię "${name}".`);
    return result;
  }

  async function updateCategory(id, name) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: name.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd aktualizacji kategorii.');
    await fetchCategories();
    toast.success('Nazwa kategorii zaktualizowana.');
    return result;
  }

  async function deleteCategory(categoryId) {
    const response = await authenticatedFetch(`${API_URL}/api/inventory/categories/${categoryId}`, {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć kategorii.');
    }
    if (selectedCategoryId.value === categoryId) selectedCategoryId.value = null;
    await fetchCategories();
    toast.success('Kategoria została usunięta.');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setPage(page) {
    currentPage.value = page;
    fetchItems();
  }

  function setSort(key) {
    if (sortBy.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = key;
      sortOrder.value = 'asc';
    }
    currentPage.value = 1;
    fetchItems();
  }

  function resetFilters() {
    filterLowStock.value = false;
    filterAlertOnly.value = false;
    filterHideOrdered.value = false;
    selectedCategoryId.value = null;
    currentPage.value = 1;
    fetchItems();
  }

  return {
    // State
    items,
    categories,
    allItems,
    isLoading,
    isAllItemsLoading,
    currentPage,
    totalPages,
    totalItems,
    searchQuery,
    sortBy,
    sortOrder,
    selectedCategoryId,
    filterLowStock,
    filterAlertOnly,
    filterHideOrdered,
    hasActiveFilters,
    // Actions
    fetchItems,
    fetchCategories,
    fetchAllItems,
    addItem,
    updateItem,
    deleteItem,
    performOperation,
    toggleOrdered,
    fetchHistory,
    addCategory,
    updateCategory,
    deleteCategory,
    setPage,
    setSort,
    resetFilters,
  };
});
