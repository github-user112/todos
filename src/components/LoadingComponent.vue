<template>
  <Transition name="loading-fade">
    <div class="loading-overlay" v-if="show" @click.prevent>
      <div class="loading-container">
        <!-- 主加载动画：日历翻页效果 -->
        <div class="calendar-loader">
          <div class="calendar-ring ring-1"></div>
          <div class="calendar-ring ring-2"></div>
          <div class="calendar-ring ring-3"></div>
          <div class="calendar-core">
            <div class="flip-pages">
              <div class="page page-1">1</div>
              <div class="page page-2">2</div>
              <div class="page page-3">3</div>
            </div>
            <div class="calendar-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M3 10h18" stroke="currentColor" stroke-width="2"/>
                <path d="M8 2v4M16 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="8" cy="15" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 加载文字 -->
        <div class="loading-text-wrapper">
          <span class="loading-text">{{ text || t('加载中') }}</span>
          <span class="loading-dots">
            <span class="dot">.</span>
            <span class="dot">.</span>
            <span class="dot">.</span>
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { t } from '../utils/i18n.js';
defineProps({
  show: {
    type: Boolean,
    required: true,
    default: false
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
/* 进出动画 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.3s ease;
}
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

/* 遮罩层 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--loading-overlay-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

/* ============ 日历加载器 ============ */
.calendar-loader {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 外围旋转光环 —— 双色雅致方案，全部取自主题令牌 */
.calendar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: ring-spin 3s linear infinite;
}

.ring-1 {
  width: 120px;
  height: 120px;
  border-top-color: var(--loading-spinner-border-top);
  border-right-color: var(--loading-spinner-border-top);
  opacity: 0.35;
}

.ring-2 {
  width: 100px;
  height: 100px;
  border-top-color: var(--loading-spinner-border);
  border-bottom-color: var(--loading-spinner-border);
  animation-direction: reverse;
  animation-duration: 2s;
  opacity: 0.6;
}

.ring-3 {
  width: 80px;
  height: 80px;
  border-left-color: var(--primary-dark);
  border-bottom-color: var(--primary-dark);
  animation-duration: 1.5s;
  opacity: 0.75;
}

@keyframes ring-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 核心区域 */
.calendar-core {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--card-background);
  border-radius: 16px;
  box-shadow:
    0 8px 24px -8px var(--form-input-focus-shadow),
    inset 0 0 0 1px var(--border-color);
  animation: core-pulse 2s ease-in-out infinite;
}

@keyframes core-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 8px 24px -8px var(--form-input-focus-shadow),
      inset 0 0 0 1px var(--border-color);
  }
  50% {
    transform: scale(1.05);
    box-shadow:
      0 12px 32px -8px var(--form-input-focus-shadow),
      inset 0 0 0 1px var(--primary-color);
  }
}

/* 日历图标 */
.calendar-icon {
  width: 32px;
  height: 32px;
  color: var(--primary-color);
}

.calendar-icon svg {
  width: 100%;
  height: 100%;
}

/* 翻页数字 */
.flip-pages {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 24px;
  height: 24px;
}

.page {
  position: absolute;
  width: 24px;
  height: 24px;
  background: var(--primary-color);
  color: #fff;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  animation: page-flip 1.5s ease-in-out infinite;
  backface-visibility: hidden;
  opacity: 0;
  box-shadow: 0 4px 10px -3px var(--form-input-focus-shadow);
}

.page-1 { animation-delay: 0s; }
.page-2 { animation-delay: 0.5s; }
.page-3 { animation-delay: 1s; }

@keyframes page-flip {
  0% {
    opacity: 0;
    transform: rotateX(-90deg) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: rotateX(0deg) scale(1);
  }
  80% {
    opacity: 1;
    transform: rotateX(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotateX(90deg) scale(0.8);
  }
}

/* ============ 加载文字 ============ */
.loading-text-wrapper {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 15px;
  font-weight: 500;
  color: var(--loading-text);
  letter-spacing: 0.5px;
}

.loading-text {
  background: linear-gradient(
    90deg,
    var(--text-primary) 0%,
    var(--primary-color) 50%,
    var(--text-primary) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: text-shimmer 2s ease-in-out infinite;
}

@keyframes text-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.loading-dots {
  display: flex;
}

.dot {
  animation: dot-bounce 1.4s ease-in-out infinite;
  opacity: 0;
  color: var(--primary-color);
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% {
    opacity: 0;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

/* ============ 响应式 ============ */
@media (max-width: 768px) {
  .calendar-loader {
    width: 100px;
    height: 100px;
  }

  .ring-1 { width: 100px; height: 100px; }
  .ring-2 { width: 84px; height: 84px; }
  .ring-3 { width: 68px; height: 68px; }

  .calendar-core {
    width: 48px;
    height: 48px;
    border-radius: 13px;
  }

  .calendar-icon {
    width: 26px;
    height: 26px;
  }

  .loading-text-wrapper {
    font-size: 14px;
  }
}
</style>
