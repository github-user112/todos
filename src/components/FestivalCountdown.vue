<template>
  <Transition name="festival-chip">
    <span
      v-if="visible && festivalInfo"
      class="festival-chip"
      :class="{ 'is-today': festivalInfo.isToday }"
      @click="dismiss"
      :title="festivalInfo.isToday ? festivalGreeting : tf('{name} ({date})', { name: t(festivalInfo.def.name), date: festivalDateStr })"
    >
      <span class="chip-emoji">{{ festivalInfo.def.emoji }}</span>
      <template v-if="festivalInfo.isToday">
        <span class="chip-text">{{ tf('今天是{name}', { name: t(festivalInfo.def.name) }) }}</span>
      </template>
      <template v-else>
        <span class="chip-text">
          {{ tf('距{name}还有 {days} 天', { name: t(festivalInfo.def.name), days: festivalInfo.daysLeft }) }}
        </span>
      </template>
    </span>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { t, tf } from '../utils/i18n.js';
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
  return t(greetings[festivalInfo.value.def.key] || '节日快乐！');
});

const festivalDateStr = computed(() => {
  if (!festivalInfo.value) return '';
  const d = festivalInfo.value.date;
  return tf('{month}月{day}日', { month: d.getMonth() + 1, day: d.getDate() });
});

const checkFestival = async () => {
  try {
    await ensureLunarLoaded();
    const info = getUpcomingFestival();
    if (!info) return;

    // 如果是今天，或者 30 天内，显示
    if (info.isToday || info.daysLeft <= 30) {
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
  setTimeout(checkFestival, 1000);
});
</script>

<style scoped>
.festival-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  animation: chip-glow 3s ease-in-out infinite;
}

@keyframes chip-glow {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 2px 10px -2px var(--form-input-focus-shadow); }
}

.festival-chip.is-today {
  background: color-mix(in srgb, var(--danger-color) 10%, transparent);
  border-color: color-mix(in srgb, var(--danger-color) 40%, transparent);
  color: var(--danger-color);
}

.chip-emoji {
  font-size: 0.95rem;
  line-height: 1;
  animation: emoji-bounce 2s ease-in-out infinite;
}

@keyframes emoji-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

.chip-text strong {
  color: var(--danger-color);
  font-size: 0.9rem;
  margin: 0 1px;
}

.festival-chip:active {
  transform: scale(0.95);
}

/* 动画 */
.festival-chip-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.festival-chip-leave-active {
  transition: all 0.3s ease;
}
.festival-chip-enter-from {
  opacity: 0;
  transform: scale(0.7);
}
.festival-chip-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

@media (max-width: 380px) {
  .festival-chip {
    padding: 4px 8px;
    font-size: 0.7rem;
    border-radius: 8px;
  }
  .chip-emoji {
    font-size: 0.85rem;
  }
}
</style>
