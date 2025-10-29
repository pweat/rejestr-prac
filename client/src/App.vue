<script setup>
/**
 * @file App.vue
 * @description Główny komponent aplikacji, który renderuje stałe elementy interfejsu,
 * takie jak nagłówek nawigacyjny, oraz zarządza wyświetlaniem podstron za pomocą RouterView.
 * Zawiera także globalne style CSS dla całego projektu.
 */

// ===================================================================================
// 📜 IMPORTS
// ===================================================================================
import { RouterView, RouterLink, useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import { isAuthenticated, removeToken, getUserRole } from './auth/auth.js';

const userRole = computed(() => getUserRole());
// ===================================================================================
// ⚙️ INICJALIZACJA
// ===================================================================================

/** Dostęp do instancji routera Vue. */
const router = useRouter();

// ===================================================================================
// ✨ STAN KOMPONENTU
// ===================================================================================

/** Przechowuje stan menu mobilnego (true = otwarte, false = zamknięte). */
const isMobileMenuOpen = ref(false);

// ===================================================================================
// ⚡ OBSŁUGA ZDARZEŃ
// ===================================================================================

/**
 * Przełącza widoczność menu mobilnego.
 */
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

/**
 * Zamyka menu mobilne. Przydatne po kliknięciu linku nawigacyjnego.
 */
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

/**
 * Obsługuje proces wylogowania użytkownika.
 */
const handleLogout = () => {
  removeToken();
  closeMobileMenu();
  window.location.href = '/login';
};
</script>

<template>
  <header class="main-header">
    <div class="logo-container">
      <RouterLink to="/" class="logo-link" @click="closeMobileMenu">Zentroo</RouterLink>
    </div>

    <nav class="main-nav" :class="{ 'is-open': isMobileMenuOpen }">
      <template v-if="isAuthenticated">
        <RouterLink to="/" @click="closeMobileMenu">Pulpit</RouterLink>
        <RouterLink to="/klienci" @click="closeMobileMenu">Klienci</RouterLink>
        <RouterLink to="/zlecenia" @click="closeMobileMenu">Zlecenia</RouterLink>
        <RouterLink to="/magazyn" @click="closeMobileMenu">Magazyn</RouterLink>
        <RouterLink to="/oferty" @click="closeMobileMenu">Oferty</RouterLink>
        <RouterLink v-if="userRole === 'admin' || userRole === 'editor'" to="/rozliczenia" @click="closeMobileMenu">Rozliczenia</RouterLink>
        <RouterLink v-if="userRole === 'admin'" to="/pracownicy" @click="closeMobileMenu">Pracownicy</RouterLink>
        <button @click="handleLogout" class="logout-btn mobile-logout">Wyloguj</button>
      </template>
    </nav>

    <div class="actions-container">
      <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn desktop-logout">Wyloguj</button>
      <button v-if="isAuthenticated" class="hamburger-btn" @click="toggleMobileMenu" :class="{ 'is-active': isMobileMenuOpen }" aria-label="Otwórz menu">
        <span class="hamburger-box">
          <span class="hamburger-inner"></span>
        </span>
      </button>
    </div>
  </header>

  <main>
    <RouterView />
  </main>
</template>

<style>
/* ==========================================================================
   GLOBALNE STYLE I ZMIENNE CSS
   ========================================================================== */

/* --- Zmienne (Design Tokens) --- */
:root {
  --text-color: #2c3e50;
  --text-color-secondary: #555;
  --border-color: #e0e0e0;
  --background-light: #ffffff;
  --background-light-secondary: #f8f9fa;
  --background-page: #f4f7f9;
  --green: #28a745;
  --red: #dc3545;
  --blue: #007bff;
  --grey: #6c757d;
  --white: #fff;
  --dark: #343a40;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* --- Globalny reset i podstawowe style --- */
html {
  box-sizing: border-box;
}
*,
*:before,
*:after {
  box-sizing: inherit;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-color);
  background-color: var(--background-page);
  margin: 0;
  overflow-x: hidden;
}
#app {
  width: 100%;
}
main {
  /* Odstęp od góry, aby treść nie chowała się pod stałym nagłówkiem */
  padding-top: 80px;
}

/* ==========================================================================
   NAGŁÓWEK I NAWIGACJA
   ========================================================================== */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
  background-color: var(--dark);
  color: var(--white);
  height: 60px;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1001;
}
.logo-container .logo-link {
  color: var(--white);
  font-weight: bold;
  font-size: 22px;
  text-decoration: none;
}
.main-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.main-nav a {
  color: var(--background-light-secondary);
  text-decoration: none;
  padding: 10px 15px;
  border-radius: 6px;
  transition: background-color 0.2s;
  white-space: nowrap;
}
.main-nav a.router-link-exact-active {
  background-color: var(--blue);
  color: var(--white);
}
.main-nav a:hover {
  background-color: #495057;
}
.actions-container {
  display: flex;
  align-items: center;
  gap: 15px;
}
.mobile-logout,
.hamburger-btn {
  display: none;
}

/* --- Style przycisku "Hamburger" --- */
.hamburger-box {
  width: 30px;
  height: 24px;
  display: inline-block;
  position: relative;
}
.hamburger-inner,
.hamburger-inner::before,
.hamburger-inner::after {
  width: 100%;
  height: 3px;
  background-color: var(--white);
  border-radius: 3px;
  position: absolute;
  transition: all 0.25s ease-in-out;
}
.hamburger-inner {
  top: 50%;
  transform: translateY(-50%);
}
.hamburger-inner::before,
.hamburger-inner::after {
  content: '';
  display: block;
}
.hamburger-inner::before {
  top: -10px;
}
.hamburger-inner::after {
  bottom: -10px;
}
.hamburger-btn.is-active .hamburger-inner {
  background-color: transparent;
}
.hamburger-btn.is-active .hamburger-inner::before {
  top: 0;
  transform: rotate(45deg);
}
.hamburger-btn.is-active .hamburger-inner::after {
  bottom: 0;
  transform: rotate(-45deg);
}

/* ==========================================================================
   STYLE WSPÓLNYCH KOMPONENTÓW
   ========================================================================== */

/* --- Główny kontener strony --- */
.container {
  width: 98%;
  max-width: 1800px;
  margin: 20px auto;
  padding: 20px 30px;
  background-color: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 15px;
}
.header h1 {
  margin: 0;
  font-size: 24px;
}

/* --- Wyszukiwarka i wskaźnik ładowania --- */
.search-container {
  margin-bottom: 1.5rem;
}
.search-container input {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.main-content-wrapper {
  position: relative;
}
.table-and-pagination.is-loading {
  opacity: 0.4;
  pointer-events: none;
  transition: opacity 0.3s ease-in-out;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
  z-index: 10;
}
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid var(--blue);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* --- Tabele --- */
.table-container {
  width: 100%;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th,
td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
th {
  background-color: var(--background-light-secondary);
  font-weight: 600;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background-color: #e9ecef;
}
td {
  color: var(--text-color-secondary);
}
.actions-cell {
  /* Wyrównuje tekst i elementy wewnątrz do lewej */
  text-align: left;
}

/* Dodajemy odstęp między przyciskami */
.actions-cell button + button {
  margin-left: 8px;
}

.actions-cell::before {
  /* Ta reguła pozostaje bez zmian */
  display: none;
}

/* --- Przyciski --- */
button {
  padding: 8px 12px;
  color: var(--white);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
button:disabled {
  background-color: var(--grey);
  cursor: not-allowed;
  opacity: 0.7;
}
.add-new-btn {
  background-color: var(--green);
  font-size: 16px;
  padding: 12px 20px;
}
.btn-secondary {
  background-color: var(--grey);
}
button.pokaż {
  background-color: #17a2b8;
}
button.usun {
  background-color: var(--red);
}
button.edytuj {
  background-color: var(--blue);
}
button.zapisz {
  background-color: var(--green);
}
button.anuluj {
  background-color: var(--grey);
}
.logout-btn {
  background-color: var(--grey);
}

/* --- Okna modalne --- */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  overflow-y: auto;
  padding: 80px 15px 40px;
  text-align: center;
}
.modal-content {
  display: inline-block;
  text-align: left;
  width: 100%;
  max-width: 1000px;
  margin-bottom: auto;
  background-color: var(--background-light);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 {
  margin: 0;
}
.close-button {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--grey);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.modal-content form {
  padding: 25px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
}
.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
}
.form-group input,
.form-group textarea,
.form-group select,
.v-select {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
}
.v-select {
  padding: 0;
}
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: 0;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  gap: 10px;
}

/* ==========================================================================
   RESPONSYWNOŚĆ (MOBILE)
   ========================================================================== */
@media screen and (max-width: 850px) {
  /* --- Nawigacja mobilna --- */
  .main-nav {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: var(--dark);
    flex-direction: column;
    padding: 10px 0;
    border-top: 1px solid #495057;
  }
  .main-nav.is-open {
    display: flex;
  }
  .main-nav a {
    width: 100%;
    text-align: center;
    border-radius: 0;
    padding: 15px;
    border-bottom: 1px solid #495057;
  }
  .hamburger-btn {
    display: inline-block;
    padding: 15px 5px;
    cursor: pointer;
    background-color: transparent;
    border: 0;
    margin: 0;
  }
  .desktop-logout {
    display: none;
  }
  .mobile-logout {
    display: block;
    background-color: var(--red);
    margin: 10px 20px 0;
    width: auto;
  }

  /* --- Responsywna tabela --- */
  table thead {
    border: none;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
  table tr {
    display: block;
    margin-bottom: 1em;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1em;
  }
  table td {
    display: block;
    text-align: right;
    border-bottom: 1px dotted #ccc;
    padding: 10px 0;
    word-break: break-word;
  }
  table td:last-child {
    border-bottom: 0;
  }
  table td::before {
    content: attr(data-label);
    float: left;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    color: var(--grey);
  }
  .actions-cell {
    display: flex;
    gap: 8px;
    justify-content: flex-start;
  }
  .actions-cell::before {
    display: none; /* Ukryj label dla komórki akcji */
  }

  /* --- Dostosowanie ogólnego layoutu --- */
  .container {
    width: auto;
    margin: 15px 10px;
    padding: 15px;
  }
  main {
    padding-top: 75px;
  }
}
</style>
