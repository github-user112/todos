<template>
  <div class="celebration-layer" aria-hidden="true">
    <!-- 彩色纸屑 -->
    <template v-if="effect === 'confetti' || effect === 'all'">
      <span
        v-for="(p, i) in confettiParticles"
        :key="`c${burstId}-${i}`"
        class="confetti"
        :style="p.style"
      ></span>
    </template>
    <!-- 星星粒子 -->
    <template v-if="effect === 'stars' || effect === 'all'">
      <span
        v-for="(s, i) in starParticles"
        :key="`s${burstId}-${i}`"
        class="star"
        :style="s.style"
        >✨</span
      >
    </template>
    <!-- 彩虹光波 -->
    <template v-if="effect === 'rainbow' || effect === 'all'">
      <div class="rainbow-wave" :style="rainbowStyle"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  trigger: { type: Number, default: 0 },
  effect: { type: String, default: 'confetti' },
  originX: { type: Number, default: 50 },
  originY: { type: Number, default: 50 },
});

const confettiParticles = ref([]);
const starParticles = ref([]);
const burstId = ref(0);
let timer = null;

const COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
];

const rainbowStyle = computed(() => ({
  left: `${props.originX}%`,
  top: `${props.originY}%`,
}));

function buildConfetti() {
  const arr = [];
  const count = 52;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const distance = 100 + Math.random() * 180;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 80;
    const rot = Math.random() * 720 - 360;
    const color = COLORS[i % COLORS.length];
    const size = 10 + Math.random() * 10;
    arr.push({
      style: {
        left: `${props.originX}%`,
        top: `${props.originY}%`,
        width: `${size}px`,
        height: `${size * 0.5}px`,
        background: color,
        '--dx': `${dx}px`,
        '--dy': `${dy}px`,
        '--rot': `${rot}deg`,
        animationDelay: `${Math.random() * 0.1}s`,
      },
    });
  }
  return arr;
}

function buildStars() {
  const arr = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const distance = 70 + Math.random() * 120;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const scale = 0.8 + Math.random() * 1.2;
    arr.push({
      style: {
        left: `${props.originX}%`,
        top: `${props.originY}%`,
        '--dx': `${dx}px`,
        '--dy': `${dy}px`,
        '--scale': scale,
        animationDelay: `${Math.random() * 0.15}s`,
        fontSize: `${18 + Math.random() * 14}px`,
      },
    });
  }
  return arr;
}

function burst() {
  if (props.effect === 'none') return;
  // 递增 burstId 强制 v-for 重新创建 DOM 元素，确保 CSS 动画重播
  burstId.value++;
  confettiParticles.value = buildConfetti();
  starParticles.value = buildStars();
  clearTimeout(timer);
  // 1.8 秒后清空粒子（动画 1.6 秒 + 缓冲）
  timer = setTimeout(() => {
    confettiParticles.value = [];
    starParticles.value = [];
  }, 1800);
}

watch(
  () => props.trigger,
  (val) => {
    if (!val) return;
    burst();
  },
);

defineExpose({ burst });
</script>

<style>
.celebration-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

/* 彩色纸屑 */
.confetti {
  position: absolute;
  border-radius: 2px;
  transform: translate(-50%, -50%);
  animation: confetti-burst 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 1;
}

@keyframes confetti-burst {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 120px))
      rotate(var(--rot)) scale(0.4);
  }
}

/* 星星粒子 */
.star {
  position: absolute;
  transform: translate(-50%, -50%) scale(0);
  animation: star-burst 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  will-change: transform, opacity;
}

@keyframes star-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  20% {
    opacity: 1;
    transform: translate(calc(-50% + var(--dx) * 0.3), calc(-50% + var(--dy) * 0.3))
      scale(var(--scale));
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))
      scale(calc(var(--scale) * 0.3));
  }
}

/* 彩虹光波 */
.rainbow-wave {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: conic-gradient(
    from 0deg,
    #ef4444,
    #f59e0b,
    #10b981,
    #3b82f6,
    #8b5cf6,
    #ec4899,
    #ef4444
  );
  animation: rainbow-expand 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  filter: blur(2px);
}

@keyframes rainbow-expand {
  0% {
    opacity: 0.9;
    width: 20px;
    height: 20px;
  }
  100% {
    opacity: 0;
    width: 600px;
    height: 600px;
  }
}
</style>
