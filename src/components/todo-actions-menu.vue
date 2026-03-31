<template>
  <div class="todo-actions">
    <button class="action-btn complete-btn" @click="$emit('complete')">
      <span class="action-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span>完成</span>
    </button>
    <button class="action-btn delete-btn" @click="$emit('delete')">
      <span class="action-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </span>
      <span>删除</span>
    </button>
  </div>
</template>

<script setup>
defineEmits(['complete', 'delete']);
</script>

<style scoped>
.todo-actions {
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.15s;
  white-space: nowrap;
}
.action-btn:hover {
  background: var(--hover-color);
}
.action-btn:active {
  opacity: 0.7;
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
}

.complete-btn .action-icon {
  background: #f0fdf4;
  color: var(--success-color);
}
.complete-btn:hover {
  background: #f0fdf4;
  color: var(--success-color);
}

.delete-btn .action-icon {
  background: #fef2f2;
  color: var(--danger-color);
}
.delete-btn:hover {
  background: #fef2f2;
  color: var(--danger-color);
}

/* ---- 移动端底部抽屉 ---- */
@media (max-width: 480px) {
  .todo-actions {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: 100% !important;
    flex-direction: row;
    justify-content: space-around;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
    padding: 8px 0;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
  .action-btn {
    flex-direction: column;
    gap: 4px;
    padding: 10px 20px;
    font-size: 0.75rem;
  }
}
</style>
