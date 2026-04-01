<template>
  <div class="calendar-grid" :style="{ '--week-count': weekCount }">
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
    <template v-for="(week, weekIndex) in weekCount" :key="`week-number-${weekIndex}`">
      <div class="week-number" :style="{ gridRow: weekIndex + 2 }">
        {{ weekNumbers[weekIndex] }}
      </div>
    </template>

    <!-- 日历天 -->
    <template v-for="(week, weekIndex) in weekCount" :key="`week-${weekIndex}`">
      <CalendarDay
        v-for="(day, dayIndex) in calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7)"
        :key="`${day.dateStr}-${day.isOtherMonth}`"
        :day="day"
        :style="{
          gridRow: weekIndex + 2,
          gridColumn: dayIndex + (isMobile ? 1 : 2),
        }"
        @dblclick="$emit('openAddTodoPopup', day.dateStr)"
        @openTodoActions="(todoId, event) => $emit('openTodoActions', todoId, day.dateStr, event)"
        @openAddPopup="(dateStr) => $emit('openAddTodoPopup', dateStr)"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import CalendarDay from './calendar-day.vue';

const props = defineProps({
  weekdays: { type: Array, required: true },
  calendarDays: { type: Array, required: true },
  weekNumbers: { type: Array, required: true },
  animationType: { type: String, required: true },
  weekCount: { type: Number, default: 5 },
});

defineEmits(['openAddTodoPopup', 'openTodoActions']);

const isMobile = ref(window.innerWidth <= 768);
const onResize = () => { isMobile.value = window.innerWidth <= 768; };
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: 36px repeat(7, 1fr);
  grid-template-rows: 34px repeat(var(--week-count, 5), 1fr);
  gap: 4px;
  flex: 1;
  min-height: 0;
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
  user-select: none;
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
  user-select: none;
}

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 3px;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: 30px repeat(var(--week-count, 5), 1fr);
    padding: 0 2px;
  }
  .empty-corner,
  .week-number {
    display: none;
  }
  .calendar-weekday {
    font-size: 0.75rem;
    padding: 5px 0;
    border-radius: 6px;
    font-weight: 700;
  }
}

@media (max-width: 380px) {
  .calendar-grid {
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    padding: 0 1px;
  }
  .empty-corner,
  .week-number {
    display: none;
  }
  .calendar-weekday {
    font-size: 0.7rem;
    border-radius: 5px;
    padding: 4px 0;
    font-weight: 700;
  }
}
</style>
