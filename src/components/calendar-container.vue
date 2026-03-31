<template>
  <div class="calendar-container">
    <CalendarHeader
      :currentYear="currentYear"
      :currentMonth="currentMonth"
      :animationType="animationType"
      :themeType="themeType"
      @prevMonth="prevMonth"
      @nextMonth="nextMonth"
      @goToToday="goToToday"
      @changeAnimation="changeAnimation"
      @changeTheme="changeTheme"
    />

    <CalendarGrid
      :weekdays="weekdays"
      :calendarDays="calendarDays"
      :weekNumbers="weekNumbers"
      :animationType="animationType"
      @openAddTodoPopup="openAddTodoPopup"
      @openTodoActions="openTodoActions"
    />

    <AddTodoPopup
      v-if="showAddTodoPopup"
      v-model:todoText="todoText"
      v-model:todoRepeat="todoRepeat"
      :selectedDate="selectedDate"
      @close="closeAddTodoPopup"
      @save="saveTodo"
    />

    <TodoActionsMenu
      v-if="showTodoActions"
      :style="todoActionsStyle"
      @complete="completeTodo"
      @delete="deleteTodo"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import CalendarHeader from './calendar-header.vue';
import CalendarGrid from './calendar-grid.vue';
import AddTodoPopup from './add-todo-popup.vue';
import TodoActionsMenu from './todo-actions-menu.vue';
import { formatDate, getWeekNumber } from '../utils/dateUtils';
import { shouldShowRepeatingTodo } from '../utils/repeatUtils';

const dialog = useDialog();
const message = useMessage();

const props = defineProps({
  todos: { type: Array, required: true },
  completedInstances: { type: Array, required: true },
  deletedInstances: { type: Array, required: true },
  lunarData: { type: Object, required: true },
  holidayData: { type: Object, required: true },
  userId: { type: String, required: true },
});

const emit = defineEmits([
  'fetch-calendar-data',
  'fetch-holiday-data',
  'add-todo',
  'complete-todo',
  'delete-todo',
]);

// ---- 设置 ----
const savedAnimation = localStorage.getItem('calendar_animation_type');
const animationType = ref(savedAnimation || 'slide-left');
const savedTheme = localStorage.getItem('calendar_theme_type');
const themeType = ref(savedTheme || 'default');

// ---- 状态 ----
const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

// Popup
const showAddTodoPopup = ref(false);
const todoText = ref('');
const todoRepeat = ref('none');
const selectedDate = ref(null);

// Todo actions
const showTodoActions = ref(false);
const todoActionsStyle = ref({});
const selectedTodo = ref(null);
const selectedTodoDate = ref(null);

// Touch
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

// ---- 日历计算 ----
const calendarDays = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = today.getDay();
  const offsetToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - offsetToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const startDate = new Date(currentMonday);
  startDate.setDate(startDate.getDate() - 7);

  const result = [];
  for (let i = 0; i < 35; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const isCurrentMonth = date.getMonth() === currentMonth.value && date.getFullYear() === currentYear.value;
    const dateStr = formatDate(date);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    result.push({
      dayNumber: date.getDate(),
      isOtherMonth: !isCurrentMonth,
      isToday,
      date,
      dateStr,
      lunarDate: getLunarDate(date),
      holiday: props.holidayData[dateStr] || '',
      todos: getTodosForDate(date, dateStr),
    });
  }
  return result;
});

const weekNumbers = computed(() => {
  const weeks = [];
  for (let i = 0; i < 5; i++) {
    const firstDayOfWeek = new Date(calendarDays.value[i * 7].date);
    const dayOfWeek = firstDayOfWeek.getDay();
    const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(firstDayOfWeek);
    monday.setDate(firstDayOfWeek.getDate() - offsetToMonday);
    weeks.push(getWeekNumber(monday));
  }
  return weeks;
});

function getLunarDate(date) {
  return props.lunarData[formatDate(date)] || '';
}

function getTodosForDate(date, dateStr) {
  const result = [];
  props.todos.forEach((todo) => {
    if (isInstanceDeleted(todo.id, dateStr)) return;

    if (todo.date === dateStr) {
      const isCompleted = todo.completed || isInstanceCompleted(todo.id, dateStr);
      result.push({ ...todo, isCompleted });
      return;
    }

    if (!todo.repeat_type || todo.repeat_type === 'none') return;

    const todoDate = new Date(todo.date);
    const currentDate = new Date(dateStr);
    const interval = todo.repeat_interval || 1;

    if (shouldShowRepeatingTodo(todoDate, currentDate, todo.repeat_type, interval, todo.end_date ? new Date(todo.end_date) : null)) {
      const isCompleted = isInstanceCompleted(todo.id, dateStr);
      result.push({ ...todo, isCompleted });
    }
  });
  return result;
}

function isInstanceCompleted(todoId, dateStr) {
  return props.completedInstances.some((i) => i.todo_id === todoId && i.date === dateStr);
}
function isInstanceDeleted(todoId, dateStr) {
  return props.deletedInstances.some((i) => i.todo_id === todoId && i.date === dateStr);
}

// ---- 导航 ----
const prevMonth = () => {
  document.documentElement.style.setProperty('--direction', '-1');
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
};
const nextMonth = () => {
  document.documentElement.style.setProperty('--direction', '1');
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
};
const goToToday = () => { currentDate.value = new Date(); };

watch(currentDate, (newDate, oldValue) => {
  emit('fetch-calendar-data', newDate);
  if (oldValue && newDate.getFullYear() !== oldValue.getFullYear()) {
    emit('fetch-holiday-data', newDate.getFullYear());
  }
});

// ---- 设置 ----
const changeAnimation = (v) => {
  animationType.value = v;
  localStorage.setItem('calendar_animation_type', v);
};
const changeTheme = (v) => {
  themeType.value = v;
  localStorage.setItem('calendar_theme_type', v);
  applyTheme(v);
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.remove('classic-theme', 'orange-theme', 'green-theme');
  root.classList.remove('dark-mode');
  if (theme === 'classic') root.classList.add('classic-theme');
  else if (theme === 'orange') root.classList.add('orange-theme');
  else if (theme === 'green') root.classList.add('green-theme');
};

// ---- Todo 弹窗 ----
const openAddTodoPopup = (date) => {
  selectedDate.value = date;
  showAddTodoPopup.value = true;
  todoText.value = '';
  todoRepeat.value = 'none';
};
const closeAddTodoPopup = () => { showAddTodoPopup.value = false; };

const saveTodo = async (eventData) => {
  if (!todoText.value.trim()) return;
  try {
    await emit('add-todo', {
      text: todoText.value.trim(),
      date: selectedDate.value,
      repeatType: eventData?.repeatType || todoRepeat.value,
      repeatInterval: eventData?.repeatInterval || 1,
      endDate: eventData?.endDate,
    });
    closeAddTodoPopup();
  } catch (error) {
    console.error('添加待办事项失败:', error);
  }
};

// ---- Todo 操作 ----
const openTodoActions = (todoId, todoDate, event) => {
  selectedTodo.value = todoId;
  selectedTodoDate.value = todoDate;
  showTodoActions.value = true;

  if (window.innerWidth <= 480) {
    todoActionsStyle.value = {};
  } else {
    const target = event?.target || event?.currentTarget;
    if (target) {
      const rect = target.getBoundingClientRect();
      todoActionsStyle.value = {
        position: 'absolute',
        top: `${rect.bottom + 4}px`,
        left: `${Math.min(rect.left, window.innerWidth - 140)}px`,
      };
    }
  }
};

const completeTodo = async () => {
  if (!selectedTodo.value || !selectedTodoDate.value) return;
  await emit('complete-todo', {
    todoId: selectedTodo.value,
    date: selectedTodoDate.value,
    allInstances: false,
  });
  showTodoActions.value = false;
};

const deleteTodo = async () => {
  if (!selectedTodo.value || !selectedTodoDate.value) return;
  const todo = props.todos.find((t) => t.id === selectedTodo.value);
  if (!todo) return;

  if (todo.repeat_type && todo.repeat_type !== 'none') {
    dialog.warning({
      title: '删除重复事件',
      content: '请选择操作范围',
      positiveText: '删除所有重复事件',
      negativeText: '仅删除当前事件',
      onPositiveClick: async () => {
        await emit('delete-todo', { todoId: selectedTodo.value, date: selectedTodoDate.value, allInstances: true });
        message.success('已删除所有重复事件');
        showTodoActions.value = false;
      },
      onNegativeClick: async () => {
        await emit('delete-todo', { todoId: selectedTodo.value, date: selectedTodoDate.value, allInstances: false });
        message.success('已删除当前事件');
        showTodoActions.value = false;
      },
    });
    return;
  }

  await emit('delete-todo', { todoId: selectedTodo.value, date: selectedTodoDate.value, allInstances: false });
  showTodoActions.value = false;
};

// ---- 点击外部关闭 ----
const closeActionsOnOutsideClick = (event) => {
  if (!event.target.closest('.todo-item') && !event.target.closest('.todo-actions')) {
    showTodoActions.value = false;
  }
};

// ---- 触摸 ----
const handleTouchStart = (event) => {
  touchStartTime = Date.now();
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
};
const handleTouchEnd = async (event) => {
  const dt = Date.now() - touchStartTime;
  const dx = Math.abs(event.changedTouches[0].screenX - touchStartX);
  const dy = Math.abs(event.changedTouches[0].screenY - touchStartY);

  if (dt < 300 && dx < 10 && dy < 10) {
    const target = event.target.closest('.calendar-day');
    if (target) openAddTodoPopup(target.dataset.date);
  }
  if (dx > 100 && dy < 50) {
    if (event.changedTouches[0].screenX < touchStartX) nextMonth();
    else prevMonth();
  }
};

onMounted(() => {
  document.addEventListener('click', closeActionsOnOutsideClick);
  const calendarEl = document.querySelector('.calendar-grid');
  if (calendarEl) {
    calendarEl.addEventListener('touchstart', handleTouchStart);
    calendarEl.addEventListener('touchend', handleTouchEnd);
  }
  applyTheme(themeType.value);
});
</script>

<style>
.calendar-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 10px;
  margin: 0;
  box-sizing: border-box;
  background: var(--background-color);
  font-family: 'Inter', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: var(--text-primary);
  overflow: hidden;
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 6px;
  }
}

@media (max-width: 480px) {
  .calendar-container {
    padding: 4px;
  }
}
</style>
