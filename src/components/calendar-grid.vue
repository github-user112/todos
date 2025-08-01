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
    <TransitionGroup
      :name="animationType ? animationType : 'default'"
      :enter-active-class="activeClass"
      @beforeEnter="onBeforeEnter"
    >
      <!-- Calendar days -->
      <CalendarDay
        v-for="(day, index) in calendarDays"
        :key="day.dateStr + day.isOtherMonth"
        :day="day"
        class="list-item"
        :style="{
          '--delay': (index / 7) * 0.1 + 's',
          '--i': getI(index),
          '--j': getJ(index),
        }"
        @dblclick="$emit('openAddTodoPopup', day.dateStr)"
        @openTodoActions="
          (todoId, event) =>
            $emit('openTodoActions', todoId, day.dateStr, event)
        "
    /></TransitionGroup>
  </div>
</template>

<script setup>
import CalendarDay from './calendar-day.vue';
import { computed } from 'vue';
// 引入动画样式文件
import '../assets/animation.css';
function getI(index) {
  return parseInt(index / 7);
}
function getJ(index) {
  return parseInt(index % 7);
}
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
  animationType: {
    type: String,
    required: true,
  },
});
const lines = computed(() => props.calendarDays.length / 7);
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
