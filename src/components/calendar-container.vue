<template>
  <div class="calendar-container">
    <CalendarHeader 
      :currentYear="currentYear" 
      :currentMonth="currentMonth" 
      @prevMonth="prevMonth" 
      @nextMonth="nextMonth" 
      @goToToday="goToToday" 
    />

    <CalendarGrid 
      :weekdays="weekdays" 
      :calendarDays="calendarDays" 
      @openAddTodoPopup="openAddTodoPopup" 
      @openTodoActions="openTodoActions" 
    />

    <AddTodoPopup 
      v-if="showAddTodoPopup" 
      v-model:todoText="todoText" 
      v-model:todoRepeat="todoRepeat" 
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
import { formatDate } from '../utils/dateUtils';
import { useDialog, useMessage } from 'naive-ui';
import CalendarHeader from './calendar-header.vue';
import CalendarGrid from './calendar-grid.vue';
import AddTodoPopup from './add-todo-popup.vue';
import TodoActionsMenu from './todo-actions-menu.vue';

const dialog = useDialog();
const message = useMessage();

// Status
const holidayDataFromFile = ref({});

// Props
const props = defineProps({
  todos: {
    type: Array,
    required: true,
  },
  completedInstances: {
    type: Array,
    required: true,
  },
  deletedInstances: {
    type: Array,
    required: true,
  },
  lunarData: {
    type: Object,
    required: true,
  },
  holidayData: {
    type: Object,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
});

// Events
const emit = defineEmits([
  'fetch-calendar-data',
  'add-todo',
  'complete-todo',
  'delete-todo',
]);

// State
const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

// Popup state
const showAddTodoPopup = ref(false);
const todoText = ref('');
const todoRepeat = ref('none');
const selectedDate = ref(null);

// Todo action state
const showTodoActions = ref(false);
const todoActionsStyle = ref({});
const selectedTodo = ref(null);
const selectedTodoDate = ref(null);

// Touch event state
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

// Truncated user ID display
const truncatedUserId = computed(() => {
  if (props.userId && props.userId.length > 8) {
    return props.userId.substring(0, 8) + '...';
  }
  return props.userId;
});

// Calendar days computation
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const result = [];

  // Merge holiday data
  const mergedHolidayData = {
    ...props.holidayData,
    ...(holidayDataFromFile.value?.dates?.reduce((acc, item) => {
      acc[item.date] = item.type === 'public_holiday' ? '休' : '班';
      return acc;
    }, {}) || {}),
  };

  // Get first day of current month
  const firstDay = new Date(year, month, 1);
  // Get last day of current month
  const lastDay = new Date(year, month + 1, 0);

  // First day of week
  let firstDayOfWeek = firstDay.getDay();
  if (firstDayOfWeek === 0) firstDayOfWeek = 7; // Adjust Sunday to 7

  // Days in month
  const daysInMonth = lastDay.getDate();

  // Last day of previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Current date
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === month && today.getFullYear() === year;
  const currentDay = today.getDate();

  // Add previous month dates
  for (let i = firstDayOfWeek - 1; i > 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i + 1);
    const dateStr = formatDate(date);

    result.push({
      dayNumber: prevMonthLastDay - i + 1,
      isOtherMonth: true,
      isToday: false,
      date,
      dateStr,
      lunarDate: getLunarDate(date),
      holiday: mergedHolidayData[dateStr]
        ? mergedHolidayData[dateStr].name ||
          (mergedHolidayData[dateStr] === '休' ? '休' : '班')
        : '',
      todos: getTodosForDate(date, dateStr),
    });
  }

  // Add current month dates
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = formatDate(date);
    const isToday = isCurrentMonth && i === currentDay;

    result.push({
      dayNumber: i,
      isOtherMonth: false,
      isToday,
      date,
      dateStr,
      lunarDate: getLunarDate(date),
      holiday: mergedHolidayData[dateStr]
        ? mergedHolidayData[dateStr].name ||
          (mergedHolidayData[dateStr] === '休' ? '休' : '班')
        : '',
      todos: getTodosForDate(date, dateStr),
    });
  }

  // Add next month dates (to fill 6 weeks)
  const cellsAdded = result.length;
  const remainingCells = 42 - cellsAdded;

  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(year, month + 1, i);
    const dateStr = formatDate(date);

    result.push({
      dayNumber: i,
      isOtherMonth: true,
      isToday: false,
      date,
      dateStr,
      lunarDate: getLunarDate(date),
      holiday: mergedHolidayData[dateStr]
        ? mergedHolidayData[dateStr].name ||
          (mergedHolidayData[dateStr] === '休' ? '休' : '班')
        : '',
      todos: getTodosForDate(date, dateStr),
    });
  }

  return result;
});

// Get lunar date
function getLunarDate(date) {
  const dateStr = formatDate(date);
  return props.lunarData[dateStr] || '';
}

// Get holiday (backup compatibility)
function getHoliday(date) {
  const dateStr = formatDate(date);
  return props.holidayData[dateStr] || '';
}

// Get todos for date
function getTodosForDate(date, dateStr) {
  const result = [];

  props.todos.forEach((todo) => {
    // Check if instance is deleted
    if (isInstanceDeleted(todo.id, dateStr)) {
      return;
    }

    // Check direct date match
    if (todo.date === dateStr) {
      const isCompleted =
        todo.completed || isInstanceCompleted(todo.id, dateStr);
      result.push({
        ...todo,
        isCompleted,
      });
      return;
    }

    // Check repeating todos
    if (!todo.repeat_type || todo.repeat_type === 'none') return;

    const todoDate = new Date(todo.date);
    const currentDate = new Date(dateStr);

    // Check if repeating todo should show on current date
    let shouldShow = false;

    if (todo.repeat_type === 'daily') {
      shouldShow = true;
    } else if (
      todo.repeat_type === 'weekly' &&
      todoDate.getDay() === currentDate.getDay()
    ) {
      shouldShow = true;
    } else if (
      todo.repeat_type === 'monthly' &&
      todoDate.getDate() === currentDate.getDate()
    ) {
      shouldShow = true;
    } else if (
      todo.repeat_type === 'yearly' &&
      todoDate.getDate() === currentDate.getDate() &&
      todoDate.getMonth() === currentDate.getMonth()
    ) {
      shouldShow = true;
    }

    if (shouldShow) {
      const isCompleted = isInstanceCompleted(todo.id, dateStr);
      result.push({
        ...todo,
        isCompleted,
      });
    }
  });

  return result;
}

// Check if instance is completed
function isInstanceCompleted(todoId, dateStr) {
  return props.completedInstances.some(
    (instance) => instance.todo_id === todoId && instance.date === dateStr
  );
}

// Check if instance is deleted
function isInstanceDeleted(todoId, dateStr) {
  return props.deletedInstances.some(
    (instance) => instance.todo_id === todoId && instance.date === dateStr
  );
}

// Month navigation
const prevMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
};

const nextMonth = () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentDate.value = newDate;
};

const goToToday = () => {
  currentDate.value = new Date();
};

// Watch for date changes
watch(
  currentDate,
  async (newDate) => {
    await emit('fetch-calendar-data', newDate);

    // Load holiday data when year changes
    try {
      const response = await apiRequest(`/api/holidays?year=${currentYear.value}`);
      if (response.ok) {
        holidayDataFromFile.value = await response.json();
      } else {
        holidayDataFromFile.value = {};
      }
    } catch (error) {
      console.error('加载节假日数据失败:', error);
      holidayDataFromFile.value = {};
    }
  },
  {
    immediate: true,
    flush: 'post', // Ensure DOM is updated first
  }
);

// Todo popup management
const openAddTodoPopup = (date) => {
  selectedDate.value = date;
  showAddTodoPopup.value = true;
  todoText.value = '';
  todoRepeat.value = 'none';
};

const closeAddTodoPopup = () => {
  showAddTodoPopup.value = false;
};

const saveTodo = async () => {
  if (!todoText.value.trim()) return;

  try {
    await emit('add-todo', {
      text: todoText.value.trim(),
      date: selectedDate.value,
      repeatType: todoRepeat.value,
    });
    closeAddTodoPopup();
  } catch (error) {
    console.error('添加待办事项失败:', error);
    alert('添加待办事项失败，请重试');
  }
};

// Todo actions menu
const openTodoActions = (todoId, todoDate, event) => {
  selectedTodo.value = todoId;
  selectedTodoDate.value = todoDate;
  showTodoActions.value = true;

  // Position the menu based on device
  if (window.innerWidth <= 480) {
    todoActionsStyle.value = {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '100%',
      display: 'flex',
    };
  } else {
    const target = event?.target || event?.currentTarget;
    if (target) {
      const rect = target.getBoundingClientRect();
      todoActionsStyle.value = {
        position: 'absolute',
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        display: 'block',
      };
    }
  }
};

const completeTodo = async () => {
  if (!selectedTodo.value || !selectedTodoDate.value) return;

  const todo = props.todos.find((t) => t.id === selectedTodo.value);
  if (!todo) return;

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

  // For repeating events, show a confirmation dialog
  if (todo.repeat_type && todo.repeat_type !== 'none') {
    const d = dialog.warning({
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

  // Non-repeating events can be deleted directly
  await emit('delete-todo', {
    todoId: selectedTodo.value,
    date: selectedTodoDate.value,
    allInstances: false,
  });
  showTodoActions.value = false;
};

// Close actions menu when clicking outside
const closeActionsOnOutsideClick = (event) => {
  if (
    !event.target.closest('.todo-item') &&
    !event.target.closest('.todo-actions')
  ) {
    showTodoActions.value = false;
  }
};

// Touch event handlers
const handleTouchStart = (event) => {
  touchStartTime = new Date().getTime();
  touchStartX = event.changedTouches[0].screenX;
  touchStartY = event.changedTouches[0].screenY;
};

const handleTouchEnd = async (event) => {
  const touchEndTime = new Date().getTime();
  const touchEndX = event.changedTouches[0].screenX;
  const touchEndY = event.changedTouches[0].screenY;

  const touchDuration = touchEndTime - touchStartTime;
  const touchDistanceX = Math.abs(touchEndX - touchStartX);
  const touchDistanceY = Math.abs(touchEndY - touchStartY);

  // Detect double tap - open add todo popup
  if (touchDuration < 300 && touchDistanceX < 10 && touchDistanceY < 10) {
    const target = event.target.closest('.calendar-day');
    if (target) {
      openAddTodoPopup(target.dataset.date);
    }
  }

  // Detect swipe - change month
  if (touchDistanceX > 100 && touchDistanceY < 50) {
    if (touchEndX < touchStartX) {
      // Swipe left, next month
      await nextMonth();
    } else {
      // Swipe right, previous month
      await prevMonth();
    }
  }
};

// Initialize event listeners
onMounted(async () => {
  document.addEventListener('click', closeActionsOnOutsideClick);

  // Mobile touch events
  const calendarEl = document.querySelector('.calendar-grid');
  if (calendarEl) {
    calendarEl.addEventListener('touchstart', handleTouchStart);
    calendarEl.addEventListener('touchend', handleTouchEnd);
  }

  // Load holiday data for current year
  try {
    const response = await apiRequest(`/api/holidays?year=${currentYear.value}`);
    if (response.ok) {
      holidayDataFromFile.value = await response.json();
    }
  } catch (error) {
    console.error('加载节假日数据失败:', error);
  }
});
</script>

<style>
.calendar-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  background: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-container {
    padding: 4px;
  }
}
</style>

