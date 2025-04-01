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
}

.delete-btn {
  display: none;
}

.todo-item:hover .delete-btn {
  display: block;
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
  padding: 2px 6px;
  font-size: 12px;
  background-color: #ff4d4f;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
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
    font-size: 12px;
  }

  button,
  .repeat-badge {
    font-size: 10px;
    padding: 1px 4px;
  }
}
</style>
