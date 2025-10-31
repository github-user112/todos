<template>
  <div class="login-container">
    <h2>登录</h2>
    <input 
      type="password" 
      v-model="password" 
      placeholder="密码" 
      @keypress.enter="handleLogin"
    >
    <button @click="handleLogin">登录</button>
    <div class="login-error" v-if="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['login-success']);

const password = ref('');
const error = ref('');

const handleLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: password.value })
    });
    
    const result = await response.json();
    
    if (result.success) {
      emit('login-success', {
        token: result.token,
        userId: result.userId
      });
    } else {
      error.value = '密码错误，请重试';
    }
  } catch (err) {
    error.value = '登录失败，请重试';
    console.error('登录失败:', err);
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  width: 300px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  background: var(--card-background);
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-primary);
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid var(--form-input-border);
  border-radius: 4px;
  background: var(--card-background);
  color: var(--text-primary);
}

input:focus {
  outline: none;
  border-color: var(--form-input-focus-border);
  box-shadow: 0 0 0 2px var(--form-input-focus-shadow);
}

button {
  width: 100%;
  padding: 10px;
  background-color: var(--button-primary-bg);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: var(--button-primary-hover-bg);
}

.login-error {
  color: var(--danger-color);
  margin-top: 15px;
  text-align: center;
}