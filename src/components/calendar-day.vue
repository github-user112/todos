<template>
  <div
    :class="[
      'calendar-day',
      { 'other-month': day.isOtherMonth },
      { 'current-day': day.isToday },
    ]"
    :data-date="day.dateStr"
    @dblclick="$emit('dblclick')"
  >
    <div class="day-number">{{ day.dayNumber }}</div>

    <!-- Lunar date and holiday display -->
    <div v-if="day.lunarDate || day.holiday" class="special-date">
      <span
        :class="getHolidayClass(day.holiday)"
      >
        {{ getHolidayText(day.holiday) || day.lunarDate }}
      </span>
    </div>

    <div class="todo-list">
      <div
        v-for="todo in day.todos"
        :key="`${todo.id}-${day.dateStr}`"
        :class="['todo-item', { completed: todo.isCompleted }]"
        :data-id="todo.id"
        :data-date="day.dateStr"
        @click="$emit('openTodoActions', todo.id, $event)"
      >
        {{ todo.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  day: {
    type: Object,
    required: true
  }
});

defineEmits(['dblclick', 'openTodoActions']);

// Helper functions
function getHolidayClass(holiday) {
  if (holiday === '休' || (typeof holiday === 'object' && holiday.type === 'public_holiday')) {
    return 'holiday-rest';
  } else if (holiday === '班' || (typeof holiday === 'object' && holiday.type === 'working_day')) {
    return 'holiday-work';
  }
  return '';
}

function getHolidayText(holiday) {
  if (typeof holiday === 'object') {
    return holiday.name;
  }
  return holiday;
}
</script>

<style scoped>
.calendar-day {
  border: 1px solid #e2e8f0;
  padding: 8px 4px 4px 4px;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  transition: all 0.2s;
  min-height: 0;
  position: relative;
}

.calendar-day:nth-child(7n),
.calendar-day:nth-child(7n-1) {
  background: #f0f9ff;
}

.calendar-day.holiday-rest {
  background: #fff0f0;
}

.calendar-day.holiday-rest:hover {
  background: #ffe8e8;
}

.other-month:nth-child(7n),
.other-month:nth-child(7n-1) {
  background: #f0f9ff;
  opacity: 0.6;
}

.other-month.holiday-rest {
  background: #fff0f0;
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
  position: absolute;
  top: 6px;
  left: 6px;
  font-weight: 600;
  color: #2d3748;
  font-size: 15px;
  z-index: 1;
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

.special-date {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 0.75em;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 4px;
  z-index: 1;
}

.holiday-rest {
  color: #f56565;
  background: rgba(245, 101, 101, 0.1);
}

.holiday-work {
  color: #4299e1;
  background: rgba(66, 153, 225, 0.1);
}

.todo-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 24px;
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
  text-decoration-thickness: 2px;
  color: #a0aec0;
  border-left-color: #48bb78;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-day {
    padding: 3px;
  }
  
  .todo-item {
    padding: 3px 4px;
    font-size: 0.75em;
    border-left-width: 1px;
  }
}
</style>

