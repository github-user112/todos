<template>
  <div class="calendar-header">
    <button @click="$emit('prevMonth')" class="nav-button">&lt;</button>
    <h2 class="calendar-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
    <button @click="$emit('nextMonth')" class="nav-button">&gt;</button>
    <button @click="$emit('goToToday')" class="today-button">今天</button>
    <button @click="copyUrlToClipboard" class="share-button">
      分享我的日程
    </button>
    <div class="theme-selector">
      <label for="theme-type">主题:</label>
      <select
        id="theme-type"
        :value="themeType"
        @change="$emit('changeTheme', $event.target.value)"
      >
        <option value="default">默认</option>
        <option value="classic">经典</option>
        <option value="orange">橙色</option>
        <!-- 未来可以添加更多主题选项 -->
      </select>
    </div>
    <div class="animation-selector">
      <label for="animation-type">动画类型:</label>
      <select
        id="animation-type"
        :value="animationType"
        @change="$emit('changeAnimation', $event.target.value)"
      >
        <option value="animate__bounce">animate__bounce</option>
        <option value="animate__tada">animate__tada</option>

        <option value="random">随机</option>
        <option value="slide-left">向左滑动</option>
        <option value="default">默认</option>
        <!-- 未来可以添加更多动画选项 -->
      </select>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentYear: {
    type: Number,
    required: true,
  },
  currentMonth: {
    type: Number,
    required: true,
  },
  animationType: {
    type: String,
    required: true,
  },
  themeType: {
    type: String,
    required: true,
  },
});

defineEmits([
  'prevMonth',
  'nextMonth',
  'goToToday',
  'changeAnimation',
  'changeTheme',
]);

const copyUrlToClipboard = () => {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => {
      alert('链接已复制到剪贴板');
    })
    .catch((err) => {
      console.error('复制失败:', err);
    });
};
</script>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 15px;
  background: var(--card-background);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.nav-button,
.today-button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  font-weight: 500;
}

.nav-button {
  background: var(--preview-bg);
  color: var(--info-color);
  box-shadow: 0 2px 5px rgba(49, 130, 206, 0.1);
}

.today-button {
  background: var(--button-primary-bg);
  color: white;
  box-shadow: 0 2px 5px rgba(74, 108, 247, 0.2);
}

.share-button {
  background: var(--button-success-bg);
  color: white;
  box-shadow: 0 2px 5px rgba(56, 161, 105, 0.2);
}

.share-button:hover {
  background: var(--button-success-hover-bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(56, 161, 105, 0.3);
}

.nav-button:hover {
  background: var(--preview-hover-bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(49, 130, 206, 0.2);
}

.today-button:hover {
  background: var(--button-primary-hover-bg);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(74, 108, 247, 0.3);
}

.calendar-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 600;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .calendar-header {
    padding: 8px;
    flex-wrap: wrap;
  }

  .nav-button,
  .today-button,
  .share-button {
    padding: 4px 8px;
    font-size: 12px;
  }

  .calendar-title {
    font-size: 1rem;
    flex-basis: 100%;
    text-align: center;
    margin: 8px 0;
  }
}

.theme-selector,
.animation-selector {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.theme-selector label,
.animation-selector label {
  margin-right: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.theme-selector select,
.animation-selector select {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-background);
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
}

@media (max-width: 768px) {
  .theme-selector,
  .animation-selector {
    margin-left: 5px;
  }
  .theme-selector label,
  .animation-selector label {
    font-size: 12px;
  }
  .theme-selector select,
  .animation-selector select {
    padding: 4px 8px;
    font-size: 12px;
  }
}

/* 在小屏幕上将选择器放在下一行 */
@media (max-width: 768px) {
  .theme-selector,
  .animation-selector {
    margin-top: 8px;
  }
}
</style>
