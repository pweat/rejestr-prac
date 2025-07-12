<script setup>
// ================================================================================================
// IMPORTS
// ================================================================================================
import { ref, onMounted, watch } from 'vue';
import { getAuthHeaders, getUserRole } from '../auth/auth.js';
import vSelect from 'vue-select';
import PaginationControls from '../components/PaginationControls.vue';

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
    vat_rate: 23,
    notes: 'Termin ważności oferty: 14 dni. \nGwarancja na wykonane usługi: 24 miesiące.',
    // Głęboka kopia pozycji z szablonu, aby uniknąć referencji
    items: JSON.parse(JSON.stringify(OFFER_TEMPLATES[defaultOfferType])),
  };
};

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

// ================================================================================================
// OBSŁUGA API (CRUD dla Ofert)
// ================================================================================================

/**
 * Pobiera listę ofert z API z uwzględnieniem paginacji.
 */
async function fetchOffers() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/api/offers?page=${currentPage.value}`, {
      headers: getAuthHeaders(),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Błąd pobierania ofert');

    offers.value = result.data;
    totalPages.value = result.pagination.totalPages;
    totalItems.value = result.pagination.totalItems;
    currentPage.value = result.pagination.currentPage;
  } catch (error) {
    console.error('Błąd podczas pobierania ofert:', error);
    alert(error.message);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Pobiera uproszczoną listę klientów na potrzeby formularzy (np. v-select).
 */
async function fetchClientsForSelect() {
  try {
    const response = await fetch(`${API_URL}/api/clients-for-select`, {
      headers: getAuthHeaders(),
    });
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
    alert('Proszę wybrać klienta.');
    return;
  }

  // Filtruj puste pozycje przed wysłaniem
  const payload = {
    ...newOfferData.value,
    items: newOfferData.value.items.filter((item) => item.name && item.quantity > 0),
  };

  if (!payload.items.length) {
    alert('Proszę dodać co najmniej jedną poprawną pozycję do oferty (z nazwą i ilością).');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Błąd podczas zapisywania oferty.');
    }

    alert(`Oferta ${result.offerNumber} została pomyślnie utworzona!`);
    showAddOfferModal.value = false;
    await fetchOffers(); // Odśwież listę
  } catch (error) {
    console.error('Błąd zapisu oferty:', error);
    alert(error.message);
  }
}

/**
 * Aktualizuje istniejącą ofertę w bazie danych.
 */
async function handleUpdateOffer() {
  if (!editedOfferData.value || !editedOfferData.value.client) {
    alert('Proszę wybrać klienta.');
    return;
  }

  const payload = {
    ...editedOfferData.value,
    clientId: editedOfferData.value.client.id, // Używamy ID z obiektu klienta
    items: editedOfferData.value.items.filter((item) => item.name && item.quantity > 0),
  };

  try {
    const response = await fetch(`${API_URL}/api/offers/${editedOfferData.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Błąd podczas aktualizacji oferty.');
    }
    alert('Oferta pomyślnie zaktualizowana!');
    showEditOfferModal.value = false;
    await fetchOffers(); // Odśwież listę
  } catch (error) {
    console.error('Błąd aktualizacji oferty:', error);
    alert(error.message);
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
    const response = await fetch(`${API_URL}/api/offers/${offerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok && response.status !== 204) {
      const result = await response.json();
      throw new Error(result.error || 'Nie udało się usunąć oferty.');
    }

    alert('Oferta została pomyślnie usunięta.');
    await fetchOffers(); // Odśwież listę
  } catch (error) {
    console.error('Błąd usuwania oferty:', error);
    alert(error.message);
  }
}

/**
 * Pobiera i inicjuje pobieranie pliku PDF dla danej oferty.
 * @param {number} offerId - ID oferty.
 */
async function handleGeneratePdf(offerId) {
  try {
    // 1. Wykonaj zapytanie do serwera
    const response = await fetch(`${API_URL}/api/offers/${offerId}/download`, {
      headers: getAuthHeaders(),
    });

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
    alert(error.message);
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
  showAddOfferModal.value = true;
}

/**
 * Otwiera modal edycji, pobierając pełne dane oferty z API.
 * @param {number} offerId - ID oferty do edycji.
 */
async function handleShowEditModal(offerId) {
  editedOfferData.value = null; // Zresetuj dane na wypadek błędu
  showEditOfferModal.value = true;
  try {
    const response = await fetch(`${API_URL}/api/offers/${offerId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Błąd pobierania danych oferty do edycji.');

    const fullOfferData = await response.json();
    // Przygotuj obiekt klienta w formacie wymaganym przez v-select
    fullOfferData.client = {
      id: fullOfferData.client_id,
      name: fullOfferData.client_name,
      phone_number: fullOfferData.client_phone,
    };
    editedOfferData.value = fullOfferData;
  } catch (error) {
    console.error(error);
    alert(error.message);
    showEditOfferModal.value = false; // Zamknij modal w przypadku błędu
  }
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
      // Głęboka kopia, by uniknąć mutacji oryginalnego szablonu
      newOfferData.value.items = JSON.parse(JSON.stringify(OFFER_TEMPLATES[newType]));
    } else {
      // Jeśli brak szablonu, wstaw pusty wiersz
      newOfferData.value.items = [{ name: '', quantity: 1, unit: 'szt.', net_price: 0 }];
    }
  },
  { deep: true } // Konieczne do obserwacji właściwości obiektu
);

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
});
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Generator Ofert ({{ totalItems }})</h1>
      <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="handleShowAddOfferModal">&#43; Stwórz nową ofertę</button>
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
                <th>Numer Oferty</th>
                <th>Klient (Telefon)</th>
                <th>Miejscowość</th>
                <th>Data Wystawienia</th>
                <th>Wartość Netto</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!offers.length && !isLoading">
                <td colspan="6" class="empty-table-message">
                  <p>Brak ofert do wyświetlenia. Stwórz pierwszą!</p>
                </td>
              </tr>
              <tr v-for="offer in offers" :key="offer.id">
                <td data-label="Numer Oferty">{{ offer.offer_number }}</td>
                <td data-label="Klient (Telefon)">
                  {{ offer.client_name || 'Brak' }}<br />
                  <small>{{ offer.client_phone }}</small>
                </td>
                <td data-label="Miejscowość">{{ offer.client_address || '-' }}</td>
                <td data-label="Data Wystawienia">{{ offer.issue_date }}</td>
                <td data-label="Wartość Netto">{{ parseFloat(offer.total_net_value).toFixed(2) }} zł</td>
                <td data-label="Akcje" class="actions-cell">
                  <button class="zapisz" @click="handleGeneratePdf(offer.id)">Generuj PDF</button>
                  <button v-if="userRole === 'admin' || userRole === 'editor'" class="edytuj" @click="handleShowEditModal(offer.id)">Edytuj</button>
                  <button v-if="userRole === 'admin'" class="usun" @click="handleDeleteOffer(offer.id)">Usuń</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationControls v-if="totalPages > 1" :current-page="currentPage" :total-pages="totalPages" @page-changed="handlePageChange" />
      </div>
    </div>

    <div v-if="showAddOfferModal" class="modal-backdrop">
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
              </div>
            </div>

            <div class="details-section">
              <h4>Pozycje w ofercie</h4>
              <div class="offer-items-table">
                <div class="offer-item-header">
                  <div>Lp.</div>
                  <div>Nazwa towaru / usługi</div>
                  <div>Ilość</div>
                  <div>J.m.</div>
                  <div>Cena netto</div>
                  <div>Akcje</div>
                </div>
                <div v-for="(item, index) in newOfferData.items" :key="index" class="offer-item-row">
                  <div>{{ index + 1 }}</div>
                  <div>
                    <input v-model="item.name" type="text" placeholder="np. Pompa głębinowa" />
                  </div>
                  <div><input v-model.number="item.quantity" type="number" step="any" /></div>
                  <div><input v-model="item.unit" type="text" /></div>
                  <div><input v-model.number="item.net_price" type="number" step="any" /></div>
                  <div>
                    <button type="button" class="usun" @click="removeOfferItem(index, false)">Usuń</button>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-secondary" style="margin-top: 10px" @click="addOfferItem(false)">+ Dodaj kolejną pozycję</button>
            </div>

            <div class="details-section">
              <h4>Notatki i dodatkowe warunki</h4>
              <div class="form-group">
                <textarea v-model="newOfferData.notes" rows="4" placeholder="np. Termin ważności oferty, warunki płatności..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="zapisz">Zapisz Ofertę</button>
            <button type="button" class="anuluj" @click="showAddOfferModal = false">Anuluj</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditOfferModal" class="modal-backdrop">
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
              </div>
            </div>

            <div class="details-section">
              <h4>Pozycje w ofercie</h4>
              <div class="offer-items-table">
                <div class="offer-item-header">
                  <div>Lp.</div>
                  <div>Nazwa towaru / usługi</div>
                  <div>Ilość</div>
                  <div>J.m.</div>
                  <div>Cena netto</div>
                  <div>Akcje</div>
                </div>
                <div v-for="(item, index) in editedOfferData.items" :key="index" class="offer-item-row">
                  <div>{{ index + 1 }}</div>
                  <div>
                    <input v-model="item.name" type="text" placeholder="np. Pompa głębinowa" />
                  </div>
                  <div><input v-model.number="item.quantity" type="number" step="any" /></div>
                  <div><input v-model="item.unit" type="text" /></div>
                  <div><input v-model.number="item.net_price" type="number" step="any" /></div>
                  <div>
                    <button type="button" class="usun" @click="removeOfferItem(index, true)">Usuń</button>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-secondary" style="margin-top: 10px" @click="addOfferItem(true)">+ Dodaj kolejną pozycję</button>
            </div>

            <div class="details-section">
              <h4>Notatki i dodatkowe warunki</h4>
              <div class="form-group">
                <textarea v-model="editedOfferData.notes" rows="4" placeholder="np. Termin ważności oferty, warunki płatności..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="zapisz">Zapisz Zmiany</button>
            <button type="button" class="anuluj" @click="showEditOfferModal = false">Anuluj</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Grupowanie stylów dla sekcji w formularzu */
.details-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}
.details-section:first-child {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
.details-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

/* Układ jednokolumnowy dla formularza */
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Tabela z pozycjami oferty (Grid Layout) */
.offer-items-table {
  display: grid;
  /* Definicja kolumn: Lp, Nazwa, Ilość, J.m., Cena, Akcje */
  grid-template-columns: 30px 4fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  align-items: center;
}
.offer-item-header,
.offer-item-row {
  /* Kluczowa właściwość, która "wypłaszcza" te elementy,
     a ich dzieci stają się bezpośrednimi komórkami siatki */
  display: contents;
}
.offer-item-header {
  font-weight: bold;
  font-size: 13px;
  padding-bottom: 5px;
}
/* Dodatkowy padding dla lepszego wyglądu komórek */
.offer-items-table > div > div {
  padding-bottom: 10px;
}

/* Styl dla przycisku drugorzędnego */
.btn-secondary {
  background-color: var(--grey);
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
</style>
