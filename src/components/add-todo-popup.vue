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
      <div class="button-group">
        <button @click="$emit('save')" class="save-button">保存</button>
        <button @click="$emit('close')" class="cancel-button">取消</button>
      </div>
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
  backdrop-filter: blur(3px);
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
  text-align: center;
}

.popup-content input,
.popup-content select {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.popup-content input:focus,
.popup-content select:focus {
  outline: none;
  border-color: #4a6cf7;
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
}

.button-group {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.save-button, .cancel-button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.save-button {
  background: #4a6cf7;
  color: white;
}

.cancel-button {
  background: #f8fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.save-button:hover {
  background: #3a5bd9;
  transform: translateY(-1px);
}

.cancel-button:hover {
  background: #edf2f7;
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

