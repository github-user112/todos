/**
 * 设计令牌 → naive-ui 主题覆盖
 * ------------------------------------------------------------
 * 让 Dialog / Message 等弹层组件跟随当前日历主题（强调色、语义色、圆角）。
 * 只覆盖强调色系与圆角——表面与文字色交给 naive-ui 自身的
 * light / dark 基础主题处理，避免深浅模式下的配色冲突。
 */

export function buildNaiveThemeOverrides() {
  // SSR / 非浏览器环境兜底
  if (typeof window === 'undefined') return {};

  const token = (name, fallback = '') => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  };

  const primary = token('--primary-color', '#6e56cf');
  const primaryHover = token('--button-primary-hover-bg', primary);
  const success = token('--success-color', '#16a34a');
  const danger = token('--danger-color', '#dc2626');
  const warning = token('--warning-color', '#d97706');
  const info = token('--info-color', '#2563eb');

  /** 语义色的 hover/pressed/suppl 统一取同色，保持按钮观感稳定 */
  const accent = (color, hover = color) => ({
    color,
    colorHover: hover,
    colorPressed: hover,
    colorSuppl: color,
  });

  return {
    common: {
      ...accent(primary, primaryHover),
      ...accent(success),
      errorColor: danger,
      errorColorHover: danger,
      errorColorPressed: danger,
      errorColorSuppl: danger,
      ...accent(warning),
      ...accent(info),
      borderRadius: '10px',
      borderRadiusSmall: '8px',
    },
    Dialog: { borderRadius: '16px' },
    Message: { borderRadius: '12px' },
  };
}
