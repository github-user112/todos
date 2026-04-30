<template>
  <div class="calendar-header">
    <div class="header-left">
      <button class="nav-btn" @click="$emit('prevMonth')" aria-label="上一月">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <h2 class="header-title">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
      <button class="nav-btn" @click="$emit('nextMonth')" aria-label="下一月">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <button class="today-btn" @click="$emit('goToToday')">今天</button>
    </div>

    <div class="header-right">
      <button
        :class="['icon-btn', { active: showTodoList }]"
        @click="$emit('toggleTodoList')"
        title="待办列表"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
      <button class="icon-btn" @click="copyUrlToClipboard" title="分享">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      <button class="icon-btn" @click="showDrawer = true" title="设置">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
      </button>
    </div>

    <!-- 设置抽屉 -->
    <Transition name="drawer-overlay">
      <div
        v-if="showDrawer"
        class="drawer-overlay"
        @click.self="showDrawer = false"
      >
        <Transition name="drawer-panel">
          <div v-if="showDrawer" class="drawer-panel">
            <div class="drawer-header">
              <span class="drawer-title">⚙️ 设置</span>
              <button class="drawer-close" @click="showDrawer = false">
                ✕
              </button>
            </div>
            <div class="drawer-body">
              <div class="setting-group">
                <label class="setting-label">👁️ 视图模式</label>
                <div class="view-mode-chips">
                  <button
                    v-for="v in viewModeOptions"
                    :key="v.value"
                    :class="['theme-chip', { active: viewMode === v.value }]"
                    @click="$emit('changeViewMode', v.value)"
                  >
                    {{ v.label }}
                  </button>
                </div>
              </div>
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
              <div class="setting-group">
                <label class="setting-label">🌙 农历显示</label>
                <div class="toggle-row">
                  <span class="toggle-desc">在日期旁显示农历/节气</span>
                  <button
                    :class="['toggle-btn', { active: showLunar }]"
                    @click="$emit('changeShowLunar', !showLunar)"
                  >
                    <span class="toggle-thumb"></span>
                  </button>
                </div>
              </div>
              <div class="setting-group">
                <label class="setting-label">🔗 Webhook 推送</label>
                <p class="webhook-desc">
                  每天早上 8:00 将当日待办推送到指定 URL
                </p>
                <p class="webhook-formats">
                  支持：企业微信 / 钉钉 / 通用 Webhook（自动识别）
                </p>
                <input
                  type="url"
                  class="webhook-input"
                  v-model="webhookUrl"
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                />
                <div v-if="webhookUrl" class="webhook-type-badge">
                  <span :class="['type-tag', webhookType]">{{
                    webhookTypeLabel
                  }}</span>
                </div>
                <div class="webhook-actions">
                  <button
                    class="webhook-test-btn"
                    :disabled="webhookTesting || !webhookUrl"
                    @click="testWebhook"
                  >
                    {{ webhookTesting ? '测试中...' : '🧪 测试' }}
                  </button>
                  <button
                    class="webhook-save-btn"
                    :disabled="webhookSaving"
                    @click="saveWebhook"
                  >
                    {{ webhookSaving ? '保存中...' : '💾 保存' }}
                  </button>
                </div>
                <p
                  v-if="webhookTestResult"
                  :class="[
                    'webhook-result',
                    webhookTestResult.success ? 'success' : 'error',
                  ]"
                >
                  {{ webhookTestResult.message }}
                </p>
              </div>
            </div>
            <div class="drawer-footer">
              <a href="mailto:gonesc@foxmail.com" class="contact-link"
                >📧 gonesc@foxmail.com</a
              >
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { apiRequest } from '../utils/api';
defineProps({
  currentYear: { type: Number, required: true },
  currentMonth: { type: Number, required: true },
  animationType: { type: String, required: true },
  themeType: { type: String, required: true },
  viewMode: { type: String, required: true },
  showTodoList: { type: Boolean, default: false },
  showLunar: { type: Boolean, default: true },
  webhookUrlProp: { type: String, default: '' },
});

defineEmits([
  'prevMonth',
  'nextMonth',
  'goToToday',
  'changeAnimation',
  'changeTheme',
  'changeViewMode',
  'openTodoList',
  'changeShowLunar',
  'changeWebhookUrl',
]);

const showDrawer = ref(false);
const webhookUrl = ref('');
const webhookTesting = ref(false);
const webhookSaving = ref(false);
const webhookTestResult = ref(null);

const webhookType = computed(() => {
  const url = webhookUrl.value || '';
  if (url.includes('qyapi.weixin.qq.com')) return 'wecom';
  if (url.includes('oapi.dingtalk.com')) return 'dingtalk';
  if (url.includes('hooks.slack.com')) return 'slack';
  if (url) return 'generic';
  return '';
});

const webhookTypeLabel = computed(() => {
  const labels = {
    wecom: '🏢 企业微信',
    dingtalk: '📎 钉钉',
    slack: '💬 Slack',
    generic: '🌐 通用 Webhook',
  };
  return labels[webhookType.value] || '';
});

const viewModeOptions = [
  { value: 'today-priority', label: '📅 今日优先' },
  { value: 'full-month', label: '🗓️ 完整月' },
];

const themeOptions = [
  { value: 'default', label: '🔮 极光紫' },
  { value: 'classic', label: '💎 经典蓝' },
  { value: 'orange', label: '🌅 暖橙' },
  { value: 'green', label: '🌿 护眼绿' },
  { value: 'rose', label: '🌹 玫瑰粉' },
  { value: 'lavender', label: '💜 薰衣草' },
  { value: 'mint', label: '🌊 薄荷青' },
  { value: 'amber', label: '🟠 琥珀橙' },
  { value: 'primrose', label: '🌼 樱草黄' },
];

const testWebhook = async () => {
  if (!webhookUrl.value) return;
  webhookTesting.value = true;
  webhookTestResult.value = null;
  try {
    const result = await apiRequest('/api/webhook/test', 'POST', {});
    if (result.success) {
      webhookTestResult.value = {
        success: true,
        message: `✅ 测试成功！推送了 ${result.todoCount} 条待办（HTTP ${result.status}）`,
      };
    } else {
      webhookTestResult.value = {
        success: false,
        message: `❌ 测试失败：${result.error || '未知错误'}`,
      };
    }
  } catch (error) {
    webhookTestResult.value = {
      success: false,
      message: `❌ 请求失败：${error.message}`,
    };
  } finally {
    webhookTesting.value = false;
  }
};

const saveWebhook = async () => {
  webhookSaving.value = true;
  try {
    await apiRequest('/api/user-settings', 'PUT', {
      webhook_url: webhookUrl.value,
    });
    webhookTestResult.value = {
      success: true,
      message: '✅ Webhook URL 已保存',
    };
  } catch (error) {
    webhookTestResult.value = {
      success: false,
      message: `❌ 保存失败：${error.message}`,
    };
  } finally {
    webhookSaving.value = false;
  }
};

const copyUrlToClipboard = () => {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => alert('链接已复制到剪贴板'))
    .catch(() => alert('复制失败'));
};
</script>

<style scoped>
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: 6px;
  background: var(--card-background);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  gap: 8px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
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
  -webkit-tap-highlight-color: transparent;
}
.nav-btn:active {
  transform: scale(0.9);
  background: var(--primary-light);
  color: var(--primary-color);
}

.header-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 105px;
  text-align: center;
  letter-spacing: -0.02em;
  user-select: none;
}

.today-btn {
  padding: 7px 14px;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  background: var(--button-primary-bg);
  box-shadow: var(--shadow-sm);
  -webkit-tap-highlight-color: transparent;
}
.today-btn:active {
  background: var(--button-primary-hover-bg);
  transform: scale(0.95);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: var(--text-secondary);
  -webkit-tap-highlight-color: transparent;
}
.icon-btn:active {
  background: var(--hover-color);
  color: var(--primary-color);
  transform: scale(0.9);
}
.icon-btn.active {
  background: var(--primary-light);
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
  width: 280px;
  height: 100%;
  background: var(--card-background);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-close {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1rem;
  -webkit-tap-highlight-color: transparent;
}
.drawer-close:active {
  background: var(--hover-color);
}

.drawer-body {
  flex: 1;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.drawer-footer {
  padding: 14px 18px;
  border-top: 1px solid var(--border-color);
}

.contact-link {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
}

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
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background);
  color: var(--text-primary);
  font-size: 0.88rem;
  cursor: pointer;
  -webkit-appearance: none;
}
.setting-select:focus {
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
  outline: none;
}

.view-mode-chips {
  display: flex;
  gap: 10px;
}

.theme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.theme-chip {
  padding: 11px 6px;
  border-radius: 10px;
  border: 2px solid var(--border-color);
  background: var(--hover-color);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
  -webkit-tap-highlight-color: transparent;
}
.theme-chip:active {
  transform: scale(0.96);
}
.theme-chip.active {
  border-color: var(--primary-color);
  background: var(--primary-light);
  color: var(--primary-dark);
  font-weight: 700;
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toggle-desc {
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  transition: background 0.25s ease;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.toggle-btn.active {
  background: var(--primary-color);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.25s ease;
}
.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

.webhook-desc {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin: 0 0 4px;
  line-height: 1.4;
}

.webhook-formats {
  font-size: 0.68rem;
  color: var(--other-month-text);
  margin: 0 0 8px;
  line-height: 1.4;
}

.webhook-type-badge {
  margin-top: 6px;
}

.type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
}

.type-tag.wecom {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
}

.type-tag.dingtalk {
  background: rgba(0, 166, 255, 0.12);
  color: #00a6ff;
}

.type-tag.slack {
  background: rgba(74, 21, 75, 0.12);
  color: #4a154b;
}

.type-tag.generic {
  background: var(--hover-color);
  color: var(--text-secondary);
}

.webhook-input {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.82rem;
  background: var(--card-background);
  color: var(--text-primary);
  -webkit-appearance: none;
  box-sizing: border-box;
}

.webhook-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

.webhook-input::placeholder {
  color: var(--other-month-text);
}

.webhook-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.webhook-test-btn,
.webhook-save-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}

.webhook-test-btn {
  background: var(--hover-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.webhook-test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhook-save-btn {
  background: var(--button-primary-bg);
  color: white;
}

.webhook-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhook-result {
  margin: 6px 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
}

.webhook-result.success {
  color: var(--success-color, #18a058);
}

.webhook-result.error {
  color: var(--danger-color, #e74c3c);
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

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .calendar-header {
    padding: 6px 10px;
    border-radius: 12px;
    margin-bottom: 4px;
  }
  .header-left {
    gap: 4px;
  }
  .header-right {
    gap: 4px;
  }
  .header-title {
    font-size: 1rem;
    min-width: 90px;
  }
  .today-btn {
    padding: 8px 12px;
    font-size: 0.78rem;
    border-radius: 8px;
    min-height: 36px;
  }
  .nav-btn,
  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .nav-btn svg,
  .icon-btn svg {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 380px) {
  .calendar-header {
    padding: 5px 6px;
    border-radius: 10px;
    gap: 2px;
  }
  .header-title {
    font-size: 0.95rem;
    min-width: 82px;
  }
  .today-btn {
    padding: 6px 10px;
    font-size: 0.75rem;
    min-height: 34px;
  }
  .nav-btn,
  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }
  .nav-btn svg,
  .icon-btn svg {
    width: 16px;
    height: 16px;
  }
  .drawer-panel {
    width: 100%;
  }
}
</style>
