<template>
  <Transition name="festival-banner">
    <div
      v-if="visible && festivalInfo"
      class="festival-banner"
      :class="{ 'is-today': festivalInfo.isToday }"
    >
      <div class="banner-content">
        <span class="festival-emoji">{{ festivalInfo.def.emoji }}</span>
        <div class="festival-text">
          <template v-if="festivalInfo.isToday">
            <span class="festival-name">今天是 {{ festivalInfo.def.name }}！</span>
            <span class="festival-desc">{{ festivalGreeting }}</span>
          </template>
          <template v-else>
            <span class="festival-name">
              距{{ festivalInfo.def.name }}还有
              <strong>{{ festivalInfo.daysLeft }}</strong> 天
            </span>
            <span class="festival-desc">{{ festivalDateStr }}</span>
          </template>
        </div>
      </div>
      <button class="banner-close" @click="dismiss" aria-label="关闭">×</button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ensureLunarLoaded } from '../utils/lunarUtils';
import { getUpcomingFestival } from '../utils/festivalUtils';

const visible = ref(false);
const festivalInfo = ref(null);
const dismissedKey = ref('');

const festivalGreeting = computed(() => {
  if (!festivalInfo.value) return '';
  const greetings = {
    spring_festival: '新年快乐！万事如意 🎉',
    lantern: '元宵节快乐！团团圆圆 🏮',
    qingming: '清明时节，追思踏青 🍃',
    dragon_boat: '端午安康！粽叶飘香 🐉',
    qixi: '七夕快乐！有情人终成眷属 💕',
    mid_autumn: '中秋快乐！阖家团圆 🌕',
    double_ninth: '重阳安康！登高望远 🌼',
    new_year_eve: '除夕快乐！辞旧迎新 🎆',
    new_year: '元旦快乐！新年新气象 🎊',
    national_day: '国庆快乐！繁荣昌盛 🇨🇳',
    christmas: '圣诞快乐！🎄',
  };
  return greetings[festivalInfo.value.def.key] || '节日快乐！';
});

const festivalDateStr = computed(() => {
  if (!festivalInfo.value) return '';
  const d = festivalInfo.value.date;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});

const checkFestival = async () => {
  try {
    await ensureLunarLoaded();
    const info = getUpcomingFestival();
    if (!info) return;

    // 如果是今天，或者 30 天内，显示
    if (info.isToday || info.daysLeft <= 30) {
      // 检查是否被用户关闭过（按日期+节日key）
      const dismissKey = `festival_dismissed_${info.def.key}_${formatDateKey(new Date())}`;
      try {
        if (info.isToday && localStorage.getItem(dismissKey) === '1') return;
      } catch {}

      festivalInfo.value = info;
      visible.value = true;
      dismissedKey.value = dismissKey;
    }
  } catch (e) {
    console.warn('节日倒计时检查失败:', e);
  }
};

const dismiss = () => {
  visible.value = false;
  // 仅在节日当天关闭时记录，避免每天弹
  if (festivalInfo.value?.isToday && dismissedKey.value) {
    try {
      localStorage.setItem(dismissedKey.value, '1');
    } catch {}
  }
};

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

onMounted(() => {
  // 延迟 1s 避免与初始化抢资源
  setTimeout(checkFestival, 1000);
});
</script>

<style scoped>
.festival-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  margin: 0 0 6px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-light, #e0e7ff), var(--card-background, #fff));
  border: 1px solid var(--primary-color, #6366f1);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  animation: banner-glow 3s ease-in-out infinite;
}

@keyframes banner-glow {
  0%, 100% { box-shadow: 0 0 0 0 var(--form-input-focus-shadow, rgba(99,102,241,0.1)); }
  50% { box-shadow: 0 0 12px 2px var(--form-input-focus-shadow, rgba(99,102,241,0.15)); }
}

.festival-banner.is-today {
  background: linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.05));
  border-color: var(--danger-color, #ef4444);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.festival-emoji {
  font-size: 1.6rem;
  line-height: 1;
  flex-shrink: 0;
  animation: emoji-bounce 2s ease-in-out infinite;
}

@keyframes emoji-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.festival-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.festival-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.festival-name strong {
  color: var(--danger-color, #e11d48);
  font-size: 1.05rem;
  margin: 0 2px;
}

.festival-desc {
  font-size: 0.72rem;
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-close {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
  font-size: 1.1rem;
  line-height: 1;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.banner-close:active {
  background: var(--hover-color, #f1f5f9);
  transform: scale(0.9);
}

/* 动画 */
.festival-banner-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.festival-banner-leave-active {
  transition: all 0.3s ease;
}
.festival-banner-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
.festival-banner-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

@media (max-width: 380px) {
  .festival-banner {
    padding: 6px 10px;
    border-radius: 10px;
  }
  .festival-emoji {
    font-size: 1.3rem;
  }
  .festival-name {
    font-size: 0.78rem;
  }
  .festival-desc {
    font-size: 0.68rem;
  }
}
</style>
