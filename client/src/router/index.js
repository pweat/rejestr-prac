/**
 * @file router/index.js
 * @description Główny plik konfiguracyjny dla Vue Router.
 */

import { createRouter, createWebHistory } from 'vue-router';
// Zmieniamy import - potrzebujemy tylko funkcji getToken
import { getToken } from '../auth/auth.js';

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
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes,
});

router.beforeEach((to, from, next) => {
  // === KLUCZOWA POPRAWKA ===
  // Zamiast używać reaktywnego 'isAuthenticated.value',
  // bezpośrednio sprawdzamy, czy token istnieje w momencie nawigacji.
  // To rozwiązuje problem z "mignięciem", ponieważ jest to natychmiastowe.
  const loggedIn = !!getToken();

  if (to.meta.requiresAuth && !loggedIn) {
    next({ name: 'login' });
  } else if (to.name === 'login' && loggedIn) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
