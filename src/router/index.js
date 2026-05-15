import { createRouter, createWebHashHistory } from 'vue-router';
import CalendarPage from '../pages/CalendarPage.vue';
import SettingsPage from '../pages/SettingsPage.vue';

const routes = [
  {
    path: '/',
    name: 'calendar',
    component: CalendarPage,
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
