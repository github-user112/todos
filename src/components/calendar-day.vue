<template>
  <Transition @before-enter="onBeforeEnter">
    <div
      :class="[
        'calendar-day',
        { 'other-month': day.isOtherMonth },
        { 'current-day': day.isToday },
        { 'weekend-day': isWeekend(day.date) && !day.holiday },
        {
          'holiday-rest-day':
            day.holiday === '休' ||
            (typeof day.holiday === 'object' &&
              day.holiday.type === 'public_holiday'),
        },
        {
          'holiday-work-day':
            day.holiday === '班' ||
            (typeof day.holiday === 'object' &&
              day.holiday.type === 'transfer_workday'),
        },
      ]"
      :data-date="day.dateStr"
      @dblclick="$emit('dblclick')"
    >
      <div class="day-number">{{ day.dayNumber }}</div>

      <!-- Holiday indicator badge -->
      <div
        v-if="day.holiday"
        class="holiday-badge"
        :class="getHolidayBadgeClass(day.holiday)"
      >
        {{ getHolidayBadgeText(day.holiday) }}
      </div>

      <!-- Holiday name or lunar date display -->
      <div
        v-if="getHolidayName(day.holiday) || day.lunarDate"
        class="holiday-name"
      >
        {{ getHolidayName(day.holiday) || day.lunarDate }}
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
    </div></Transition
  >
</template>

<script setup>
import { computed, inject, watch } from 'vue';
const { day, holidayData } = defineProps({
  day: {
    type: Object,
    required: true,
  },
  holidayData: {
    type: Object,
    required: false,
  },
});
// console.log(props.day);
// console.log(holidayData);
const holiday = computed(() => {
  // console.log(holiday.value);
  return holidayData.value[props.day.dateStr];
});
// watch(holidayData, (holidayData) => {
//   console.log(holidayData.value);
//   if (holiday.value) {
//     props.day.holiday = props.day.dateStr
//       ? holidayData.value[props.day.dateStr]
//       : '';
//   }
// });
// props.day.holiday = holidayData[props.day.dateStr];
defineEmits(['dblclick', 'openTodoActions']);
function onBeforeEnter() {
  console.log('onBeforeEnter');
}
// Helper function to check if date is weekend
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

// Helper function to get holiday badge class
function getHolidayBadgeClass(holiday) {
  if (
    holiday === '休' ||
    (typeof holiday === 'object' && holiday.type === 'public_holiday')
  ) {
    return 'rest-badge';
  } else if (
    holiday === '班' ||
    (typeof holiday === 'object' && holiday.type === 'transfer_workday')
  ) {
    return 'work-badge';
  }
  return '';
}

// Helper function to get holiday badge text
function getHolidayBadgeText(holiday) {
  // console.log(holiday);
  if (
    holiday === '休' ||
    (typeof holiday === 'object' && holiday.type === 'public_holiday')
  ) {
    return '休';
  } else if (
    holiday === '班' ||
    (typeof holiday === 'object' && holiday.type === 'transfer_workday')
  ) {
    return '班';
  }
  return '';
}

// Helper function to get holiday name
function getHolidayName(holiday) {
  if (typeof holiday === 'object' && holiday.name) {
    return holiday.name;
  }
  return '';
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.calendar-day {
  border: 1px solid #e2e8f0;
  padding: 8px 4px 4px 4px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  /*transition: all 0.2s;*/
  min-height: 0;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Weekend styling */
.weekend-day {
  background: #f0f7ff;
  border-color: #d0e1fd;
}

/* Holiday styling - Rest Day */
.holiday-rest-day {
  background: #fff0f0;
  border-color: #ffd0d0;
}

/* Holiday styling - Work Day */
.holiday-work-day {
  background: #e6f7ff;
  border-color: #bae7ff;
}

.calendar-day:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.other-month {
  /*opacity: 0.6;*/
  color: #a0aec0;
  border-color: #edf2f7;
}

.other-month.weekend-day,
.other-month.holiday-rest-day,
.other-month.holiday-work-day {
  /*opacity: 0.5;*/
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
  color: #a0aec0;
  font-size: 0.9em;
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

/* Holiday badge */
.holiday-badge {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 0.75em;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 12px;
  z-index: 2;
  min-width: 20px;
  text-align: center;
}

.rest-badge {
  background: #e53e3e;
  color: white;
  box-shadow: 0 2px 4px rgba(229, 62, 62, 0.3);
}

.work-badge {
  background: #3182ce;
  color: white;
  box-shadow: 0 2px 4px rgba(49, 130, 206, 0.3);
}

/* Holiday name */
.holiday-name {
  position: absolute;
  top: 8px;
  right: 40px;
  font-size: 0.7em;
  color: #718096;
  z-index: 1;
  max-width: 80%;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.holiday-rest-day .holiday-name {
  color: #e53e3e;
  font-weight: 600;
}

.holiday-work-day .holiday-name {
  color: #3182ce;
  font-weight: 600;
}

.todo-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 25px; /* Increased to make room for holiday name */
  padding-right: 2px;
  max-height: calc(100% - 28px);
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

  .holiday-badge {
    padding: 1px 4px;
    font-size: 0.7em;
    right: 4px;
    top: 4px;
  }

  .holiday-name {
    font-size: 0.65em;
    top: 24px;
    right: 4px;
  }

  .todo-list {
    margin-top: 36px;
  }
}
</style>
