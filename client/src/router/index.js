import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/praca/:id',
      name: 'workDetails',
      // Poniższy kod sprawia, że komponent dla tej podstrony będzie ładowany "leniwie",
      // czyli dopiero wtedy, gdy użytkownik na nią wejdzie. To dobra praktyka.
      component: () => import('../views/WorkDetailsView.vue')
    }
  ]
})

export default router