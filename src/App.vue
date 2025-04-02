<template>
  <div class="app-container">
    <div id="loading-indicator" v-if="loading">加载中...</div>
    <n-dialog-provider><n-message-provider>
      <CalendarContainer
          v-if="isInitialized"
          :todos="todos"
          :completedInstances="completedInstances"
          :deletedInstances="deletedInstances"
          :lunarData="lunarData"
          :holidayData="holidayData"
          :userId="userId"
          @fetch-calendar-data="fetchCalendarData"
          @add-todo="handleAddTodo"
          @complete-todo="handleCompleteTodo"
          @delete-todo="handleDeleteTodo"
      /></n-message-provider>
    </n-dialog-provider>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import CalendarContainer from './components/CalendarContainer.vue';
import {formatDate} from './utils/dateUtils';
import {generateHash} from './utils/hashUtils';
import {NDialogProvider,NMessageProvider} from 'naive-ui'
// 状态
const loading = ref(false);
const isInitialized = ref(false);
const userId = ref(null);
const todos = ref([]);
const completedInstances = ref([]);
const deletedInstances = ref([]);

// 农历和节假日数据
const lunarData = ref({
  '2024-01-01': '元旦',
  '2024-02-10': '春节',
  '2024-02-11': '春节',
  '2024-02-12': '春节',
  '2024-04-04': '清明节',
  '2024-05-01': '劳动节',
  '2024-06-10': '端午节',
  '2024-09-17': '中秋节',
  '2024-10-01': '国庆节',
  '2024-10-02': '国庆节',
  '2024-10-03': '国庆节',

  // 2025年节假日
  '2025-01-01': '元旦',
  '2025-01-29': '春节',
  '2025-01-30': '春节',
  '2025-01-31': '春节',
  '2025-04-05': '清明节',
  '2025-05-01': '劳动节',
  '2025-06-01': '端午节',
  '2025-10-06': '中秋节',
  '2025-10-01': '国庆节',
  '2025-10-02': '国庆节',
  '2025-10-03': '国庆节',

  // 2026年节假日
  '2026-01-01': '元旦',
  '2026-02-17': '春节',
  '2026-02-18': '春节',
  '2026-02-19': '春节',
  '2026-04-05': '清明节',
  '2026-05-01': '劳动节',
  '2026-06-18': '端午节',
  '2026-09-25': '中秋节',
  '2026-10-01': '国庆节',
  '2026-10-02': '国庆节',
  '2026-10-03': '国庆节',
});

const holidayData = ref({});

// API 请求函数
const apiRequest = async (endpoint, method = 'GET', data = null) => {
  loading.value = true;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // 添加用户ID到请求头
    if (userId.value) {
      headers['X-User-ID'] = userId.value;
    }

    const options = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '请求失败');
    }

    return result;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  } finally {
    loading.value = false;
  }
};

// 初始化用户ID
const initializeUserId = () => {
  // 从URL hash中获取用户ID
  let hash = window.location.hash.substring(1);

  // 如果没有hash，生成一个新的
  if (!hash) {
    hash = generateHash();
    window.location.hash = hash;
  }

  userId.value = hash;
  console.log('用户ID:', userId.value);

  // 初始化日历
  initCalendar();
};

// 初始化日历
// 在App.vue的script setup部分添加
const fetchHolidayData = async (year) => {
  try {
    const result = await apiRequest(`/api/holidays?year=${year}`);
    if (result && result.dates) {
      // 将数据转换为前端需要的格式
      const holidayMap = {};
      result.dates.forEach(item => {
        holidayMap[item.date] = {
          name: item.name_cn,
          type: item.type
        };
      });
      holidayData.value = holidayMap;
    }
  } catch (error) {
    console.error('获取节假日数据失败:', error);
  }
};

// 在initCalendar方法中调用
const initCalendar = async () => {
  try {
    const currentDate = new Date();
    await fetchHolidayData(currentDate.getFullYear());
    await fetchCalendarData(currentDate);
    isInitialized.value = true;
  } catch (error) {
    console.error('初始化日历失败:', error);
    alert('加载日历数据失败，请刷新页面重试');
  }
};

// 获取日历数据
const fetchCalendarData = async (currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 计算当前月的第一天和最后一天
  const firstDay = new Date(year, month - 1, 1); // 包括上个月
  const lastDay = new Date(year, month + 2, 0); // 包括下个月

  const startDate = formatDate(firstDay);
  const endDate = formatDate(lastDay);

  try {
    const result = await apiRequest(
        `/api/todos?startDate=${startDate}&endDate=${endDate}`
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

// 添加待办事项
const handleAddTodo = async (todoData) => {
  try {
    const result = await apiRequest('/api/todos', 'POST', {
      text: todoData.text,
      date: todoData.date,
      repeatType: todoData.repeatType,
    });

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

// 完成待办事项
const handleCompleteTodo = async ({todoId, date: todoDate, allInstances}) => {
  try {
    const todo = todos.value.find((t) => t.id == todoId);

    if (!todo) return false;

    if ((!todo.repeat_type || todo.repeat_type === 'none') && todo.date === todoDate) {
      // 非重复事项，直接修改原始待办事项
      const result = await apiRequest('/api/todos', 'PUT', {
        id: todoId,
        completed: !todo.completed,
      });

      if (result.success) {
        todo.completed = !todo.completed;
        return true;
      }
    } else {
      if (allInstances) {
        // 完成所有重复实例
        const result = await apiRequest('/api/todos', 'PUT', {
          id: todoId,
          completed: !todo.completed,
        });

        if (result.success) {
          todo.completed = !todo.completed;
          return true;
        }
      } else {
        // 完成单个重复实例
        const result = await apiRequest('/api/completed-instances', 'POST', {
          todoId,
          date: todoDate,
        });

        if (result.success) {
          if (result.completed) {
            completedInstances.value.push({
              todo_id: parseInt(todoId),
              date: todoDate,
              user_id: userId.value,
            });
          } else {
            // 移除完成记录
            const index = completedInstances.value.findIndex(
              (instance) => instance.todo_id == todoId && instance.date === todoDate
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

// 删除待办事项
const handleDeleteTodo = async ({todoId, date:todoDate, allInstances}) => {
  try {
    const todo = todos.value.find((t) => t.id == todoId);

    if (todo) {
      console.log(todo);
      console.log(todoDate);
      if (
          (!todo.repeat_type || todo.repeat_type === 'none') &&
          todo.date === todoDate
      ) {
        // 非重复事项，直接从数据库中删除
        const result = await apiRequest(`/api/todos?id=${todoId}`, 'DELETE');

        if (result.success) {
          // 从本地数组中移除
          todos.value = todos.value.filter((t) => t.id != todoId);
        }
      } else {
        if (allInstances) {
          // 非重复事项，直接从数据库中删除
          const result = await apiRequest(`/api/todos?id=${todoId}`, 'DELETE');

          if (result.success) {
            // 从本地数组中移除
            todos.value = todos.value.filter((t) => t.id != todoId);
          }
        } else {
          // 重复事项，记录特定实例的删除状态
          const result = await apiRequest('/api/deleted-instances', 'POST', {
            todoId,
            date: todoDate,
          });

          if (result.success) {
            // 添加到本地删除实例数组
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

// 监听hash变化
window.addEventListener('hashchange', () => {
  const newHash = window.location.hash.substring(1);
  if (newHash && newHash !== userId.value) {
    userId.value = newHash;
    initCalendar();
  }
});

// 页面加载时初始化用户ID
onMounted(() => {
  initializeUserId();
});
</script>

<style>
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 禁止全局滚动条 */
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 使用视口高度 */
  width: 100vw; /* 使用视口宽度 */
  overflow: hidden; /* 禁止容器滚动 */
}

#loading-indicator {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 2em;
  z-index: 1000;
}
</style>
