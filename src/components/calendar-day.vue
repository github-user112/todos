<template>
  <div
    :class="[
      'calendar-day',
      { 'other-month': day.isOtherMonth },
      { 'current-day': day.isToday },
      { 'weekend-day': isWeekend(day.date) && !day.holiday },
      {
        'holiday-rest-day':
          day.holiday === '休' ||
          (typeof day.holiday === 'object' && day.holiday.type === 'public_holiday'),
      },
      {
        'holiday-work-day':
          day.holiday === '班' ||
          (typeof day.holiday === 'object' && day.holiday.type === 'transfer_workday'),
      },
    ]"
    :data-date="day.dateStr"
    @dblclick="$emit('dblclick')"
  >
    <!-- 日期数字 -->
    <div class="day-header">
      <span class="day-number">{{ day.dayNumber }}</span>
      <span v-if="day.holiday" class="holiday-badge" :class="getHolidayBadgeClass(day.holiday)">
        {{ getHolidayBadgeText(day.holiday) }}
      </span>
    </div>

    <!-- 农历/节日名 -->
    <div v-if="getHolidayName(day.holiday) || day.lunarDate" class="holiday-name">
      {{ getHolidayName(day.holiday) || day.lunarDate }}
    </div>

    <!-- 待办列表 -->
    <div class="todo-list">
      <div
        v-for="todo in day.todos"
        :key="`${todo.id}-${day.dateStr}`"
        :class="['todo-item', { completed: todo.isCompleted }]"
        :data-id="todo.id"
        :data-date="day.dateStr"
        @click="$emit('openTodoActions', todo.id, $event)"
      >
        <span class="todo-dot" :class="{ done: todo.isCompleted }"></span>
        <span class="todo-text">{{ todo.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  day: { type: Object, required: true },
});

defineEmits(['dblclick', 'openTodoActions']);

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function getHolidayBadgeClass(holiday) {
  if (holiday === '休' || (typeof holiday === 'object' && holiday.type === 'public_holiday')) return 'rest-badge';
  if (holiday === '班' || (typeof holiday === 'object' && holiday.type === 'transfer_workday')) return 'work-badge';
  return '';
}

function getHolidayBadgeText(holiday) {
  if (holiday === '休' || (typeof holiday === 'object' && holiday.type === 'public_holiday')) return '休';
  if (holiday === '班' || (typeof holiday === 'object' && holiday.type === 'transfer_workday')) return '班';
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
  transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
  cursor: default;
  overflow: hidden;
}

.calendar-day:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  border-color: var(--primary-color);
  z-index: 5;
}

/* ---- 周末 ---- */
.weekend-day {
  background: var(--calendar-day-weekend-bg);
  border-color: var(--calendar-day-weekend-border);
}

/* ---- 节假日 ---- */
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

/* ---- 非本月 ---- */
.other-month {
  opacity: var(--calendar-day-other-month-opacity);
}
.other-month .day-number {
  color: var(--other-month-text);
  font-size: 0.85em;
}

/* ---- 今天 ---- */
.current-day {
  background: var(--calendar-day-current-bg);
  border: 2px solid var(--calendar-day-current-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow), var(--shadow-sm);
}
.current-day .day-number {
  color: var(--primary-color);
  font-weight: 800;
  font-size: 1.15em;
}

/* ---- 日期头部 ---- */
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2px;
}

.day-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1;
}

/* ---- 假期徽章 ---- */
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

/* ---- 农历/节日 ---- */
.holiday-name {
  font-size: 0.6rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.holiday-rest-day .holiday-name {
  color: var(--danger-color);
  font-weight: 600;
}

/* ---- 待办列表 ---- */
.todo-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  transition: background 0.15s, transform 0.15s;
  min-height: 0;
}
.todo-item:hover {
  background: var(--todo-item-hover-bg);
  transform: translateX(1px);
}
.todo-item:active {
  opacity: 0.8;
}

.todo-dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary-color);
  transition: all 0.2s;
}
.todo-dot.done {
  background: var(--success-color);
  width: 6px;
  height: 6px;
}

.todo-text {
  font-size: 0.72em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
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

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .calendar-day {
    padding: 3px;
    border-radius: 8px;
  }
  .calendar-day:hover {
    transform: none;
  }
  .todo-item {
    padding: 2px 4px;
    border-left-width: 2px;
    border-radius: 4px;
  }
  .todo-text {
    font-size: 0.65em;
  }
  .holiday-badge {
    font-size: 0.55rem;
    padding: 0 4px;
  }
  .day-number {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .holiday-name {
    display: none;
  }
  .todo-dot {
    display: none;
  }
}
</style>
