# 全局加载动画组件

## 组件位置
`/src/components/LoadingComponent.vue`

## 特性
- 🎨 **日历主题动画** - 契合应用主题的日历翻页效果
- 🌈 **渐变文字** - 加载文字带有流光渐变动画
- 🎭 **多层光环** - 三层旋转光环，营造科技感
- 💫 **脉冲效果** - 核心图标带有呼吸脉冲动画
- 🌙 **深色模式支持** - 自动适配深色主题
- 📱 **响应式设计** - 移动端自动缩小尺寸

## 使用方法

### 基础用法
```vue
<template>
  <LoadingComponent :show="loading" text="加载中" />
</template>

<script setup>
import { ref } from 'vue'
import LoadingComponent from './components/LoadingComponent.vue'

const loading = ref(false)
</script>
```

### 配合全局状态使用
```javascript
// utils/loading.js
import { ref } from 'vue'

export const loading = ref(false)
let requestCount = 0

export function setLoading(isLoading) {
  if (isLoading) {
    requestCount++
    loading.value = true
  } else {
    requestCount--
    if (requestCount <= 0) {
      loading.value = false
      requestCount = 0
    }
  }
}
```

```vue
<!-- App.vue -->
<script setup>
import { loading, setLoading } from './utils/loading'

// 显示loading
setLoading(true)

// 隐藏loading
setLoading(false)
</script>
```

## Props
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| show | Boolean | false | 是否显示加载动画 |
| text | String | '加载中' | 加载提示文字 |

## 动画效果说明

### 1. 多层旋转光环
- **ring-1**: 最外层，顺时针旋转，3秒一圈
- **ring-2**: 中间层，逆时针旋转，2秒一圈
- **ring-3**: 最内层，顺时针旋转，1.5秒一圈

### 2. 日历翻页数字
- 右上角显示数字 1、2、3
- 模拟日历翻页效果，每 0.5 秒切换

### 3. 核心图标脉冲
- 中心日历图标带有呼吸效果
- 缩放 1 → 1.05 → 1，配合阴影变化

### 4. 文字流光效果
- 文字颜色在深色和主题色之间渐变
- 营造科技感的文字动画

## 自定义样式

如需调整动画效果，可以修改以下 CSS 变量：

```css
:root {
  /* 加载遮罩背景 */
  --loading-overlay-bg: rgba(248, 250, 252, 0.95);
  
  /* 加载文字颜色 */
  --loading-text: #0f172a;
  
  /* 主题色（影响光环颜色） */
  --primary-color: #6366f1;
  --primary-light: #e0e7ff;
  --primary-dark: #4338ca;
}
```

## 主题适配

组件自动适配以下主题：
- 默认主题（紫色）
- 经典蓝主题 (`.classic-theme`)
- 暖橙主题 (`.orange-theme`)
- 护眼绿主题 (`.green-theme`)
- 深色模式 (`.dark-mode`)

## 注意事项

1. 组件使用 `position: fixed` 覆盖全屏
2. z-index 为 9999，确保在最上层
3. 使用 backdrop-filter 实现毛玻璃效果
4. 移动端已做响应式适配

## 更新日志

### v2.0.0 (2026-04-02)
- 全新设计的日历主题动画
- 添加多层旋转光环效果
- 添加日历翻页数字动画
- 优化深色模式适配
- 改进响应式布局

### v1.0.0
- 基础旋转加载动画
