<script setup>
// Sekcja <script> jest gotowa i nie wymaga zmian.
import { ref, onMounted } from 'vue';

const inicjalizujPustaPrace = () => ({
  od_kogo: '', pracownicy: '', dane_kontaktowe: '', numer_tel: '', email: '', miejscowosc: '',
  informacje: '', srednica: null, data_rozpoczecia: '', data_zakonczenia: '', lustro_statyczne: null,
  lustro_dynamiczne: null, wydajnosc: null, ilosc_metrow: null
});

const prace = ref([]);
const wiadomosc = ref('Ładowanie danych...');
const nowaPraca = ref(inicjalizujPustaPrace());

const showEditModal = ref(false); 
const edytowaneDane = ref(inicjalizujPustaPrace());

async function pobierzPrace() {
  try {
    const response = await fetch('http://localhost:3000/api/prace');
    if (!response.ok) throw new Error(`Błąd sieci! Status: ${response.status}`);
    const data = await response.json();
    prace.value = data.data;
    wiadomosc.value = 'Dane załadowano pomyślnie.';
  } catch (error) {
    console.error('Błąd w pobierzPrace():', error);
    wiadomosc.value = 'Nie udało się załadować danych.';
  }
}

async function handleSubmit() {
  try {
    const response = await fetch('http://localhost:3000/api/prace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nowaPraca.value) });
    if (!response.ok) throw new Error('Błąd podczas zapisywania');
    await pobierzPrace();
    nowaPraca.value = inicjalizujPustaPrace();
    wiadomosc.value = 'Pomyślnie dodano nową pracę!';
  } catch (error) {
    console.error('Błąd w handleSubmit():', error);
    wiadomosc.value = 'Nie udało się zapisać pracy.';
  }
}

function handleEdit(praca) {
  edytowaneDane.value = { ...praca };
  showEditModal.value = true;
}

function handleCancelEdit() {
  showEditModal.value = false;
}

async function handleUpdate() {
  if (!edytowaneDane.value.id) return;
  try {
    const response = await fetch(`http://localhost:3000/api/prace/${edytowaneDane.value.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edytowaneDane.value) });
    if (!response.ok) throw new Error('Błąd podczas aktualizacji');
    await pobierzPrace();
    showEditModal.value = false;
    wiadomosc.value = 'Wpis zaktualizowany.';
  } catch (error) {
    console.error("Błąd w handleUpdate():", error);
    wiadomosc.value = 'Nie udało się zaktualizować wpisu.';
  }
}

async function handleDelete(idPracy) {
  if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) return;
  try {
    const response = await fetch(`http://localhost:3000/api/prace/${idPracy}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Błąd podczas usuwania');
    await pobierzPrace();
    wiadomosc.value = 'Wpis został usunięty.';
  } catch (error) {
    console.error('Błąd w handleDelete():', error);
    wiadomosc.value = 'Nie udało się usunąć wpisu.';
  }
}

onMounted(() => {
  pobierzPrace();
});
</script>

<template>
  <div class="container">
    <h1>Rejestr Wykonanych Prac</h1>
    <form @submit.prevent="handleSubmit" class="form-dodaj">
      <h3>Dodaj nową pracę</h3>
      <div class="form-grid">
        <div class="form-group"><label>Od kogo:</label><input type="text" v-model="nowaPraca.od_kogo" required></div>
        <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="nowaPraca.miejscowosc"></div>
        <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="nowaPraca.pracownicy"></div>
        <div class="form-group"><label>Osoba kontaktowa:</label><input type="text" v-model="nowaPraca.dane_kontaktowe"></div>
        <div class="form-group"><label>Numer tel.:</label><input type="text" v-model="nowaPraca.numer_tel"></div>
        <div class="form-group"><label>E-mail:</label><input type="email" v-model="nowaPraca.email"></div>
        <div class="form-group full-width"><label>Informacje:</label><textarea v-model="nowaPraca.informacje" rows="3"></textarea></div>
        <div class="form-group"><label>Data rozpoczęcia:</label><input type="date" v-model="nowaPraca.data_rozpoczecia"></div>
        <div class="form-group"><label>Data zakończenia:</label><input type="date" v-model="nowaPraca.data_zakonczenia"></div>
        <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="nowaPraca.srednica"></div>
        <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="nowaPraca.ilosc_metrow"></div>
        <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="nowaPraca.lustro_statyczne"></div>
        <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="nowaPraca.lustro_dynamiczne"></div>
        <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="nowaPraca.wydajnosc"></div>
      </div>
      <button type="submit">Zapisz pracę</button>
    </form>
    <hr>
    <p>{{ wiadomosc }}</p>
    <h2>Zapisane prace:</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Akcje</th><th>ID</th><th>Od kogo</th><th>Miejscowość</th><th>Data Rozp.</th><th>Data Zakoń.</th><th>Pracownicy</th><th>Osoba kontaktowa</th><th>Telefon</th><th>Email</th><th>Metry</th><th>Średnica Ø</th><th>L. statyczne</th><th>L. dynamiczne</th><th>Wydajność</th><th>Informacje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="praca in prace" :key="praca.id">
            <td><button class="edytuj" @click="handleEdit(praca)">Edytuj</button><button class="usun" @click="handleDelete(praca.id)">Usuń</button></td>
            <td>{{ praca.id }}</td><td>{{ praca.od_kogo }}</td><td>{{ praca.miejscowosc }}</td><td>{{ praca.data_rozpoczecia }}</td><td>{{ praca.data_zakonczenia }}</td><td>{{ praca.pracownicy }}</td><td>{{ praca.dane_kontaktowe }}</td><td>{{ praca.numer_tel }}</td><td>{{ praca.email }}</td><td>{{ praca.ilosc_metrow }}</td><td>{{ praca.srednica }}</td><td>{{ praca.lustro_statyczne }}</td><td>{{ praca.lustro_dynamiczne }}</td><td>{{ praca.wydajnosc }}</td><td>{{ praca.informacje }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="prace.length === 0" class="empty-table-message"><p>Brak zapisanych prac.</p></div>
    </div>
  </div>
  <div v-if="showEditModal" class="modal-backdrop" @click.self="handleCancelEdit">
    <div class="modal-content">
      <div class="modal-header"><h3>Edytuj wpis #{{ edytowaneDane.id }}</h3><button class="close-button" @click="handleCancelEdit">&times;</button></div>
      <form @submit.prevent="handleUpdate">
        <div class="form-grid">
          <div class="form-group"><label>Od kogo:</label><input type="text" v-model="edytowaneDane.od_kogo" required></div>
          <div class="form-group"><label>Miejscowość:</label><input type="text" v-model="edytowaneDane.miejscowosc"></div>
          <div class="form-group"><label>Pracownicy:</label><input type="text" v-model="edytowaneDane.pracownicy"></div>
          <div class="form-group"><label>Osoba kontaktowa:</label><input type="text" v-model="edytowaneDane.dane_kontaktowe"></div>
          <div class="form-group"><label>Numer tel.:</label><input type="text" v-model="edytowaneDane.numer_tel"></div>
          <div class="form-group"><label>E-mail:</label><input type="email" v-model="edytowaneDane.email"></div>
          <div class="form-group full-width"><label>Informacje:</label><textarea v-model="edytowaneDane.informacje" rows="3"></textarea></div>
          <div class="form-group"><label>Data rozpoczęcia:</label><input type="date" v-model="edytowaneDane.data_rozpoczecia"></div>
          <div class="form-group"><label>Data zakończenia:</label><input type="date" v-model="edytowaneDane.data_zakonczenia"></div>
          <div class="form-group"><label>Średnica Ø:</label><input type="number" step="any" v-model.number="edytowaneDane.srednica"></div>
          <div class="form-group"><label>Ilość metrów:</label><input type="number" step="any" v-model.number="edytowaneDane.ilosc_metrow"></div>
          <div class="form-group"><label>Lustro statyczne:</label><input type="number" step="any" v-model.number="edytowaneDane.lustro_statyczne"></div>
          <div class="form-group"><label>Lustro dynamiczne:</label><input type="number" step="any" v-model.number="edytowaneDane.lustro_dynamiczne"></div>
          <div class="form-group"><label>Wydajność (m³/h):</label><input type="number" step="any" v-model.number="edytowaneDane.wydajnosc"></div>
        </div>
        <div class="modal-actions"><button type="submit" class="zapisz">Zapisz zmiany</button><button type="button" class="anuluj" @click="handleCancelEdit">Anuluj</button></div>
      </form>
    </div>
  </div>
</template>

<style>
:root {
  --text-color: #2c3e50; --border-color: #e0e0e0; --background-light: #ffffff;
  --background-page: #f4f7f9; --header-background: #f8f9fa; --green: #28a745;
  --red: #dc3545; --blue: #007bff; --grey: #6c757d; --white: #fff;
  --shadow: 0 4px 12px rgba(0,0,0,0.08);
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-color);
  background-color: var(--background-page);
  margin: 0;
}
h1, h2, h3 { color: var(--text-color); }
hr { border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; }

.container { 
  width: 98%; /* Ustawmy prawie pełną szerokość */
  max-width: none; /* ZMIANA: Usunięcie jakiegokolwiek limitu maksymalnej szerokości */
  box-sizing: border-box; 
  margin: 30px 0;
  padding: 20px 25px; /* Lekko zwiększony boczny padding dla estetyki */
  background-color: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
/* ZMIANA: Dodano nową regułę dla #app, aby wycentrować kontener w nowocześniejszy sposób */
#app {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* ... reszta stylów bez zmian ... */
.form-dodaj, .modal-content form { padding: 25px; border-radius: 8px; }
.form-dodaj { background-color: var(--background-light); border: 1px solid var(--border-color); margin-bottom: 20px; }
h3 { margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.form-group { display: flex; flex-direction: column; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { margin-bottom: 8px; font-weight: 600; font-size: 14px; }
.form-group input, .form-group textarea { padding: 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; transition: border-color 0.3s, box-shadow 0.3s; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2); }
.table-container { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
th { background-color: var(--header-background); font-weight: 600; }
td { color: #555; }
.empty-table-message { padding: 30px; text-align: center; color: var(--grey); }
button { padding: 10px 15px; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 0 5px 0 0; font-size: 14px; font-weight: 500; transition: all 0.2s; }
button:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
button:last-child { margin-right: 0; }
button[type="submit"] { background-color: var(--green); margin-top: 20px; grid-column: 1 / -1; width: 100%; font-size: 16px; }
button.usun { background-color: var(--red); }
button.edytuj { background-color: var(--blue); }
button.zapisz { background-color: var(--green); }
button.anuluj { background-color: var(--grey); }
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { width: 90%; max-width: 1000px; max-height: 90vh; overflow-y: auto; background-color: var(--background-light); border-radius: 8px; box-shadow: var(--shadow); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 25px; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { border-bottom: none; padding-bottom: 0; margin: 0; }
.close-button { background: none; border: none; font-size: 28px; font-weight: 300; color: var(--grey); cursor: pointer; padding: 0; line-height: 1; }
.modal-content form { border: none; }
.modal-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color); }
</style>