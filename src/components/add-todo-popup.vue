<template>
  <Transition name="popup">
    <div class="add-todo-popup" @click.self="$emit('close')">
      <div class="popup-card">
        <div class="drag-bar"></div>

        <div class="popup-header">
          <h2>添加待办</h2>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="date-badge">📅 {{ selectedDate }}</div>

        <input
          ref="inputRef"
          type="text"
          :value="todoText"
          @input="$emit('update:todoText', $event.target.value)"
          placeholder="输入待办事项..."
          class="todo-input"
          @keydown.enter="handleSave"
          enterkeyhint="done"
        />

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

          <div v-if="todoRepeat !== 'none'" class="interval-row">
            <span class="interval-prefix">每</span>
            <input
              type="number"
              inputmode="numeric"
              pattern="[0-9]*"
              v-model.number="intervals[todoRepeat]"
              :min="1"
              :max="INTERVAL_LIMITS[todoRepeat]?.max"
              class="interval-input"
              @blur="validateInterval(todoRepeat)"
            />
            <span class="interval-suffix">{{ INTERVAL_LIMITS[todoRepeat]?.unit }}</span>
            <span class="interval-hint">{{ INTERVAL_LIMITS[todoRepeat]?.min }}-{{ INTERVAL_LIMITS[todoRepeat]?.max }}{{ INTERVAL_LIMITS[todoRepeat]?.unit }}</span>
          </div>

          <div v-if="todoRepeat !== 'none'" class="interval-row">
          <label class="interval-prefix" for="end-date">结束</label>
          <input type="date" id="end-date" v-model="endDate" class="interval-input date-input" />
          <span class="interval-hint">可选</span>
        </div>

        <div class="holiday-section">
          <label class="section-label">⛔ 避开节假日</label>
          <label class="switch-label">
            <input type="checkbox" v-model="skipHolidays" class="holiday-switch" />
            <span class="switch-slider"></span>
            <span class="switch-text">{{ skipHolidays ? '已开启' : '未开启' }}</span>
          </label>
          <p v-if="skipHolidays" class="holiday-hint">节假日将自动调整至前一工作日，并提前一天提醒</p>
        </div>
      </div>

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

        <div class="popup-actions">
          <button class="btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn-save" @click="handleSave">保存</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
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
const skipHolidays = ref(false);
const intervals = ref({ daily: 1, weekly: 1, monthly: 1, yearly: 1 });

// 重置表单状态
const resetForm = () => {
  skipHolidays.value = false;
  endDate.value = '';
  showPreview.value = false;
};

const handleSave = () => {
  if (!props.todoText?.trim()) return;
  if (props.todoRepeat !== 'none') validateInterval(props.todoRepeat);
  emit('save', {
    repeatType: props.todoRepeat,
    repeatInterval: currentInterval.value,
    endDate: endDate.value || undefined,
    skipHolidays: skipHolidays.value,
  });
  resetForm();
};

// 监听 selectedDate 变化（每次打开弹窗时会设置新日期）
watch(() => props.selectedDate, () => {
  resetForm();
});

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

onMounted(() => {
  nextTick(() => inputRef.value?.focus());
});
</script>

<style scoped>
/* ---- 节假日开关样式 ---- */
.holiday-section {
  margin: 10px 0 0;
  padding: 10px 12px;
  background: var(--hover-color);
  border-radius: 10px;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.holiday-switch {
  display: none;
}

.switch-slider {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--border-color);
  border-radius: 11px;
  transition: background 0.3s;
  flex-shrink: 0;
}

.switch-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.holiday-switch:checked + .switch-slider {
  background: var(--primary-color, #18a058);
}

.holiday-switch:checked + .switch-slider::before {
  transform: translateX(18px);
}

.switch-text {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.holiday-hint {
  margin: 6px 0 0;
  font-size: 0.72rem;
  color: var(--other-month-text);
}
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
  -webkit-overflow-scrolling: touch;
}

.drag-bar {
  display: none;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  margin: 8px auto 0;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 18px 0;
}
.popup-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1rem;
  -webkit-tap-highlight-color: transparent;
}
.close-btn:active {
  background: var(--hover-color);
}

.date-badge {
  margin: 10px 18px 0;
  padding: 5px 10px;
  background: var(--hover-color);
  border-radius: 7px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: inline-block;
  width: fit-content;
}

.todo-input {
  display: block;
  width: calc(100% - 36px);
  margin: 14px 18px;
  padding: 12px 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--card-background);
  color: var(--text-primary);
  -webkit-appearance: none;
}
.todo-input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 4px var(--form-input-focus-shadow);
}
.todo-input::placeholder {
  color: var(--other-month-text);
}

.repeat-section {
  margin: 0 18px 14px;
  padding: 12px;
  background: var(--hover-color);
  border-radius: 10px;
}
.section-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.repeat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.repeat-chip {
  padding: 7px 12px;
  border-radius: 18px;
  border: 1.5px solid var(--border-color);
  background: var(--card-background);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 500;
  -webkit-tap-highlight-color: transparent;
}
.repeat-chip:active {
  transform: scale(0.95);
}
.repeat-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  font-weight: 600;
}

.interval-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.interval-prefix {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 26px;
}
.interval-input {
  width: 58px;
  padding: 7px 8px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  background: var(--card-background);
  color: var(--text-primary);
  -webkit-appearance: none;
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
  font-size: 0.7rem;
  color: var(--other-month-text);
  margin-left: auto;
}

.preview-section {
  margin: 0 18px 14px;
}
.preview-toggle {
  width: 100%;
  padding: 9px;
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 8px;
  color: var(--preview-text);
  font-size: 0.8rem;
  -webkit-tap-highlight-color: transparent;
}
.preview-toggle:active {
  background: var(--preview-hover-bg);
}

.popup-actions {
  display: flex;
  gap: 8px;
  padding: 0 18px 18px;
}
.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}
.btn-cancel {
  background: var(--button-secondary-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.btn-cancel:active {
  background: var(--button-secondary-hover-bg);
}
.btn-save {
  background: var(--button-primary-bg);
  color: white;
  box-shadow: var(--shadow-sm);
}
.btn-save:active {
  background: var(--button-primary-hover-bg);
  transform: scale(0.97);
}

/* ---- 动画 ---- */
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

/* ========== 移动端 ========== */
@media (max-width: 768px) {
  .add-todo-popup {
    align-items: flex-end;
    padding: 0;
  }
  .popup-card {
    max-height: 92vh;
    max-height: 92dvh;
    border-radius: 18px 18px 0 0;
    max-width: 100%;
    width: 100%;
  }
  .drag-bar {
    display: block;
  }
  .popup-header {
    padding: 10px 16px 0;
  }
  .popup-header h2 {
    font-size: 1.05rem;
  }
  .date-badge {
    margin: 8px 16px 0;
    font-size: 0.78rem;
  }
  .todo-input {
    width: calc(100% - 32px);
    margin: 12px 16px;
    padding: 14px 14px;
    font-size: 1rem;
  }
  .repeat-section {
    margin: 0 16px 10px;
    padding: 10px;
  }
  .repeat-chip {
    padding: 8px 12px;
    font-size: 0.78rem;
    min-height: 36px;
  }
  .preview-section {
    margin: 0 16px 10px;
  }
  .preview-toggle {
    min-height: 44px;
  }
  .popup-actions {
    padding: 0 16px 14px;
    padding-bottom: max(14px, env(safe-area-inset-bottom));
    gap: 10px;
  }
  .btn-cancel,
  .btn-save {
    padding: 14px 14px;
    font-size: 0.95rem;
    min-height: 48px;
  }
}

@media (max-width: 380px) {
  .popup-card {
    max-height: 95vh;
    max-height: 95dvh;
  }
  .repeat-chips {
    gap: 4px;
  }
  .repeat-chip {
    padding: 7px 10px;
    font-size: 0.75rem;
    min-height: 34px;
  }
  .interval-input {
    width: 54px;
    padding: 8px 8px;
    font-size: 0.85rem;
    min-height: 36px;
  }
  .interval-prefix, .interval-suffix {
    font-size: 0.82rem;
  }
}
</style>
