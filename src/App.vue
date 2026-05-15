<template>
  <div class="app-container">
    <LoadingComponent :show="loading" />

    <TransitionGroup
      name="reminder-toast"
      tag="div"
      class="reminder-toast-container"
    >
      <div
        v-for="item in activeReminders"
        :key="item.key"
        class="reminder-toast"
        @click="dismissReminder(item.key)"
      >
        <div class="reminder-toast-icon">🔔</div>
        <div class="reminder-toast-content">
          <div class="reminder-toast-title">
            {{ item.timeDesc }} {{ item.todoTime }}
          </div>
          <div class="reminder-toast-text">{{ item.text }}</div>
          <div class="reminder-toast-desc">{{ item.reminderDesc }}</div>
        </div>
        <button class="reminder-toast-close">✕</button>
      </div>
    </TransitionGroup>

    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import LoadingComponent from './components/LoadingComponent.vue';
import { generateHash } from './utils/hashUtils';
import { getUserId } from './utils/api';
import { loading } from './utils/loading';

const activeReminders = ref([]);
let reminderKeyCounter = 0;

const handleInPageReminder = ({
  todo,
  dateStr,
  timeDesc,
  todoTime,
  reminderDesc,
}) => {
  const key = `reminder-${++reminderKeyCounter}`;
  activeReminders.value.push({
    key,
    text: todo.text,
    timeDesc,
    todoTime,
    reminderDesc,
    dateStr,
  });

  setTimeout(() => {
    dismissReminder(key);
  }, 15000);
};

const dismissReminder = (key) => {
  const idx = activeReminders.value.findIndex((r) => r.key === key);
  if (idx >= 0) {
    activeReminders.value.splice(idx, 1);
  }
};

const initializeUserId = () => {
  let uid = getUserId();

  if (!uid) {
    uid = generateHash();
    const url = new URL(window.location);
    url.searchParams.set('uid', uid);
    window.history.replaceState({}, '', url);
  }
};

onMounted(() => {
  initializeUserId();
});
</script>

<style>
@import './assets/theme.css';

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.reminder-toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: 380px;
  width: calc(100% - 32px);
}

.reminder-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: var(--card-background);
  border: 1px solid var(--primary-color);
  border-radius: 12px;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.15),
    0 0 0 1px var(--primary-color);
  pointer-events: auto;
  cursor: pointer;
  animation: reminder-toast-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.reminder-toast-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 1px;
}

.reminder-toast-content {
  flex: 1;
  min-width: 0;
}

.reminder-toast-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 2px;
}

.reminder-toast-text {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reminder-toast-desc {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

.reminder-toast-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  -webkit-tap-highlight-color: transparent;
}

.reminder-toast-close:hover {
  background: var(--hover-color);
}

.reminder-toast-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.reminder-toast-leave-active {
  transition: all 0.25s ease;
}

.reminder-toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

.reminder-toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}

@keyframes reminder-toast-in {
  from {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@media (max-width: 768px) {
  .reminder-toast-container {
    top: auto;
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: none;
    width: auto;
  }

  .reminder-toast {
    animation-name: reminder-toast-in-mobile;
  }

  @keyframes reminder-toast-in-mobile {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .reminder-toast-enter-from {
    transform: translateY(20px) scale(0.95);
  }

  .reminder-toast-leave-to {
    transform: translateY(20px) scale(0.95);
  }
}
</style>
