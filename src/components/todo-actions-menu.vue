<template>
  <div class="todo-actions">
    <button @click="$emit('complete')">完成</button>
    <button @click="$emit('delete')">删除</button>
  </div>
</template>

<script setup>
defineEmits(['complete', 'delete']);
</script>

<style scoped>
.todo-actions {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.todo-actions button {
  padding: 12px 20px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  position: relative;
}

.todo-actions button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.todo-actions button:disabled::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.todo-actions button:hover {
  background: #f8fafc;
}

.todo-actions button:first-child {
  color: #48bb78;
}

.todo-actions button:last-child {
  color: #f56565;
}

/* Mobile device styles */
@media (max-width: 768px) {
  .todo-actions {
    width: 100%;
    position: fixed;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
  }
  
  .todo-actions button {
    flex: 1;
    text-align: center;
  }
}
</style>

