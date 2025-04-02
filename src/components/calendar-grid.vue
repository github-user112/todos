<template>
  <div class="calendar-grid">
    <!-- Weekday headers -->
    <div 
      v-for="day in weekdays" 
      :key="day" 
      class="calendar-weekday"
    >
      {{ day }}
    </div>

    <!-- Calendar days -->
    <CalendarDay
      v-for="day in calendarDays"
      :key="day.date"
      :day="day"
      @dblclick="$emit('openAddTodoPopup', day.dateStr)"
      @openTodoActions="(todoId, event) => $emit('openTodoActions', todoId, day.dateStr, event)"
    />
  </div>
</template>

<script setup>
import CalendarDay from './calendar-day.vue';

defineProps({
  weekdays: {
    type: Array,
    required: true
  },
  calendarDays: {
    type: Array,
    required: true
  }
});

defineEmits(['openAddTodoPopup', 'openTodoActions']);
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: 36px repeat(6, minmax(0, 1fr));
  gap: 1px;
  flex: 1;
  height: calc(100vh - 60px);
  padding: 0 2px;
}

.calendar-weekday {
  text-align: center;
  font-weight: 600;
  padding: 12px 0;
  background: #ffffff;
  border-radius: 8px;
  color: #4a5568;
  font-size: 15px;
}

.calendar-weekday:nth-child(6),
.calendar-weekday:nth-child(7) {
  color: #f56565;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 1px;
  }
}
</style>

