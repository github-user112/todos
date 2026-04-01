<script setup>
const props = defineProps({
  todo: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['toggle', 'delete']);

const handleToggle = () => {
  if (props.todo.repeat === 'none') {
    emit('toggle');
  } else {
    // 对于重复事件，只标记当前实例为完成
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
  <div class="todo-item" :class="{ completed: todo.completed }">
    <span @click="handleToggle">{{ todo.title }}</span>
    <button class="delete-btn" @click="handleDelete">删除</button>
    <span v-if="todo.repeat !== 'none'" class="repeat-badge">
      {{
        todo.repeat === 'daily'
          ? '每天'
          : todo.repeat === 'weekly'
          ? '每周'
          : todo.repeat === 'monthly'
          ? '每月'
          : ''
      }}
    </span>
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

.todo-item span {
  flex-grow: 1;
  cursor: pointer;
}

button {
  margin-left: 8px;
  padding: 4px 10px;
  font-size: 12px;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  min-height: 28px;
  min-width: 36px;
}

.repeat-badge {
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 12px;
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
