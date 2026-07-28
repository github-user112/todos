<template>
  <div v-if="active" class="celebration-layer" aria-hidden="true">
    <!-- 彩色纸屑 -->
    <template v-if="effect === 'confetti' || effect === 'all'">
      <span
        v-for="(p, i) in confettiParticles"
        :key="'c' + i"
        class="confetti"
        :style="p.style"
      ></span>
    </template>
    <!-- 星星粒子 -->
    <template v-if="effect === 'stars' || effect === 'all'">
      <span
        v-for="(s, i) in starParticles"
        :key="'s' + i"
        class="star"
        :style="s.style"
      >✨</span>
    </template>
    <!-- 彩虹光波 -->
    <template v-if="effect === 'rainbow' || effect === 'all'">
      <div class="rainbow-wave"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  // 触发令牌：每次变化即触发一次动效
  trigger: { type: Number, default: 0 },
  // 动效风格：'confetti' | 'stars' | 'rainbow' | 'all' | 'none'
  effect: { type: String, default: 'confetti' },
  // 起点位置（相对视口），默认中央上方
  originX: { type: Number, default: 50 },
  originY: { type: Number, default: 50 },
});

const active = ref(false);
const confettiParticles = ref([]);
const starParticles = ref([]);
let timer = null;

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316'];

function buildConfetti() {
  const arr = [];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const distance = 80 + Math.random() * 140;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 60; // 略向上
    const rot = Math.random() * 720 - 360;
    const color = COLORS[i % COLORS.length];
    const size = 6 + Math.random() * 6;
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
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const distance = 60 + Math.random() * 100;
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
        fontSize: `${14 + Math.random() * 10}px`,
      },
    });
  }
  return arr;
}

watch(
  () => props.trigger,
  (val) => {
    if (!val || props.effect === 'none') return;
    confettiParticles.value = buildConfetti();
    starParticles.value = buildStars();
    active.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      active.value = false;
    }, 1800);
  },
);

defineExpose({
  burst() {
    confettiParticles.value = buildConfetti();
    starParticles.value = buildStars();
    active.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      active.value = false;
    }, 1800);
  },
});
</script>

<style scoped>
.celebration-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5500;
  overflow: hidden;
}

/* 彩色纸屑 */
.confetti {
  position: absolute;
  border-radius: 2px;
  transform: translate(-50%, -50%);
  animation: confetti-burst 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
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
  left: 50%;
  top: 50%;
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
