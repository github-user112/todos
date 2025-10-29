<template>
  <div class="calendar-grid">
    <!-- Empty cell for top-left corner -->
    <div class="empty-corner"></div>

    <!-- Weekday headers -->
    <div
      v-for="(day, index) in weekdays"
      :key="day"
      :class="['calendar-weekday', { 'weekend-header': index >= 5 }]"
    >
      {{ day }}
    </div>

    <!-- Week numbers -->
    <template v-for="(week, weekIndex) in 5" :key="`week-number-${weekIndex}`">
      <div class="week-number" :style="{ gridRow: weekIndex + 2 }">
        {{ weekNumbers[weekIndex] }}
      </div>
    </template>

    <!-- Calendar days with transition -->
    <TransitionGroup
      :name="animationType ? animationType : 'default'"
      :enter-active-class="activeClass"
      @beforeEnter="onBeforeEnter"
    >
      <template v-for="(week, weekIndex) in 5" :key="`week-${weekIndex}`">
        <!-- Calendar days for this week -->
        <CalendarDay
          v-for="(day, dayIndex) in calendarDays.slice(
            weekIndex * 7,
            (weekIndex + 1) * 7
          )"
          :key="`${day.dateStr}-${day.isOtherMonth}`"
          :day="day"
          class="list-item"
          :style="{
            '--delay': (weekIndex + dayIndex / 7) * 0.1 + 's',
            '--i': weekIndex,
            '--j': dayIndex,
            'grid-row': weekIndex + 2,
            'grid-column': dayIndex + 2,
          }"
          @dblclick="$emit('openAddTodoPopup', day.dateStr)"
          @openTodoActions="
            (todoId, event) =>
              $emit('openTodoActions', todoId, day.dateStr, event)
          "
        />
      </template>
    </TransitionGroup>
  </div>
</template>

<script setup>
import CalendarDay from './calendar-day.vue';
import { computed } from 'vue';
// 引入动画样式文件
import '../assets/animation.css';

function onBeforeEnter(el) {
  // console.log('onBeforeEnter', el);
}

const props = defineProps({
  weekdays: {
    type: Array,
    required: true,
  },
  calendarDays: {
    type: Array,
    required: true,
  },
  weekNumbers: {
    type: Array,
    required: true,
  },
  animationType: {
    type: String,
    required: true,
  },
});

const activeClass = computed(() =>
  props.animationType.includes('animate')
    ? 'animate__animated ' + props.animationType
    : props.animationType + '-enter-active'
);

defineEmits(['openAddTodoPopup', 'openTodoActions']);
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: 40px repeat(7, 1fr); /* 第一列是周数列，后面是7天 */
  grid-template-rows: 36px repeat(5, 1fr); /* 第一行是星期标题，后面是5周 */
  gap: 4px;
  flex: 1;
  height: calc(100vh - 60px);
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
  padding: 12px 0;
  background: #dddddd75;
  border-radius: 8px;
  color: #4a5568;
  font-size: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
  position: relative;
}

.weekend-header {
  color: #e53e3e;
  background: #fff5f5;
}

.week-number {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #4a5568;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 14px;
  z-index: 10;
  position: relative;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-grid {
    gap: 2px;
    grid-template-columns: 30px repeat(7, 1fr);
  }

  .calendar-weekday {
    font-size: 13px;
    padding: 8px 0;
  }

  .week-number {
    font-size: 12px;
  }
}
</style>
