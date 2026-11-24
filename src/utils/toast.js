/**
 * 轻量全局提示（toast）
 *
 * 为什么不用 window.alert：
 *   - 原生 alert 会阻塞整个页面（JS 停止执行），自动化环境下还会卡死 CDP
 *   - 样式无法跟随主题，移动端体验割裂
 *
 * 本实现为纯 DOM 单例，挂在 body 下，读取主题 CSS 变量（变量定义在 :root / html 上），
 * 因此自动适配各种主题与暗色模式。不依赖 Vue，任意模块都能调用。
 */

const TOAST_ID = 'app-toast';
const HIDE_ANIM_MS = 260;

let container = null;
let hideTimer = null;
let removeTimer = null;

const TYPE_COLOR = {
  success: 'var(--success-color, #16a34a)',
  error: 'var(--danger-color, #dc2626)',
  warning: 'var(--warning-color, #d97706)',
  info: '',
};

function ensureContainer() {
  if (container && document.body.contains(container)) return container;

  // 已存在同 id 节点（HMR / 多个模块实例）时复用，避免重复挂载
  const existing = document.getElementById(TOAST_ID);
  if (existing) {
    container = existing;
    return container;
  }

  container = document.createElement('div');
  container.id = TOAST_ID;
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  Object.assign(container.style, {
    position: 'fixed',
    left: '50%',
    bottom: '32px',
    transform: 'translateX(-50%) translateY(10px)',
    maxWidth: 'min(88vw, 420px)',
    padding: '11px 18px',
    borderRadius: '12px',
    background: 'var(--card-background, #ffffff)',
    color: 'var(--text-primary, #1d2433)',
    border: '1px solid var(--border-color, rgba(0, 0, 0, 0.14))',
    boxShadow: 'var(--shadow-xl, 0 10px 30px rgba(0, 0, 0, 0.22))',
    fontSize: '13.6px',
    lineHeight: '1.45',
    textAlign: 'center',
    zIndex: '3000',
    pointerEvents: 'none',
    opacity: '0',
    transition: `opacity 0.25s ease, transform 0.25s ease`,
    wordBreak: 'break-word',
    display: 'none',
  });
  document.body.appendChild(container);
  return container;
}

/**
 * 显示一条提示
 * @param {string} text 提示文案
 * @param {{ duration?: number, type?: 'info'|'success'|'error'|'warning' }} [options]
 */
export function showToast(text, options = {}) {
  if (!text || typeof document === 'undefined') return;

  const { duration = 3200, type = 'info' } = options;
  const el = ensureContainer();

  el.textContent = String(text);

  const accent = TYPE_COLOR[type] || '';
  el.style.borderColor = accent || 'var(--border-color, rgba(0, 0, 0, 0.14))';
  el.style.color = type === 'error' ? accent : 'var(--text-primary, #1d2433)';

  if (hideTimer) clearTimeout(hideTimer);
  if (removeTimer) clearTimeout(removeTimer);

  el.style.display = 'block';
  // 强制 reflow，确保从初始状态开始过渡
  void el.offsetHeight;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';

  hideTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(10px)';
    removeTimer = setTimeout(() => {
      el.style.display = 'none';
      removeTimer = null;
    }, HIDE_ANIM_MS);
    hideTimer = null;
  }, duration);
}

export default showToast;
