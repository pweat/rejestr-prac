/**
 * @file router/index.js
 * @description Główny plik konfiguracyjny dla Vue Router.
 */

import { createRouter, createWebHistory } from 'vue-router';
// Zmieniamy import - potrzebujemy tylko funkcji getToken
import { getToken, getUserRole } from '../auth/auth.js'; // Dodano getUserRole

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
    path: '/pracownicy',
    name: 'employees',
    component: () => import('../views/EmployeesView.vue'), // Nowy widok
    meta: { requiresAuth: true, requiresAdmin: true }, // Tylko admin
  },
  {
    path: '/rozliczenia',
    name: 'settlements',
    component: () => import('../views/WeeklySettlementsView.vue'), // Nowy widok
    meta: { requiresAuth: true, requiresAdminOrEditor: true }, // Admin lub Editor
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
  const loggedIn = !!getToken();
  const userRole = getUserRole(); // Pobieramy rolę

  if (to.meta.requiresAuth && !loggedIn) {
    // Jeśli trasa wymaga logowania, a użytkownik nie jest zalogowany
    next({ name: 'login' });
  } else if (to.name === 'login' && loggedIn) {
    // Jeśli użytkownik jest zalogowany i próbuje wejść na stronę logowania
    next({ name: 'dashboard' });
  } else if (to.meta.requiresAdmin && userRole !== 'admin') {
    // Jeśli trasa wymaga admina, a użytkownik nim nie jest
    alert('Brak uprawnień administratora.');
    next(from.path === '/login' ? { name: 'dashboard' } : false); // Wróć lub zostań
  } else if (to.meta.requiresAdminOrEditor && !(userRole === 'admin' || userRole === 'editor')) {
    // Jeśli trasa wymaga admina lub edytora, a użytkownik nim nie jest
    alert('Brak uprawnień do edycji.');
    next(from.path === '/login' ? { name: 'dashboard' } : false); // Wróć lub zostań
  } else {
    // W pozostałych przypadkach, pozwól na nawigację
    next();
  }
});

export default router;
