<template>
  <div class="calendar-container">
    <CalendarHeader
      :currentYear="currentYear"
      :currentMonth="currentMonth"
      :animationType="animationType"
      @prevMonth="prevMonth"
      @nextMonth="nextMonth"
      @goToToday="goToToday"
      @changeAnimation="changeAnimation"
    />

    <CalendarGrid
      :weekdays="weekdays"
      :calendarDays="calendarDays"
      :animationType="animationType"
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
import { apiRequest } from '../utils/api';

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
// 添加动画类型状态
// 从localStorage读取保存的动画类型，默认为'slide-left'
const allowedAnimations = ['slide-left', 'default']; // 允许的动画类型列表
const savedAnimation = localStorage.getItem('calendar_animation_type');
const animationType = ref(savedAnimation ? savedAnimation : 'slide-left');

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
  console.log('computed calendarDays');
  const mergedHolidayData = {
    ...props.holidayData,
    ...(holidayDataFromFile.value?.dates?.reduce((acc, item) => {
      acc[item.date] = {
        name:
          item.name || (item.type === 'public_holiday' ? '节假日' : '工作日'),
        type: item.type,
      };
      return acc;
    }, {}) || {}),
  };

  // 获取当前日期
  const today = currentDate.value;
  today.setHours(0, 0, 0, 0);

  // 找到当前周的周一
  const currentDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday...
  const offsetToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - offsetToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // 起始日期：当前周的周一往前推 2 周
  const startDate = new Date(currentMonday);
  startDate.setDate(startDate.getDate() - 7); // 往前推两周（14天）

  const result = [];

  for (let i = 0; i < 35; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const year = date.getFullYear();
    const month = date.getMonth();
    const dayNumber = date.getDate();

    const isCurrentMonth =
      month === currentMonth.value && year === currentYear.value;

    const dateStr = formatDate(date);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    result.push({
      dayNumber,
      isOtherMonth: !isCurrentMonth,
      isToday,
      date,
      dateStr,
      lunarDate: getLunarDate(date),
      holiday: mergedHolidayData[dateStr] || '',
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

  // Sort todos: incomplete first, then completed
  return result.sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return 0;
  });
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
const prevMonth = async () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
};

const nextMonth = async () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);

  currentDate.value = newDate;
};

const goToToday = () => {
  currentDate.value = new Date();
};

// Watch for date changes
watch(currentDate, async (newDate, oldValue) => {
  emit('fetch-calendar-data', newDate);
  // Load holiday data when year changes
  if (oldValue && newDate.getFullYear() !== oldValue.getFullYear()) {
    emit('fetch-holiday-data', newDate.getFullYear());
  }
});

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
// 添加动画类型更改方法
const changeAnimation = (newType) => {
  animationType.value = newType;
  // 保存到localStorage
  localStorage.setItem('calendar_animation_type', newType);
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
  background: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #2d3748;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-container {
    padding: 4px;
  }
}
</style>
