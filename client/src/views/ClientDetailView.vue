<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { authenticatedFetch } from '../api/api.js';
import { useToast } from '../composables/useToast.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const route = useRoute();
const toast = useToast();

const isLoading = ref(true);
const data = ref(null);

const JOB_TYPE_LABELS = {
  well_drilling: 'Wykonanie Studni',
  connection: 'Podłączenie',
  treatment_station: 'Stacja Uzdatniania',
  service: 'Serwis',
};
const OFFER_STATUS_LABELS = {
  draft: 'Robocza',
  sent: 'Wysłana',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
};
const OFFER_TYPE_LABELS = {
  studnia: 'Studnia',
  podlaczenie: 'Podłączenie',
  stacja_uzdatniania: 'Stacja Uzdatniania',
  serwis: 'Serwis',
  inne: 'Inne',
};

const translateJobType = (t) => JOB_TYPE_LABELS[t] || t || '-';
const translateOfferStatus = (s) => OFFER_STATUS_LABELS[s] || s || '-';
const translateOfferType = (t) => OFFER_TYPE_LABELS[t] || t || '-';

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
};

const clientId = computed(() => route.params.id);

async function fetchData() {
  isLoading.value = true;
  try {
    const response = await authenticatedFetch(`${API_URL}/api/clients/${clientId.value}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Nie udało się pobrać danych klienta.');
    }
    data.value = await response.json();
  } catch (error) {
    console.error(error);
    toast.error(error.message || 'Błąd pobierania danych klienta.');
  } finally {
    isLoading.value = false;
  }
}

watch(clientId, () => fetchData());
onMounted(fetchData);

const summary = computed(() => data.value?.summary || null);
</script>

<template>
  <div class="container">
    <div class="page-header">
      <div class="breadcrumbs">
        <RouterLink to="/klienci" class="breadcrumb-link">← Klienci</RouterLink>
      </div>
      <div class="header-actions">
        <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="btn btn-secondary">Zlecenia klienta</RouterLink>
        <RouterLink :to="`/oferty?clientId=${clientId}`" class="btn btn-secondary">Oferty klienta</RouterLink>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state"><div class="spinner"></div></div>

    <div v-else-if="!data" class="empty-state">
      <p>Nie znaleziono klienta.</p>
    </div>

    <template v-else>
      <section class="client-card">
        <div class="client-card-main">
          <h1>{{ data.client.name || 'Bez nazwy' }}</h1>
          <div class="client-card-meta">
            <span v-if="data.client.phone_number"><strong>Telefon:</strong> {{ data.client.phone_number }}</span>
            <span v-if="data.client.email"><strong>Email:</strong> {{ data.client.email }}</span>
            <span v-if="data.client.address"><strong>Adres:</strong> {{ data.client.address }}</span>
          </div>
          <p v-if="data.client.notes" class="client-notes">{{ data.client.notes }}</p>
        </div>
      </section>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Zlecenia</div>
          <div class="stat-value">{{ summary.jobs_count }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Oferty łącznie</div>
          <div class="stat-value">{{ summary.offers_total }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_total) }} netto</div>
        </div>
        <div class="stat-card stat--draft">
          <div class="stat-label">Robocze</div>
          <div class="stat-value">{{ summary.offers_by_status.draft }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.draft) }}</div>
        </div>
        <div class="stat-card stat--sent">
          <div class="stat-label">Wysłane</div>
          <div class="stat-value">{{ summary.offers_by_status.sent }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.sent) }}</div>
        </div>
        <div class="stat-card stat--accepted">
          <div class="stat-label">Zaakceptowane</div>
          <div class="stat-value">{{ summary.offers_by_status.accepted }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.accepted) }}</div>
        </div>
        <div class="stat-card stat--rejected">
          <div class="stat-label">Odrzucone</div>
          <div class="stat-value">{{ summary.offers_by_status.rejected }}</div>
          <div class="stat-subtitle">{{ formatCurrency(summary.offers_net_by_status.rejected) }}</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Zlecenia ({{ data.jobs.length }})</h2>
          <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="link">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="!data.jobs.length" class="empty-mini">Brak zleceń dla tego klienta.</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Typ</th>
                <th>Miejscowość</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in data.jobs" :key="job.id">
                <td data-label="Data">{{ formatDate(job.job_date) }}</td>
                <td data-label="Typ">
                  <span class="badge" :class="`badge--job-${job.job_type}`">{{ translateJobType(job.job_type) }}</span>
                </td>
                <td data-label="Miejscowość">{{ job.miejscowosc || '-' }}</td>
                <td data-label="Akcje">
                  <RouterLink :to="`/zlecenia?clientId=${clientId}`" class="link">Otwórz →</RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Oferty ({{ data.offers.length }})</h2>
          <RouterLink :to="`/oferty?clientId=${clientId}`" class="link">Zobacz wszystkie →</RouterLink>
        </div>
        <div v-if="!data.offers.length" class="empty-mini">Brak ofert dla tego klienta.</div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Numer</th>
                <th>Data</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Wartość netto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="offer in data.offers" :key="offer.id">
                <td data-label="Numer">{{ offer.offer_number }}</td>
                <td data-label="Data">{{ formatDate(offer.issue_date) }}</td>
                <td data-label="Typ">{{ translateOfferType(offer.offer_type) }}</td>
                <td data-label="Status">
                  <span class="badge" :class="`badge--status-${offer.status}`">{{ translateOfferStatus(offer.status) }}</span>
                </td>
                <td data-label="Wartość netto">{{ formatCurrency(offer.total_net_value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}
.breadcrumbs {
  font-size: 14px;
}
.breadcrumb-link {
  color: var(--blue);
  text-decoration: none;
}
.breadcrumb-link:hover {
  text-decoration: underline;
}
.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.btn {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  color: #fff;
  background-color: var(--blue);
}
.btn-secondary {
  background-color: var(--grey);
}
.btn:hover {
  filter: brightness(1.08);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-color-secondary);
}

.client-card {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #eef2f5 100%);
  border: 1px solid var(--border-color);
  border-radius: 10px;
}
.client-card h1 {
  margin: 0 0 8px;
  font-size: 26px;
  color: var(--text-color);
}
.client-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  color: var(--text-color-secondary);
  font-size: 14px;
}
.client-card-meta strong {
  color: var(--text-color);
}
.client-notes {
  margin-top: 10px;
  padding: 10px 12px;
  background-color: #fff;
  border-left: 3px solid var(--blue);
  border-radius: 4px;
  color: var(--text-color);
  font-size: 14px;
  white-space: pre-line;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  padding: 14px 16px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  border-top: 3px solid var(--grey);
}
.stat--draft {
  border-top-color: #6c757d;
}
.stat--sent {
  border-top-color: #007bff;
}
.stat--accepted {
  border-top-color: #28a745;
}
.stat--rejected {
  border-top-color: #dc3545;
}
.stat-label {
  font-size: 12px;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color);
}
.stat-subtitle {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.panel {
  margin-bottom: 20px;
  padding: 18px 20px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
  flex-wrap: wrap;
}
.panel-header h2 {
  margin: 0;
  font-size: 18px;
}
.link {
  color: var(--blue);
  text-decoration: none;
  font-size: 14px;
}
.link:hover {
  text-decoration: underline;
}
.empty-mini {
  padding: 16px;
  color: var(--text-color-secondary);
  font-style: italic;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background-color: var(--grey);
}
.badge--job-well_drilling {
  background-color: #007bff;
}
.badge--job-connection {
  background-color: #28a745;
}
.badge--job-treatment_station {
  background-color: #ffc107;
  color: #333;
}
.badge--job-service {
  background-color: #6c757d;
}
.badge--status-draft {
  background-color: #6c757d;
}
.badge--status-sent {
  background-color: #007bff;
}
.badge--status-accepted {
  background-color: #28a745;
}
.badge--status-rejected {
  background-color: #dc3545;
}
</style>
