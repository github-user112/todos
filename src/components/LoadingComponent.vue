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
          <span class="loading-text">{{ text || '加载中' }}</span>
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
defineProps({
  show: {
    type: Boolean,
    required: true,
    default: false
  },
  text: {
    type: String,
    default: '加载中'
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
  background: var(--loading-overlay-bg, rgba(248, 250, 252, 0.95));
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

/* 外围旋转光环 */
.calendar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: ring-spin 3s linear infinite;
}

.ring-1 {
  width: 120px;
  height: 120px;
  border-top-color: var(--primary-color, #6366f1);
  border-right-color: var(--primary-color, #6366f1);
  opacity: 0.3;
}

.ring-2 {
  width: 100px;
  height: 100px;
  border-top-color: var(--primary-light, #e0e7ff);
  border-bottom-color: var(--primary-light, #e0e7ff);
  animation-direction: reverse;
  animation-duration: 2s;
  opacity: 0.5;
}

.ring-3 {
  width: 80px;
  height: 80px;
  border-left-color: var(--primary-dark, #4338ca);
  border-bottom-color: var(--primary-dark, #4338ca);
  animation-duration: 1.5s;
  opacity: 0.7;
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
  background: var(--card-background, #ffffff);
  border-radius: 14px;
  box-shadow: 
    0 4px 20px rgba(99, 102, 241, 0.15),
    0 0 0 1px var(--border-color, #e2e8f0);
  animation: core-pulse 2s ease-in-out infinite;
}

@keyframes core-pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 
      0 4px 20px rgba(99, 102, 241, 0.15),
      0 0 0 1px var(--border-color, #e2e8f0);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 
      0 8px 30px rgba(99, 102, 241, 0.25),
      0 0 0 2px var(--primary-color, #6366f1);
  }
}

/* 日历图标 */
.calendar-icon {
  width: 32px;
  height: 32px;
  color: var(--primary-color, #6366f1);
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
  background: var(--primary-color, #6366f1);
  color: white;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  animation: page-flip 1.5s ease-in-out infinite;
  backface-visibility: hidden;
  opacity: 0;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
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
  color: var(--loading-text, #0f172a);
  letter-spacing: 0.5px;
}

.loading-text {
  background: linear-gradient(
    90deg,
    var(--text-primary, #0f172a) 0%,
    var(--primary-color, #6366f1) 50%,
    var(--text-primary, #0f172a) 100%
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
  color: var(--primary-color, #6366f1);
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
    border-radius: 12px;
  }
  
  .calendar-icon {
    width: 26px;
    height: 26px;
  }
  
  .loading-text-wrapper {
    font-size: 14px;
  }
}

/* ============ 深色模式适配 ============ */
:root.dark-mode .loading-overlay,
.dark-mode .loading-overlay {
  background: var(--loading-overlay-bg, rgba(15, 23, 42, 0.95));
}

:root.dark-mode .calendar-core,
.dark-mode .calendar-core {
  background: var(--card-background, #1e293b);
  box-shadow: 
    0 4px 20px rgba(99, 102, 241, 0.2),
    0 0 0 1px var(--border-color, #334155);
}

:root.dark-mode .calendar-core,
.dark-mode .calendar-core {
  animation-name: core-pulse-dark;
}

@keyframes core-pulse-dark {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 
      0 4px 20px rgba(99, 102, 241, 0.2),
      0 0 0 1px var(--border-color, #334155);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 
      0 8px 30px rgba(99, 102, 241, 0.35),
      0 0 0 2px var(--primary-color, #6366f1);
  }
}
</style>
