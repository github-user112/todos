<script setup>
import { ref, computed, onMounted } from 'vue';
const dialogVisible = ref(false);
const todoForm = ref({
  content: '',
  repeat: 'none',
});
import TodoItem from './TodoItem.vue';

// 状态管理
const currentDate = ref(new Date());
const todos = ref([]);
const userHash = ref('');

// 生成用户唯一标识
const generateUserHash = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// 从URL获取或生成hash
onMounted(() => {
  const hashFromUrl = window.location.hash.substring(1);
  userHash.value = hashFromUrl || generateUserHash();
  if (!hashFromUrl) {
    window.location.hash = userHash.value;
  }
  loadTodos();
});

// 加载待办事项
const loadTodos = () => {
  const saved = localStorage.getItem(`todos-${userHash.value}`);
  if (saved) {
    todos.value = JSON.parse(saved);
  }
};

// 保存待办事项
const saveTodos = () => {
  localStorage.setItem(`todos-${userHash.value}`, JSON.stringify(todos.value));
};

// 月份导航
const prevMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
};

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
};

// 生成月份日历
const monthDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days = [];

  // 上个月的日期
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  // 当前月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // 下个月的日期
  const totalCells = Math.ceil(days.length / 7) * 7;
  while (days.length < totalCells) {
    days.push(null);
  }

  return days;
});

// 添加待办事项
const selectedDay = ref(null);

const addTodo = (date) => {
  console.log(date);
  if (date) {
    selectedDay.value = date.toISOString().split('T')[0];
    dialogVisible.value = true;
  }
};

const confirmAddTodo = () => {
  if (todoForm.value.content.trim()) {
    const newTodo = {
      id: Date.now(),
      title: todoForm.value.content,
      date: selectedDay.value,
      completed: false,
      repeat: todoForm.value.repeat,
    };
    todos.value.push(newTodo);
    saveTodos();
    dialogVisible.value = false;
    todoForm.value = { content: '', repeat: 'none' };
  }
};

// 处理待办事项状态
// 修改toggleTodo函数，使其只处理当前实例
const toggleTodo = (todo) => {
  if (todo.repeat === 'none') {
    todo.completed = !todo.completed;
  } else {
    // 对于重复事件，只标记当前实例为完成
    const index = todos.value.findIndex((t) => t.id === todo.id);
    if (index !== -1) {
      todos.value[index].completed = !todos.value[index].completed;
    }
  }
  saveTodos();
};

const deleteTodo = (todo) => {
  todos.value = todos.value.filter((t) => t.id !== todo.id);
  saveTodos();
};

// 获取某天的待办事项
const getTodosForDay = (date) => {
  if (!date) return [];

  const dateStr = date.toISOString().split('T')[0];
  return todos.value.filter((todo) => {
    if (todo.date === dateStr) return true;

    // 处理重复事项
    const todoDate = new Date(todo.date);
    const today = new Date(dateStr);

    if (todo.repeat === 'daily') {
      return todoDate <= today;
    } else if (todo.repeat === 'weekly') {
      return todoDate.getDay() === today.getDay() && todoDate <= today;
    } else if (todo.repeat === 'monthly') {
      return todoDate.getDate() === today.getDate() && todoDate <= today;
    }

    return false;
  });
};

// 检查是否是今天
const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
</script>

<template>
  <div class="calendar-container" style="height: 100vh">
    <el-dialog v-model="dialogVisible" title="添加事件" width="30%">
      <el-form :model="todoForm">
        <el-form-item label="事件内容">
          <el-input v-model="todoForm.content" />
        </el-form-item>
        <el-form-item label="重复">
          <el-select v-model="todoForm.repeat" placeholder="请选择">
            <el-option label="不重复" value="none" />
            <el-option label="每天" value="daily" />
            <el-option label="每月" value="monthly" />
            <el-option label="每天" value="daily" />
            <el-option label="每周" value="weekly" />
            <el-option label="每月" value="monthly" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAddTodo">确认</el-button>
        </span>
      </template>
    </el-dialog>
    <div class="calendar-header">
      <button @click="prevMonth">上一月</button>
      <h6>
        {{
          currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })
        }}
      </h6>
      <button @click="nextMonth">下一月</button>
    </div>

    <div class="calendar-grid">
      <div
        class="day-header"
        v-for="day in ['日', '一', '二', '三', '四', '五', '六']"
        :key="day"
      >
        {{ day }}
      </div>

      <div
        class="day-cell"
        v-for="(day, index) in monthDays"
        :key="index"
        :class="{ today: isToday(day), 'other-month': !day }"
        @dblclick="day && addTodo(day)"
      >
        <div class="day-number">{{ day ? day.getDate() : '' }}</div>
        <div class="todos-container">
          <TodoItem
            v-for="todo in getTodosForDay(day)"
            :key="todo.id"
            :todo="todo"
            @toggle="toggleTodo(todo)"
            @delete="deleteTodo(todo)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-container {
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
  height: calc(100vh - 60px);
  overflow: auto;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background-color: #ddd;
  border: 1px solid #ddd;
}
.day-cell {
  min-height: 80px;
  height: calc((100vh - 120px) / 6);
  display: flex;
  flex-direction: column;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  flex-grow: 1;
}
.day-header {
  text-align: center;
  font-weight: bold;
  padding: 0px;
}
.day-cell {
  background-color: white;
  min-height: 80px;
  max-height: calc((100vh - 120px) / 6);
  padding: 2px;
  position: relative;
  overflow: hidden;
}
.day-cell.today {
  background-color: #e8f4fd;
}

.day-cell.today .day-number {
  color: #3498db;
}
.day-cell.other-month {
  opacity: 0.5;
}
.day-number {
  font-size: 16px;
  margin-bottom: 5px;
}
.todos-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
  overflow-y: auto;
  max-height: calc((100vh - 120px) / 6 - 20px);
}

.todos-container::-webkit-scrollbar {
  display: none;
}
/* 鼠标移入目标日期时显示删除按钮 */
.day-cell:hover .delete-btn {
  display: block;
}
.delete-btn {
  display: none;
}
@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: repeat(7, 1fr);
  }
  .day-cell {
    min-height: 60px;
  }
  .day-number {
    font-size: 12px;
  }
}
</style>
