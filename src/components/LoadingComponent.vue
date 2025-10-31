<template>
  <div class="loading-overlay" v-if="show">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ text || '加载中...' }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingComponent',
  props: {
    show: {
      type: Boolean,
      required: true,
      default: false
    },
    text: {
      type: String,
      default: '加载中...'
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--loading-overlay-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.3s ease;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 5px solid var(--loading-spinner-border);
  border-top: 5px solid var(--loading-spinner-border-top);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 18px;
  color: var(--loading-text);
  font-weight: 500;
  letter-spacing: 0.5px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}</style>