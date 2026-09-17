# WebGL 液态玻璃（实验主题）

在主题设置中选择 **🔬 WebGL 液态玻璃**。现有主题不变。

## 实现边界

- 原生 WebGL 1，无 Three.js/React 依赖。
- 一个共享 Canvas + 一张背景 FBO 纹理；背景为冷暖渐变与弧形光带。
- 每个可见日期格通过 scissor 裁剪绘制圆角 SDF 玻璃，模拟边缘折射、轻微 RGB 色散与高光。
- 鼠标移入时平滑加强偏移采样与高光；文字及点击保留原生 DOM，不折射 HTML 文字，也不捕获整页。
- 是屏幕空间折射近似，不是物理光线追踪，也不是文章 GLB 模型的直接移植。
- 像素比上限 1.5；背景只在尺寸变化时重绘，交互时按需重绘，不空闲持续循环。
- 不支持 WebGL、着色器/帧缓冲失败或上下文丢失时显示 CSS 回退。上下文丢失后可切换主题重新初始化。
- 尊重减少动态效果、减少透明度偏好。主题切换和卸载清理监听器与 GPU 资源。
- 本主题采用自己的 WebGL 壁纸，而不是折射现有天气/时间动态背景。

## 验证

```sh
npm run build
npm test
# 单独终端：
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# 本机需有 chromium-browser，Node 22+：
node scripts/check-webgl.mjs
```

浏览器测试仅 mock 日历 API，不读取真实用户待办；检查首帧、日期格透明 DOM 表层、鼠标画面变化、移动尺寸、减少透明度偏好和 context-loss 回退。截图输出在 `dist-shots/webgl-glass-*.png`。软件渲染测试不代表所有移动 GPU 性能。
