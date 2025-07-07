/**
 * @file router/index.js
 * @description Główny plik konfiguracyjny dla Vue Router.
 * Definiuje wszystkie ścieżki (trasy) w aplikacji, włącza leniwe ładowanie (lazy loading)
 * dla widoków oraz implementuje globalną ochronę ścieżek wymagających uwierzytelnienia.
 */

// ===================================================================================
// 📜 IMPORTS
// ===================================================================================

import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from '../auth/auth.js';

// ===================================================================================
// 🗺️ DEFINICJE ŚCIEŻEK (ROUTES)
// ===================================================================================

/**
 * Tablica obiektów definiujących każdą dostępną ścieżkę w aplikacji.
 *
 * Użycie `component: () => import(...)` to tzw. "lazy loading" (leniwe ładowanie).
 * Oznacza to, że kod dla danego widoku zostanie pobrany przez przeglądarkę
 * dopiero wtedy, gdy użytkownik wejdzie na tę konkretną podstronę,
 * co przyspiesza początkowe ładowanie aplikacji.
 *
 * Pole `meta: { requiresAuth: true }` to niestandardowe dane, które pozwalają nam
 * oznaczyć ścieżki wymagające zalogowania.
 */
const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/zlecenia',
    name: 'jobs',
    component: () => import('../views/JobsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/klienci',
    name: 'clients',
    component: () => import('../views/ClientsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/magazyn',
    name: 'inventory',
    component: () => import('../views/InventoryView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/oferty',
    name: 'offers',
    component: () => import('../views/OffersView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    // Ta ścieżka nie wymaga autoryzacji
  },
];

// ===================================================================================
// 🚀 TWORZENIE INSTANCJI ROUTERA
// ===================================================================================

const router = createRouter({
  // Używa `createWebHistory` dla "czystych" adresów URL bez hasha (#).
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
});

// ===================================================================================
// 🛡️ GLOBALNA OCHRONA ŚCIEŻEK (NAVIGATION GUARD)
// ===================================================================================

/**
 * Ta funkcja jest wywoływana przed każdą próbą zmiany ścieżki w aplikacji.
 * @param {object} to - Obiekt reprezentujący ścieżkę, do której nawigujemy.
 * @param {object} from - Obiekt reprezentujący ścieżkę, z której przychodzimy.
 * @param {function} next - Funkcja, którą należy wywołać, aby kontynuować lub przekierować nawigację.
 */
router.beforeEach((to, from, next) => {
  // Sprawdzamy, czy ścieżka DOCELOWA wymaga uwierzytelnienia ORAZ czy użytkownik NIE JEST zalogowany.
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // Jeśli tak, przekierowujemy użytkownika na stronę logowania.
    next({ name: 'login' });
  } else {
    // W przeciwnym wypadku pozwalamy na kontynuowanie nawigacji.
    next();
  }
});

// ===================================================================================
//  EXPORT
// ===================================================================================

export default router;
