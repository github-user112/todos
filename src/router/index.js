import { createRouter, createWebHashHistory } from 'vue-router';
import CalendarPage from '../pages/CalendarPage.vue';

const routes = [
  {
    path: '/',
    name: 'calendar',
    component: CalendarPage,
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
