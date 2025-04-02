<template>
  <div class="calendar-header">
    <button @click="$emit('prevMonth')">&lt;</button>
    <h2 class="calendar-title">
      {{ currentYear }}年{{ currentMonth + 1 }}月
    </h2>
    <button @click="$emit('nextMonth')">&gt;</button>
    <button @click="$emit('goToToday')">今天</button>
  </div>
</template>

<script setup>
defineProps({
  currentYear: {
    type: Number,
    required: true
  },
  currentMonth: {
    type: Number,
    required: true
  }
});

defineEmits(['prevMonth', 'nextMonth', 'goToToday']);
</script>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 15px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.calendar-header button {
  padding: 8px 16px;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.calendar-header button:hover {
  background: #3a5bd9;
  transform: translateY(-1px);
}

.calendar-title {
  margin: 0;
  font-size: 1.3rem;
  color: #2d3748;
  font-weight: 600;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-header {
    padding: 8px;
  }

  .calendar-header button {
    padding: 4px 8px;
    font-size: 12px;
  }

  .calendar-title {
    font-size: 1rem;
  }
}
</style>

