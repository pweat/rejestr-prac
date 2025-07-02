import { createApp } from 'vue';
import App from './App.vue';
// ZMIANA: Importujemy nasz nowo stworzony router
import router from './router';
// ZMIANA: Usuwamy domyślny import CSS, bo style mamy w App.vue
// import './assets/main.css'
import 'vue-select/dist/vue-select.css';

const app = createApp(App);

// ZMIANA: Mówimy aplikacji Vue, aby używała routera
app.use(router);

app.mount('#app');
