<!-- 重复事件预览组件 -->
<template>
  <div class="repeat-preview" v-if="showPreview">
    <div class="preview-header">
      <h4>重复预览</h4>
      <button @click="$emit('close')" class="close-btn">&times;</button>
    </div>
    <div class="preview-content">
      <div class="original-date">
        <strong>原始日期:</strong> {{ formatPreviewDate(baseDate) }}
      </div>
      <div class="repeat-setting">
        <strong>重复设置:</strong> {{ repeatDescription }}
      </div>
      <div class="next-occurrences" v-if="nextDates.length > 0">
        <strong>接下来几次重复:</strong>
        <ul>
          <li v-for="(date, index) in nextDates" :key="index">
            {{ formatPreviewDate(date) }} ({{ getWeekday(date) }})
          </li>
        </ul>
      </div>
      <div class="no-preview" v-else>
        <em>无重复或无法生成预览</em>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
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
    return '不重复';
  }

  const interval = props.repeatInterval;
  const typeMap = {
    daily: interval === 1 ? '每天' : `每${interval}天`,
    weekly: interval === 1 ? '每周' : `每${interval}周`,
    monthly: interval === 1 ? '每月' : `每${interval}个月`,
    yearly: interval === 1 ? '每年' : `每${interval}年`,
  };

  return typeMap[props.repeatType] || '未知重复类型';
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
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 获取星期几
const getWeekday = (date) => {
  const weekdays = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
  ];
  return weekdays[date.getDay()];
};
</script>

<style scoped>
.repeat-preview {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  background: var(--background-color);
  border-bottom: 1px solid var(--border-color);
  border-radius: 8px 8px 0 0;
}

.preview-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
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
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 16px 16px 0 0;
    max-height: 50vh;
  }

  .preview-header {
    border-radius: 16px 16px 0 0;
  }
}
</style>
