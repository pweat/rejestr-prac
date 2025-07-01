<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, RouterLink, useRouter } from 'vue-router';
import { getAuthHeaders, removeToken } from '../auth/auth.js';
import { formatDate } from '../utils/formatters.js';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const route = useRoute();
const router = useRouter();
const praca = ref(null);
const isLoading = ref(true);
const error = ref(null);
const showPrintControls = ref(false);

const handleAuthError = (error) => {
  if (error.message.includes('401') || error.message.includes('403')) {
    alert('Twoja sesja wygasła lub jest nieprawidłowa. Proszę zalogować się ponownie.');
    removeToken();
    router.push('/login');
    return true;
  }
  return false;
};

const visibleFields = ref({
  od_kogo: true,
  miejscowosc: true,
  pracownicy: true,
  numer_tel: true,
  data_rozpoczecia: true,
  data_zakonczenia: true,
  informacje: true,
  srednica: true,
  ilosc_metrow: true,
  lustro_statyczne: true,
  lustro_dynamiczne: true,
  wydajnosc: true,
});

function formatFieldName(field) {
  const names = {
    od_kogo: 'Od kogo',
    miejscowosc: 'Miejscowość',
    pracownicy: 'Pracownicy',
    numer_tel: 'Telefon',
    data_rozpoczecia: 'Data rozpoczęcia',
    data_zakonczenia: 'Data zakończenia',
    informacje: 'Informacje',
    srednica: 'Średnica Ø',
    ilosc_metrow: 'Ilość metrów',
    lustro_statyczne: 'Lustro statyczne',
    lustro_dynamiczne: 'Lustro dynamiczne',
    wydajnosc: 'Wydajność',
  };
  return names[field] || field;
}

const workId = route.params.id;

onMounted(async () => {
  try {
    const response = await fetch(`${API_URL}/api/prace/${workId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error('Nie znaleziono zlecenia o podanym ID.');
      throw new Error(`Błąd podczas pobierania danych. Status: ${response.status}`);
    }
    const result = await response.json();
    if (result && result.data) {
      praca.value = result.data;
    } else {
      throw new Error('Otrzymano niekompletne dane z serwera.');
    }
  } catch (e) {
    if (!handleAuthError(e)) {
      error.value = e.message;
    }
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="view-wrapper">
    <div class="details-container">
      <div v-if="isLoading" class="loading-box"><p>Ładowanie danych...</p></div>
      <div v-else-if="error" class="error-box">
        <h2>Błąd</h2>
        <p>{{ error }}</p>
        <RouterLink to="/" class="btn btn-secondary">Wróć do listy</RouterLink>
      </div>
      <div v-else-if="praca && praca.id" class="work-card-wrapper">
        <div class="view-actions"><button class="btn btn-secondary" @click="showPrintControls = !showPrintControls">Ustawienia Druku</button><RouterLink to="/" class="btn btn-primary">Wróć do listy</RouterLink></div>
        <div v-if="showPrintControls" class="print-controls">
          <h3>Pola do druku</h3>
          <p>Wybierz, które informacje mają znaleźć się na wydruku.</p>
          <div class="checkbox-grid">
            <div v-for="(isVisible, field) in visibleFields" :key="field" class="checkbox-item">
              <input type="checkbox" :id="field" v-model="visibleFields[field]" /><label :for="field">{{ formatFieldName(field) }}</label>
            </div>
          </div>
        </div>
        <div class="work-card">
          <h1 class="print-title">Studnia {{ praca.miejscowosc }}</h1>
          <div class="card-grid">
            <div v-if="visibleFields.od_kogo" class="card-item">
              <strong>Od kogo:</strong> <span>{{ praca.od_kogo }}</span>
            </div>
            <div v-if="visibleFields.miejscowosc" class="card-item">
              <strong>Miejscowość:</strong> <span>{{ praca.miejscowosc }}</span>
            </div>
            <div v-if="visibleFields.pracownicy" class="card-item">
              <strong>Pracownicy:</strong> <span>{{ praca.pracownicy }}</span>
            </div>
            <div v-if="visibleFields.numer_tel" class="card-item">
              <strong>Telefon:</strong> <span>{{ praca.numer_tel }}</span>
            </div>
            <div v-if="visibleFields.data_rozpoczecia" class="card-item">
              <strong>Data rozpoczęcia:</strong>
              <span>{{ formatDate(praca.data_rozpoczecia) }}</span>
            </div>
            <div v-if="visibleFields.data_zakonczenia" class="card-item">
              <strong>Data zakończenia:</strong>
              <span>{{ formatDate(praca.data_zakonczenia) }}</span>
            </div>
            <div v-if="visibleFields.informacje" class="card-item full-width">
              <strong>Informacje:</strong>
              <p class="info-text">{{ praca.informacje }}</p>
            </div>
            <div v-if="visibleFields.srednica" class="card-item">
              <strong>Średnica Ø:</strong> <span>{{ praca.srednica }}</span>
            </div>
            <div v-if="visibleFields.ilosc_metrow" class="card-item">
              <strong>Ilość metrów:</strong>
              <span>{{ praca.ilosc_metrow }}</span>
            </div>
            <div v-if="visibleFields.lustro_statyczne" class="card-item">
              <strong>Lustro statyczne:</strong>
              <span>{{ praca.lustro_statyczne }}</span>
            </div>
            <div v-if="visibleFields.lustro_dynamiczne" class="card-item">
              <strong>Lustro dynamiczne:</strong>
              <span>{{ praca.lustro_dynamiczne }}</span>
            </div>
            <div v-if="visibleFields.wydajnosc" class="card-item">
              <strong>Wydajność:</strong>
              <span>{{ praca.wydajnosc ? praca.wydajnosc + ' m³/h' : '' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="error-box">
        <h2>Błąd</h2>
        <p>Nie udało się wczytać danych dla tego zlecenia.</p>
        <RouterLink to="/" class="btn btn-secondary">Wróć do listy</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  min-height: 100vh;
  padding: 40px 20px;
  box-sizing: border-box;
}
.details-container {
  width: 100%;
  max-width: 900px;
  margin: 0;
  padding: 30px 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.view-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 20px;
}
.btn {
  text-decoration: none;
  border: 1px solid transparent;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.btn-primary {
  background-color: #007bff;
  color: #fff;
}
.btn-secondary {
  background-color: #6c757d;
  color: #fff;
}
.print-controls {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #f8f9fa;
}
.print-controls h3 {
  margin-top: 0;
}
.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.checkbox-item {
  display: flex;
  align-items: center;
}
.checkbox-item input {
  margin-right: 8px;
}
.checkbox-item label {
  cursor: pointer;
}
.work-card {
  border: 1px solid #ccc;
  padding: 25px;
  border-radius: 6px;
}
.print-title {
  text-align: center;
  margin-top: 0;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.card-item {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e7e7e7;
  font-size: 16px;
}
.card-item.full-width {
  grid-column: 1/-1;
}
.card-item strong {
  display: block;
  margin-bottom: 8px;
  color: #6c757d;
  font-size: 14px;
}
.card-item span {
  font-weight: 500;
}
.info-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}
.error-box,
.loading-box {
  text-align: center;
  padding: 50px;
  color: #6c757d;
}
.error-box h2 {
  color: #dc3545;
}
@media print {
  body,
  #app,
  .view-wrapper {
    all: unset !important;
    background: #fff !important;
  }
  .details-container {
    box-shadow: none !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  .view-actions,
  .print-controls {
    display: none !important;
  }
  .work-card {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
}
</style>
