import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
// ZMIANA: Importujemy nasz stan autentykacji
import { isAuthenticated } from '../auth/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      // ZMIANA: Dodajemy informację, że ta trasa wymaga logowania
      meta: { requiresAuth: true }
    },
    {
      path: '/praca/:id',
      name: 'workDetails',
      component: () => import('../views/WorkDetailsView.vue'),
      // ZMIANA: Ta trasa również wymaga logowania
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    }
  ]
})

// ZMIANA: Dodajemy globalnego "strażnika nawigacji"
router.beforeEach((to, from, next) => {
  // Sprawdzamy, czy strona, na którą użytkownik wchodzi, wymaga autoryzacji ORAZ czy użytkownik NIE jest zalogowany
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // Jeśli tak, przekieruj go na stronę logowania
    next({ name: 'login' });
  } else {
    // W przeciwnym wypadku, pozwól mu wejść
    next();
  }
});

export default router