<template>
  <div class="calendar-grid">
    <!-- 左上角空格 -->
    <div class="empty-corner"></div>

    <!-- 星期标题 -->
    <div
      v-for="(day, index) in weekdays"
      :key="day"
      :class="['calendar-weekday', { 'weekend-header': index >= 5 }]"
    >
      {{ day }}
    </div>

    <!-- 周数 -->
    <template v-for="(week, weekIndex) in 5" :key="`week-number-${weekIndex}`">
      <div class="week-number" :style="{ gridRow: weekIndex + 2 }">
        {{ weekNumbers[weekIndex] }}
      </div>
    </template>

    <!-- 日历天 -->
    <template v-for="(week, weekIndex) in 5" :key="`week-${weekIndex}`">
      <CalendarDay
        v-for="(day, dayIndex) in calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7)"
        :key="`${day.dateStr}-${day.isOtherMonth}`"
        :day="day"
        :style="{
          gridRow: weekIndex + 2,
          gridColumn: dayIndex + 2,
        }"
        @dblclick="$emit('openAddTodoPopup', day.dateStr)"
        @openTodoActions="(todoId, event) => $emit('openTodoActions', todoId, day.dateStr, event)"
      />
    </template>
  </div>
</template>

<script setup>
import CalendarDay from './calendar-day.vue';

defineProps({
  weekdays: { type: Array, required: true },
  calendarDays: { type: Array, required: true },
  weekNumbers: { type: Array, required: true },
  animationType: { type: String, required: true },
});

defineEmits(['openAddTodoPopup', 'openTodoActions']);
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: 36px repeat(7, 1fr);
  grid-template-rows: 32px repeat(5, 1fr);
  gap: 4px;
  flex: 1;
  min-height: 0;
  height: calc(100vh - 80px);
  padding: 0 2px;
  position: relative;
}

.empty-corner {
  grid-column: 1;
  grid-row: 1;
}

.calendar-weekday {
  text-align: center;
  font-weight: 600;
  padding: 6px 0;
  background: var(--hover-color);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  z-index: 10;
  position: relative;
}

.weekend-header {
  color: var(--danger-color);
  background: var(--calendar-day-holiday-rest-bg);
}

.week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--other-month-text);
  background: var(--hover-color);
  border-radius: 8px;
  font-size: 0.75rem;
  z-index: 10;
  position: relative;
}

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 2px;
    grid-template-columns: 24px repeat(7, 1fr);
    height: calc(100vh - 64px);
  }
  .calendar-weekday {
    font-size: 0.72rem;
    padding: 4px 0;
    border-radius: 6px;
  }
  .week-number {
    font-size: 0.65rem;
    border-radius: 6px;
  }
}

@media (max-width: 480px) {
  .calendar-grid {
    grid-template-columns: 0 repeat(7, 1fr);
  }
  .empty-corner,
  .week-number {
    display: none;
  }
}
</style>
