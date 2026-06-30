/**
 * @file main.js
 * @description Główny plik wejściowy aplikacji Vue.js.
 * Odpowiada za inicjalizację aplikacji, konfigurację routera
 * oraz montowanie głównego komponentu App.vue do drzewa DOM.
 */

// --- Importy podstawowe ---
import { createApp } from 'vue';
import App from './App.vue';

// --- Importy wtyczek i konfiguracji ---
import router from './router';
import { createPinia } from 'pinia';

// --- Importy stylów ---
import 'vue-select/dist/vue-select.css';

// Tworzenie instancji aplikacji Vue z głównego komponentu App.vue
const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);

// Montowanie aplikacji do elementu DOM z identyfikatorem #app w pliku index.html
app.mount('#app');

// --- Koniec pliku main.js ---
