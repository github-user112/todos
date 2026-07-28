<template>
  <Transition name="solar-term-popup">
    <div
      v-if="visible"
      class="solar-term-overlay"
      @click.self="close"
    >
      <div class="solar-term-card">
        <button class="close-btn" @click="close">✕</button>

        <div class="card-header">
          <div class="term-emoji">{{ termInfo.emoji }}</div>
          <div class="term-title">
            <h2>{{ termInfo.name }}</h2>
            <p class="term-summary">{{ termInfo.summary }}</p>
          </div>
        </div>

        <div class="card-greeting">
          {{ termInfo.greeting }}
        </div>

        <div class="card-tips">
          <h3>🌿 养生小贴士</h3>
          <ul>
            <li v-for="(tip, i) in termInfo.tips" :key="i">{{ tip }}</li>
          </ul>
        </div>

        <button class="got-it-btn" @click="close">
          知道啦 🌸
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  termInfo: {
    type: Object,
    default: () => ({ emoji: '🌿', name: '', summary: '', greeting: '', tips: [] }),
  },
});

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<style scoped>
.solar-term-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.solar-term-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: var(--card-background, #fff);
  border-radius: 20px;
  padding: 28px 24px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-height: 85vh;
  overflow-y: auto;
  animation: card-pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes card-pop-in {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
  font-size: 0.9rem;
  background: var(--hover-color, #f1f5f9);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.close-btn:active {
  transform: scale(0.9);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.term-emoji {
  font-size: 3rem;
  line-height: 1;
  flex-shrink: 0;
  animation: emoji-float 2s ease-in-out infinite;
}

@keyframes emoji-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.term-title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary, #0f172a);
  letter-spacing: 0.02em;
}

.term-summary {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary, #64748b);
}

.card-greeting {
  background: var(--primary-light, #e0e7ff);
  color: var(--primary-dark, #4338ca);
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 18px;
  border-left: 4px solid var(--primary-color, #6366f1);
}

.card-tips h3 {
  margin: 0 0 10px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.card-tips ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.card-tips li {
  position: relative;
  padding: 8px 8px 8px 24px;
  font-size: 0.85rem;
  color: var(--text-primary, #0f172a);
  line-height: 1.5;
}

.card-tips li::before {
  content: '✓';
  position: absolute;
  left: 6px;
  top: 8px;
  color: var(--success-color, #10b981);
  font-weight: 700;
  font-size: 0.8rem;
}

.got-it-btn {
  width: 100%;
  margin-top: 20px;
  padding: 13px;
  border-radius: 12px;
  background: var(--button-primary-bg, #6366f1);
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s, background 0.15s;
}
.got-it-btn:active {
  transform: scale(0.97);
  background: var(--button-primary-hover-bg, #4f46e5);
}

/* 弹窗动画 */
.solar-term-popup-enter-active {
  transition: opacity 0.3s ease;
}
.solar-term-popup-leave-active {
  transition: opacity 0.25s ease;
}
.solar-term-popup-enter-from,
.solar-term-popup-leave-to {
  opacity: 0;
}

@media (max-width: 380px) {
  .solar-term-card {
    padding: 22px 18px 16px;
  }
  .term-emoji {
    font-size: 2.4rem;
  }
  .term-title h2 {
    font-size: 1.3rem;
  }
}
</style>
