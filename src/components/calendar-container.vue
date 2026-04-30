<template>
  <div :class="['calendar-container', { 'drawer-open': showTodoListDrawer }]">
    <CalendarHeader
      :currentYear="currentYear"
      :currentMonth="currentMonth"
      :animationType="animationType"
      :themeType="themeType"
      :viewMode="viewMode"
      :showTodoList="showTodoListDrawer"
      :showLunar="showLunar"
      :webhookUrlProp="webhookUrl"
      @prevMonth="prevMonth"
      @nextMonth="nextMonth"
      @goToToday="goToToday"
      @changeAnimation="changeAnimation"
      @changeTheme="changeTheme"
      @changeViewMode="changeViewMode"
      @toggleTodoList="toggleTodoList"
      @changeShowLunar="changeShowLunar"
    />

    <CalendarGrid
      :weekdays="weekdays"
      :calendarDays="calendarDays"
      :weekNumbers="weekNumbers"
      :animationType="animationType"
      :weekCount="calendarWeekCount"
      :selectedDate="selectedDate"
      :todos="todos"
      :holidayData="holidayData"
      :completedInstances="completedInstances"
      :deletedInstances="deletedInstances"
      :showLunar="showLunar"
      @openAddTodoPopup="openAddTodoPopup"
      @openTodoActions="openTodoActions"
      @selectDate="handleSelectDate"
      @todoDrop="handleTodoDrop"
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

    <TodoListDrawer
      :show="showTodoListDrawer"
      :todos="todos"
      :completedInstances="completedInstances"
      :deletedInstances="deletedInstances"
      :selectedDate="selectedDate"
      @close="showTodoListDrawer = false"
      @complete-todo="handleListComplete"
      @delete-todo="handleListDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useDialog, useMessage } from 'naive-ui';
import CalendarHeader from './calendar-header.vue';
import CalendarGrid from './calendar-grid.vue';
import AddTodoPopup from './add-todo-popup.vue';
import TodoActionsMenu from './todo-actions-menu.vue';
import TodoListDrawer from './TodoListDrawer.vue';
import { formatDate, getWeekNumber } from '../utils/dateUtils';
import {
  getLunarDateStr,
  ensureLunarLoaded,
  isLunarLoaded,
} from '../utils/lunarUtils';
import { apiRequest } from '../utils/api';
const dialog = useDialog();
const message = useMessage();

const props = defineProps({
  todos: { type: Array, required: true },
  completedInstances: { type: Array, required: true },
  deletedInstances: { type: Array, required: true },
  holidayData: { type: Object, required: true },
  userId: { type: String, required: true },
});

const emit = defineEmits([
  'fetch-calendar-data',
  'fetch-holiday-data',
  'add-todo',
  'complete-todo',
  'delete-todo',
  'moveTodoDate',
  'reorderTodos',
]);

// ---- 设置（从 API 加载，fallback localStorage） ----
const animationType = ref(
  localStorage.getItem('calendar_animation_type') || 'slide-left',
);
const themeType = ref(localStorage.getItem('calendar_theme_type') || 'default');
const viewMode = ref(
  localStorage.getItem('calendar_view_mode') || 'today-priority',
);
const showTodoList = ref(
  localStorage.getItem('calendar_show_todo_list') === '1',
);
const showLunar = ref(localStorage.getItem('calendar_show_lunar') !== '0');
const lunarReady = ref(isLunarLoaded());
const webhookUrl = ref('');

// 从 API 加载用户设置
const loadUserSettings = async () => {
  try {
    const settings = await apiRequest('/api/user-settings');
    if (settings.animation_type) {
      animationType.value = settings.animation_type;
      localStorage.setItem('calendar_animation_type', settings.animation_type);
    }
    if (settings.theme_type) {
      themeType.value = settings.theme_type;
      localStorage.setItem('calendar_theme_type', settings.theme_type);
    }
    if (settings.view_mode) {
      viewMode.value = settings.view_mode;
      localStorage.setItem('calendar_view_mode', settings.view_mode);
    }
    if (settings.show_todo_list !== undefined) {
      showTodoList.value = !!settings.show_todo_list;
      localStorage.setItem(
        'calendar_show_todo_list',
        settings.show_todo_list ? '1' : '0',
      );
      showTodoListDrawer.value = !!settings.show_todo_list;
    }
    if (settings.show_lunar !== undefined) {
      showLunar.value = !!settings.show_lunar;
      localStorage.setItem(
        'calendar_show_lunar',
        settings.show_lunar ? '1' : '0',
      );
    }
    if (settings.webhook_url !== undefined) {
      webhookUrl.value = settings.webhook_url;
    }
  } catch (e) {
    console.warn('加载用户设置失败，使用本地缓存:', e);
  }
};

// 保存设置到 API + localStorage
const saveUserSettings = async (field, value) => {
  const fieldMap = {
    animationType: 'animation_type',
    themeType: 'theme_type',
    viewMode: 'view_mode',
    showTodoList: 'show_todo_list',
    showLunar: 'show_lunar',
  };
  const localStorageMap = {
    animationType: 'calendar_animation_type',
    themeType: 'calendar_theme_type',
    viewMode: 'calendar_view_mode',
    showTodoList: 'calendar_show_todo_list',
    showLunar: 'calendar_show_lunar',
  };
  const apiValue =
    field === 'showTodoList' || field === 'showLunar' ? (value ? 1 : 0) : value;
  const localValue =
    field === 'showTodoList' || field === 'showLunar'
      ? value
        ? '1'
        : '0'
      : value;
  localStorage.setItem(localStorageMap[field], localValue);
  try {
    await apiRequest('/api/user-settings', 'PUT', {
      [fieldMap[field]]: apiValue,
    });
  } catch (e) {
    console.warn('保存用户设置到 API 失败:', e);
  }
};

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

// Todo list drawer
const showTodoListDrawer = ref(false);

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
const calendarWeekCount = computed(() => {
  if (viewMode.value === 'today-priority') return 5;

  // 完整月视图：计算当月实际有几周
  const year = currentYear.value;
  const month = currentMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 本月第一天是周几（周一=1 ... 周日=0→7）
  const firstDow = firstDay.getDay() || 7;
  // 本月最后一天是周几
  const lastDow = lastDay.getDay() || 7;

  // 总格子数 = 月初前面空位 + 本月天数 + 月末后面空位
  const totalCells = firstDow - 1 + lastDay.getDate() + (7 - lastDow);
  return Math.ceil(totalCells / 7);
});

const calendarDays = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const _ = lunarReady.value;

  const weekCount = calendarWeekCount.value;
  let startDate;

  if (viewMode.value === 'today-priority') {
    const viewDate = new Date(currentDate.value);
    const viewDayOfWeek = viewDate.getDay();
    const offsetToMonday = viewDayOfWeek === 0 ? 6 : viewDayOfWeek - 1;
    const viewMonday = new Date(viewDate);
    viewMonday.setDate(viewDate.getDate() - offsetToMonday);
    viewMonday.setHours(0, 0, 0, 0);
    startDate = new Date(viewMonday);
    startDate.setDate(startDate.getDate() - 7);
  } else {
    const firstOfMonth = new Date(currentYear.value, currentMonth.value, 1);
    const dow = firstOfMonth.getDay() || 7;
    startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - (dow - 1));
    startDate.setHours(0, 0, 0, 0);
  }

  const result = [];
  const totalDays = weekCount * 7;
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const isCurrentMonth =
      date.getMonth() === currentMonth.value &&
      date.getFullYear() === currentYear.value;
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
      lunarDate: getLunarDateStr(date),
      holiday: props.holidayData[dateStr] || '',
    });
  }
  return result;
});

const weekNumbers = computed(() => {
  const weekCount = calendarWeekCount.value;
  const weeks = [];
  for (let i = 0; i < weekCount; i++) {
    const firstDayOfWeek = new Date(calendarDays.value[i * 7].date);
    const dayOfWeek = firstDayOfWeek.getDay();
    const offsetToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(firstDayOfWeek);
    monday.setDate(firstDayOfWeek.getDate() - offsetToMonday);
    weeks.push(getWeekNumber(monday));
  }
  return weeks;
});

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
const goToToday = () => {
  currentDate.value = new Date();
  selectedDate.value = formatDate(new Date());
};

watch(currentDate, (newDate, oldValue) => {
  emit('fetch-calendar-data', newDate);
  if (oldValue && newDate.getFullYear() !== oldValue.getFullYear()) {
    emit('fetch-holiday-data', newDate.getFullYear());
  }
});

// ---- 设置 ----
const changeAnimation = (v) => {
  animationType.value = v;
  saveUserSettings('animationType', v);
};
const changeTheme = (v) => {
  themeType.value = v;
  applyTheme(v);
  saveUserSettings('themeType', v);
};
const changeViewMode = (v) => {
  viewMode.value = v;
  saveUserSettings('viewMode', v);
};
const changeShowLunar = (v) => {
  showLunar.value = v;
  saveUserSettings('showLunar', v);
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.remove(
    'classic-theme',
    'orange-theme',
    'green-theme',
    'rose-theme',
    'lavender-theme',
    'mint-theme',
    'amber-theme',
    'primrose-theme',
    'dark-mode',
  );

  const map = {
    default: '',
    classic: 'classic-theme',
    orange: 'orange-theme',
    green: 'green-theme',
    rose: 'rose-theme',
    lavender: 'lavender-theme',
    mint: 'mint-theme',
    amber: 'amber-theme',
    primrose: 'primrose-theme',
    dark: 'dark-mode',
  };

  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.classList.add('dark-mode');
  } else if (map[theme]) {
    root.classList.add(map[theme]);
  }
};

const handleColorSchemeChange = () => {
  if (themeType.value === 'auto') {
    applyTheme('auto');
  }
};

// ---- Todo 弹窗 ----
const openAddTodoPopup = (date) => {
  selectedDate.value = date;
  showAddTodoPopup.value = true;
  todoText.value = '';
  todoRepeat.value = 'none';
};
const closeAddTodoPopup = () => {
  showAddTodoPopup.value = false;
};

const saveTodo = async (eventData) => {
  if (!todoText.value.trim()) return;
  try {
    await emit('add-todo', {
      text: todoText.value.trim(),
      date: selectedDate.value,
      repeatType: eventData?.repeatType || todoRepeat.value,
      repeatInterval: eventData?.repeatInterval || 1,
      endDate: eventData?.endDate,
      skipHolidays: eventData?.skipHolidays || false,
      reminder: eventData?.reminder || 0,
      todoTime: eventData?.todoTime || '09:00',
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

  // 桌面端定位
  if (window.innerWidth > 768) {
    const target = event?.target || event?.currentTarget;
    if (target) {
      const rect = target.getBoundingClientRect();
      todoActionsStyle.value = {
        position: 'absolute',
        top: `${rect.bottom + 4}px`,
        left: `${Math.min(rect.left, window.innerWidth - 150)}px`,
      };
    }
  } else {
    todoActionsStyle.value = {};
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
        await emit('delete-todo', {
          todoId: selectedTodo.value,
          date: selectedTodoDate.value,
          allInstances: true,
        });
        message.success('已删除所有重复事件');
        showTodoActions.value = false;
      },
      onNegativeClick: async () => {
        await emit('delete-todo', {
          todoId: selectedTodo.value,
          date: selectedTodoDate.value,
          allInstances: false,
        });
        message.success('已删除当前事件');
        showTodoActions.value = false;
      },
    });
    return;
  }

  await emit('delete-todo', {
    todoId: selectedTodo.value,
    date: selectedTodoDate.value,
    allInstances: false,
  });
  showTodoActions.value = false;
};

// ---- 选中日期 ----
const handleSelectDate = (dateStr) => {
  selectedDate.value = dateStr;
  if (!showTodoListDrawer.value) {
    showTodoListDrawer.value = true;
  }
  saveUserSettings('showTodoList', true);
};

const handleTodoDrop = async ({ type, source, targetTodoId, targetDate }) => {
  if (type === 'moveDate') {
    emit('moveTodoDate', { todoId: source.id, newDate: targetDate });
  } else if (type === 'reorder') {
    emit('reorderTodos', { sourceId: source.id, targetId: targetTodoId });
  }
};

// ---- 待办列表开关 ----
const toggleTodoList = () => {
  showTodoListDrawer.value = !showTodoListDrawer.value;
  showTodoList.value = showTodoListDrawer.value;
  saveUserSettings('showTodoList', showTodoListDrawer.value);
};

// ---- 待办列表抽屉操作 ----
const handleListComplete = async ({ todoId, date, allInstances }) => {
  await emit('complete-todo', { todoId, date, allInstances });
};
const handleListDelete = async ({ todoId, date, allInstances }) => {
  await emit('delete-todo', { todoId, date, allInstances });
};

// ---- 点击外部关闭 ----
const closeActionsOnOutsideClick = (event) => {
  if (
    !event.target.closest('.todo-item') &&
    !event.target.closest('.todo-actions')
  ) {
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

  // 左右滑切换月份
  if (dx > 80 && dy < 40) {
    if (event.changedTouches[0].screenX < touchStartX) nextMonth();
    else prevMonth();
  }
};

onMounted(() => {
  document.addEventListener('click', closeActionsOnOutsideClick);
  const calendarEl = document.querySelector('.calendar-grid');
  if (calendarEl) {
    calendarEl.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    calendarEl.addEventListener('touchend', handleTouchEnd, { passive: true });
  }
  applyTheme(themeType.value);
  loadUserSettings();

  ensureLunarLoaded().then(() => {
    lunarReady.value = true;
  });

  const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  colorSchemeMedia.addEventListener('change', handleColorSchemeChange);
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
  font-family:
    'Inter', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: var(--text-primary);
  overflow: hidden;
  transition:
    width 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 769px) {
  .calendar-container.drawer-open {
    width: calc(100vw - 340px);
  }
}

@media (max-width: 768px) {
  .calendar-container {
    padding: 6px 4px;
  }
}

@media (max-width: 380px) {
  .calendar-container {
    padding: 4px 3px;
  }
}
</style>
