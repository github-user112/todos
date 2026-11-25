<template>
  <calendar-container
    :todos="todos"
    :completedInstances="completedInstances"
    :deletedInstances="deletedInstances"
    :holidayData="holidayData"
    :userId="userId"
    @fetch-calendar-data="fetchCalendarData"
    @fetch-holiday-data="fetchHolidayData"
    @add-todo="handleAddTodo"
    @update-todo="handleUpdateTodo"
    @complete-todo="handleCompleteTodo"
    @delete-todo="handleDeleteTodo"
    @moveTodoDate="handleMoveTodoDate"
    @reorderTodos="handleReorderTodos"
  />
  <SolarTermPopup
    :visible="showSolarTermPopup"
    :termInfo="solarTermInfo"
    @close="closeSolarTermPopup"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import CalendarContainer from '../components/calendar-container.vue';
import SolarTermPopup from '../components/SolarTermPopup.vue';
import { formatDate } from '../utils/dateUtils';
import { apiRequest, getUserId } from '../utils/api';
import { t } from '../utils/i18n.js';
import { showToast } from '../utils/toast.js';
import HolidayCalendar from 'holiday-calendar';
import { normalizeYears } from '../utils/holidayYears.js';
import { loading, setLoading } from '../utils/loading';
import {
  initReminderManager,
  destroyReminderManager,
} from '../utils/reminderManager';
import { ensureLunarLoaded } from '../utils/lunarUtils';
import {
  getTodaySolarTerm,
  isSolarTermPopupShown,
  markSolarTermPopupShown,
} from '../utils/solarTermTips.js';

const userId = getUserId();
const todos = ref([]);
const completedInstances = ref([]);
const deletedInstances = ref([]);
const holidayData = ref({});

// 节气弹窗状态
const showSolarTermPopup = ref(false);
const solarTermInfo = ref({
  emoji: '🌿',
  name: '',
  summary: '',
  greeting: '',
  tips: [],
});

const checkAndShowSolarTermPopup = async () => {
  try {
    await ensureLunarLoaded();
    const today = new Date();
    if (isSolarTermPopupShown(today)) return;

    const info = getTodaySolarTerm(today);
    if (info) {
      solarTermInfo.value = info;
      showSolarTermPopup.value = true;
      markSolarTermPopupShown(today);
    }
  } catch (e) {
    console.warn('节气弹窗检查失败:', e);
  }
};

const closeSolarTermPopup = () => {
  showSolarTermPopup.value = false;
};

import { addReminder } from '../utils/reminderState';

// 已成功加载过的节假日年份，避免同一份数据被反复请求
const loadedHolidayYears = new Set();

/**
 * 加载节假日数据
 * @param {number|number[]} target - 需要加载的年份，或年份数组
 *
 * 视图会跨年（今日优先窗口固定 35 天，年末伸到次年 1 月），所以调用方会传入
 * 「窗口覆盖的年份集合」，这里逐年请求，任一年失败都不影响其余年份。
 */
const fetchHolidayData = async (target) => {
  const years = normalizeYears(target).filter(
    (year) => !loadedHolidayYears.has(year),
  );
  if (!years.length) return;

  try {
    const calendar = new HolidayCalendar();
    const results = await Promise.allSettled(
      years.map((year) => calendar.getDates('CN', year)),
    );

    const holidayMap = {};
    results.forEach((result, index) => {
      const year = years[index];
      if (result.status !== 'fulfilled') {
        console.warn(`节假日数据加载失败：${year}`, result.reason);
        return; // 不记入已加载，下次切回该年时会重试
      }
      if (!Array.isArray(result.value)) {
        console.warn(`节假日数据格式异常：${year}`);
        return;
      }
      loadedHolidayYears.add(year);
      result.value.forEach((item) => {
        holidayMap[item.date] = {
          name: item.name_cn,
          type: item.type,
        };
      });
    });

    if (Object.keys(holidayMap).length > 0) {
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
    const currentYear = currentDate.getFullYear();
    setLoading(true);
    await Promise.allSettled([
      // 前后各一年：首页视图可能跨年（12 月的今日优先窗口会伸到次年 1 月）
      fetchHolidayData([currentYear - 1, currentYear, currentYear + 1]),
      fetchCalendarData(currentDate),
    ]);
    setLoading(false);
  } catch (error) {
    console.error('初始化日历失败:', error);
    setLoading(false);
    showToast(t('加载日历数据失败，请刷新页面重试'), { type: 'error' });
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

// 修改已有待办：更新后同步本地数据（重复实例由前端按 todos 行展开，无需重新拉取）
const handleUpdateTodo = async ({
  id,
  text,
  date,
  repeatType,
  repeatInterval,
  endDate,
  skipHolidays,
  reminder,
  todoTime,
}) => {
  try {
    const result = await apiRequest(
      '/api/todos',
      'PUT',
      {
        id,
        text,
        date,
        repeatType: repeatType || 'none',
        repeatInterval: repeatInterval || 1,
        endDate: endDate || '2039-12-31',
        skipHolidays: !!skipHolidays,
        reminder: reminder || 0,
        todoTime: todoTime || '09:00',
      },
      null,
      true,
    );

    if (result.success) {
      const todo = todos.value.find((t) => t.id == id);
      if (todo) {
        todo.text = text;
        todo.date = date;
        todo.repeat_type = repeatType || 'none';
        todo.repeat_interval = repeatInterval || 1;
        todo.end_date = endDate || '2039-12-31';
        todo.skip_holidays = !!skipHolidays;
        todo.reminder = reminder || 0;
        todo.todo_time = todoTime || '09:00';
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('修改待办事项失败:', error);
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
    addReminder,
  );
  // 节气养生提醒弹窗（延迟 1.5s 避免与初始化抢资源）
  setTimeout(checkAndShowSolarTermPopup, 1500);
});

onUnmounted(() => {
  window.removeEventListener('visibilitychange', handlePageShow);
  destroyReminderManager();
});
</script>
