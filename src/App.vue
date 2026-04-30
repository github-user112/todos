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

    <n-dialog-provider
      ><n-message-provider>
        <calendar-container
          :todos="todos"
          :completedInstances="completedInstances"
          :deletedInstances="deletedInstances"
          :holidayData="holidayData"
          :userId="userId"
          @fetch-calendar-data="fetchCalendarData"
          @fetch-holiday-data="fetchHolidayData"
          @add-todo="handleAddTodo"
          @complete-todo="handleCompleteTodo"
          @delete-todo="handleDeleteTodo"
          @moveTodoDate="handleMoveTodoDate"
          @reorderTodos="handleReorderTodos"
      /></n-message-provider>
    </n-dialog-provider>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import CalendarContainer from './components/calendar-container.vue';
import LoadingComponent from './components/LoadingComponent.vue';
import { formatDate } from './utils/dateUtils';
import { generateHash } from './utils/hashUtils';
import { NDialogProvider, NMessageProvider } from 'naive-ui';
import { apiRequest } from './utils/api';
import { loading, setLoading } from './utils/loading';
import {
  initReminderManager,
  destroyReminderManager,
} from './utils/reminderManager';

const isInitialized = ref(false);
const userId = ref(null);
const todos = ref([]);
const completedInstances = ref([]);
const deletedInstances = ref([]);
const holidayData = ref({});

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
  let hash = window.location.hash.substring(1);

  if (!hash) {
    hash = generateHash();
    window.location.hash = hash;
  }

  userId.value = hash;

  initCalendar();
};

const fetchHolidayData = async (currentYear) => {
  try {
    let result = {};
    const calendar = new HolidayCalendar();
    let ps = [
      calendar.getDates('CN', currentYear - 1),
      calendar.getDates('CN', currentYear),
    ];
    if (currentYear < new Date().getFullYear()) {
      ps.push(calendar.getDates('CN', currentYear + 1));
    }
    const cnDates = await Promise.all(ps);

    result.dates = cnDates.flat();

    if (result && result.dates) {
      const holidayMap = {};
      result.dates.forEach((item) => {
        holidayMap[item.date] = {
          name: item.name_cn,
          type: item.type,
        };
      });
      holidayData.value = { ...holidayData.value, ...holidayMap };
    }
  } catch (error) {
    console.error('获取节假日数据失败:', error);
  }
};
provide('holidayData', holidayData);

const initCalendar = async () => {
  try {
    const currentDate = new Date();
    setLoading(true);
    await Promise.allSettled([
      fetchHolidayData(currentDate.getFullYear()),
      fetchCalendarData(currentDate),
    ]);
    setLoading(false);
    isInitialized.value = true;
  } catch (error) {
    console.error('初始化日历失败:', error);
    alert('加载日历数据失败，请刷新页面重试');
  }
};

const fetchCalendarData = async (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month + 2, 0);

  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  try {
    const result = await apiRequest(
      `/api/todos?startDate=${startDate}&endDate=${endDate}`,
      'GET',
      null,
      null,
      false,
    );
    todos.value = result.todos || [];
    completedInstances.value = result.completedInstances || [];
    deletedInstances.value = result.deletedInstances || [];
    return result;
  } catch (error) {
    console.error('获取日历数据失败:', error);
    throw error;
  }
};

const handleAddTodo = async (todoData) => {
  try {
    const result = await apiRequest(
      '/api/todos',
      'POST',
      {
        text: todoData.text,
        date: todoData.date,
        repeatType: todoData.repeatType,
        repeatInterval: todoData.repeatInterval || 1,
        endDate: todoData.endDate || '2039-12-31',
        skipHolidays: todoData.skipHolidays || false,
        reminder: todoData.reminder || 0,
        todoTime: todoData.todoTime || '09:00',
      },
      null,
      true,
    );

    if (result.success) {
      todos.value.push(result.todo);
      return true;
    }
    return false;
  } catch (error) {
    console.error('保存待办事项失败:', error);
    return false;
  }
};

const handleCompleteTodo = async ({ todoId, date: todoDate, allInstances }) => {
  try {
    const todo = todos.value.find((t) => t.id == todoId);

    if (!todo) return false;

    if (
      (!todo.repeat_type || todo.repeat_type === 'none') &&
      todo.date === todoDate
    ) {
      const result = await apiRequest(
        '/api/todos',
        'PUT',
        {
          id: todoId,
          completed: !todo.completed,
        },
        null,
        true,
      );

      if (result.success) {
        todo.completed = !todo.completed;
        return true;
      }
    } else {
      if (allInstances) {
        const result = await apiRequest(
          '/api/todos',
          'PUT',
          {
            id: todoId,
            completed: !todo.completed,
            endDate: todo.end_date || '2039-12-31',
          },
          null,
          true,
        );

        if (result.success) {
          todo.completed = !todo.completed;
          return true;
        }
      } else {
        const result = await apiRequest(
          '/api/completed-instances',
          'POST',
          {
            todoId,
            date: todoDate,
          },
          null,
          true,
        );

        if (result.success) {
          if (result.completed) {
            completedInstances.value.push({
              todo_id: parseInt(todoId),
              date: todoDate,
              user_id: userId.value,
            });
          } else {
            const index = completedInstances.value.findIndex(
              (instance) =>
                instance.todo_id == todoId && instance.date === todoDate,
            );
            if (index >= 0) {
              completedInstances.value.splice(index, 1);
            }
          }
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('更新待办事项状态失败:', error);
    return false;
  }
};

const handleDeleteTodo = async ({ todoId, date: todoDate, allInstances }) => {
  try {
    const todo = todos.value.find((t) => t.id == todoId);

    if (todo) {
      if (
        (!todo.repeat_type || todo.repeat_type === 'none') &&
        todo.date === todoDate
      ) {
        const result = await apiRequest(
          `/api/todos?id=${todoId}`,
          'DELETE',
          null,
          null,
          true,
        );

        if (result.success) {
          todos.value = todos.value.filter((t) => t.id != todoId);
        }
      } else {
        if (allInstances) {
          const result = await apiRequest(
            `/api/todos?id=${todoId}`,
            'DELETE',
            null,
            null,
            true,
          );

          if (result.success) {
            todos.value = todos.value.filter((t) => t.id != todoId);
          }
        } else {
          const result = await apiRequest(
            '/api/deleted-instances',
            'POST',
            {
              todoId,
              date: todoDate,
            },
            null,
            null,
            true,
          );

          if (result.success) {
            deletedInstances.value.push({
              todo_id: parseInt(todoId),
              date: todoDate,
              user_id: userId.value,
            });
          }
        }
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('删除待办事项失败:', error);
    return false;
  }
};

const handleMoveTodoDate = async ({ todoId, newDate }) => {
  try {
    const result = await apiRequest('/api/todos', 'PUT', {
      id: todoId,
      date: newDate,
    });
    if (result.success) {
      const todo = todos.value.find((t) => t.id == todoId);
      if (todo) {
        todo.date = newDate;
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('移动待办日期失败:', error);
    return false;
  }
};

const handleReorderTodos = async ({ sourceId, targetId }) => {
  try {
    const sourceTodo = todos.value.find((t) => t.id == sourceId);
    const targetTodo = todos.value.find((t) => t.id == targetId);
    if (!sourceTodo || !targetTodo) return false;

    const sourceOrder = targetTodo.sort_order ?? targetTodo.sortOrder ?? 0;
    const result = await apiRequest('/api/todos', 'PUT', {
      id: sourceId,
      sortOrder: sourceOrder - 1,
    });
    if (result.success) {
      sourceTodo.sort_order = sourceOrder - 1;
    }
    return result.success;
  } catch (error) {
    console.error('排序待办失败:', error);
    return false;
  }
};

window.addEventListener('hashchange', () => {
  const newHash = window.location.hash.substring(1);
  if (newHash && newHash !== userId.value) {
    userId.value = newHash;
    initCalendar();
  }
});

const handlePageShow = (event) => {
  if (document.visibilityState === 'visible') {
    const currentDate = new Date();
    fetchCalendarData(currentDate);
  }
};

onMounted(() => {
  initializeUserId();
  window.addEventListener('visibilitychange', handlePageShow);
  initReminderManager(
    todos,
    holidayData,
    completedInstances,
    deletedInstances,
    handleInPageReminder,
  );
});

onUnmounted(() => {
  window.removeEventListener('visibilitychange', handlePageShow);
  destroyReminderManager();
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
