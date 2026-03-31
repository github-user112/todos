<template>
  <div class="calendar-header">
    <!-- 左侧：导航 -->
    <div class="header-left">
      <button class="nav-btn" @click="$emit('prevMonth')" aria-label="上一月">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h2 class="header-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
      <button class="nav-btn" @click="$emit('nextMonth')" aria-label="下一月">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="today-btn" @click="$emit('goToToday')">今天</button>
    </div>

    <!-- 右侧：操作 -->
    <div class="header-right">
      <button class="icon-btn" @click="copyUrlToClipboard" title="分享日程">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
      <button class="icon-btn settings-trigger" @click="showDrawer = true" title="设置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
    </div>

    <!-- 设置抽屉 -->
    <Transition name="drawer-overlay">
      <div v-if="showDrawer" class="drawer-overlay" @click.self="showDrawer = false">
        <Transition name="drawer-panel">
          <div v-if="showDrawer" class="drawer-panel">
            <div class="drawer-header">
              <span class="drawer-title">⚙️ 设置</span>
              <button class="drawer-close" @click="showDrawer = false">✕</button>
            </div>
            <div class="drawer-body">
              <!-- 主题 -->
              <div class="setting-group">
                <label class="setting-label">🎨 主题风格</label>
                <div class="theme-grid">
                  <button
                    v-for="t in themeOptions"
                    :key="t.value"
                    :class="['theme-chip', { active: themeType === t.value }]"
                    @click="$emit('changeTheme', t.value)"
                  >
                    {{ t.label }}
                  </button>
                </div>
              </div>

              <!-- 动画 -->
              <div class="setting-group">
                <label class="setting-label">🎬 切换动画</label>
                <select
                  class="setting-select"
                  :value="animationType"
                  @change="$emit('changeAnimation', $event.target.value)"
                >
                  <option value="slide-left">← 滑动</option>
                  <option value="default">淡入淡出</option>
                  <option value="animate__bounce">弹跳</option>
                  <option value="animate__tada">抖动</option>
                  <option value="random">随机</option>
                </select>
              </div>
            </div>
            <div class="drawer-footer">
              <a href="mailto:gonesc@foxmail.com" class="contact-link">
                📧 gonesc@foxmail.com
              </a>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  currentYear: { type: Number, required: true },
  currentMonth: { type: Number, required: true },
  animationType: { type: String, required: true },
  themeType: { type: String, required: true },
});

defineEmits(['prevMonth', 'nextMonth', 'goToToday', 'changeAnimation', 'changeTheme']);

const showDrawer = ref(false);

const themeOptions = [
  { value: 'default', label: '🔮 极光紫' },
  { value: 'classic', label: '💎 经典蓝' },
  { value: 'orange', label: '🌅 暖橙' },
  { value: 'green', label: '🌿 护眼绿' },
];

const copyUrlToClipboard = () => {
  navigator.clipboard.writeText(window.location.href)
    .then(() => alert('链接已复制到剪贴板'))
    .catch(() => alert('复制失败'));
};
</script>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: var(--card-background);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  gap: 8px;
}

/* ---- 左侧导航 ---- */
.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--hover-color);
  transition: all 0.2s;
}
.nav-btn:hover {
  background: var(--primary-light);
  color: var(--primary-color);
  transform: scale(1.05);
}

.header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 120px;
  text-align: center;
  letter-spacing: -0.02em;
}

.today-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  background: var(--button-primary-bg);
  box-shadow: var(--shadow-sm);
}
.today-btn:hover {
  background: var(--button-primary-hover-bg);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ---- 右侧操作 ---- */
.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.icon-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

/* ---- 设置抽屉 ---- */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 300px;
  height: 100%;
  background: var(--card-background);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1rem;
}
.drawer-close:hover {
  background: var(--hover-color);
}

.drawer-body {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.contact-link {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
}
.contact-link:hover {
  color: var(--primary-color);
}

/* ---- 设置项 ---- */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}
.setting-select:focus {
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
  outline: none;
}

/* ---- 主题色块 ---- */
.theme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.theme-chip {
  padding: 10px 8px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  background: var(--hover-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s;
}
.theme-chip:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
}
.theme-chip.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
  color: var(--primary-dark);
  font-weight: 700;
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

/* ---- 抽屉动画 ---- */
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

.drawer-panel-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-panel-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-panel-enter-from,
.drawer-panel-leave-to {
  transform: translateX(100%);
}

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .calendar-header {
    padding: 8px 10px;
    border-radius: 12px;
  }
  .header-title {
    font-size: 1rem;
    min-width: auto;
  }
  .today-btn {
    padding: 5px 10px;
    font-size: 0.75rem;
  }
  .nav-btn, .icon-btn {
    width: 32px;
    height: 32px;
  }
  .drawer-panel {
    width: 260px;
  }
}
</style>
