<template>
  <div class="todo-actions">
    <button @click="$emit('complete')" class="complete-button">
      <span class="action-icon">✓</span>
      <span>完成</span>
    </button>
    <button @click="$emit('delete')" class="delete-button">
      <span class="action-icon">✕</span>
      <span>删除</span>
    </button>
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
  border: 1px solid #e2e8f0;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon {
  font-weight: bold;
  font-size: 16px;
}

.todo-actions button:hover {
  background: #f8fafc;
}

.complete-button {
  color: #48bb78;
}

.complete-button:hover {
  background: #f0fff4 !important;
}

.delete-button {
  color: #f56565;
}

.delete-button:hover {
  background: #fff5f5 !important;
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
    border-radius: 12px 12px 0 0;
    border-bottom: none;
  }
  
  .todo-actions button {
    flex: 1;
    justify-content: center;
    padding: 16px;
  }
}
</style>

