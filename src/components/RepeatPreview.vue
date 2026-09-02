<!-- 重复事件预览组件 -->
<template>
  <div class="repeat-preview" v-if="showPreview">
    <div class="preview-header">
      <h4>{{ t('重复预览') }}</h4>
      <button @click="$emit('close')" class="close-btn">&times;</button>
    </div>
    <div class="preview-content">
      <div class="original-date">
        <strong>{{ t('原始日期:') }}</strong> {{ formatPreviewDate(baseDate) }}
      </div>
      <div class="repeat-setting">
        <strong>{{ t('重复设置:') }}</strong> {{ repeatDescription }}
      </div>
      <div class="next-occurrences" v-if="nextDates.length > 0">
        <strong>{{ t('接下来几次重复:') }}</strong>
        <ul>
          <li v-for="(date, index) in nextDates" :key="index">
            {{ tf('{date} ({weekday})', { date: formatPreviewDate(date), weekday: getWeekday(date) }) }}
          </li>
        </ul>
      </div>
      <div class="no-preview" v-else>
        <em>{{ t('无重复或无法生成预览') }}</em>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { t, tf } from '../utils/i18n.js';
import { getNextRepeatDatesWithEndDate } from '../utils/repeatUtils';

const props = defineProps({
  showPreview: {
    type: Boolean,
    default: false,
  },
  baseDate: {
    type: Date,
    required: true,
  },
  repeatType: {
    type: String,
    required: true,
  },
  repeatInterval: {
    type: Number,
    default: 1,
  },
  endDate: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close']);

// 计算重复描述
const repeatDescription = computed(() => {
  if (props.repeatType === 'none') {
    return t('不重复');
  }

  const interval = props.repeatInterval;
  const typeMap = {
    daily: interval === 1 ? t('每天') : tf('每{interval}天', { interval }),
    weekly: interval === 1 ? t('每周') : tf('每{interval}周', { interval }),
    monthly: interval === 1 ? t('每月') : tf('每{interval}个月', { interval }),
    yearly: interval === 1 ? t('每年') : tf('每{interval}年', { interval }),
  };

  return typeMap[props.repeatType] || t('未知重复类型');
});

// 计算下次重复日期
const nextDates = computed(() => {
  if (props.repeatType === 'none') {
    return [];
  }

  try {
    return getNextRepeatDatesWithEndDate(
      new Date(props.baseDate),
      props.repeatType,
      props.repeatInterval,
      4,
      props.endDate
    );
  } catch (error) {
    console.error('生成重复日期预览失败:', error);
    return [];
  }
});

// 格式化日期显示
const formatPreviewDate = (date) => {
  if (!date) return '';
  date = new Date(date);
  return tf('{year}年{month}月{day}日', { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
};

// 获取星期几
const getWeekday = (date) => {
  const weekdays = [
    t('星期日'),
    t('星期一'),
    t('星期二'),
    t('星期三'),
    t('星期四'),
    t('星期五'),
    t('星期六'),
  ];
  return weekdays[date.getDay()];
};
</script>

<style scoped>
.repeat-preview {
  background: var(--card-background);
  border: 1px solid var(--preview-border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: var(--preview-bg);
  border-bottom: 1px solid var(--preview-border);
  border-radius: 13px 13px 0 0;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--preview-text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--text-primary);
}

.preview-content {
  padding: 15px;
}

.original-date,
.repeat-setting {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.next-occurrences {
  margin-top: 12px;
}

.next-occurrences strong {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

.next-occurrences ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.next-occurrences li {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.no-preview {
  text-align: center;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 10px 0;
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .repeat-preview {
    max-height: 250px;
    margin-top: 8px;
  }

  .preview-header {
    padding: 10px 14px;
  }

  .preview-header h4 {
    font-size: 13px;
  }

  .preview-content {
    padding: 12px;
  }

  .original-date,
  .repeat-setting {
    font-size: 12px;
  }

  .next-occurrences li {
    font-size: 11px;
  }
}
</style>
