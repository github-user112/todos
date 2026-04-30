<script setup>
const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['toggle', 'delete']);

const handleToggle = () => {
  if (props.todo.repeat_type === 'none') {
    emit('toggle');
  } else {
    emit('toggle', props.todo.id);
  }
};

const handleDelete = () => {
  if (confirm('确定要删除这个待办事项吗？')) {
    emit('delete');
  }
};
</script>

<template>
  <div class="todo-item" :class="{ completed: todo.completed || todo.isCompleted }">
    <div class="todo-content">
      <span @click="handleToggle">{{ todo.text || todo.title }}</span>
      <div class="todo-badges">
        <span v-if="todo.isHolidayAdjusted" class="holiday-badge adjusted">
          ⛔ 已调至工作日
        </span>
        <span v-if="todo.repeat_type !== 'none'" class="repeat-badge">
          {{
            todo.repeat_type === 'daily'
              ? '每天'
              : todo.repeat_type === 'weekly'
              ? '每周'
              : todo.repeat_type === 'monthly'
              ? '每月'
              : todo.repeat_type === 'yearly'
              ? '每年'
              : ''
          }}
        </span>
      </div>
    </div>
    <button class="delete-btn" @click="handleDelete">删除</button>
  </div>
</template>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin: 2px 0;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  position: relative;
  min-height: 36px;
}

.todo-content {
  flex-grow: 1;
  cursor: pointer;
}

.todo-content span {
  display: block;
}

.todo-badges {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.holiday-badge {
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 2px;
  font-weight: 500;
}

.holiday-badge.adjusted {
  background-color: #faad14;
  color: white;
}

.holiday-badge.reminder {
  background-color: #ff4d4f;
  color: white;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.todo-item:hover .delete-btn,
.todo-item:active .delete-btn {
  opacity: 1;
}

.todo-item.completed {
  text-decoration: line-through;
  opacity: 0.7;
}

.repeat-badge {
  margin-left: 0;
  padding: 1px 6px;
  font-size: 11px;
  background-color: #1890ff;
  color: white;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .todo-item {
    font-size: 13px;
    min-height: 40px;
    padding: 6px 10px;
  }

  .delete-btn {
    opacity: 1;
  }

  button {
    font-size: 11px;
    padding: 6px 12px;
    min-height: 32px;
    min-width: 44px;
    border-radius: 6px;
  }

  .repeat-badge {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
  }
}
</style>
