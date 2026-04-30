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
import {
  isHoliday,
  isWorkday,
  findLastWorkday,
  formatDate,
} from '../utils/holidayAdjustment';
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
  return holidayName || props.day.lunarDate || '';
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
  return `${todoTime} ${reminderDesc}提醒`;
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
    return '休';
  if (
    holiday === '班' ||
    (typeof holiday === 'object' && holiday.type === 'transfer_workday')
  )
    return '班';
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
  padding: 6px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  background: var(--calendar-day-bg);
  min-height: 0;
  position: relative;
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;
  cursor: default;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

.calendar-day:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  border-color: var(--primary-color);
  z-index: 5;
}

.weekend-day {
  background: var(--calendar-day-weekend-bg);
  border-color: var(--calendar-day-weekend-border);
}

.holiday-rest-day {
  background: var(--calendar-day-holiday-rest-bg);
  border-color: var(--calendar-day-holiday-rest-border);
}
.holiday-rest-day .day-number {
  color: var(--danger-color);
}

.holiday-work-day {
  background: var(--calendar-day-holiday-work-bg);
  border-color: var(--calendar-day-holiday-work-border);
}

.other-month {
  opacity: var(--calendar-day-other-month-opacity);
}
.other-month .day-number {
  color: var(--other-month-text);
  font-size: 0.85em;
}

.selected-day {
  background: var(--primary-light);
  border: 2px solid var(--primary-color);
  box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
}
.selected-day .day-number {
  color: var(--primary-color);
  font-weight: 700;
}

.current-day {
  background: var(--calendar-day-current-bg);
  border: 2px solid var(--calendar-day-current-border);
  box-shadow:
    0 0 0 3px var(--form-input-focus-shadow),
    var(--shadow-sm);
}
.current-day .day-number {
  color: var(--primary-color);
  font-weight: 800;
  font-size: 1.15em;
}

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
  gap: 3px;
  min-width: 0;
}

.day-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1;
  flex-shrink: 0;
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
.holiday-rest-day .day-lunar {
  color: var(--danger-color);
  font-weight: 500;
}

.day-badges {
  display: flex;
  align-items: center;
  gap: 3px;
}

.holiday-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  line-height: 1.4;
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
  border-radius: 8px;
  line-height: 1.5;
  background: var(--primary-light);
  color: var(--primary-color);
}

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
  gap: 4px;
  padding: 3px 6px;
  border-radius: 6px;
  background: var(--todo-item-bg);
  border-left: 3px solid var(--todo-item-border-left);
  cursor: pointer;
  transition: background 0.15s;
  min-height: 0;
  -webkit-tap-highlight-color: transparent;
}
.todo-item:active {
  background: var(--todo-item-hover-bg);
}

.todo-item.drag-over {
  border-top: 2px solid var(--primary-color);
}

.todo-item[draggable="true"] {
  cursor: grab;
}

.todo-item[draggable="true"]:active {
  cursor: grabbing;
  opacity: 0.6;
}

.todo-dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
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
  margin-left: 2px;
  opacity: 0.7;
}

.todo-item.completed {
  border-left-color: var(--todo-item-completed-border-left);
  background: var(--todo-item-completed-bg);
}
.todo-item.completed .todo-text {
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  color: var(--todo-item-completed-text);
}

@media (max-width: 768px) {
  .calendar-day {
    padding: 3px 3px 2px;
    border-radius: 8px;
    border-width: 1px;
    transition: none;
  }
  .calendar-day:hover {
    transform: none;
    box-shadow: none;
    border-color: var(--calendar-day-border);
  }
  .calendar-day:active {
    background: var(--hover-color);
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
    padding: 3px 4px;
    border-left-width: 2px;
    border-radius: 4px;
    gap: 3px;
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
    border-radius: 5px;
    line-height: 1.4;
  }
  .todo-count-badge {
    font-size: 0.52rem;
    padding: 0 4px;
    border-radius: 5px;
    line-height: 1.5;
  }
  .todo-list {
    gap: 2px;
  }
  .current-day {
    box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
  }
}

@media (max-width: 380px) {
  .calendar-day {
    padding: 2px 2px 1px;
    border-radius: 6px;
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
    padding: 2px 3px;
    border-radius: 3px;
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
