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
      <h2 class="header-title">
        <span class="title-main">{{ currentMonth + 1 }}<i class="title-unit">月</i></span>
        <span class="title-sub">{{ currentYear }}</span>
      </h2>
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
      <FestivalCountdown />
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
      <button class="icon-btn" @click="openDrawer" title="设置">
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

    <!-- 设置抽屉 - Teleport 到 body 避免祖先 backdrop-filter 影响固定定位 -->
    <Teleport to="body">
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
                <select
                  class="setting-select"
                  :value="themeType"
                  @change="$emit('changeTheme', $event.target.value)"
                >
                  <option v-for="t in themeOptions" :key="t.value" :value="t.value">
                    {{ t.label }}
                  </option>
                </select>
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
                  <option value="fade-up">✨ 浮入</option>
                  <option value="flip">🌀 翻转</option>
                  <option value="scale-pop">💥 缩放</option>
                  <option value="skew">⚡ 倾斜</option>
                  <option value="reveal">🌈 展开</option>
                  <option value="cube">🧊 立方体</option>
                  <option value="depth-zoom">🔍 景深缩放</option>
                  <option value="glass-flip">🪟 玻璃翻转</option>
                  <option value="split">🚪 分裂</option>
                  <option value="ripple">🌊 波纹</option>
                  <option value="stagger">🎯 错峰</option>
                  <option value="random">随机</option>
                </select>
              </div>
              <div class="setting-group">
                <label class="setting-label">🎉 完成动效</label>
                <select
                  class="setting-select"
                  :value="celebrationEffect"
                  @change="changeCelebrationEffect($event.target.value)"
                >
                  <option value="confetti">🎊 彩色纸屑</option>
                  <option value="stars">✨ 星星粒子</option>
                  <option value="rainbow">🌈 彩虹光波</option>
                  <option value="all">🎉 全部动效</option>
                  <option value="none">🚫 关闭动效</option>
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
                <label class="setting-label">🌦️ 动态背景</label>
                <div class="toggle-row">
                  <span class="toggle-desc">根据时间和天气自动切换背景</span>
                  <button
                    :class="['toggle-btn', { active: dynamicBgEnabled }]"
                    @click="toggleDynamicBackground"
                  >
                    <span class="toggle-thumb"></span>
                  </button>
                </div>
                <div v-if="dynamicBgEnabled" class="city-input-row">
                  <span class="city-desc">城市（未授权定位时使用）</span>
                  <div class="city-input-wrap">
                    <input
                      type="text"
                      class="city-input"
                      v-model="customCity"
                      placeholder="如：北京、上海"
                      @keyup.enter="saveCity"
                    />
                    <button class="city-save-btn" @click="saveCity">确定</button>
                  </div>
                  <p v-if="cityMessage" :class="['webhook-result', cityMessage.success ? 'success' : 'error']">
                    {{ cityMessage.text }}
                  </p>
                </div>
              </div>
              <div class="setting-group">
                <label class="setting-label">💾 数据管理</label>
                <div class="data-actions">
                  <button class="data-btn" @click="exportJSON">📤 导出 JSON</button>
                  <button class="data-btn" @click="exportCSV">📤 导出 CSV</button>
                  <button class="data-btn import-btn" @click="triggerImport">📥 导入数据</button>
                  <input ref="importInput" type="file" accept=".json" style="display:none" @change="handleImport" />
                </div>
                <p v-if="dataMessage" :class="['webhook-result', dataMessage.success ? 'success' : 'error']">
                  {{ dataMessage.text }}
                </p>
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
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { apiRequest } from '../utils/api';
import FestivalCountdown from './FestivalCountdown.vue';
import {
  getCelebrationEffect,
  setCelebrationEffect,
} from '../utils/celebrationUtils';
import {
  isDynamicBackgroundEnabled,
  setDynamicBackgroundEnabled,
  applyDynamicBackground,
  removeDynamicBackground,
  startDynamicBackgroundRefresh,
  stopDynamicBackgroundRefresh,
  getCustomCity,
  setCustomCity,
} from '../utils/dynamicBackground';
defineProps({
  currentYear: { type: Number, required: true },
  currentMonth: { type: Number, required: true },
  animationType: { type: String, required: true },
  themeType: { type: String, required: true },
  viewMode: { type: String, required: true },
  showTodoList: { type: Boolean, default: false },
  showLunar: { type: Boolean, default: true },
});

const emit = defineEmits([
  'prevMonth',
  'nextMonth',
  'goToToday',
  'changeAnimation',
  'changeTheme',
  'changeViewMode',
  'openTodoList',
  'changeShowLunar',
  'changeCelebrationEffect',
]);

const showDrawer = ref(false);
const celebrationEffect = ref(getCelebrationEffect());
const dynamicBgEnabled = ref(isDynamicBackgroundEnabled());
const customCity = ref(getCustomCity());
const cityMessage = ref(null);

const changeCelebrationEffect = (effect) => {
  setCelebrationEffect(effect);
  celebrationEffect.value = effect;
  emit('changeCelebrationEffect', effect);
  window.dispatchEvent(new CustomEvent('celebration-effect-change', { detail: effect }));
};

const toggleDynamicBackground = () => {
  const next = !dynamicBgEnabled.value;
  setDynamicBackgroundEnabled(next);
  dynamicBgEnabled.value = next;
  if (next) {
    applyDynamicBackground();
    startDynamicBackgroundRefresh();
  } else {
    removeDynamicBackground();
    stopDynamicBackgroundRefresh();
  }
};

const saveCity = () => {
  const city = customCity.value.trim();
  setCustomCity(city);
  if (city) {
    cityMessage.value = { success: true, text: `✅ 城市已设为「${city}」，将重新获取天气` };
    // 重新应用动态背景
    if (dynamicBgEnabled.value) {
      applyDynamicBackground();
    }
  } else {
    cityMessage.value = { success: true, text: '✅ 已清除自定义城市' };
  }
  setTimeout(() => { cityMessage.value = null; }, 3000);
};
const webhookUrl = ref('');
const webhookTesting = ref(false);
const webhookSaving = ref(false);
const webhookTestResult = ref(null);
const dataMessage = ref(null);
const importInput = ref(null);

const openDrawer = () => {
  showDrawer.value = true;
};

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
  { value: 'dark', label: '🌙 深色' },
  { value: 'glass', label: '🪟 液态玻璃' },
  { value: 'ios-glass', label: '🍎 iOS 玻璃' },
  { value: 'liquid-glass', label: '💧 流动玻璃' },
  { value: 'auto', label: '🔄 跟随系统' },
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

const exportJSON = async () => {
  try {
    const data = await apiRequest('/api/data/export', 'GET');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dataMessage.value = { success: true, text: `✅ 已导出 ${data.todos?.length || 0} 条待办` };
  } catch (error) {
    dataMessage.value = { success: false, text: `❌ 导出失败：${error.message}` };
  }
};

const exportCSV = async () => {
  try {
    const data = await apiRequest('/api/data/export', 'GET');
    const todos = data.todos || [];
    const header = 'ID,内容,日期,重复类型,重复间隔,结束日期,已完成,避开节假日,提醒(分钟),待办时间,排序';
    const rows = todos.map((t) =>
      [t.id, `"${(t.text || '').replace(/"/g, '""')}"`, t.date, t.repeat_type, t.repeat_interval, t.end_date, t.completed ? '是' : '否', t.skip_holidays ? '是' : '否', t.reminder, t.todo_time, t.sort_order].join(',')
    );
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-backup-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    dataMessage.value = { success: true, text: `✅ 已导出 ${todos.length} 条待办` };
  } catch (error) {
    dataMessage.value = { success: false, text: `❌ 导出失败：${error.message}` };
  }
};

const triggerImport = () => {
  importInput.value?.click();
};

const handleImport = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.todos || !Array.isArray(data.todos)) {
      dataMessage.value = { success: false, text: '❌ 无效的备份文件格式' };
      return;
    }

    const result = await apiRequest('/api/data/import', 'POST', data);
    if (result.success) {
      dataMessage.value = {
        success: true,
        text: `✅ 导入成功：${result.imported.todos} 条待办`,
      };
    } else {
      dataMessage.value = { success: false, text: `❌ 导入失败：${result.error}` };
    }
  } catch (error) {
    dataMessage.value = { success: false, text: `❌ 导入失败：${error.message}` };
  } finally {
    e.target.value = '';
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
/* ---- 头部容器：悬浮卡片 ---- */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  margin-bottom: 8px;
  background: var(--card-background);
  border-radius: 18px;
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

/* ---- 导航按钮：幽灵圆角方块，悬停浮现 ---- */
.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: transparent;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.nav-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}
.nav-btn:active {
  transform: scale(0.9);
}

/* ---- 标题：大月份 + 小年份，现代日历排版 ---- */
.header-title {
  margin: 0;
  min-width: 108px;
  display: flex;
  align-items: baseline;
  gap: 7px;
  text-align: center;
  user-select: none;
}
.title-main {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.title-unit {
  font-style: normal;
  font-size: 0.95rem;
  font-weight: 700;
  margin-left: 1px;
}
.title-sub {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ---- 今天按钮：强调色胶囊 ---- */
.today-btn {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #fff;
  background: var(--button-primary-bg);
  box-shadow: 0 3px 10px -3px var(--form-input-focus-shadow);
  transition: background 0.15s ease, box-shadow 0.2s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.today-btn:hover {
  background: var(--button-primary-hover-bg);
  box-shadow: 0 5px 16px -4px var(--form-input-focus-shadow);
  transform: translateY(-1px);
}
.today-btn:active {
  transform: scale(0.95);
  box-shadow: none;
}

/* ---- 图标按钮 ---- */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: transparent;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.icon-btn:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}
.icon-btn:active {
  transform: scale(0.9);
}
.icon-btn.active {
  background: var(--primary-light);
  color: var(--primary-dark);
}

/* ==============================
   设置抽屉
   ============================== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 28, 45, 0.4);
  backdrop-filter: blur(4px);
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 300px;
  height: 100%;
  background: var(--card-background);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  z-index: 3001;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--card-background);
  z-index: 2;
}

.drawer-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: background 0.15s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.drawer-close:hover {
  background: var(--hover-color);
  color: var(--text-primary);
}

.drawer-body {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.drawer-footer {
  padding: 14px 20px;
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

/* ---- 设置分组卡片 ---- */
.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--card-background);
  transition: border-color 0.2s ease;
}
.setting-group:hover {
  border-color: var(--form-input-border);
}

.setting-label {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* ---- 下拉选择 ---- */
.setting-select {
  padding: 9px 34px 9px 12px;
  border: 1px solid var(--form-input-border);
  border-radius: 11px;
  background-color: var(--card-background);
  color: var(--text-primary);
  font-size: 0.86rem;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%235d6a84' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.setting-select:hover {
  border-color: var(--primary-color);
}
.setting-select:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

/* ---- 视图模式胶囊 ---- */
.view-mode-chips {
  display: flex;
  gap: 8px;
}

.theme-chip {
  flex: 1;
  padding: 9px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.theme-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-dark);
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

/* ---- 开关 ---- */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.toggle-desc {
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.toggle-btn {
  position: relative;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: var(--border-color);
  transition: background 0.22s ease;
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
  background: #fff;
  box-shadow: 0 1px 3px rgba(23, 28, 45, 0.25);
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.toggle-btn.active .toggle-thumb {
  transform: translateX(18px);
}

/* ---- 城市输入 ---- */
.city-input-row {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.city-desc {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.city-input-wrap {
  display: flex;
  gap: 6px;
}

.city-input {
  flex: 1;
  min-width: 0;
  padding: 8px 11px;
  border: 1px solid var(--form-input-border);
  border-radius: 10px;
  font-size: 0.8rem;
  background: var(--card-background);
  color: var(--text-primary);
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.city-input::placeholder {
  color: var(--other-month-text);
}
.city-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

.city-save-btn {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--button-primary-bg);
  color: #fff;
  flex-shrink: 0;
  transition: background 0.15s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
}
.city-save-btn:hover {
  background: var(--button-primary-hover-bg);
}
.city-save-btn:active {
  transform: scale(0.95);
}

/* ---- Webhook ---- */
.webhook-desc {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.webhook-formats {
  font-size: 0.68rem;
  color: var(--other-month-text);
  margin: 0;
  line-height: 1.5;
}

.webhook-type-badge {
  margin-top: 2px;
}

.type-tag {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
}

.type-tag.wecom {
  background: rgba(7, 193, 96, 0.12);
  color: #07a35a;
}
.type-tag.dingtalk {
  background: rgba(37, 99, 235, 0.1);
  color: var(--info-color);
}
.type-tag.slack {
  background: rgba(90, 74, 120, 0.1);
  color: #5a4a78;
}
.type-tag.generic {
  background: var(--hover-color);
  color: var(--text-secondary);
}

.webhook-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--form-input-border);
  border-radius: 10px;
  font-size: 0.8rem;
  background: var(--card-background);
  color: var(--text-primary);
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.webhook-input::placeholder {
  color: var(--other-month-text);
}
.webhook-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}

.webhook-actions {
  display: flex;
  gap: 8px;
}

.webhook-test-btn,
.webhook-save-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.webhook-test-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.webhook-test-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-dark);
}
.webhook-test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhook-save-btn {
  background: var(--button-primary-bg);
  color: #fff;
}
.webhook-save-btn:hover:not(:disabled) {
  background: var(--button-primary-hover-bg);
}
.webhook-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhook-result {
  margin: 2px 0 0;
  font-size: 0.72rem;
  line-height: 1.5;
}
.webhook-result.success {
  color: var(--success-color);
}
.webhook-result.error {
  color: var(--danger-color);
}

/* ---- 数据管理 ---- */
.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.data-btn {
  padding: 7px 13px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.data-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-dark);
}
.data-btn:active {
  transform: scale(0.96);
}

.data-btn.import-btn {
  background: var(--button-primary-bg);
  color: #fff;
  border-color: transparent;
}
.data-btn.import-btn:hover {
  background: var(--button-primary-hover-bg);
  color: #fff;
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
    padding: 7px 10px;
    border-radius: 15px;
    margin-bottom: 6px;
  }
  .header-left {
    gap: 3px;
  }
  .header-title {
    min-width: 92px;
    gap: 5px;
  }
  .title-main {
    font-size: 1.15rem;
  }
  .title-unit {
    font-size: 0.85rem;
  }
  .title-sub {
    font-size: 0.75rem;
  }
  .today-btn {
    padding: 8px 13px;
    font-size: 0.78rem;
    min-height: 36px;
  }
  .nav-btn,
  .icon-btn {
    width: 36px;
    height: 36px;
  }
  .nav-btn svg,
  .icon-btn svg {
    width: 18px;
    height: 18px;
  }
  .nav-btn:hover,
  .icon-btn:hover {
    background: transparent;
    color: inherit;
  }
}

@media (max-width: 380px) {
  .calendar-header {
    padding: 6px 6px;
    border-radius: 13px;
    gap: 2px;
  }
  .header-title {
    min-width: 84px;
  }
  .title-main {
    font-size: 1.05rem;
  }
  .today-btn {
    padding: 6px 11px;
    font-size: 0.75rem;
    min-height: 34px;
  }
  .nav-btn,
  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: 10px;
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
