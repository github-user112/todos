<template>
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import CalendarContainer from '../components/calendar-container.vue';
import { formatDate } from '../utils/dateUtils';
import { NDialogProvider, NMessageProvider } from 'naive-ui';
import { apiRequest, getUserId } from '../utils/api';
import { loading, setLoading } from '../utils/loading';
import {
  initReminderManager,
  destroyReminderManager,
} from '../utils/reminderManager';

const userId = getUserId();
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
              user_id: userId,
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
              user_id: userId,
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

const handlePageShow = (event) => {
  if (document.visibilityState === 'visible') {
    const currentDate = new Date();
    fetchCalendarData(currentDate);
  }
};

onMounted(() => {
  initCalendar();
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
