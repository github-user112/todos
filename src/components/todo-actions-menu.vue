<template>
  <div class="todo-actions">
    <button class="action-btn complete-btn" @click="$emit('complete')">
      <span class="action-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <span>完成</span>
    </button>
    <button class="action-btn delete-btn" @click="$emit('delete')">
      <span class="action-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 130px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.15s;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
.action-btn:active {
  opacity: 0.7;
  transform: scale(0.97);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
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

/* ========== 移动端：底部抽屉 ========== */
@media (max-width: 768px) {
  .todo-actions {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: 100% !important;
    flex-direction: row;
    justify-content: space-evenly;
    border-radius: 18px 18px 0 0;
    border-bottom: none;
    padding: 12px 0;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(12px);
    z-index: 500;
  }
  .action-btn {
    flex-direction: column;
    gap: 6px;
    padding: 12px 28px;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 14px;
    min-width: 80px;
  }
  .action-btn:active {
    background: var(--hover-color);
  }
  .action-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }
  .action-icon svg {
    width: 22px;
    height: 22px;
  }
}
</style>
