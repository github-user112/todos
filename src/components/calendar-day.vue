<template>
  <div
    :class="[
      'calendar-day',
      { 'other-month': day.isOtherMonth },
      { 'current-day': day.isToday },
      getHolidayClass(day.holiday)
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
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  transition: all 0.2s;
  min-height: 0;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Weekend styling */
.calendar-day:nth-child(7n),
.calendar-day:nth-child(7n-1) {
  background: #f0f7ff;
  border-color: #d0e1fd;
}

/* Holiday styling */
.calendar-day.holiday-rest {
  background: linear-gradient(135deg, #fff0f0, #fff5f5);
  border-color: #fdd0d0;
}

.calendar-day.holiday-work {
  background: linear-gradient(135deg, #f0f9ff, #e6f7ff);
  border-color: #bae7ff;
}

.calendar-day:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.other-month {
  background: #f8fafc !important;
  opacity: 0.6;
  color: #a0aec0;
  border-color: #edf2f7;
}

.day-number {
  position: absolute;
  top: 6px;
  left: 8px;
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
  background: #ebf8ff !important;
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
  right: 8px;
  font-size: 0.75em;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  z-index: 1;
}

.holiday-rest {
  color: #e53e3e;
  background: rgba(245, 101, 101, 0.15);
  border: 1px solid rgba(245, 101, 101, 0.3);
}

.holiday-work {
  color: #3182ce;
  background: rgba(66, 153, 225, 0.15);
  border: 1px solid rgba(66, 153, 225, 0.3);
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
  padding: 6px 8px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #f8fafc;
  border-radius: 4px;
  border-left: 3px solid #4a6cf7;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.todo-item:hover {
  background: #edf2f7;
  transform: translateX(2px);
}

.todo-item.completed {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  color: #a0aec0;
  border-left-color: #48bb78;
  background: #f0fff4;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-day {
    padding: 3px;
    border-radius: 6px;
  }
  
  .todo-item {
    padding: 3px 4px;
    font-size: 0.75em;
    border-left-width: 2px;
  }
  
  .special-date {
    padding: 1px 4px;
    font-size: 0.7em;
  }
}
</style>

