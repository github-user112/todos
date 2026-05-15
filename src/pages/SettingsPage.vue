<template>
  <div class="settings-page">
    <div class="settings-container">
      <div class="settings-header">
        <h1>⚙️ 周报提醒设置</h1>
        <button class="back-btn" @click="goBack">← 返回日历</button>
      </div>

      <div v-if="!isAdmin" class="access-denied">
        <p>⚠️ 您没有权限访问此页面</p>
        <button class="btn-primary" @click="goBack">返回日历</button>
      </div>

      <div v-else class="settings-content">
        <div class="setting-section">
          <h2>📢 周末提醒配置</h2>
          <p class="section-desc">
            在本周最后 N 个工作日时，推送待办提醒到企业微信/钉钉
          </p>

          <div class="form-group">
            <label class="toggle-row">
              <span class="toggle-desc">启用周末提醒</span>
              <button
                :class="['toggle-btn', { active: settings.enabled }]"
                @click="settings.enabled = !settings.enabled"
              >
                <span class="toggle-thumb"></span>
              </button>
            </label>
          </div>

          <div class="form-group">
            <label>📅 提前触发</label>
            <select v-model.number="settings.days" class="form-select">
              <option :value="1">最后 1 个工作日</option>
              <option :value="2">最后 2 个工作日</option>
              <option :value="3">最后 3 个工作日</option>
            </select>
          </div>

          <div class="form-group">
            <label>🔗 Webhook URL</label>
            <input
              type="url"
              class="form-input"
              v-model="settings.webhook_url"
              placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
            />
            <span v-if="webhookType" :class="['type-tag', webhookType]">{{
              webhookTypeLabel
            }}</span>
          </div>

          <div class="form-group">
            <label>📝 消息模板</label>
            <textarea
              class="form-textarea"
              v-model="settings.template"
              rows="10"
              placeholder="输入自定义消息模板..."
            ></textarea>
            <div class="template-hints">
              <p>可用变量：</p>
              <code>{date}</code> 日期、 <code>{weekday}</code> 星期、
              <code>{week_num}</code> 第N个工作日、
              <code>{total_workdays}</code> 总工作日数
              <br />
              <code>{todo_count}</code> 待办数量、
              <code>{todo_list}</code> 待办列表
            </div>
          </div>

          <div class="form-actions">
            <button
              class="btn-secondary"
              :disabled="testing || !settings.webhook_url"
              @click="testSettings"
            >
              {{ testing ? '测试中...' : '🧪 测试推送' }}
            </button>
            <button
              class="btn-primary"
              :disabled="saving"
              @click="saveSettings"
            >
              {{ saving ? '保存中...' : '💾 保存设置' }}
            </button>
          </div>

          <p
            v-if="message"
            :class="['result-message', message.success ? 'success' : 'error']"
          >
            {{ message.text }}
          </p>
        </div>

        <div class="setting-section preview-section">
          <h2>📋 模板预览</h2>
          <div class="preview-box">
            <div
              v-if="settings.template"
              class="markdown-preview"
              v-html="renderedPreview"
            ></div>
            <p v-else class="preview-placeholder">填写模板后在此预览效果</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  getWeeklySummarySettings,
  updateWeeklySummarySettings,
  testWeeklySummary,
  checkAdminAccess,
} from '../utils/settingsApi';
import { getUserId } from '../utils/api';
const router = useRouter();
const props = defineProps({
  userId: { type: String, required: true },
});
const settings = ref({
  enabled: false,
  days: 1,
  webhook_url: '',
  template: `## 📢 周末提醒

📅 日期：{date}
🗓️ 星期：{weekday}
📊 本周第 {week_num} 个工作日（共 {total_workdays} 天）

📋 今日待办（{todo_count} 项）：
{todo_list}`,
});

const testing = ref(false);
const saving = ref(false);
const message = ref(null);
const isAdmin = ref(false);

const webhookType = computed(() => {
  const url = settings.value.webhook_url || '';
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

const renderedPreview = computed(() => {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const weekday = weekDays[today.getDay()];

  const sampleTodos = [
    { todo_time: '09:00', text: '示例待办 1' },
    { todo_time: '14:00', text: '示例待办 2' },
  ];

  const todoLines = sampleTodos
    .map((t, i) => `${i + 1}. [${t.todo_time || '09:00'}] ${t.text}`)
    .join('\n');

  let preview = settings.value.template
    .replace('{date}', dateStr)
    .replace('{weekday}', weekday)
    .replace('{week_num}', '第1个')
    .replace('{total_workdays}', '5')
    .replace('{todo_count}', String(sampleTodos.length))
    .replace('{todo_list}', todoLines || '（无待办）');

  return preview
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
});

const loadSettings = async () => {
  try {
    const data = await getWeeklySummarySettings(getUserId());
    if (data && !data.error) {
      settings.value = {
        enabled: !!data.enabled,
        days: data.days || 1,
        webhook_url: data.webhook_url || '',
        template: data.template || settings.value.template,
      };
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

const testSettings = async () => {
  testing.value = true;
  message.value = null;
  try {
    await updateWeeklySummarySettings(settings.value, props.userId);
    const result = await testWeeklySummary(props.userId);
    if (result.success) {
      const dayLabel = result.isLastNWorkday
        ? '✅ 今天是本周最后N个工作日'
        : 'ℹ️ 今天不是本周最后N个工作日';
      message.value = {
        success: true,
        text: `${dayLabel}，推送了 ${result.todoCount} 条待办`,
      };
    } else {
      message.value = {
        success: false,
        text: `❌ 测试失败：${result.error || '未知错误'}`,
      };
    }
  } catch (error) {
    message.value = {
      success: false,
      text: `❌ 请求失败：${error.message}`,
    };
  } finally {
    testing.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;
  message.value = null;
  try {
    await updateWeeklySummarySettings(settings.value, getUserId());
    message.value = {
      success: true,
      text: '✅ 设置已保存',
    };
  } catch (error) {
    message.value = {
      success: false,
      text: `❌ 保存失败：${error.message}`,
    };
  } finally {
    saving.value = false;
  }
};

const goBack = () => {
  router.push({ name: 'calendar' });
};

onMounted(async () => {
  try {
    const result = await checkAdminAccess();
    isAdmin.value = !!result.allowed;
  } catch {
    isAdmin.value = false;
  }
  if (isAdmin.value) {
    loadSettings();
  }
});
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--page-background, #f5f5f5);
  padding: 20px;
  overflow-y: auto;
}

.settings-container {
  max-width: 700px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.settings-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.back-btn {
  padding: 8px 16px;
  border-radius: 8px;
  background: var(--hover-color);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
}

.access-denied {
  background: var(--card-background);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.access-denied p {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-section {
  background: var(--card-background);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.setting-section h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0 0 20px;
  line-height: 1.4;
}

.form-group {
  margin-bottom: 20px;
}

.form-group > label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-desc {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--border-color);
  border: none;
  cursor: pointer;
  transition: background 0.25s ease;
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

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.88rem;
  background: var(--card-background);
  color: var(--text-primary);
  box-sizing: border-box;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--form-input-focus-border, var(--primary-color));
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow, rgba(79, 70, 229, 0.1));
}

.form-textarea {
  resize: vertical;
  min-height: 150px;
  font-family: inherit;
  line-height: 1.5;
}

.type-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  margin-top: 8px;
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

.template-hints {
  margin-top: 10px;
  padding: 12px;
  background: var(--hover-color);
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.template-hints p {
  margin: 0 0 6px;
  font-weight: 600;
}

.template-hints code {
  background: var(--card-background);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.72rem;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--hover-color);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-primary {
  background: var(--button-primary-bg, var(--primary-color));
  color: white;
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.4;
  text-align: center;
}

.result-message.success {
  background: rgba(24, 160, 88, 0.1);
  color: var(--success-color, #18a058);
}

.result-message.error {
  background: rgba(231, 76, 60, 0.1);
  color: var(--danger-color, #e74c3c);
}

.preview-section h2 {
  margin-bottom: 16px;
}

.preview-box {
  background: var(--page-background, #f5f5f5);
  border-radius: 10px;
  padding: 16px;
  min-height: 120px;
}

.markdown-preview {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-placeholder {
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-align: center;
  padding: 40px 0;
  margin: 0;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 12px;
  }

  .setting-section {
    padding: 18px;
  }

  .settings-header h1 {
    font-size: 1.25rem;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
