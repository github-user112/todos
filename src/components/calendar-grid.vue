<template>
  <div class="calendar-grid" :style="{ '--week-count': calendarDays.length }">
    <!-- 左上角空格 -->
    <div class="empty-corner"></div>

    <!-- 星期标题 -->
    <div
      v-for="(day, index) in weekdays"
      :key="day"
      :class="['calendar-weekday', { 'weekend-header': index >= 5 }]"
    >
      {{ t(day) }}
    </div>

    <!-- 周数 -->
    <template
      v-for="(row, weekIndex) in calendarDays"
      :key="`week-number-${weekIndex}`"
    >
      <div class="week-number" :style="{ gridRow: weekIndex + 2 }">
        {{ weekNumbers[weekIndex] }}
      </div>
    </template>

    <!-- 日历天 -->
    <template v-for="(row, weekIndex) in calendarDays" :key="`week-${weekIndex}`">
      <template v-for="(day, dayIndex) in row" :key="dayIndex">
        <CalendarDay
          v-if="day"
          :day="day"
          :selectedDate="selectedDate"
          :todos="todos"
          :holidayData="holidayData"
          :completedInstances="completedInstances"
          :deletedInstances="deletedInstances"
          :showLunar="showLunar"
          :class="{ 'stagger-day': animationType === 'stagger' }"
          :style="{
            '--i': weekIndex * 7 + dayIndex,
            gridRow: weekIndex + 2,
            gridColumn: dayIndex + (isMobile ? 1 : 2),
            animationDelay: animationType === 'stagger' ? `${(weekIndex * 7 + dayIndex) * 20}ms` : undefined,
          }"
          @dblclick="$emit('openAddTodoPopup', day.dateStr)"
          @openTodoActions="
            (todoId, event) =>
              $emit('openTodoActions', todoId, day.dateStr, event)
          "
          @openAddPopup="(dateStr) => $emit('openAddTodoPopup', dateStr)"
          @selectDate="(dateStr) => $emit('selectDate', dateStr)"
          @todoDrop="(data) => $emit('todoDrop', data)"
        />
        <div
          v-else
          class="calendar-day empty-day"
          :style="{
            gridRow: weekIndex + 2,
            gridColumn: dayIndex + (isMobile ? 1 : 2),
          }"
        />
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { t } from '../utils/i18n.js';
import CalendarDay from './calendar-day.vue';

const props = defineProps({
  weekdays: { type: Array, required: true },
  calendarDays: { type: Array, required: true },
  weekNumbers: { type: Array, required: true },
  animationType: { type: String, required: true },
  weekCount: { type: Number, default: 5 },
  selectedDate: { type: String, default: '' },
  todos: { type: Array, required: true },
  holidayData: { type: Object, required: true },
  completedInstances: { type: Array, required: true },
  deletedInstances: { type: Array, required: true },
  showLunar: { type: Boolean, default: true },
});

defineEmits(['openAddTodoPopup', 'openTodoActions', 'selectDate', 'todoDrop']);

const isMobile = ref(window.innerWidth <= 768);
const onResize = () => {
  isMobile.value = window.innerWidth <= 768;
};
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));


</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: 40px repeat(7, 1fr);
  grid-template-rows: 34px repeat(var(--week-count, 5), 1fr);
  gap: 5px;
  flex: 1;
  min-height: 0;
  padding: 2px 2px 4px;
  position: relative;
  backdrop-filter: var(--glass-grid-backdrop, none);
  -webkit-backdrop-filter: var(--glass-grid-backdrop, none);
}

.empty-corner {
  grid-column: 1;
  grid-row: 1;
}

/* ---- 星期标题：安静的文字标签，不与格子争抢视觉 ---- */
.calendar-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.08em;
  user-select: none;
  background: transparent;
  z-index: 10;
  position: relative;
}

.weekend-header {
  color: var(--danger-color);
}

/* ---- 周号列：弱化的辅助信息 ---- */
.week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--other-month-text);
  font-variant-numeric: tabular-nums;
  user-select: none;
  background: transparent;
  z-index: 10;
  position: relative;
}

.empty-day {
  visibility: hidden;
  pointer-events: none;
}

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 3px;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: 26px repeat(var(--week-count, 5), 1fr);
    padding: 0 2px 2px;
  }
  .empty-corner,
  .week-number {
    display: none;
  }
  .calendar-weekday {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    font-weight: 700;
  }
}

@media (max-width: 380px) {
  .calendar-grid {
    gap: 2px;
    padding: 0 1px 2px;
  }
  .calendar-weekday {
    font-size: 0.7rem;
  }
}
</style>
