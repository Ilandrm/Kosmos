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
      path: '/games/asteroid-dodge-3d',
      name: 'asteroid-dodge-3d',
      component: () => import('../games/asteroid-dodge-3d/AsteroidDodge3DGame.vue')
    },
    {
      path: '/games/telescope',
      name: 'telescope',
      component: () => import('../games/telescope/TelescopeGame.vue')
    },
    {
      path: '/games/alien-hunt-3d',
      name: 'alien-hunt-3d',
      component: () => import('../games/alien-hunt-3d/AlienHunt3DGame.vue')
    },
    {
      path: '/games/maze-3d',
      name: 'maze-3d',
      component: () => import('../games/maze-3d/Maze3DGame.vue')
    },
    {
    path: '/games/star-collector-3d',
    name: 'star-collector-3d',
    component: () => import('../games/star-collector-3d/StarCollector3DGame.vue')
  },
  {
    path: '/games/koesio-quiz',
    name: 'koesio-quiz',
    component: () => import('../games/koesio-quiz/KoesioQuizGame.vue')
  },
  {
    path: '/games/space-hangman',
    name: 'space-hangman',
    component: () => import('../games/space-hangman/SpaceHangmanGame.vue')
  }
  ]
})

export default router
