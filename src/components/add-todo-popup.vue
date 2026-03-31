<template>
  <Transition name="popup">
    <div class="add-todo-popup" @click.self="$emit('close')">
      <div class="popup-card">
        <!-- 头部 -->
        <div class="popup-header">
          <h2>添加待办事项</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- 日期显示 -->
        <div class="date-badge">
          📅 {{ selectedDate }}
        </div>

        <!-- 输入框 -->
        <input
          ref="inputRef"
          type="text"
          :value="todoText"
          @input="$emit('update:todoText', $event.target.value)"
          placeholder="输入待办事项..."
          class="todo-input"
          @keydown.enter="handleSave"
        />

        <!-- 重复设置 -->
        <div class="repeat-section">
          <label class="section-label">🔄 重复</label>
          <div class="repeat-chips">
            <button
              v-for="opt in repeatOptions"
              :key="opt.value"
              :class="['repeat-chip', { active: todoRepeat === opt.value }]"
              @click="updateRepeatType(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- 间隔输入 -->
          <div v-if="todoRepeat !== 'none'" class="interval-row">
            <span class="interval-prefix">每</span>
            <input
              type="number"
              v-model.number="intervals[todoRepeat]"
              :min="1"
              :max="INTERVAL_LIMITS[todoRepeat]?.max"
              class="interval-input"
              @blur="validateInterval(todoRepeat)"
            />
            <span class="interval-suffix">{{ INTERVAL_LIMITS[todoRepeat]?.unit }}</span>
            <span class="interval-hint">{{ INTERVAL_LIMITS[todoRepeat]?.min }}-{{ INTERVAL_LIMITS[todoRepeat]?.max }}{{ INTERVAL_LIMITS[todoRepeat]?.unit }}</span>
          </div>

          <!-- 结束日期 -->
          <div v-if="todoRepeat !== 'none'" class="interval-row">
            <label class="interval-prefix" for="end-date">结束</label>
            <input
              type="date"
              id="end-date"
              v-model="endDate"
              class="interval-input date-input"
            />
            <span class="interval-hint">可选</span>
          </div>
        </div>

        <!-- 预览 -->
        <div v-if="todoRepeat !== 'none'" class="preview-section">
          <button type="button" @click="showPreview = !showPreview" class="preview-toggle">
            {{ showPreview ? '▲ 隐藏预览' : '▼ 显示未来日期' }}
          </button>
          <RepeatPreview
            v-if="showPreview"
            :showPreview="showPreview"
            :baseDate="selectedDate"
            :repeatType="todoRepeat"
            :repeatInterval="currentInterval"
            :endDate="endDate"
            @close="showPreview = false"
          />
        </div>

        <!-- 按钮 -->
        <div class="popup-actions">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-save" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import RepeatPreview from './RepeatPreview.vue';

const props = defineProps({
  todoText: { type: String, required: true },
  todoRepeat: { type: String, required: true },
  selectedDate: { type: String, default: '' },
});

const emit = defineEmits(['update:todoText', 'update:todoRepeat', 'save', 'close']);

const inputRef = ref(null);
const showPreview = ref(false);
const endDate = ref('');

const intervals = ref({ daily: 1, weekly: 1, monthly: 1, yearly: 1 });

const INTERVAL_LIMITS = {
  daily: { min: 1, max: 365, unit: '天' },
  weekly: { min: 1, max: 52, unit: '周' },
  monthly: { min: 1, max: 12, unit: '个月' },
  yearly: { min: 1, max: 10, unit: '年' },
};

const repeatOptions = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
];

const currentInterval = computed(() =>
  props.todoRepeat === 'none' ? 1 : intervals.value[props.todoRepeat]
);

const updateRepeatType = (type) => {
  emit('update:todoRepeat', type);
  showPreview.value = false;
};

const validateInterval = (type) => {
  const limit = INTERVAL_LIMITS[type];
  if (intervals.value[type] < limit.min) intervals.value[type] = limit.min;
  if (intervals.value[type] > limit.max) intervals.value[type] = limit.max;
};

const handleSave = () => {
  if (!props.todoText?.trim()) return;
  if (props.todoRepeat !== 'none') validateInterval(props.todoRepeat);
  emit('save', {
    repeatType: props.todoRepeat,
    repeatInterval: currentInterval.value,
    endDate: endDate.value || undefined,
  });
};

onMounted(() => {
  nextTick(() => inputRef.value?.focus());
});
</script>

<style scoped>
.add-todo-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 16px;
}

.popup-card {
  background: var(--card-background);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-color);
}

/* ---- 头部 ---- */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
}
.popup-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1rem;
}
.close-btn:hover {
  background: var(--hover-color);
}

/* ---- 日期徽章 ---- */
.date-badge {
  margin: 12px 20px 0;
  padding: 6px 12px;
  background: var(--hover-color);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: inline-block;
  width: fit-content;
}

/* ---- 输入框 ---- */
.todo-input {
  display: block;
  width: calc(100% - 40px);
  margin: 16px 20px;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--card-background);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.todo-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 4px var(--form-input-focus-shadow);
}
.todo-input::placeholder {
  color: var(--other-month-text);
}

/* ---- 重复设置 ---- */
.repeat-section {
  margin: 0 20px 16px;
  padding: 14px;
  background: var(--hover-color);
  border-radius: 12px;
}
.section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.repeat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.repeat-chip {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: var(--card-background);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  transition: all 0.2s;
}
.repeat-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.repeat-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  font-weight: 600;
}

/* ---- 间隔输入 ---- */
.interval-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.interval-prefix {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 24px;
}
.interval-input {
  width: 60px;
  padding: 6px 8px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  background: var(--card-background);
  color: var(--text-primary);
}
.interval-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 3px var(--form-input-focus-shadow);
}
.date-input {
  width: auto;
  flex: 1;
}
.interval-suffix {
  font-size: 0.82rem;
  color: var(--text-secondary);
}
.interval-hint {
  font-size: 0.72rem;
  color: var(--other-month-text);
  margin-left: auto;
}

/* ---- 预览 ---- */
.preview-section {
  margin: 0 20px 16px;
}
.preview-toggle {
  width: 100%;
  padding: 8px;
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  color: var(--preview-text);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
}
.preview-toggle:hover {
  background: var(--preview-hover-bg);
}

/* ---- 按钮 ---- */
.popup-actions {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
}
.btn-cancel,
.btn-save {
  flex: 1;
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-cancel {
  background: var(--button-secondary-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.btn-cancel:hover {
  background: var(--button-secondary-hover-bg);
}
.btn-save {
  background: var(--button-primary-bg);
  color: white;
  box-shadow: var(--shadow-sm);
}
.btn-save:hover {
  background: var(--button-primary-hover-bg);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ---- 弹窗动画 ---- */
.popup-enter-active {
  transition: opacity 0.25s ease;
}
.popup-enter-active .popup-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}
.popup-leave-active {
  transition: opacity 0.2s ease;
}
.popup-leave-active .popup-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.popup-enter-from {
  opacity: 0;
}
.popup-enter-from .popup-card {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.popup-leave-to {
  opacity: 0;
}
.popup-leave-to .popup-card {
  transform: scale(0.95);
  opacity: 0;
}

/* ---- 移动端 ---- */
@media (max-width: 480px) {
  .add-todo-popup {
    align-items: flex-end;
    padding: 0;
  }
  .popup-card {
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    max-width: 100%;
  }
}
</style>
