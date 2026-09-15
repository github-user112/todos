/**
 * Fluid Glass · 鼠标追光控制器
 * ----------------------------------------------------------
 * 监听 mousemove，将归一化坐标写入 CSS 变量 --fg-x / --fg-y，
 * 驱动玻璃面的动态高光、折射与阴影。
 * 仅在 html 带有 .fluid-glass-theme 时才启动，不浪费资源。
 */

let rafId = null;
let cx = 50; // 初始居中
let cy = 50;

function writeVars() {
  document.documentElement.style.setProperty('--fg-x', cx + '%');
  document.documentElement.style.setProperty('--fg-y', cy + '%');
  rafId = null;
}

function onMouseMove(e) {
  // 归一化到 0-100
  cx = (e.clientX / window.innerWidth) * 100;
  cy = (e.clientY / window.innerHeight) * 100;
  if (!rafId) rafId = requestAnimationFrame(writeVars);
}

/** 启动监听（幂等） */
export function initFluidGlassLight() {
  const html = document.documentElement;
  // 设置初始值
  html.style.setProperty('--fg-x', '50%');
  html.style.setProperty('--fg-y', '50%');

  if (window.__fluidGlassLightInited) return;
  window.__fluidGlassLightInited = true;

  window.addEventListener('mousemove', onMouseMove, { passive: true });
}

/** 停止监听并清理变量 */
export function stopFluidGlassLight() {
  const html = document.documentElement;
  html.style.removeProperty('--fg-x');
  html.style.removeProperty('--fg-y');
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  window.removeEventListener('mousemove', onMouseMove);
  window.__fluidGlassLightInited = false;
}

/**
 * 监听主题切换，按需启停
 */
export function watchFluidGlassTheme(cb) {
  const obs = new MutationObserver(() => {
    const html = document.documentElement;
    const active = html.classList.contains('fluid-glass-theme');
    cb(active);
  });
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  // 初始检查
  cb(document.documentElement.classList.contains('fluid-glass-theme'));
  return obs;
}
