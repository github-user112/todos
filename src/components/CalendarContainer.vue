<template>
  <div class="calendar-container">
    <!-- <div class="user-info">
      <span>用户ID: {{ truncatedUserId }}</span>
      <button @click="copyUserId" class="copy-btn">复制链接</button>
    </div> -->

    <div class="calendar-header">
      <button @click="prevMonth">&lt;</button>
      <h2 class="calendar-title">
        {{ currentYear }}年{{ currentMonth + 1 }}月
      </h2>
      <button @click="nextMonth">&gt;</button>
      <button @click="goToToday">今天</button>
    </div>

    <div class="calendar-grid">
      <!-- 星期头部 -->
      <div v-for="day in weekdays" :key="day" class="calendar-weekday">
        {{ day }}
      </div>

      <!-- 日历天 -->
      <div
        v-for="day in calendarDays"
        :key="day.date"
        :class="[
          'calendar-day',
          { 'other-month': day.isOtherMonth },
          { 'current-day': day.isToday },
        ]"
        :data-date="day.dateStr"
        @dblclick="openAddTodoPopup(day.dateStr)"
      >
        <div class="day-number">{{ day.dayNumber }}</div>

        <!-- 合并农历和节日显示 -->
        <div v-if="day.lunarDate || day.holiday" class="special-date">
          {{ day.holiday || day.lunarDate }}
        </div>

        <div class="todo-list">
          <div
            v-for="todo in day.todos"
            :key="`${todo.id}-${day.dateStr}`"
            :class="['todo-item', { completed: todo.isCompleted }]"
            :data-id="todo.id"
            :data-date="day.dateStr"
            @click="openTodoActions(todo.id, day.dateStr, $event)"
          >
            {{ todo.text }}
          </div>
        </div>
      </div>
    </div>

    <!-- 添加待办事项弹窗 -->
    <div class="add-todo-popup" v-if="showAddTodoPopup">
      <div class="popup-content">
        <h2>添加待办事项</h2>
        <input type="text" v-model="todoText" placeholder="待办事项" />
        <select v-model="todoRepeat">
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="yearly">每年</option>
        </select>
        <button @click="saveTodo">保存</button>
        <button @click="closeAddTodoPopup">取消</button>
      </div>
    </div>

    <!-- 待办事项操作菜单 -->
    <div class="todo-actions" v-if="showTodoActions" :style="todoActionsStyle">
      <button @click="completeTodo">完成</button>
      <button @click="deleteTodo">删除</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { formatDate } from '../utils/dateUtils';
import { useDialog } from 'naive-ui';
const dialog = useDialog();
const message = useMessage();
// 接收的属性
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

// 事件
const emit = defineEmits([
  'fetch-calendar-data',
  'add-todo',
  'complete-todo',
  'delete-todo',
]);

// 状态
const currentDate = ref(new Date());
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());
const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

// 截断的用户ID显示
const truncatedUserId = computed(() => {
  if (props.userId && props.userId.length > 8) {
    return props.userId.substring(0, 8) + '...';
  }
  return props.userId;
});

// 复制用户链接
const copyUserId = () => {
  const url =
    window.location.origin + window.location.pathname + '#' + props.userId;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      alert('链接已复制到剪贴板');
    })
    .catch((err) => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    });
};

// 弹窗状态
const showAddTodoPopup = ref(false);
const todoText = ref('');
const todoRepeat = ref('none');
const selectedDate = ref(null);

// 待办事项操作状态
const showTodoActions = ref(false);
const todoActionsStyle = ref({});
const selectedTodo = ref(null);
const selectedTodoDate = ref(null);

// 触摸事件状态
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

// 计算日历中应该显示的日期
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const result = [];

  // 获取当前月第一天
  const firstDay = new Date(year, month, 1);
  // 获取当前月最后一天
  const lastDay = new Date(year, month + 1, 0);

  // 第一天星期几
  let firstDayOfWeek = firstDay.getDay();
  if (firstDayOfWeek === 0) firstDayOfWeek = 7; // 调整星期日为7

  // 当月天数
  const daysInMonth = lastDay.getDate();

  // 上个月最后几天
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // 当前日期
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === month && today.getFullYear() === year;
  const currentDay = today.getDate();

  // 添加上个月的日期
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
      holiday: getHoliday(date),
      todos: getTodosForDate(date, dateStr),
    });
  }

  // 添加当前月的日期
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
      holiday: getHoliday(date),
      todos: getTodosForDate(date, dateStr),
    });
  }

  // 添加下个月的日期，确保总共显示42个日期（6周）
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
      holiday: getHoliday(date),
      todos: getTodosForDate(date, dateStr),
    });
  }

  return result;
});

// 获取农历日期
function getLunarDate(date) {
  const dateStr = formatDate(date);
  return props.lunarData[dateStr] || '';
}

// 获取节假日
function getHoliday(date) {
  const dateStr = formatDate(date);
  return props.holidayData[dateStr] || '';
}

// 获取特定日期的待办事项
function getTodosForDate(date, dateStr) {
  const result = [];

  props.todos.forEach((todo) => {
    // 检查是否是已删除的实例
    if (isInstanceDeleted(todo.id, dateStr)) {
      return;
    }

    // 检查直接匹配的日期
    if (todo.date === dateStr) {
      const isCompleted =
        todo.completed || isInstanceCompleted(todo.id, dateStr);
      result.push({
        ...todo,
        isCompleted,
      });
      return;
    }

    // 检查重复的待办事项
    if (!todo.repeat_type || todo.repeat_type === 'none') return;

    const todoDate = new Date(todo.date);
    const currentDate = new Date(dateStr);

    // 检查重复事项是否应该显示在当前日期
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

// 检查特定实例是否已完成
function isInstanceCompleted(todoId, dateStr) {
  return props.completedInstances.some(
    (instance) => instance.todo_id === todoId && instance.date === dateStr
  );
}

// 检查特定实例是否已删除
function isInstanceDeleted(todoId, dateStr) {
  return props.deletedInstances.some(
    (instance) => instance.todo_id === todoId && instance.date === dateStr
  );
}

// 月份导航 - 移除内部的fetch调用
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

// 修改watch选项，添加防抖
watch(
  currentDate,
  async (newDate) => {
    await emit('fetch-calendar-data', newDate);
  },
  {
    immediate: true,
    flush: 'post', // 确保DOM更新后再执行
  }
);

// 待办事项弹窗
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

// 待办事项操作
const openTodoActions = (todoId, todoDate, event) => {
  selectedTodo.value = todoId;
  selectedTodoDate.value = todoDate;
  showTodoActions.value = true;

  // 在移动设备上，将操作菜单固定在底部
  if (window.innerWidth <= 480) {
    todoActionsStyle.value = {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '100%',
      display: 'flex',
    };
  } else {
    // 将操作菜单定位到待办事项下方
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

  // 如果是重复事件，显示选择对话框
  if (todo.repeat_type && todo.repeat_type !== 'none') {
    const d = dialog.warning({
      title: '完成重复事件',
      content: '请选择操作范围',
      positiveText: '完成所有重复事件',
      negativeText: '仅完成当前事件',
      onPositiveClick: async () => {
        await emit('complete-todo', {
          todoId: selectedTodo.value,
          date: selectedTodoDate.value,
          allInstances: true,
        });
        message.success('已完成所有重复事件');
        showTodoActions.value = false;
        d.destroy();
      },
      onNegativeClick: async () => {
        await emit('complete-todo', {
          todoId: selectedTodo.value,
          date: selectedTodoDate.value,
          allInstances: false,
        });
        message.success('已完成当前事件');
        showTodoActions.value = false;
        d.destroy();
      },
    });
    return;
  }

  // 非重复事件直接完成
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

  // 如果是重复事件，显示选择对话框
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

  // 非重复事件直接删除
  await emit('delete-todo', {
    todoId: selectedTodo.value,
    date: selectedTodoDate.value,
    allInstances: false,
  });
  showTodoActions.value = false;
};

// 点击外部关闭操作菜单
const closeActionsOnOutsideClick = (event) => {
  if (
    !event.target.closest('.todo-item') &&
    !event.target.closest('.todo-actions')
  ) {
    showTodoActions.value = false;
  }
};

// 移动设备触摸事件
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

  // 检测双击 - 在移动设备上打开添加待办事项弹窗
  if (touchDuration < 300 && touchDistanceX < 10 && touchDistanceY < 10) {
    const target = event.target.closest('.calendar-day');
    if (target) {
      openAddTodoPopup(target.dataset.date);
    }
  }

  // 检测左右滑动 - 切换月份
  if (touchDistanceX > 100 && touchDistanceY < 50) {
    if (touchEndX < touchStartX) {
      // 向左滑动，下个月
      await nextMonth();
    } else {
      // 向右滑动，上个月
      await prevMonth();
    }
  }
};

// 初始化事件监听器
onMounted(() => {
  document.addEventListener('click', closeActionsOnOutsideClick);

  // 移动设备触摸事件
  const calendarEl = document.querySelector('.calendar-grid');
  if (calendarEl) {
    calendarEl.addEventListener('touchstart', handleTouchStart);
    calendarEl.addEventListener('touchend', handleTouchEnd);
  }
});
</script>

<style scoped>
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

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 15px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.calendar-header button {
  padding: 8px 16px;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.calendar-header button:hover {
  background: #3a5bd9;
  transform: translateY(-1px);
}

.calendar-title {
  margin: 0;
  font-size: 1.3rem;
  color: #2d3748;
  font-weight: 600;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 36px repeat(6, minmax(0, 1fr));
  gap: 1px;
  flex: 1;
  height: calc(100vh - 60px);
  padding: 0 2px;
}

.calendar-weekday {
  text-align: center;
  font-weight: 600;
  padding: 12px 0;
  background: #ffffff;
  border-radius: 8px;
  color: #4a5568;
  font-size: 15px;
}

.calendar-weekday:nth-child(6),
.calendar-weekday:nth-child(7) {
  color: #f56565;
}

.calendar-day {
  border: 1px solid #e2e8f0;
  padding: 4px;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  transition: all 0.2s;
  min-height: 0;
}

.calendar-day:nth-child(7n),
.calendar-day:nth-child(7n-1) {
  background: #fef2f2;
}

.other-month:nth-child(7n),
.other-month:nth-child(7n-1) {
  background: #fef2f2;
  opacity: 0.6;
}

.other-month {
  background: #f8fafc;
  opacity: 0.6;
  color: #a0aec0;
}

.calendar-day:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.day-number {
  font-weight: 600;
  margin-bottom: 6px;
  text-align: right;
  color: #2d3748;
  font-size: 15px;
}

.other-month .day-number {
  color: #cbd5e0;
  font-size: 0.9em;
  opacity: 0.7;
}

.current-day {
  background: #ebf8ff;
  border: 2px solid #3182ce;
  box-shadow: 0 0 0 1px rgba(49, 130, 206, 0.1);
}

.current-day .day-number {
  color: #2c5282;
  font-weight: 700;
  font-size: 1.1em;
}

.lunar-date,
.holiday {
  font-size: 0.75em;
  color: #718096;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.todo-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 4px;
  padding-right: 2px;
  max-height: calc(100% - 30px);
}

.todo-item {
  font-size: 0.82em;
  padding: 4px 6px;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #f8fafc;
  border-radius: 3px;
  border-left: 2px solid #4a6cf7;
  transition: all 0.2s;
}

.todo-item:hover {
  background: #edf2f7;
}

.todo-item.completed {
  text-decoration: line-through;
  color: #a0aec0;
  border-left-color: #48bb78;
}

/* 添加待办事项弹窗 */
.add-todo-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.popup-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2d3748;
  font-size: 1.4rem;
}

.popup-content input,
.popup-content select {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 15px;
}

.popup-content button {
  padding: 10px 16px;
  margin-right: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.popup-content button:first-of-type {
  background: #4a6cf7;
  color: white;
}

.popup-content button:last-of-type {
  background: #f8fafc;
  color: #4a5568;
}

.popup-content button:hover {
  transform: translateY(-1px);
}

/* 待办事项操作菜单 */
.todo-actions {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.todo-actions button {
  padding: 12px 20px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  position: relative;
}

.todo-actions button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.todo-actions button:disabled::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.todo-actions button:hover {
  background: #f8fafc;
}

.todo-actions button:first-child {
  color: #48bb78;
}

.todo-actions button:last-child {
  color: #f56565;
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .calendar-container {
    padding: 4px;
  }

  .calendar-header {
    padding: 8px;
  }

  .calendar-header button {
    padding: 4px 8px;
    font-size: 12px;
  }

  .calendar-title {
    font-size: 1rem;
  }

  .calendar-day {
    padding: 3px;
  }

  .todo-item {
    padding: 3px 4px;
    font-size: 0.75em;
    border-left-width: 1px;
  }

  .popup-content {
    width: 90%;
    padding: 16px;
  }
}
</style>
