<template>
  <div class="calendar-container">
    <div class="user-info">
      <span>用户ID: {{ truncatedUserId }}</span>
      <button @click="copyUserId" class="copy-btn">复制链接</button>
    </div>
    
    <div class="calendar-header">
      <button @click="prevMonth">&lt;</button>
      <h2 class="calendar-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
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
        :class="['calendar-day', 
                 { 'other-month': day.isOtherMonth }, 
                 { 'current-day': day.isToday }]"
        :data-date="day.dateStr"
        @dblclick="openAddTodoPopup(day.dateStr)"
      >
        <div class="day-number">{{ day.dayNumber }}</div>
        
        <!-- 农历日期 -->
        <div v-if="day.lunarDate" class="lunar-date">
          {{ day.lunarDate }}
        </div>
        
        <!-- 节假日 -->
        <div v-if="day.holiday" class="holiday">
          {{ day.holiday }}
        </div>
        
        <!-- 待办事项列表 -->
        <div class="todo-list">
          <div 
            v-for="todo in day.todos" 
            :key="`${todo.id}-${day.dateStr}`"
            :class="['todo-item', { 'completed': todo.isCompleted }]"
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
        <input type="text" v-model="todoText" placeholder="待办事项">
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

// 接收的属性
const props = defineProps({
  todos: {
    type: Array,
    required: true
  },
  completedInstances: {
    type: Array,
    required: true
  },
  deletedInstances: {
    type: Array,
    required: true
  },
  lunarData: {
    type: Object,
    required: true
  },
  holidayData: {
    type: Object,
    required: true
  },
  userId: {
    type: String,
    required: true
  }
});

// 事件
const emit = defineEmits([
  'fetch-calendar-data',
  'add-todo',
  'complete-todo',
  'delete-todo'
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
  const url = window.location.origin + window.location.pathname + '#' + props.userId;
  navigator.clipboard.writeText(url).then(() => {
    alert('链接已复制到剪贴板');
  }).catch(err => {
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
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
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
      todos: getTodosForDate(date, dateStr)
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
      todos: getTodosForDate(date, dateStr)
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
      todos: getTodosForDate(date, dateStr)
    });
  }
  
  return result;
});

// 获取农历日期
function getLunarDate(date) {
  const dateStr = formatDate(date);
  return props.lunarData[dateStr] || "";
}

// 获取节假日
function getHoliday(date) {
  const dateStr = formatDate(date);
  return props.holidayData[dateStr] || "";
}

// 获取特定日期的待办事项
function getTodosForDate(date, dateStr) {
  const result = [];
  
  props.todos.forEach(todo => {
    // 检查是否是已删除的实例
    if (isInstanceDeleted(todo.id, dateStr)) {
      return;
    }
    
    // 检查直接匹配的日期
    if (todo.date === dateStr) {
      const isCompleted = todo.completed || isInstanceCompleted(todo.id, dateStr);
      result.push({
        ...todo,
        isCompleted
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
    } else if (todo.repeat_type === 'weekly' && todoDate.getDay() === currentDate.getDay()) {
      shouldShow = true;
    } else if (todo.repeat_type === 'monthly' && todoDate.getDate() === currentDate.getDate()) {
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
        isCompleted
      });
    }
  });
  
  return result;
}

// 检查特定实例是否已完成
function isInstanceCompleted(todoId, dateStr) {
  return props.completedInstances.some(instance => 
    instance.todo_id === todoId && instance.date === dateStr
  );
}

// 检查特定实例是否已删除
function isInstanceDeleted(todoId, dateStr) {
  return props.deletedInstances.some(instance => 
    instance.todo_id === todoId && instance.date === dateStr
  );
}

// 月份导航
const prevMonth = async () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() - 1);
  currentDate.value = newDate;
  await emit('fetch-calendar-data', newDate);
};

const nextMonth = async () => {
  const newDate = new Date(currentDate.value);
  newDate.setMonth(newDate.getMonth() + 1);
  currentDate.value = newDate;
  await emit('fetch-calendar-data', newDate);
};

const goToToday = async () => {
  currentDate.value = new Date();
  await emit('fetch-calendar-data', currentDate.value);
};

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
  
  const success = await emit('add-todo', {
    text: todoText.value.trim(),
    date: selectedDate.value,
    repeatType: todoRepeat.value
  });
  
  if (success) {
    closeAddTodoPopup();
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
      display: 'flex'
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
        display: 'block'
      };
    }
  }
};

const completeTodo = async () => {
  if (!selectedTodo.value || !selectedTodoDate.value) return;
  
  const success = await emit('complete-todo', selectedTodo.value, selectedTodoDate.value);
  
  if (success) {
    showTodoActions.value = false;
  }
};

const deleteTodo = async () => {
  if (!selectedTodo.value || !selectedTodoDate.value) return;
  
  const success = await emit('delete-todo', selectedTodo.value, selectedTodoDate.value);
  
  if (success) {
    showTodoActions.value = false;
  }
};

// 点击外部关闭操作菜单
const closeActionsOnOutsideClick = (event) => {
  if (!event.target.closest('.todo-item') && !event.target.closest('.todo-actions')) {
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

// 当前日期变化时获取数据
watch(currentDate, async (newDate) => {
  await emit('fetch-calendar-data', newDate);
}, { immediate: true });
</script>

<style scoped>
.calendar-container {
  width: 100%;
  max-width: 600px;
  position: relative;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.copy-btn {
  padding: 5px 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.calendar-header button {
  padding: 5px 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.calendar-weekday {
  text-align: center;
  font-weight: bold;
  padding: 10px;
}

.calendar-day {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: center;
  cursor: pointer;
  min-height: 80px;
  position: relative;
}

.calendar-day.other-month {
  color: #aaa;
}

.calendar-day.current-day {
  background-color: #ffc;
}

.day-number {
  font-weight: bold;
}

.lunar-date, .holiday {
  font-size: 0.8em;
  color: #777;
}

.todo-list {
  margin-top: 5px;
}

.todo-item {
  font-size: 0.9em;
  padding: 3px;
  background-color: #eef;
  margin-bottom: 2px;
  border-radius: 3px;
  cursor: pointer;
}

.todo-item.completed {
  text-decoration: line-through;
  color: #777;
}

.add-todo-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.popup-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  width: 300px;
}

.popup-content h2 {
  margin-top: 0;
}

.popup-content input, 
.popup-content select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.popup-content button {
  padding: 8px 15px;
  margin-right: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.popup-content button:last-child {
  background-color: #6c757d;
}

.todo-actions {
  display: block;
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  padding: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.todo-actions button {
  display: block;
  margin-bottom: 5px;
  padding: 5px 10px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

@media (max-width: 480px) {
  .calendar-container {
    width: 100%;
  }
  
  .calendar-day {
    min-height: 60px;
    padding: 5px;
  }
  
  .todo-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    border: none;
    box-shadow: none;
    border-radius: 0;
    padding: 10px;
    background-color: #f5f5f5;
  }
  
  .todo-actions button {
    display: inline-block;
    width: 48%;
    margin: 1%;
  }
}
</style>

