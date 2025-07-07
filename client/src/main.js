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
// Importuje konfigurację routingu z pliku router/index.js
import router from './router';

// --- Importy stylów ---
// Importuje globalne style dla komponentu vue-select
import 'vue-select/dist/vue-select.css';

// Tworzenie instancji aplikacji Vue z głównego komponentu App.vue
const app = createApp(App);

// Rejestracja wtyczki Vue Router w aplikacji.
// Dzięki temu dyrektywy <router-link> i <router-view> będą dostępne globalnie.
app.use(router);

// Montowanie aplikacji do elementu DOM z identyfikatorem #app w pliku index.html
app.mount('#app');
