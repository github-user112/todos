<template>
  <div
    :class="[
      'calendar-day',
      { 'other-month': day.isOtherMonth },
      {
        'current-day':
          day.isToday && (!selectedDate || selectedDate === day.dateStr),
      },
      { 'selected-day': selectedDate === day.dateStr },
      { 'weekend-day': isWeekend(day.date) && !day.holiday },
      {
        'holiday-rest-day':
          day.holiday === '休' ||
          (typeof day.holiday === 'object' &&
            day.holiday.type === 'public_holiday'),
      },
      {
        'holiday-work-day':
          day.holiday === '班' ||
          (typeof day.holiday === 'object' &&
            day.holiday.type === 'transfer_workday'),
      },
    ]"
    :data-date="day.dateStr"
    @click="handleDayClick"
    @dblclick="$emit('dblclick')"
    @dragover.prevent="onDayDragOver"
    @dragleave="onDayDragLeave"
    @drop="onDayDrop"
  >
    <!-- 日期头部 -->
    <div class="day-header">
      <div class="day-number-wrap">
        <span class="day-number">{{ day.dayNumber }}</span>
        <span v-if="showLunar && displayLabel" class="day-lunar">{{
          displayLabel
        }}</span>
      </div>
      <div class="day-badges">
        <span
          v-if="day.holiday"
          class="holiday-badge"
          :class="getHolidayBadgeClass(day.holiday)"
        >
          {{ getHolidayBadgeText(day.holiday) }}
        </span>
        <span v-if="filteredTodos.length > 0" class="todo-count-badge">{{
          filteredTodos.length
        }}</span>
      </div>
    </div>

    <!-- 待办列表 -->
    <div class="todo-list">
      <div
        v-for="todo in filteredTodos"
        :key="`${todo.id}-${todo.originalDate}`"
        :class="['todo-item', { completed: todo.isCompleted, 'drag-over': dragOverTodoId === `${todo.id}-${todo.originalDate}` }]"
        :data-id="todo.id"
        :data-date="day.dateStr"
        :data-original-date="todo.originalDate"
        draggable="true"
        @dragstart="onDragStart($event, todo)"
        @dragover.prevent="onDragOver($event, todo)"
        @dragleave="onDragLeave"
        @drop.stop="onDrop($event, todo)"
        @click.stop="$emit('openTodoActions', todo.id, $event)"
      >
        <span class="todo-dot" :class="{ done: todo.isCompleted }"></span>
        <span class="todo-text">{{ todo.text }}</span>
        <span
          v-if="todo.reminder"
          class="todo-reminder-icon"
          :title="getReminderTooltip(todo)"
          >🔔</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { t, tf } from '../utils/i18n.js';
import {
  isHoliday,
  isWorkday,
  findLastWorkday,
} from '../utils/holidayAdjustment';
import { formatDate } from '../utils/dateUtils';
import { shouldShowRepeatingTodo } from '../utils/repeatUtils';
import { formatReminderDesc } from '../utils/reminderManager';

const props = defineProps({
  day: { type: Object, required: true },
  selectedDate: { type: String, default: '' },
  todos: { type: Array, required: true },
  holidayData: { type: Object, required: true },
  completedInstances: { type: Array, required: true },
  deletedInstances: { type: Array, required: true },
  showLunar: { type: Boolean, default: true },
});

const emit = defineEmits([
  'dblclick',
  'openTodoActions',
  'openAddPopup',
  'selectDate',
  'todoDragStart',
  'todoDrop',
]);

const displayLabel = computed(() => {
  const holidayName = getHolidayName(props.day.holiday);
  return t(holidayName || props.day.lunarDate || '');
});

const isInstanceCompleted = (todoId, dateStr) => {
  return props.completedInstances.some(
    (ci) => ci.todo_id === todoId && ci.date === dateStr,
  );
};

const isInstanceDeleted = (todoId, dateStr) => {
  return props.deletedInstances.some(
    (di) => di.todo_id === todoId && di.date === dateStr,
  );
};

const filteredTodos = computed(() => {
  const dateStr = props.day.dateStr;
  const holidayData = props.holidayData;
  const hasHolidayData = holidayData && Object.keys(holidayData).length > 0;
  const result = [];

  props.todos.forEach((todo) => {
    if (isInstanceDeleted(todo.id, dateStr)) return;

    const skipHolidays = todo.skip_holidays ?? todo.skipHolidays;

    if (!todo.repeat_type || todo.repeat_type === 'none') {
      let displayDate = todo.date;
      let adjusted = false;

      if (skipHolidays && hasHolidayData && isHoliday(todo.date, holidayData)) {
        displayDate = findLastWorkday(todo.date, holidayData);
        adjusted = true;
      }

      if (dateStr === displayDate) {
        const isCompleted =
          todo.completed || isInstanceCompleted(todo.id, dateStr);
        result.push({
          ...todo,
          isCompleted,
          isHolidayAdjusted: adjusted,
          originalDate: todo.date,
        });
      }
      return;
    }

    const todoDate = new Date(todo.date);
    const currentDate = new Date(dateStr);
    const interval = todo.repeat_interval || 1;
    const endDate = todo.end_date ? new Date(todo.end_date) : null;

    const matchesRepeat = shouldShowRepeatingTodo(
      todoDate,
      currentDate,
      todo.repeat_type,
      interval,
      endDate,
    );

    if (matchesRepeat) {
      const currentDateIsHoliday =
        skipHolidays && hasHolidayData && isHoliday(dateStr, holidayData);

      if (!currentDateIsHoliday) {
        const isCompleted = isInstanceCompleted(todo.id, dateStr);
        result.push({
          ...todo,
          isCompleted,
          isHolidayAdjusted: false,
          originalDate: dateStr,
        });
      }
    }

    if (skipHolidays && hasHolidayData && isWorkday(dateStr, holidayData)) {
      for (let i = 1; i <= 14; i++) {
        const checkDate = new Date(dateStr);
        checkDate.setDate(checkDate.getDate() + i);
        const checkDateStr = formatDate(checkDate);

        if (
          isWorkday(checkDateStr, holidayData) &&
          !isHoliday(checkDateStr, holidayData)
        ) {
          break;
        }

        if (isHoliday(checkDateStr, holidayData)) {
          if (findLastWorkday(checkDateStr, holidayData) === dateStr) {
            const checkDateObj = new Date(checkDate);
            if (
              shouldShowRepeatingTodo(
                todoDate,
                checkDateObj,
                todo.repeat_type,
                interval,
                endDate,
              )
            ) {
              const isCompleted = isInstanceCompleted(todo.id, dateStr);
              result.push({
                ...todo,
                isCompleted,
                isHolidayAdjusted: true,
                originalDate: checkDateStr,
              });
            }
          }
        }
      }
    }
  });

  return result;
});

function getReminderTooltip(todo) {
  const todoTime = todo.todo_time || todo.todoTime || '09:00';
  const reminderDesc = formatReminderDesc(todo.reminder);
  return tf('{time} {desc}提醒', { time: todoTime, desc: reminderDesc });
}

const dragOverTodoId = ref('');

function onDragStart(e, todo) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify({
    id: todo.id,
    originalDate: todo.originalDate,
    sourceDate: props.day.dateStr,
  }));
  emit('todoDragStart', todo);
}

function onDragOver(e, todo) {
  e.dataTransfer.dropEffect = 'move';
  dragOverTodoId.value = `${todo.id}-${todo.originalDate}`;
}

function onDragLeave() {
  dragOverTodoId.value = '';
}

function onDrop(e, targetTodo) {
  dragOverTodoId.value = '';
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.id === targetTodo.id) return;
    emit('todoDrop', { type: 'reorder', source: data, targetTodoId: targetTodo.id, targetDate: props.day.dateStr });
  } catch {}
}

function onDayDragOver(e) {
  e.dataTransfer.dropEffect = 'move';
}

function onDayDragLeave() {}

function onDayDrop(e) {
  if (e.target.closest('.todo-item')) return;
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.sourceDate === props.day.dateStr) return;
    emit('todoDrop', { type: 'moveDate', source: data, targetDate: props.day.dateStr });
  } catch {}
}

function handleDayClick(e) {
  if (e.target.closest('.todo-item')) return;
  if (window.innerWidth <= 768) {
    emit('openAddPopup', props.day.dateStr);
  } else {
    emit('selectDate', props.day.dateStr);
  }
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function getHolidayBadgeClass(holiday) {
  if (
    holiday === '休' ||
    (typeof holiday === 'object' && holiday.type === 'public_holiday')
  )
    return 'rest-badge';
  if (
    holiday === '班' ||
    (typeof holiday === 'object' && holiday.type === 'transfer_workday')
  )
    return 'work-badge';
  return '';
}

function getHolidayBadgeText(holiday) {
  if (
    holiday === '休' ||
    (typeof holiday === 'object' && holiday.type === 'public_holiday')
  )
    return t('休');
  if (
    holiday === '班' ||
    (typeof holiday === 'object' && holiday.type === 'transfer_workday')
  )
    return t('班');
  return '';
}

function getHolidayName(holiday) {
  if (typeof holiday === 'object' && holiday.name) return holiday.name;
  return '';
}
</script>

<style scoped>
.calendar-day {
  border: 1px solid var(--calendar-day-border);
  padding: 6px 7px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  background: var(--calendar-day-bg);
  min-height: 0;
  position: relative;
  box-shadow: var(--shadow-sm);
  backdrop-filter: var(--glass-day-backdrop, none);
  -webkit-backdrop-filter: var(--glass-day-backdrop, none);
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
  cursor: default;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.calendar-day:hover {
  background: var(--calendar-day-hover-bg);
  border-color: var(--primary-color);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  z-index: 5;
}

/* ---- 周末：仅日期数字着红色，不再铺色块，保持画面安静 ---- */
.weekend-day .day-number {
  color: var(--danger-color);
}

/* ---- 法定休息日：恒定红色系（跨主题一致） ---- */
.holiday-rest-day {
  background: var(--calendar-day-holiday-rest-bg);
  border-color: var(--calendar-day-holiday-rest-border);
}
.holiday-rest-day .day-number,
.holiday-rest-day .day-lunar {
  color: var(--danger-color);
}

/* ---- 调休上班日：恒定琥珀色系（跨主题一致） ---- */
.holiday-work-day {
  background: var(--calendar-day-holiday-work-bg);
  border-color: var(--calendar-day-holiday-work-border);
}
.holiday-work-day .work-badge {
  background: var(--badge-work-bg);
  color: var(--badge-work-text);
}

/* ---- 非当前月 ---- */
.other-month {
  opacity: var(--calendar-day-other-month-opacity);
}
.other-month .day-number {
  font-size: 0.85em;
}

/* ---- 选中的日期 ---- */
.selected-day {
  background: var(--primary-light);
  border-color: var(--primary-color);
  box-shadow: inset 0 0 0 1px var(--primary-color);
}
.selected-day .day-number {
  color: var(--primary-dark);
  font-weight: 700;
}

/* ---- 今天：强调色圆片日期 + 柔和光环（视觉锚点） ---- */
.current-day {
  background: var(--calendar-day-current-bg);
  border-color: var(--calendar-day-current-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow), var(--shadow-sm);
}
.current-day .day-number {
  position: relative;
  z-index: 0;
  color: #fff;
  font-weight: 700;
}
.current-day .day-number::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.7em;
  height: 1.7em;
  transform: translate(-50%, -50%);
  background: var(--primary-color);
  border-radius: 999px;
  z-index: -1;
  box-shadow: 0 2px 8px -2px var(--form-input-focus-shadow);
}
/* 圆片溢出到相邻农历文字上方，提升农历层级避免被盖住 */
.current-day .day-lunar {
  position: relative;
}

/* ---- 单元格内部 ---- */
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2px;
  flex-shrink: 0;
}

.day-number-wrap {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 0;
}

.day-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.day-lunar {
  font-size: 0.55rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  font-weight: 400;
}

.day-badges {
  display: flex;
  align-items: center;
  gap: 3px;
}

.holiday-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1.5px 6px;
  border-radius: 999px;
  line-height: 1.3;
  letter-spacing: 0.02em;
}
.rest-badge {
  background: var(--badge-rest-bg);
  color: var(--badge-rest-text);
}
.work-badge {
  background: var(--badge-work-bg);
  color: var(--badge-work-text);
}

.todo-count-badge {
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 999px;
  line-height: 1.6;
  background: var(--primary-light);
  color: var(--primary-dark);
}

/* ---- 待办胶囊芯片 ---- */
.todo-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border-radius: 7px;
  background: var(--todo-item-bg);
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
  min-height: 0;
  -webkit-tap-highlight-color: transparent;
}
.todo-item:hover {
  background: var(--todo-item-hover-bg);
}
.todo-item:active {
  background: var(--todo-item-hover-bg);
}

.todo-item.drag-over {
  box-shadow: inset 0 2px 0 var(--primary-color);
}

.todo-item[draggable='true'] {
  cursor: grab;
}
.todo-item[draggable='true']:active {
  cursor: grabbing;
  opacity: 0.6;
}

.todo-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--primary-color);
}
.todo-dot.done {
  background: var(--success-color);
}

.todo-text {
  font-size: 0.72em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  flex: 1;
  min-width: 0;
}

.todo-reminder-icon {
  font-size: 0.6em;
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0.7;
}

/* 已完成：绿色系 + 删除线弱化 */
.todo-item.completed {
  background: var(--todo-item-completed-bg);
}
.todo-item.completed .todo-dot {
  background: var(--success-color);
}
.todo-item.completed .todo-text {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  color: var(--todo-item-completed-text);
}

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .calendar-day {
    padding: 3px 4px 2px;
    border-radius: 11px;
    transition: none;
  }
  .calendar-day:hover {
    transform: none;
    box-shadow: var(--shadow-sm);
    border-color: var(--calendar-day-border);
    background: var(--calendar-day-bg);
  }
  .calendar-day:active {
    background: var(--hover-color);
  }
  .current-day {
    box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
  }
  .current-day .day-number::before {
    box-shadow: none;
  }
  .day-header {
    margin-bottom: 1px;
  }
  .day-number {
    font-size: 0.8rem;
  }
  .day-lunar {
    font-size: 0.5rem;
  }
  .day-badges {
    gap: 2px;
  }
  .todo-item {
    padding: 3px 5px;
    border-radius: 5px;
    gap: 4px;
    min-height: 22px;
  }
  .todo-dot {
    width: 4px;
    height: 4px;
  }
  .todo-text {
    font-size: 0.65rem;
    line-height: 1.3;
  }
  .holiday-badge {
    font-size: 0.55rem;
    padding: 1px 4px;
  }
  .todo-count-badge {
    font-size: 0.52rem;
    padding: 0 4px;
  }
  .todo-list {
    gap: 2px;
  }
}

@media (max-width: 380px) {
  .calendar-day {
    padding: 2px 3px 1px;
    border-radius: 9px;
  }
  .day-number {
    font-size: 0.75rem;
  }
  .day-lunar {
    font-size: 0.45rem;
  }
  .todo-dot {
    width: 3px;
    height: 3px;
  }
  .todo-text {
    font-size: 0.6rem;
    line-height: 1.2;
  }
  .todo-item {
    padding: 2px 4px;
    min-height: 18px;
  }
  .todo-count-badge {
    font-size: 0.48rem;
    padding: 0 3px;
  }
  .holiday-badge {
    font-size: 0.5rem;
    padding: 0 3px;
  }
}
</style>
