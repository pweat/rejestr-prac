import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from '../auth/auth.js';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'), // Nowa strona główna
      meta: { requiresAuth: true },
    },
    {
      path: '/zlecenia',
      name: 'jobs',
      component: () => import('../views/JobsView.vue'), // Nowy widok zleceń
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
      path: '/praca/:id',
      name: 'workDetails',
      component: () => import('../views/WorkDetailsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
  ],
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login' });
  } else {
    next();
  }
});

export default router;
