<template>
  <div
    ref="root"
    class="date-jump"
    role="dialog"
    :aria-label="t('快速跳转年月')"
    @click.stop
  >
    <!-- 年份导航：月份面板下 ±1 年，年份面板下 ±10 年 -->
    <div class="jump-header">
      <button
        class="jump-nav"
        :aria-label="mode === 'month' ? t('上一年') : t('上一个十年')"
        @click="shift(-1)"
      >
        <svg
          width="16"
          height="16"
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
      <button
        class="jump-label"
        :title="mode === 'month' ? t('选择年份') : t('选择月份')"
        @click="toggleMode"
      >
        {{ label }}
      </button>
      <button
        class="jump-nav"
        :aria-label="mode === 'month' ? t('下一年') : t('下一个十年')"
        @click="shift(1)"
      >
        <svg
          width="16"
          height="16"
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
    </div>

    <!-- 月份面板 -->
    <div v-if="mode === 'month'" class="jump-grid month-grid">
      <button
        v-for="m in 12"
        :key="m"
        :class="['jump-cell', { active: isCurrentMonth(m - 1) }]"
        @click="pickMonth(m - 1)"
      >
        {{ monthLabel(m - 1) }}
      </button>
    </div>

    <!-- 年份面板 -->
    <div v-else class="jump-grid year-grid">
      <button
        v-for="y in years"
        :key="y"
        :class="['jump-cell', { active: y === viewYear, now: y === year }]"
        @click="pickYear(y)"
      >
        {{ y }}
      </button>
    </div>

    <div class="jump-footer">
      <button class="jump-today" @click="$emit('today')">
        {{ t('今天') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { t, tMonth, isEn } from '../utils/i18n.js';
import { decadeYears } from '../utils/quickJump.js';

const props = defineProps({
  /** 当前展示的年（0-11 月与年一起用于高亮） */
  year: { type: Number, required: true },
  month: { type: Number, required: true },
});
const emit = defineEmits(['select', 'today', 'close']);

const root = ref(null);
const mode = ref('month'); // 'month' | 'year'
const viewYear = ref(props.year);

const label = computed(() =>
  mode.value === 'month'
    ? String(viewYear.value)
    : `${decadeYears(viewYear.value)[0]}–${decadeYears(viewYear.value)[9]}`,
);
const years = computed(() => decadeYears(viewYear.value));

const monthLabel = (m) => {
  const s = tMonth(m);
  return isEn() ? s.slice(0, 3) : s;
};
const isCurrentMonth = (m) => m === props.month && viewYear.value === props.year;

/** ‹ › 快速切换年份 / 十年区间 */
const shift = (dir) => {
  viewYear.value += mode.value === 'month' ? dir : dir * 10;
};
/** 点年份 → 年份面板；点十年区间 → 回到月份面板 */
const toggleMode = () => {
  mode.value = mode.value === 'month' ? 'year' : 'month';
};
const pickYear = (y) => {
  viewYear.value = y;
  mode.value = 'month';
};
const pickMonth = (m) => {
  emit('select', { year: viewYear.value, month: m });
};

const onKeydown = (e) => {
  if (e.key === 'Escape') emit('close');
};
// 点弹窗外任意处关闭（触发按钮有 @click.stop，不会走到这里）
const onDocClick = (e) => {
  if (root.value && !root.value.contains(e.target)) emit('close');
};

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKeydown);
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
/* ---- 弹窗：挂在标题下方，风格与抽屉/卡片一致 ---- */
.date-jump {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  z-index: 900;
  min-width: 248px;
  padding: 10px;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  text-align: left;
}

.jump-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.jump-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: var(--text-secondary);
  transition: background 0.15s ease, color 0.15s ease;
}
.jump-nav:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

.jump-label {
  flex: 1;
  height: 30px;
  border-radius: 9px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
  transition: background 0.15s ease;
}
.jump-label:hover {
  background: var(--hover-color);
  color: var(--primary-color);
}

.jump-grid {
  display: grid;
  gap: 5px;
}
.month-grid {
  grid-template-columns: repeat(4, 1fr);
}
.year-grid {
  grid-template-columns: repeat(5, 1fr);
}

.jump-cell {
  padding: 9px 0;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
}
.jump-cell:hover {
  background: var(--hover-color);
}
.jump-cell:active {
  transform: scale(0.95);
}
.jump-cell.active {
  background: var(--primary-color);
  color: #fff;
}
.jump-cell.now:not(.active) {
  box-shadow: inset 0 0 0 1px var(--primary-color);
}

.jump-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}
.jump-today {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #fff;
  background: var(--button-primary-bg);
  transition: background 0.15s ease, transform 0.1s ease;
}
.jump-today:hover {
  background: var(--button-primary-hover-bg);
}
.jump-today:active {
  transform: scale(0.95);
}

/* ---- 进出动画 ---- */
.jump-enter-active,
.jump-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.jump-enter-from,
.jump-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- 移动端：更大的点按目标 ---- */
@media (max-width: 768px) {
  .date-jump {
    min-width: 232px;
    padding: 9px;
    border-radius: 13px;
  }
  .jump-cell {
    padding: 11px 0;
    font-size: 0.85rem;
  }
  .jump-nav,
  .jump-label {
    height: 34px;
  }
}
</style>
