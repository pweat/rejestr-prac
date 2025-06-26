<script setup>
import { RouterView, useRouter } from 'vue-router'
// ZMIANA: Importujemy stan autentykacji i funkcję do usuwania tokenu
import { isAuthenticated, removeToken } from './auth/auth.js'

const router = useRouter()

const handleLogout = () => {
  removeToken();
  router.push('/login'); // Przekieruj na stronę logowania po wylogowaniu
}
</script>

<template>
  <header v-if="isAuthenticated" class="main-header">
    <button @click="handleLogout" class="logout-btn">Wyloguj</button>
  </header>
  
  <main>
    <RouterView />
  </main>
</template>

<style>
/* ... stare, globalne style ... */
:root{--text-color:#2c3e50;--border-color:#e0e0e0;--background-light:#fff;--background-page:#f4f7f9;--header-background:#f8f9fa;--green:#28a745;--red:#dc3545;--blue:#007bff;--grey:#6c757d;--white:#fff;--shadow:0 4px 12px rgba(0,0,0,.08)}
html{box-sizing:border-box}*,:after,:before{box-sizing:inherit}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text-color);background-color:var(--background-page);margin:0}
#app{width:100%}

/* ZMIANA: Nowe style dla nagłówka i przycisku wylogowania */
.main-header {
  padding: 10px 20px;
  background-color: #343a40;
  display: flex;
  justify-content: flex-end;
}
.logout-btn {
  background-color: var(--grey);
  border: none;
  color: white;
  padding: 8px 15px;
  border-radius: 6px;
  cursor: pointer;
}
</style>