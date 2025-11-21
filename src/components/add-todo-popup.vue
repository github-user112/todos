<template>
  <div class="add-todo-popup">
    <div class="popup-content">
      <h2>添加待办事项</h2>
      <input
        type="text"
        :value="todoText"
        @input="$emit('update:todoText', $event.target.value)"
        placeholder="待办事项"
      />

      <!-- 重复类型选择 -->
      <div class="repeat-section">
        <label class="section-label">重复设置</label>

        <!-- 不重复选项 -->
        <div class="repeat-option" @click="updateRepeatType('none')">
          <input
            type="radio"
            id="repeat-none"
            value="none"
            :checked="todoRepeat === 'none'"
            @change="updateRepeatType('none')"
          />
          <label for="repeat-none">不重复</label>
        </div>

        <!-- 每天选项 -->
        <div class="repeat-option" @click="updateRepeatType('daily')">
          <input
            type="radio"
            id="repeat-daily"
            value="daily"
            :checked="todoRepeat === 'daily'"
            @change="updateRepeatType('daily')"
          />
          <label for="repeat-daily">每</label>
          <input
            type="number"
            v-model.number="intervals.daily"
            :disabled="todoRepeat !== 'daily'"
            min="1"
            max="365"
            class="interval-input"
            @blur="validateInterval('daily')"
          />
          <label>天</label>
          <span class="hint" v-if="todoRepeat === 'daily'">(1-365天)</span>
        </div>

        <!-- 每周选项 -->
        <div class="repeat-option" @click="updateRepeatType('weekly')">
          <input
            type="radio"
            id="repeat-weekly"
            value="weekly"
            :checked="todoRepeat === 'weekly'"
            @change="updateRepeatType('weekly')"
          />
          <label for="repeat-weekly">每</label>
          <input
            type="number"
            v-model.number="intervals.weekly"
            :disabled="todoRepeat !== 'weekly'"
            min="1"
            max="52"
            class="interval-input"
            @blur="validateInterval('weekly')"
          />
          <label>周</label>
          <span class="hint" v-if="todoRepeat === 'weekly'">(1-52周)</span>
        </div>

        <!-- 每月选项 -->
        <div class="repeat-option" @click="updateRepeatType('monthly')">
          <input
            type="radio"
            id="repeat-monthly"
            value="monthly"
            :checked="todoRepeat === 'monthly'"
            @change="updateRepeatType('monthly')"
          />
          <label for="repeat-monthly">每</label>
          <input
            type="number"
            v-model.number="intervals.monthly"
            :disabled="todoRepeat !== 'monthly'"
            min="1"
            max="12"
            class="interval-input"
            @blur="validateInterval('monthly')"
          />
          <label>个月</label>
          <span class="hint" v-if="todoRepeat === 'monthly'">(1-12个月)</span>
        </div>

        <!-- 每年选项 -->
        <div class="repeat-option" @click="updateRepeatType('yearly')">
          <input
            type="radio"
            id="repeat-yearly"
            value="yearly"
            :checked="todoRepeat === 'yearly'"
            @change="updateRepeatType('yearly')"
          />
          <label for="repeat-yearly">每</label>
          <input
            type="number"
            v-model.number="intervals.yearly"
            :disabled="todoRepeat !== 'yearly'"
            min="1"
            max="10"
            class="interval-input"
            @blur="validateInterval('yearly')"
          />
          <label>年</label>
          <span class="hint" v-if="todoRepeat === 'yearly'">(1-10年)</span>
        </div>

        <!-- 结束日期选项 -->
        <div class="repeat-option" v-if="todoRepeat !== 'none'">
          <label for="end-date">结束日期:</label>
          <input
            type="date"
            id="end-date"
            v-model="endDate"
            class="end-date-input"
          />
          <span class="hint">(可选)</span>
        </div>
      </div>

      <!-- 重复预览 -->
      <div class="preview-container" v-if="todoRepeat !== 'none'">
        <button type="button" @click="togglePreview" class="preview-toggle">
          {{ showPreview ? '隐藏预览' : '显示预览' }}
        </button>

        <RepeatPreview
          :showPreview="showPreview"
          :baseDate="selectedDate"
          :repeatType="todoRepeat"
          :repeatInterval="currentInterval"
          @close="showPreview = false"
        />
      </div>

      <div class="button-group">
        <button @click="handleSave" class="save-button">保存</button>
        <button @click="$emit('close')" class="cancel-button">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import RepeatPreview from './RepeatPreview.vue';

const props = defineProps({
  todoText: {
    type: String,
    required: true,
  },
  todoRepeat: {
    type: String,
    required: true,
  },
  selectedDate: {
    type: Date,
    default: () => new Date(),
  },
});

const emit = defineEmits([
  'update:todoText',
  'update:todoRepeat',
  'save',
  'close',
]);

// 各类型的间隔值
const intervals = ref({
  daily: 1,
  weekly: 1,
  monthly: 1,
  yearly: 1,
});

// 结束日期
const endDate = ref('');

// 预览显示状态
const showPreview = ref(false);

// 间隔限制配置
const INTERVAL_LIMITS = {
  daily: { min: 1, max: 365, unit: '天' },
  weekly: { min: 1, max: 52, unit: '周' },
  monthly: { min: 1, max: 12, unit: '个月' },
  yearly: { min: 1, max: 10, unit: '年' },
};

// 计算当前活跃的间隔值
const currentInterval = computed(() => {
  return props.todoRepeat === 'none' ? 1 : intervals.value[props.todoRepeat];
});

// 构造重复配置
const repeatConfig = computed(() => {
  return {
    type: props.todoRepeat,
    interval: currentInterval.value,
  };
});

// 切换预览显示
const togglePreview = () => {
  showPreview.value = !showPreview.value;
};

// 更新重复类型
const updateRepeatType = (type) => {
  emit('update:todoRepeat', type);

  // 选择重复类型时自动聚焦到输入框
  if (type !== 'none') {
    setTimeout(() => {
      const input = document.querySelector(`#repeat-${type} + label + input`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  // 重置预览状态
  showPreview.value = false;
};

// 验证间隔值
const validateInterval = (type) => {
  const limit = INTERVAL_LIMITS[type];
  const currentValue = intervals.value[type];

  if (currentValue < limit.min) {
    intervals.value[type] = limit.min;
  } else if (currentValue > limit.max) {
    intervals.value[type] = limit.max;
  }

  // 间隔值变化时更新预览
  if (showPreview.value) {
    // 稍后更新预览，让用户看到变化
    setTimeout(() => {
      showPreview.value = true;
    }, 50);
  }
};

// 处理保存
const handleSave = () => {
  // 验证待办事项名称不为空
  if (!props.todoText || !props.todoText.trim()) {
    alert('请输入待办事项名称');
    return;
  }

  // 验证间隔值
  if (props.todoRepeat !== 'none') {
    validateInterval(props.todoRepeat);
  }

  // 发送保存事件，带上间隔信息和结束日期
  emit('save', {
    repeatType: props.todoRepeat,
    repeatInterval: currentInterval.value,
    endDate: endDate.value || undefined,
  });
};
</script>

<style scoped>
.add-todo-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
}

.popup-content {
  background: var(--card-background);
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.popup-content h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 1.4rem;
  text-align: center;
}

.popup-content input[type='text'] {
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background: var(--card-background);
  color: var(--text-primary);
}

.popup-content input[type='text']:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
}

/* 重复设置区域 */
.repeat-section {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--background-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.section-label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  font-size: 14px;
}

.repeat-option {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.repeat-option:hover {
  background: rgba(74, 108, 247, 0.05);
}

.repeat-option input[type='radio'] {
  margin-right: 8px;
  cursor: pointer;
  pointer-events: none;
}

.repeat-option label {
  margin-right: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  min-width: fit-content;
  user-select: none;
}

.interval-input {
  width: 60px;
  padding: 4px 8px;
  margin: 0 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  text-align: center;
  font-size: 14px;
  transition: all 0.2s;
  background: var(--card-background);
  color: var(--text-primary);
}

.interval-input:enabled {
  border-color: var(--button-primary-bg);
  background: var(--card-background);
}

.interval-input:disabled {
  background: var(--hover-color);
  color: var(--text-secondary);
  cursor: not-allowed;
}

.interval-input:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
}

.end-date-input {
  margin-left: 8px;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  background: var(--card-background);
  color: var(--text-primary);
}

.end-date-input:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
  font-style: italic;
}

/* 预览区域 */
.preview-container {
  position: relative;
  margin-bottom: 15px;
}

.preview-toggle {
  width: 100%;
  padding: 8px 12px;
  background: var(--preview-bg);
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  color: var(--preview-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-toggle:hover {
  background: var(--preview-hover-bg);
  border-color: var(--preview-hover-border);
}

.button-group {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
}

.save-button,
.cancel-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.save-button {
  background: var(--button-primary-bg);
  color: white;
}

.cancel-button {
  background: var(--button-secondary-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.save-button:hover {
  background: var(--button-primary-hover-bg);
  transform: translateY(-1px);
}

.cancel-button:hover {
  background: var(--button-secondary-hover-bg);
  transform: translateY(-1px);
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .popup-content {
    width: 95%;
    padding: 16px;
    max-height: 90vh;
  }

  .repeat-option {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .interval-input {
    width: 50px;
    margin: 2px 4px;
  }

  .hint {
    flex-basis: 100%;
    margin-left: 28px;
    margin-top: 4px;
  }
}

@media (max-width: 480px) {
  .popup-content {
    width: 98%;
    padding: 12px;
  }

  .repeat-section {
    padding: 10px;
  }

  .button-group {
    flex-direction: column;
  }
}
</style>
