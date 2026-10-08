<template>
  <Transition name="confirm">
    <!-- 遮罩复用 .add-todo-popup：玻璃主题在 theme-glass.css 中对该类统一处理遮罩（毛玻璃/雾白），保证与添加弹窗一致 -->
    <div
      v-if="confirmState.show"
      class="add-todo-popup confirm-overlay"
      @click.self="cancel"
    >
      <div
        ref="cardRef"
        class="confirm-card"
        role="alertdialog"
        aria-modal="true"
        :aria-label="confirmState.title"
        tabindex="-1"
      >
        <div class="drag-bar"></div>

        <div class="confirm-header">
          <span v-if="confirmState.icon !== 'none'" class="confirm-icon">
            <!-- 删除 -->
            <svg
              v-if="confirmState.icon !== 'warning'"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
            <!-- 警告 -->
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h3 class="confirm-title">{{ confirmState.title }}</h3>
        </div>

        <p v-if="confirmState.message" class="confirm-message">
          {{ confirmState.message }}
        </p>

        <div class="confirm-actions">
          <button
            v-for="(btn, i) in confirmState.buttons"
            :key="i"
            :class="[
              'confirm-btn',
              btn.variant === 'danger' ? 'is-danger' : 'is-secondary',
            ]"
            @click="choose(btn.value)"
          >
            {{ btn.text }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import {
  confirmState,
  chooseConfirm,
  cancelConfirm,
} from '../utils/confirm.js';

const cardRef = ref(null);

const choose = (value) => chooseConfirm(value);
const cancel = () => cancelConfirm();

const onKeydown = (e) => {
  if (e.key === 'Escape' && confirmState.show) {
    e.stopPropagation();
    cancel();
  }
};

watch(
  () => confirmState.show,
  async (show) => {
    if (show) {
      await nextTick();
      cardRef.value?.focus();
    }
  },
);

onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
/* ---- 遮罩：与添加待办弹窗同一套基础样式（玻璃主题由全局规则接管） ---- */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 28, 45, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  z-index: 3000;
}

/* ---- 卡片 ---- */
.confirm-card {
  width: 100%;
  max-width: 380px;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
  padding: 20px 18px 18px;
  outline: none;
}

.drag-bar {
  display: none;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
  margin: -8px auto 12px;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--danger-color) 12%, transparent);
  color: var(--danger-color);
}

.confirm-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.confirm-message {
  margin: 12px 0 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
}

/* ---- 按钮：与添加弹窗的 取消/保存 同规格 ---- */
.confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.confirm-btn {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.15s ease,
    transform 0.1s ease;
}

.confirm-btn.is-secondary {
  background: var(--button-secondary-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.confirm-btn.is-secondary:hover {
  background: var(--button-secondary-hover-bg);
}

.confirm-btn.is-danger {
  background: var(--danger-color);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 3px 10px -3px color-mix(in srgb, var(--danger-color) 60%, transparent);
}
.confirm-btn.is-danger:hover {
  filter: brightness(0.94);
}

.confirm-btn:active {
  transform: scale(0.97);
}

/* ---- 进出动画：与添加弹窗一致 ---- */
.confirm-enter-active {
  transition: opacity 0.25s ease;
}
.confirm-enter-active .confirm-card {
  transition:
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}
.confirm-leave-active {
  transition: opacity 0.2s ease;
}
.confirm-leave-active .confirm-card {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}
.confirm-enter-from .confirm-card {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
.confirm-leave-to .confirm-card {
  transform: scale(0.95);
  opacity: 0;
}

/* ---- 移动端：底部抽屉，与添加弹窗同款 ---- */
@media (max-width: 768px) {
  .confirm-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .confirm-card {
    max-width: 100%;
    border-radius: 18px 18px 0 0;
    border-bottom: none;
    padding: 16px 16px 14px;
    padding-bottom: max(14px, env(safe-area-inset-bottom));
  }
  .drag-bar {
    display: block;
  }
  .confirm-title {
    font-size: 1rem;
  }
  .confirm-message {
    font-size: 0.88rem;
  }
  .confirm-actions {
    margin-top: 16px;
    gap: 10px;
  }
  .confirm-btn {
    min-height: 48px;
    font-size: 0.92rem;
  }
}

@media (max-width: 380px) {
  .confirm-actions {
    flex-direction: column-reverse;
  }
}
</style>
