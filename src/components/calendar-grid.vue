<template>
  <div class="calendar-grid">
    <!-- Weekday headers -->
    <div
      v-for="(day, index) in weekdays"
      :key="day"
      :class="['calendar-weekday', { 'weekend-header': index >= 5 }]"
    >
      {{ day }}
    </div>

    <!-- Calendar days -->
    <CalendarDay
      v-for="day in calendarDays"
      :key="day.date"
      :day="day"
      @dblclick="$emit('openAddTodoPopup', day.dateStr)"
      @openTodoActions="
        (todoId, event) => $emit('openTodoActions', todoId, day.dateStr, event)
      "
    />
  </div>
</template>

<script setup>
import CalendarDay from './calendar-day.vue';
import { computed } from 'vue';

const { weekdays, calendarDays } = defineProps({
  weekdays: {
    type: Array,
    required: true,
  },
  calendarDays: {
    type: Array,
    required: true,
  },
});
const lines = computed(() => calendarDays.length / 7);
defineEmits(['openAddTodoPopup', 'openTodoActions']);
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 36px repeat(v-bind(lines), minmax(0, 1fr));
  gap: 4px;
  flex: 1;
  height: calc(100vh - 60px);
  padding: 0 2px;
}

.calendar-weekday {
  text-align: center;
  font-weight: 600;
  padding: 12px 0;
  background: #dddddd75;
  border-radius: 8px;
  color: #4a5568;
  font-size: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.weekend-header {
  color: #e53e3e;
  background: #fff5f5;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 2px;
  }

  .calendar-weekday {
    font-size: 13px;
    padding: 8px 0;
  }
}
</style>
