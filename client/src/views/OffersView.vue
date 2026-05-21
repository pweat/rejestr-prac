<script setup>
// ================================================================================================
// IMPORTS
// ================================================================================================
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { getUserRole } from '../auth/auth.js';
import vSelect from 'vue-select';
import PaginationControls from '../components/PaginationControls.vue';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const OFFER_STATUSES = ['draft', 'sent', 'accepted', 'rejected'];
const OFFER_STATUS_LABELS = {
  draft: 'Robocza',
  sent: 'Wysłana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
};

// ================================================================================================
// STAŁE I KONFIGURACJA
// ================================================================================================

/** @const {string} Podstawowy adres URL do API, pobierany ze zmiennych środowiskowych. */
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/** @const {string|null} Rola zalogowanego użytkownika (np. 'admin', 'editor', 'viewer'). */
const userRole = getUserRole();

/**
 * @const {Object} Szablony predefiniowanych pozycji dla różnych typów ofert.
 * Używane do automatycznego wypełniania formularza nowej oferty.
 */
const OFFER_TEMPLATES = {
  connection: [
    { name: 'Pompa głębinowa 4" 4N23 230V IBO', quantity: 1, unit: 'szt.', net_price: 1056.91 },
    { name: 'Głowica studzienna 125mm', quantity: 1, unit: 'szt.', net_price: 113.82 },
    { name: 'Zbiornik GWS 80L', quantity: 1, unit: 'szt.', net_price: 365.85 },
    { name: 'Wyłącznik ciśnieniowy', quantity: 1, unit: 'szt.', net_price: 48.78 },
    { name: 'Złączka PE 32x1" GZ', quantity: 1, unit: 'szt.', net_price: 13.82 },
    { name: 'Zawór kulowy 1"', quantity: 1, unit: 'szt.', net_price: 26.83 },
    { name: 'Filtr antypiaskowy', quantity: 1, unit: 'szt.', net_price: 30.08 },
    { name: 'Rura PE 32mm', quantity: 10, unit: 'm', net_price: 6.0 },
    { name: 'Robocizna - montaż i podłączenie', quantity: 1, unit: 'usł.', net_price: 1200.0 },
  ],
  drilling: [
    { name: 'Wykonanie odwiertu studni głębinowej', quantity: 30, unit: 'm', net_price: 250.0 },
    { name: 'Rury studzienne atestowane', quantity: 30, unit: 'm', net_price: 50.0 },
    { name: 'Obsypka żwirowa', quantity: 1, unit: 't', net_price: 300.0 },
    { name: 'Pompowanie oczyszczające', quantity: 1, unit: 'usł.', net_price: 500.0 },
  ],
  station: [
    { name: 'Zmiękczacz do wody', quantity: 1, unit: 'szt.', net_price: 2500.0 },
    { name: 'Lampa UV', quantity: 1, unit: 'szt.', net_price: 900.0 },
    { name: 'Worek soli tabletkowanej 25kg', quantity: 2, unit: 'szt.', net_price: 50.0 },
    { name: 'Montaż i uruchomienie stacji', quantity: 1, unit: 'usł.', net_price: 800.0 },
  ],
};

// ================================================================================================
// STAN KOMPONENTU (REFS)
// ================================================================================================

// --- Stan ogólny i paginacja ---
const isLoading = ref(true);
const offers = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);

// --- Stan dla modali (dodawanie/edycja) ---
const showAddOfferModal = ref(false);
const showEditOfferModal = ref(false);
const availableClients = ref([]); // Lista klientów do wyboru w formularzu
const newOfferData = ref({}); // Dane dla nowej oferty
const editedOfferData = ref(null); // Dane dla edytowanej oferty

// --- Filtry ---
const selectedStatuses = ref([]);
const selectedClientFilter = ref(null);
const showFilters = ref(false);

const isAnyModalOpen = computed(() => showAddOfferModal.value || showEditOfferModal.value);
const activeFilterCount = computed(() =>
  (selectedStatuses.value.length ? 1 : 0) + (selectedClientFilter.value ? 1 : 0)
);

// ================================================================================================
// FUNKCJE POMOCNICZE
// ================================================================================================

/**
 * Inicjalizuje obiekt nowej oferty z domyślnymi wartościami.
 * @returns {object} Obiekt nowej oferty gotowy do użycia w formularzu.
 */
const initializeNewOffer = () => {
  const defaultOfferType = 'connection';
  return {
    clientId: null,
    issue_date: new Date().toISOString().slice(0, 10),
    offer_type: defaultOfferType,
    company_profile_key: 'firma_a',
    status: 'draft',
    vat_rate: 23,
    notes: 'Termin ważności oferty: 14 dni. \nGwarancja na wykonane usługi: 24 miesiące.',
    // Głęboka kopia pozycji z szablonu, aby uniknąć referencji
    items: JSON.parse(JSON.stringify(OFFER_TEMPLATES[defaultOfferType])),
  };
};

const getOfferStatusLabel = (s) => OFFER_STATUS_LABELS[s] || 'Robocza';

/**
 * Funkcja filtrująca dla komponentu v-select. Umożliwia wyszukiwanie po nazwie i numerze telefonu.
 * @param {Array} options - Lista dostępnych opcji (klientów).
 * @param {string} search - Wprowadzony ciąg wyszukiwania.
 * @returns {Array} Przefiltrowana lista opcji.
 */
const filterClients = (options, search) => {
  const lowerSearch = search.toLowerCase();
  return options.filter((client) => {
    const nameMatch = client.name && client.name.toLowerCase().includes(lowerSearch);
    const phoneMatch = client.phone_number && client.phone_number.includes(lowerSearch);
    return nameMatch || phoneMatch;
  });
};

/**
 * Formatuje wartość liczbową jako kwotę w PLN.
 * @param {number|string} value - Wartość do sformatowania.
 * @returns {string}
 */
const formatCurrency = (value) => {
  const parsed = Number(value) || 0;
  return `${parsed.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
};

/**
 * Zwraca czytelny label dla typu oferty.
 * @param {string} type - Typ techniczny oferty.
 * @returns {string}
 */
const getOfferTypeLabel = (type) => {
  const labels = {
    connection: 'Podłączenie',
    drilling: 'Wykonanie studni',
    station: 'Stacja uzdatniania',
  };
  return labels[type] || 'Inna';
};

/**
 * Liczy podsumowanie kwot dla listy pozycji.
 * @param {Array} items - Lista pozycji.
 * @param {number|string} vatRate - Stawka VAT.
 * @returns {{net: number, vat: number, gross: number}}
 */
const calculateTotals = (items, vatRate) => {
  const net = (items || []).reduce((sum, item) => {
    const quantity = Number(item?.quantity) || 0;
    const netPrice = Number(item?.net_price) || 0;
    return sum + quantity * netPrice;
  }, 0);
  const vat = net * ((Number(vatRate) || 0) / 100);
  return {
    net,
    vat,
    gross: net + vat,
  };
};

const newOfferTotals = computed(() => calculateTotals(newOfferData.value.items, newOfferData.value.vat_rate));
const editedOfferTotals = computed(() =>
  calculateTotals(editedOfferData.value?.items, editedOfferData.value?.vat_rate)
);

// ================================================================================================
// OBSŁUGA API (CRUD dla Ofert)
// ================================================================================================

/**
 * Pobiera listę ofert z API z uwzględnieniem paginacji.
 */
async function fetchOffers() {
  isLoading.value = true;
  try {
    const params = new URLSearchParams({ page: String(currentPage.value) });
    const clientIdParam = route.query.clientId || (selectedClientFilter.value?.id ?? null);
    if (clientIdParam) params.append('clientId', String(clientIdParam));
    if (selectedStatuses.value.length) params.append('status', selectedStatuses.value.join(','));

    const response = await authenticatedFetch(`${API_URL}/api/offers?${params.toString()}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania ofert');

    offers.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;
  } catch (error) {
    console.error('Błąd podczas pobierania ofert:', error);
    toast.error(error.message);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Pobiera uproszczoną listę klientów na potrzeby formularzy (np. v-select).
 */
async function fetchClientsForSelect() {
  try {
    const response = await authenticatedFetch(`${API_URL}/api/clients-for-select`);
    if (!response.ok) throw new Error('Błąd pobierania listy klientów');
    availableClients.value = await response.json();
  } catch (error) {
    console.error('Błąd podczas pobierania klientów do formularza:', error);
  }
}

/**
 * Zapisuje nową ofertę w bazie danych.
 */
async function handleSaveOffer() {
  if (!newOfferData.value.clientId) {
    toast.warn('Proszę wybrać klienta.');
    return;
  }

  // Filtruj puste pozycje przed wysłaniem
  const payload = {
    ...newOfferData.value,
    items: newOfferData.value.items.filter((item) => item.name && item.quantity > 0),
  };

  if (!payload.items.length) {
    toast.warn('Dodaj co najmniej jedną poprawną pozycję (z nazwą i ilością).');
    return;
  }

  try {
    const response = await authenticatedFetch(`${API_URL}/api/offers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Błąd podczas zapisywania oferty.');
    }

    toast.success(`Oferta ${result.offerNumber} została utworzona.`);
    showAddOfferModal.value = false;
    await fetchOffers();
  } catch (error) {
    console.error('Błąd zapisu oferty:', error);
    toast.error(error.message);
  }
}

/**
 * Aktualizuje istniejącą ofertę w bazie danych.
 */
async function handleUpdateOffer() {
  if (!editedOfferData.value || !editedOfferData.value.client) {
    toast.warn('Proszę wybrać klienta.');
    return;
  }

  const payload = {
    ...editedOfferData.value,
    clientId: editedOfferData.value.client.id,
    items: editedOfferData.value.items.filter((item) => item.name && item.quantity > 0),
  };

  try {
    const response = await authenticatedFetch(`${API_URL}/api/offers/${editedOfferData.value.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Błąd podczas aktualizacji oferty.');
    }
    toast.success('Oferta zaktualizowana.');
    showEditOfferModal.value = false;
    await fetchOffers();
  } catch (error) {
    console.error('Błąd aktualizacji oferty:', error);
    toast.error(error.message);
  }
}

/**
 * Usuwa ofertę o podanym ID.
 * @param {number} offerId - ID oferty do usunięcia.
 */
async function handleDeleteOffer(offerId) {
  if (!confirm('Czy na pewno chcesz trwale usunąć tę ofertę?')) {
    return;
  }
  try {
    const response = await authenticatedFetch(`${API_URL}/api/offers/${offerId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć oferty.');
    }

    toast.success('Oferta usunięta.');
    await fetchOffers();
  } catch (error) {
    console.error('Błąd usuwania oferty:', error);
    toast.error(error.message);
  }
}

/**
 * Zmienia status oferty optymistycznie (UI + PATCH /status).
 */
async function changeOfferStatus(offer, newStatus) {
  if (!OFFER_STATUSES.includes(newStatus)) return;
  if (offer.status === newStatus) return;
  const previousStatus = offer.status;
  offer.status = newStatus; // optymistycznie

  try {
    const response = await authenticatedFetch(`${API_URL}/api/offers/${offer.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Nie udało się zmienić statusu.');
    }
    toast.success(`Status: ${getOfferStatusLabel(newStatus)}`);
  } catch (error) {
    offer.status = previousStatus; // rollback
    console.error(error);
    toast.error(error.message);
  }
}

/**
 * Pobiera i inicjuje pobieranie pliku PDF dla danej oferty.
 * @param {number} offerId - ID oferty.
 */
async function handleGeneratePdf(offerId) {
  try {
    // 1. Wykonaj zapytanie do serwera
    const response = await authenticatedFetch(`${API_URL}/api/offers/${offerId}/download`);

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas generowania pliku PDF.');
      } catch {
        throw new Error(`Błąd serwera: ${response.status} ${response.statusText}`);
      }
    }

    // 2. Pobierz nazwę pliku z nagłówka odpowiedzi
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = 'oferta.pdf';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
    }

    // 3. Utwórz obiekt Blob i tymczasowy URL
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // 4. Utwórz niewidzialny link i zasymuluj kliknięcie, aby pobrać plik
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // 5. Posprzątaj - zwolnij pamięć i usuń element
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Błąd podczas pobierania PDF:', error);
    toast.error(error.message);
  }
}

// ================================================================================================
// HANDLERY ZDARZEŃ I INTERAKCJI UŻYTKOWNIKA
// ================================================================================================

/**
 * Obsługuje zmianę strony w komponencie paginacji.
 * @param {number} newPage - Nowy numer strony.
 */
function handlePageChange(newPage) {
  currentPage.value = newPage;
  fetchOffers();
}

/**
 * Otwiera modal dodawania nowej oferty i inicjalizuje jego dane.
 */
function handleShowAddOfferModal() {
  newOfferData.value = initializeNewOffer();
  // Jeśli wchodzimy z ?clientId=, ustawiamy go domyślnie
  const cid = route.query.clientId;
  if (cid) {
    const id = Number(cid);
    if (!Number.isNaN(id)) newOfferData.value.clientId = id;
  }
  showAddOfferModal.value = true;
}

/**
 * Otwiera modal edycji, pobierając pełne dane oferty z API.
 * @param {number} offerId - ID oferty do edycji.
 */
async function handleShowEditModal(offerId) {
  editedOfferData.value = null;
  showEditOfferModal.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/offers/${offerId}`);
    if (!response.ok) throw new Error('Błąd pobierania danych oferty do edycji.');

    const fullOfferData = await response.json();
    fullOfferData.client = {
      id: fullOfferData.client_id,
      name: fullOfferData.client_name,
      phone_number: fullOfferData.client_phone,
    };
    if (!fullOfferData.status) fullOfferData.status = 'draft';
    editedOfferData.value = fullOfferData;
  } catch (error) {
    console.error(error);
    toast.error(error.message);
    showEditOfferModal.value = false;
  }
}

function toggleStatusFilter(status) {
  const idx = selectedStatuses.value.indexOf(status);
  if (idx === -1) selectedStatuses.value.push(status);
  else selectedStatuses.value.splice(idx, 1);
  currentPage.value = 1;
  fetchOffers();
}

function clearClientQueryFilter() {
  const q = { ...route.query };
  delete q.clientId;
  router.replace({ query: q });
}

function clearAllOfferFilters() {
  selectedStatuses.value = [];
  selectedClientFilter.value = null;
  if (route.query.clientId) clearClientQueryFilter();
  currentPage.value = 1;
  fetchOffers();
}

/**
 * Dodaje nową, pustą pozycję do listy w formularzu.
 * Dotyczy to zarówno modala dodawania, jak i edycji.
 */
function addOfferItem(isEditing = false) {
  const target = isEditing ? editedOfferData : newOfferData;
  target.value.items.push({ name: '', quantity: 1, unit: 'szt.', net_price: 0 });
}

/**
 * Usuwa pozycję z listy w formularzu o zadanym indeksie.
 * Dotyczy to zarówno modala dodawania, jak i edycji.
 * @param {number} index - Indeks pozycji do usunięcia.
 * @param {boolean} isEditing - Czy operacja dotyczy modala edycji.
 */
function removeOfferItem(index, isEditing = false) {
  const target = isEditing ? editedOfferData : newOfferData;
  target.value.items.splice(index, 1);
}

// ================================================================================================
// WATCHERS (OBSERWATORZY)
// ================================================================================================

/**
 * Obserwuje zmianę typu nowej oferty i automatycznie aktualizuje listę pozycji,
 * wczytując odpowiedni szablon.
 */
watch(
  () => newOfferData.value.offer_type,
  (newType) => {
    if (newType && OFFER_TEMPLATES[newType]) {
      newOfferData.value.items = JSON.parse(JSON.stringify(OFFER_TEMPLATES[newType]));
    } else {
      newOfferData.value.items = [{ name: '', quantity: 1, unit: 'szt.', net_price: 0 }];
    }
  },
  { deep: true }
);

watch(
  () => route.query.clientId,
  () => {
    currentPage.value = 1;
    fetchOffers();
  }
);

watch(selectedClientFilter, () => {
  currentPage.value = 1;
  fetchOffers();
});

function handleOffersKeydown(e) {
  if (!isAnyModalOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    showAddOfferModal.value = false;
    showEditOfferModal.value = false;
  } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (showAddOfferModal.value) handleSaveOffer();
    else if (showEditOfferModal.value) handleUpdateOffer();
  }
}

// ================================================================================================
// CYKL ŻYCIA KOMPONENTU
// ================================================================================================

/**
 * Funkcja wywoływana po zamontowaniu komponentu w DOM.
 * Pobiera początkowe dane.
 */
onMounted(() => {
  fetchClientsForSelect();
  fetchOffers();
  window.addEventListener('keydown', handleOffersKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleOffersKeydown);
});
</script>

<template>
  <div class="container">
    <div class="header">
      <div class="header-title-group">
        <h1>Generator Ofert</h1>
        <p class="header-subtitle">Wystawionych ofert: <strong>{{ totalItems }}</strong></p>
      </div>
      <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="handleShowAddOfferModal">&#43; Stwórz nową ofertę</button>
    </div>

    <!-- Toolbar filtrów -->
    <div class="offers-toolbar">
      <button
        type="button"
        class="filters-toggle"
        :class="{ active: showFilters }"
        @click="showFilters = !showFilters"
      >
        {{ showFilters ? '▲ Ukryj filtry' : '▼ Filtry' }}
        <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
      </button>

      <transition name="filters-slide">
        <div v-if="showFilters" class="filters-panel">
          <div class="filter-group">
            <label>Status:</label>
            <div class="chip-group">
              <button
                v-for="s in OFFER_STATUSES"
                :key="s"
                type="button"
                class="chip"
                :class="[`chip-status-${s}`, { selected: selectedStatuses.includes(s) }]"
                @click="toggleStatusFilter(s)"
              >
                {{ getOfferStatusLabel(s) }}
              </button>
            </div>
          </div>
          <div class="filter-group filter-client">
            <label>Klient:</label>
            <v-select
              v-model="selectedClientFilter"
              :options="availableClients"
              :get-option-label="(option) => option.name || 'Brak Nazwy'"
              :filter="filterClients"
              placeholder="-- Filtruj po kliencie --"
            >
              <template #option="{ name, phone_number }">
                <div><strong>{{ name || 'Brak nazwy' }}</strong><br /><small>{{ phone_number }}</small></div>
              </template>
              <template #selected-option="{ name, phone_number }">
                <div><strong>{{ name || 'Brak nazwy' }}</strong> <small>({{ phone_number }})</small></div>
              </template>
            </v-select>
          </div>
        </div>
      </transition>

      <div v-if="route.query.clientId || activeFilterCount" class="active-filters">
        <span
          v-if="route.query.clientId"
          class="active-chip client-chip"
          @click="clearClientQueryFilter"
          title="Usuń filtr klienta"
        >
          👤 Klient #{{ route.query.clientId }} ✕
        </span>
        <button type="button" class="clear-btn" @click="clearAllOfferFilters">Wyczyść filtry</button>
      </div>
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
                <th>Numer</th>
                <th>Klient (Telefon)</th>
                <th>Data</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Wartość Netto</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!offers.length && !isLoading">
                <td colspan="7" class="empty-table-message">
                  <p>Brak ofert do wyświetlenia.</p>
                </td>
              </tr>
              <tr v-for="offer in offers" :key="offer.id">
                <td data-label="Numer">
                  <strong>{{ offer.offer_number }}</strong>
                </td>
                <td data-label="Klient (Telefon)">
                  <RouterLink v-if="offer.client_id" :to="`/klienci/${offer.client_id}`" class="client-link">
                    <strong>{{ offer.client_name || 'Brak' }}</strong>
                  </RouterLink>
                  <strong v-else>{{ offer.client_name || 'Brak' }}</strong>
                  <br />
                  <small>{{ offer.client_phone }}</small>
                </td>
                <td data-label="Data">{{ offer.issue_date }}</td>
                <td data-label="Typ">
                  <span class="offer-type-badge">{{ getOfferTypeLabel(offer.offer_type) }}</span>
                </td>
                <td data-label="Status" class="status-cell">
                  <select
                    v-if="userRole !== 'viewer'"
                    class="status-select"
                    :class="`status-${offer.status || 'draft'}`"
                    :value="offer.status || 'draft'"
                    @change="changeOfferStatus(offer, $event.target.value)"
                  >
                    <option v-for="s in OFFER_STATUSES" :key="s" :value="s">{{ getOfferStatusLabel(s) }}</option>
                  </select>
                  <span v-else class="status-badge" :class="`status-${offer.status || 'draft'}`">
                    {{ getOfferStatusLabel(offer.status) }}
                  </span>
                </td>
                <td data-label="Wartość Netto">
                  <strong>{{ formatCurrency(offer.total_net_value) }}</strong>
                </td>
                <td data-label="Akcje" class="actions-cell">
                  <div class="actions-cell-inner">
                    <button class="zapisz" @click="handleGeneratePdf(offer.id)">PDF</button>
                    <button
                      v-if="userRole !== 'viewer' && (offer.status === 'draft' || !offer.status)"
                      class="btn-quick btn-quick-sent"
                      @click="changeOfferStatus(offer, 'sent')"
                      title="Oznacz jako wysłaną"
                    >Wyślij</button>
                    <button
                      v-if="userRole !== 'viewer' && offer.status === 'sent'"
                      class="btn-quick btn-quick-accept"
                      @click="changeOfferStatus(offer, 'accepted')"
                      title="Oznacz jako zaakceptowaną"
                    >Akcept.</button>
                    <button
                      v-if="userRole !== 'viewer' && offer.status === 'sent'"
                      class="btn-quick btn-quick-reject"
                      @click="changeOfferStatus(offer, 'rejected')"
                      title="Oznacz jako odrzuconą"
                    >Odrzuć</button>
                    <button v-if="userRole === 'admin' || userRole === 'editor'" class="edytuj" @click="handleShowEditModal(offer.id)">Edytuj</button>
                    <RouterLink v-if="offer.client_id" :to="`/klienci/${offer.client_id}`" class="action-link">
                      <button class="karta">Karta</button>
                    </RouterLink>
                    <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteOffer(offer.id)">Usuń</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
      </div>
    </div>

    <div v-if="showAddOfferModal" class="modal-backdrop" @click.self="showAddOfferModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nowa Oferta</h3>
          <button class="close-button" @click="showAddOfferModal = false">&times;</button>
        </div>
        <form @submit.prevent="handleSaveOffer">
          <div class="form-grid-single-col">
            <div class="details-section">
              <h4>Dane Główne</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Wybierz profil firmy</label>
                  <select v-model="newOfferData.company_profile_key">
                    <option value="firma_a">Wierttrans</option>
                    <option value="firma_b">MDS Studnie</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Klient</label>
                  <v-select
                    v-model="newOfferData.clientId"
                    :options="availableClients"
                    :get-option-label="(option) => option.name || 'Brak Nazwy'"
                    :filter="filterClients"
                    :reduce="(client) => client.id"
                    placeholder="-- Wybierz klienta --"
                  >
                    <template #option="{ name, phone_number }">
                      <div>
                        <strong>{{ name || 'Brak nazwy' }}</strong>
                        <br />
                        <small>{{ phone_number }}</small>
                      </div>
                    </template>
                    <template #selected-option="{ name, phone_number }">
                      <div>
                        <strong>{{ name || 'Brak nazwy' }}</strong>
                        <small> ({{ phone_number }})</small>
                      </div>
                    </template>
                  </v-select>
                </div>
                <div class="form-group">
                  <label>Data wystawienia</label>
                  <input v-model="newOfferData.issue_date" type="date" required />
                </div>
                <div class="form-group">
                  <label>Typ Oferty</label>
                  <select v-model="newOfferData.offer_type">
                    <option value="connection">Podłączenie Studni</option>
                    <option value="drilling">Wykonanie Studni</option>
                    <option value="station">Stacja Uzdatniania</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Stawka VAT (%)</label>
                  <input v-model.number="newOfferData.vat_rate" type="number" />
                </div>
                <div class="form-group">
                  <label>Status oferty</label>
                  <select v-model="newOfferData.status">
                    <option v-for="s in OFFER_STATUSES" :key="s" :value="s">{{ getOfferStatusLabel(s) }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h4>Pozycje w ofercie</h4>
              <div class="offer-items-shell">
                <div class="offer-item-grid offer-item-grid--header">
                  <div>Lp.</div>
                  <div>Nazwa towaru / usługi</div>
                  <div>Ilość</div>
                  <div>J.m.</div>
                  <div>Cena netto</div>
                  <div>Wartość</div>
                  <div>Akcje</div>
                </div>
                <div v-for="(item, index) in newOfferData.items" :key="index" class="offer-item-grid offer-item-grid--row">
                  <div class="item-col item-col--index">
                    <span class="item-col-label">Lp.</span>
                    <strong>{{ index + 1 }}</strong>
                  </div>
                  <div class="item-col item-col--name">
                    <span class="item-col-label">Nazwa towaru / usługi</span>
                    <textarea v-model="item.name" rows="2" class="item-name-input" placeholder="np. Pompa głębinowa z osprzętem i montażem"></textarea>
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">Ilość</span>
                    <input v-model.number="item.quantity" type="number" step="any" />
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">J.m.</span>
                    <input v-model="item.unit" type="text" />
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">Cena netto</span>
                    <input v-model.number="item.net_price" type="number" step="any" />
                  </div>
                  <div class="item-col item-col--line-total">
                    <span class="item-col-label">Wartość</span>
                    <span class="line-total-cell">{{ formatCurrency((item.quantity || 0) * (item.net_price || 0)) }}</span>
                  </div>
                  <div class="item-col item-col--actions">
                    <span class="item-col-label">Akcje</span>
                    <button type="button" class="usun" @click="removeOfferItem(index, false)">Usuń</button>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-secondary add-item-btn" @click="addOfferItem(false)">+ Dodaj kolejną pozycję</button>
            </div>

            <div class="details-section">
              <h4>Podsumowanie</h4>
              <div class="totals-card">
                <p><span>Razem netto</span><strong>{{ formatCurrency(newOfferTotals.net) }}</strong></p>
                <p><span>VAT ({{ newOfferData.vat_rate || 0 }}%)</span><strong>{{ formatCurrency(newOfferTotals.vat) }}</strong></p>
                <p class="total-gross"><span>Razem brutto</span><strong>{{ formatCurrency(newOfferTotals.gross) }}</strong></p>
              </div>
            </div>

            <div class="details-section">
              <h4>Notatki i dodatkowe warunki</h4>
              <div class="form-group">
                <textarea v-model="newOfferData.notes" rows="4" placeholder="np. Termin ważności oferty, warunki płatności..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <span class="hint">💡 Ctrl+S aby zapisać, Esc aby anulować</span>
            <div class="modal-actions-buttons">
              <button type="button" class="anuluj" @click="showAddOfferModal = false">Anuluj</button>
              <button type="submit" class="zapisz">Zapisz Ofertę</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditOfferModal" class="modal-backdrop" @click.self="showEditOfferModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edytuj Ofertę nr {{ editedOfferData?.offer_number }}</h3>
          <button class="close-button" @click="showEditOfferModal = false">&times;</button>
        </div>
        <div v-if="!editedOfferData" class="loading-modal-content">
          <div class="spinner"></div>
        </div>
        <form v-else @submit.prevent="handleUpdateOffer">
          <div class="form-grid-single-col">
            <div class="details-section">
              <h4>Dane Główne</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Klient</label>
                  <v-select
                    v-model="editedOfferData.client"
                    :options="availableClients"
                    :get-option-label="(option) => option.name || 'Brak Nazwy'"
                    :filter="filterClients"
                    placeholder="-- Wybierz klienta --"
                  >
                    <template #option="{ name, phone_number }">
                      <div>
                        <strong>{{ name || 'Brak nazwy' }}</strong
                        ><br />
                        <small>{{ phone_number }}</small>
                      </div>
                    </template>
                    <template #selected-option="{ name, phone_number }">
                      <div>
                        <strong>{{ name || 'Brak nazwy' }}</strong>
                        <small> ({{ phone_number }})</small>
                      </div>
                    </template>
                  </v-select>
                </div>
                <div class="form-group">
                  <label>Data wystawienia</label>
                  <input v-model="editedOfferData.issue_date" type="date" required />
                </div>
                <div class="form-group">
                  <label>Typ Oferty</label>
                  <select v-model="editedOfferData.offer_type" disabled>
                    <option value="connection">Podłączenie Studni</option>
                    <option value="drilling">Wykonanie Studni</option>
                    <option value="station">Stacja Uzdatniania</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Stawka VAT (%)</label>
                  <input v-model.number="editedOfferData.vat_rate" type="number" />
                </div>
                <div class="form-group">
                  <label>Status oferty</label>
                  <select v-model="editedOfferData.status">
                    <option v-for="s in OFFER_STATUSES" :key="s" :value="s">{{ getOfferStatusLabel(s) }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h4>Pozycje w ofercie</h4>
              <div class="offer-items-shell">
                <div class="offer-item-grid offer-item-grid--header">
                  <div>Lp.</div>
                  <div>Nazwa towaru / usługi</div>
                  <div>Ilość</div>
                  <div>J.m.</div>
                  <div>Cena netto</div>
                  <div>Wartość</div>
                  <div>Akcje</div>
                </div>
                <div v-for="(item, index) in editedOfferData.items" :key="index" class="offer-item-grid offer-item-grid--row">
                  <div class="item-col item-col--index">
                    <span class="item-col-label">Lp.</span>
                    <strong>{{ index + 1 }}</strong>
                  </div>
                  <div class="item-col item-col--name">
                    <span class="item-col-label">Nazwa towaru / usługi</span>
                    <textarea v-model="item.name" rows="2" class="item-name-input" placeholder="np. Pompa głębinowa z osprzętem i montażem"></textarea>
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">Ilość</span>
                    <input v-model.number="item.quantity" type="number" step="any" />
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">J.m.</span>
                    <input v-model="item.unit" type="text" />
                  </div>
                  <div class="item-col">
                    <span class="item-col-label">Cena netto</span>
                    <input v-model.number="item.net_price" type="number" step="any" />
                  </div>
                  <div class="item-col item-col--line-total">
                    <span class="item-col-label">Wartość</span>
                    <span class="line-total-cell">{{ formatCurrency((item.quantity || 0) * (item.net_price || 0)) }}</span>
                  </div>
                  <div class="item-col item-col--actions">
                    <span class="item-col-label">Akcje</span>
                    <button type="button" class="usun" @click="removeOfferItem(index, true)">Usuń</button>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-secondary add-item-btn" @click="addOfferItem(true)">+ Dodaj kolejną pozycję</button>
            </div>

            <div class="details-section">
              <h4>Podsumowanie</h4>
              <div class="totals-card">
                <p><span>Razem netto</span><strong>{{ formatCurrency(editedOfferTotals.net) }}</strong></p>
                <p><span>VAT ({{ editedOfferData.vat_rate || 0 }}%)</span><strong>{{ formatCurrency(editedOfferTotals.vat) }}</strong></p>
                <p class="total-gross"><span>Razem brutto</span><strong>{{ formatCurrency(editedOfferTotals.gross) }}</strong></p>
              </div>
            </div>

            <div class="details-section">
              <h4>Notatki i dodatkowe warunki</h4>
              <div class="form-group">
                <textarea v-model="editedOfferData.notes" rows="4" placeholder="np. Termin ważności oferty, warunki płatności..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <span class="hint">💡 Ctrl+S aby zapisać, Esc aby anulować</span>
            <div class="modal-actions-buttons">
              <button type="button" class="anuluj" @click="showEditOfferModal = false">Anuluj</button>
              <button type="submit" class="zapisz">Zapisz Zmiany</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}
.header {
  margin-bottom: 18px;
}
.header-title-group h1 {
  margin-bottom: 4px;
  font-size: 28px;
  color: #163252;
}
.header-subtitle {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 14px;
}
.offer-type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #0c4678;
  background: #e8f3ff;
}
.table-container table {
  margin-top: 0.3rem;
}
.table-container th {
  background: #f3f7fb;
  color: #3c5165;
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.table-container td {
  color: #314255;
}
.table-container tbody tr:hover {
  background: #f7fbff;
}
.actions-cell {
  white-space: nowrap;
}
/* Grupowanie stylów dla sekcji w formularzu */
.details-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #e5ebf1;
}
.details-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.details-section h4 {
  margin-top: 0;
  margin-bottom: 14px;
  color: #1a3655;
  font-size: 17px;
}

/* Układ jednokolumnowy dla formularza */
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Tabela z pozycjami oferty (Grid Layout) */
.offer-items-shell {
  border: 1px solid #e3e8ee;
  border-radius: 12px;
  background: #f7f9fc;
  padding: 12px;
}
.offer-item-grid {
  display: grid;
  grid-template-columns: 34px minmax(320px, 4fr) minmax(88px, 1fr) minmax(80px, 1fr) minmax(130px, 1.4fr) minmax(130px, 1.4fr) 92px;
  gap: 10px;
}
.offer-item-grid--header {
  font-weight: 700;
  font-size: 12px;
  color: #4a5b6b;
  padding: 0 0 10px;
  border-bottom: 1px solid #dfe6ee;
  margin-bottom: 10px;
}
.offer-item-grid--row {
  align-items: center;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e7edf3;
  border-radius: 10px;
}
.offer-item-grid--row + .offer-item-grid--row {
  margin-top: 10px;
}
.item-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item-col strong {
  color: #12283e;
}
.item-col input,
.item-col textarea {
  border: 1px solid #cfd9e5;
  border-radius: 8px;
  padding: 10px 11px;
  font-size: 14px;
  background: #fff;
}
.item-col input:focus,
.item-col textarea:focus {
  outline: 0;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.14);
}
.item-col-label {
  display: none;
  font-size: 11px;
  font-weight: 700;
  color: #607488;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.item-col--index {
  align-items: center;
  justify-content: center;
}
.item-col--name {
  grid-column: auto;
}
.item-name-input {
  min-height: 64px;
  resize: vertical;
  line-height: 1.35;
}
.item-col--line-total {
  justify-content: center;
}
.item-col--actions {
  justify-content: center;
}
.item-col--actions button {
  width: 100%;
}
.add-item-btn {
  margin-top: 12px;
}

/* Styl dla przycisku drugorzędnego */
.btn-secondary {
  background-color: var(--grey);
}
.line-total-cell {
  font-weight: 600;
  color: #1f3245;
  align-self: center;
  min-height: 42px;
  display: flex;
  align-items: center;
}
.totals-card {
  background: #f7f9fc;
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  padding: 12px 14px;
  max-width: 420px;
}
.totals-card p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  color: #44576a;
}
.totals-card p + p {
  border-top: 1px dashed #d6dee8;
}
.totals-card .total-gross {
  color: #10263f;
  font-size: 16px;
}
.totals-card .total-gross strong {
  color: #0f7a37;
}

/* Ulepszona obsługa pustej tabeli */
.empty-table-message {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-secondary);
}
.loading-modal-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
.modal-content {
  max-width: 1160px;
}
.modal-header {
  background: #f5f9fd;
}
.modal-header h3 {
  color: #1a3655;
}
/* ===== Toolbar filtrów ===== */
.offers-toolbar {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.filters-toggle {
  align-self: flex-start;
  background-color: var(--background-light-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.filters-toggle:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  background-color: #e9ecef;
}
.filters-toggle.active {
  background-color: var(--blue);
  color: #fff;
  border-color: var(--blue);
}
.filter-count {
  background-color: var(--red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 7px;
  min-width: 18px;
  text-align: center;
}
.filters-panel {
  background-color: var(--background-light-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}
.filter-client {
  flex: 1 1 320px;
}
.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  background-color: #fff;
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  border-color: var(--blue);
}
.chip.selected.chip-status-draft {
  background-color: #e2e3e5;
  border-color: #6c757d;
  color: #383d41;
}
.chip.selected.chip-status-sent {
  background-color: #cfe2ff;
  border-color: #3d8bfd;
  color: #084298;
}
.chip.selected.chip-status-accepted {
  background-color: #d1f0d8;
  border-color: #48bb6f;
  color: #1c6d35;
}
.chip.selected.chip-status-rejected {
  background-color: #f8d7da;
  border-color: #dc3545;
  color: #721c24;
}
.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.active-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.client-chip {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
.client-chip:hover {
  background-color: #c1e7ed;
}
.clear-btn {
  background-color: transparent;
  color: var(--text-color-secondary);
  border: 1px dashed var(--border-color);
  padding: 6px 12px;
  font-size: 13px;
}
.clear-btn:hover:not(:disabled) {
  transform: none;
  box-shadow: none;
  color: var(--red);
  border-color: var(--red);
}
.filters-slide-enter-from,
.filters-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.filters-slide-enter-active,
.filters-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

/* ===== Klient link + status w tabeli ===== */
.client-link {
  color: var(--text-color);
  text-decoration: none;
  border-bottom: 1px dotted var(--border-color);
}
.client-link:hover {
  color: var(--blue);
  border-bottom-color: var(--blue);
}
.status-cell {
  white-space: nowrap;
}
.status-select {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 5px 28px 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background-position: right 8px center;
  background-repeat: no-repeat;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #fff 50%), linear-gradient(135deg, #fff 50%, transparent 50%);
  background-size: 5px 5px, 5px 5px;
  background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
}
.status-select.status-draft {
  background-color: #6c757d;
  border-color: #6c757d;
}
.status-select.status-sent {
  background-color: #3d8bfd;
  border-color: #3d8bfd;
}
.status-select.status-accepted {
  background-color: #48bb6f;
  border-color: #48bb6f;
}
.status-select.status-rejected {
  background-color: #dc3545;
  border-color: #dc3545;
}
.status-select option {
  color: var(--text-color);
  background: #fff;
}
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background-color: #6c757d;
}
.status-badge.status-sent {
  background-color: #3d8bfd;
}
.status-badge.status-accepted {
  background-color: #48bb6f;
}
.status-badge.status-rejected {
  background-color: #dc3545;
}

/* ===== Szybkie akcje w wierszu ===== */
.action-link {
  display: inline-block;
}
.btn-quick {
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}
.btn-quick-sent {
  background-color: #3d8bfd;
}
.btn-quick-accept {
  background-color: #48bb6f;
}
.btn-quick-reject {
  background-color: #dc3545;
}
button.karta {
  background-color: #8a2be2;
}

/* ===== Modal: stopka z hintem ===== */
.modal-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
}
.modal-actions-buttons {
  display: flex;
  gap: 10px;
}
.hint {
  font-size: 12px;
  color: var(--text-color-secondary);
}

@media (max-width: 1200px) {
  .offer-item-grid {
    grid-template-columns: 28px minmax(250px, 3fr) minmax(74px, 1fr) minmax(72px, 1fr) minmax(120px, 1.2fr) minmax(110px, 1.2fr) 86px;
  }
}
@media (max-width: 900px) {
  .header-title-group h1 {
    font-size: 24px;
  }
  .offer-item-grid--header {
    display: none;
  }
  .offer-item-grid--row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px;
  }
  .item-col-label {
    display: inline;
  }
  .item-col--index {
    align-items: flex-start;
  }
  .item-col--line-total {
    padding: 4px 0;
    border-top: 1px dashed #dce5ef;
  }
  .line-total-cell {
    min-height: 0;
  }
  .item-col--actions button {
    max-width: 160px;
  }
  .totals-card {
    max-width: 100%;
  }
}
</style>
