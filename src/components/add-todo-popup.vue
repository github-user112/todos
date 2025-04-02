<template>
  <div class="add-todo-popup">
    <div class="popup-content">
      <h2>添加待办事项</h2>
      <input 
        type="text" 
        :value="todoText" 
        @input="$emit('update:todoText', $event.target.value)" 
        placeholder="待办事项" 
      />
      <select 
        :value="todoRepeat" 
        @change="$emit('update:todoRepeat', $event.target.value)"
      >
        <option value="none">不重复</option>
        <option value="daily">每天</option>
        <option value="weekly">每周</option>
        <option value="monthly">每月</option>
        <option value="yearly">每年</option>
      </select>
      <button @click="$emit('save')">保存</button>
      <button @click="$emit('close')">取消</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  todoText: {
    type: String,
    required: true
  },
  todoRepeat: {
    type: String,
    required: true
  }
});

defineEmits(['update:todoText', 'update:todoRepeat', 'save', 'close']);
</script>

<style scoped>
.add-todo-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.popup-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2d3748;
  font-size: 1.4rem;
}

.popup-content input,
.popup-content select {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 15px;
}

.popup-content button {
  padding: 10px 16px;
  margin-right: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.popup-content button:first-of-type {
  background: #4a6cf7;
  color: white;
}

.popup-content button:last-of-type {
  background: #f8fafc;
  color: #4a5568;
}

.popup-content button:hover {
  transform: translateY(-1px);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .popup-content {
    width: 90%;
    padding: 16px;
  }
}
</style>

