import { ref } from 'vue';

// 加载状态和请求计数器
export const loading = ref(false);
let requestCount = 0;

// 设置加载状态
export function setLoading(isLoading) {
  if (isLoading) {
    requestCount++;
    loading.value = true;
  } else {
    requestCount--;
    if (requestCount <= 0) {
      loading.value = false;
      requestCount = 0;
    }
  }
}