<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAuthHeaders, getUserRole } from '../auth/auth.js';
import vSelect from 'vue-select';
import PaginationControls from '../components/PaginationControls.vue';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const userRole = getUserRole();

// --- Stan dla listy ofert i paginacji ---
const isLoading = ref(true);
const offers = ref([]);
const currentPage = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);

// --- Stan dla modala dodawania oferty ---
const showAddOfferModal = ref(false);
const availableClients = ref([]);
const newOfferData = ref({});

// --- Funkcje Pomocnicze ---
const initializeNewOffer = () => ({
  clientId: null,
  issue_date: new Date().toISOString().slice(0, 10),
  offer_type: 'connection', // Domyślny typ oferty
  vat_rate: 23,
  notes: '',
  items: [
    // Zaczynamy od jednego pustego wiersza
    { name: '', quantity: 1, unit: 'szt.', net_price: 0 },
  ],
});

const filterClients = (options, search) => {
  const lowerSearch = search.toLowerCase();
  return options.filter((client) => {
    const nameMatch = client.name && client.name.toLowerCase().includes(lowerSearch);
    const phoneMatch = client.phone_number && client.phone_number.includes(lowerSearch);
    return nameMatch || phoneMatch;
  });
};

// --- Funkcje Główne (API i Handlery) ---

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

function handlePageChange(newPage) {
  currentPage.value = newPage;
  fetchOffers();
}

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

function handleShowAddOfferModal() {
  newOfferData.value = initializeNewOffer();
  showAddOfferModal.value = true;
}

function addOfferItem() {
  newOfferData.value.items.push({ name: '', quantity: 1, unit: 'szt.', net_price: 0 });
}

function removeOfferItem(index) {
  newOfferData.value.items.splice(index, 1);
}

async function handleSaveOffer() {
  if (!newOfferData.value.clientId) {
    alert('Proszę wybrać klienta.');
    return;
  }

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
    await fetchOffers(); // Odświeżamy listę ofert
  } catch (error) {
    console.error('Błąd zapisu oferty:', error);
    alert(error.message);
  }
}

onMounted(() => {
  fetchClientsForSelect();
  fetchOffers();
});
</script>

<template>
  <div class="container">
    <div class="container">
      <div class="header">
        <h1>Generator Ofert ({{ totalItems }})</h1>
        <button v-if="userRole !== 'viewer'" class="add-new-btn" @click="handleShowAddOfferModal">
          &#43; Stwórz nową ofertę
        </button>
      </div>

      <div class="main-content-wrapper">
        <div v-if="isLoading" class="loading-overlay"><div class="spinner"></div></div>
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
                <tr v-for="offer in offers" :key="offer.id">
                  <td data-label="Numer Oferty">{{ offer.offer_number }}</td>
                  <td data-label="Klient (Telefon)">
                    {{ offer.client_name || 'Brak' }}<br /><small>{{ offer.client_phone }}</small>
                  </td>
                  <td data-label="Miejscowość">{{ offer.client_address || '-' }}</td>
                  <td data-label="Data Wystawienia">{{ offer.issue_date }}</td>
                  <td data-label="Wartość Netto">
                    {{ parseFloat(offer.total_net_value).toFixed(2) }} zł
                  </td>
                  <td data-label="Akcje" class="actions-cell"></td>
                </tr>
              </tbody>
            </table>
            <div v-if="!offers.length && !isLoading" class="empty-table-message">
              <p>Brak ofert do wyświetlenia. Stwórz pierwszą!</p>
            </div>
          </div>
          <PaginationControls
            v-if="totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            @page-changed="handlePageChange"
          />
        </div>
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
                  <label>Klient</label>
                  <v-select
                    :options="availableClients"
                    :get-option-label="(option) => option.name || 'Brak Nazwy'"
                    :filter="filterClients"
                    :reduce="(client) => client.id"
                    v-model="newOfferData.clientId"
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
                  <input type="date" v-model="newOfferData.issue_date" required />
                </div>
                <div class="form-group">
                  <label>Typ Oferty</label>
                  <select v-model="newOfferData.offer_type">
                    <option value="connection">Podłączenie Studni</option>
                    <option value="drilling">Wykonanie Studni</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Stawka VAT (%)</label>
                  <input type="number" v-model.number="newOfferData.vat_rate" />
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
                <div
                  v-for="(item, index) in newOfferData.items"
                  :key="index"
                  class="offer-item-row"
                >
                  <div>{{ index + 1 }}</div>
                  <div>
                    <input type="text" v-model="item.name" placeholder="np. Pompa głębinowa" />
                  </div>
                  <div><input type="number" step="any" v-model.number="item.quantity" /></div>
                  <div><input type="text" v-model="item.unit" /></div>
                  <div><input type="number" step="any" v-model.number="item.net_price" /></div>
                  <div>
                    <button type="button" class="usun" @click="removeOfferItem(index)">Usuń</button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="btn-secondary"
                @click="addOfferItem"
                style="margin-top: 10px"
              >
                + Dodaj kolejną pozycję
              </button>
            </div>

            <div class="details-section">
              <h4>Notatki i dodatkowe warunki</h4>
              <div class="form-group">
                <textarea
                  v-model="newOfferData.notes"
                  rows="4"
                  placeholder="np. Termin ważności oferty, warunki płatności..."
                ></textarea>
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
  </div>
</template>
<style scoped>
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
.form-grid-single-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.offer-items-table {
  display: grid;
  grid-template-columns: 30px 4fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  align-items: center;
}
.offer-item-header {
  display: contents; /* Dzieci stają się częścią siatki rodzica */
  font-weight: bold;
  font-size: 13px;
  padding-bottom: 5px;
}
.offer-item-row {
  display: contents; /* Dzieci stają się częścią siatki rodzica */
}
.offer-items-table > div > div {
  padding-bottom: 10px;
}
.btn-secondary {
  background-color: var(--grey);
}
</style>
