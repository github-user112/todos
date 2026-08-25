/**
 * 智能日历管家 · 设计令牌生成器 v2「Aurora」
 * ------------------------------------------------------------
 * 所有主题共用同一套中性色骨架 + 统一语义色规则：
 *   · 休息日(休)   → 红色系
 *   · 调休上班(班) → 琥珀色系
 *   · 完成         → 绿色系
 *   · 今天/选中    → 当前主题强调色
 * 主题个性只通过一个 accent 强调色表达，其余颜色全部按固定配方派生，
 * 从机制上保证任意主题下所有组件的颜色都一致、协调。
 *
 * 用法： node scripts/build-themes.mjs  （输出 src/assets/theme.css）
 */

/**
 * 本模块既可作为脚本直跑（node scripts/build-themes.mjs 生成 theme.css），
 * 也导出全部配方与工具函数供单元测试使用（见 tests/design-tokens.test.mjs）。
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/* ---------------- 颜色工具 ---------------- */
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');

/** 以 t 为权重把 a 混入 b（t=0 → b，t=1 → a） */
const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => B[i] + (A[i] - B[i]) * t));
};
/** hex → rgba 字符串 */
const alpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/* ---------------- 共享常量 ---------------- */
// 中性色骨架（所有亮色主题一致，只带一丝冷调，高级感来源）
const NEUTRAL = {
  textPrimary: '#1d2433',
  textSecondary: '#5d6a84',
  textMuted: '#98a2b8',
  white: '#ffffff',
};
// 语义色（跨主题恒定）
const SEMANTIC = {
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};
// 分层阴影（统一、柔和、有纵深）
const SHADOWS_LIGHT = {
  'shadow-sm': '0 1px 2px rgba(23, 28, 45, 0.05)',
  'shadow-md': '0 2px 4px -1px rgba(23, 28, 45, 0.06), 0 6px 16px -4px rgba(23, 28, 45, 0.08)',
  'shadow-lg': '0 4px 8px -2px rgba(23, 28, 45, 0.06), 0 12px 32px -8px rgba(23, 28, 45, 0.12)',
  'shadow-xl': '0 8px 16px -4px rgba(23, 28, 45, 0.08), 0 24px 56px -12px rgba(23, 28, 45, 0.16)',
};
const SHADOWS_DARK = {
  'shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
  'shadow-md': '0 2px 4px rgba(0, 0, 0, 0.35), 0 8px 20px -6px rgba(0, 0, 0, 0.45)',
  'shadow-lg': '0 4px 8px rgba(0, 0, 0, 0.35), 0 16px 40px -8px rgba(0, 0, 0, 0.55)',
  'shadow-xl': '0 8px 16px rgba(0, 0, 0, 0.4), 0 28px 64px -12px rgba(0, 0, 0, 0.65)',
};

/* ---------------- 亮色主题配方 ---------------- */
function buildLight({ accent, accentStrong }) {
  const ink = NEUTRAL.textPrimary;
  return {
    /* 主色 */
    'primary-color': accent,
    'primary-dark': accentStrong,
    'primary-light': mix(accent, NEUTRAL.white, 0.1),
    /* 语义色（恒定） */
    'success-color': SEMANTIC.success,
    'info-color': SEMANTIC.info,
    'warning-color': SEMANTIC.warning,
    'danger-color': SEMANTIC.danger,
    /* 表面与文字 */
    'background-color': mix(accent, '#f6f7fb', 0.035),
    'card-background': NEUTRAL.white,
    'text-primary': ink,
    'text-secondary': NEUTRAL.textSecondary,
    'border-color': mix(accent, '#e7eaf2', 0.14),
    'hover-color': mix(accent, '#f1f3f9', 0.05),
    /* 其他月份 */
    'other-month-bg': 'transparent',
    'other-month-border': 'transparent',
    'other-month-text': NEUTRAL.textMuted,
    'current-month-bg': NEUTRAL.white,
    'current-month-border': mix(accent, '#e7eaf2', 0.14),
    /* 按钮 */
    'button-primary-bg': accent,
    'button-primary-hover-bg': accentStrong,
    'button-secondary-bg': mix(accent, '#f1f3f9', 0.05),
    'button-secondary-hover-bg': mix(accent, '#e7eaf2', 0.14),
    'button-success-bg': SEMANTIC.success,
    'button-success-hover-bg': '#15803d',
    'button-danger-bg': SEMANTIC.danger,
    'button-danger-hover-bg': '#b91c1c',
    /* 日历格子 */
    'calendar-day-bg': NEUTRAL.white,
    'calendar-day-border': mix(accent, '#e7eaf2', 0.14),
    'calendar-day-hover-bg': mix(accent, '#fafbfe', 0.03),
    'calendar-day-current-bg': mix(accent, NEUTRAL.white, 0.07),
    'calendar-day-current-border': accent,
    'calendar-day-other-month-opacity': '0.45',
    // 周末不再铺黄色块：仅日期数字用红色（见组件样式），令牌保留兜底
    'calendar-day-weekend-bg': 'transparent',
    'calendar-day-weekend-border': 'transparent',
    // 休 → 红色系；班 → 琥珀色系（跨主题恒定）
    'calendar-day-holiday-rest-bg': mix(SEMANTIC.danger, NEUTRAL.white, 0.06),
    'calendar-day-holiday-rest-border': mix(SEMANTIC.danger, NEUTRAL.white, 0.3),
    'calendar-day-holiday-work-bg': mix(SEMANTIC.warning, NEUTRAL.white, 0.08),
    'calendar-day-holiday-work-border': mix(SEMANTIC.warning, NEUTRAL.white, 0.36),
    /* 待办事项 */
    'todo-item-bg': mix(accent, '#f3f5fa', 0.05),
    'todo-item-border-left': accent,
    'todo-item-hover-bg': mix(accent, '#eceff7', 0.09),
    'todo-item-completed-bg': mix(SEMANTIC.success, NEUTRAL.white, 0.07),
    'todo-item-completed-border-left': SEMANTIC.success,
    'todo-item-completed-text': NEUTRAL.textMuted,
    /* 重复预览 */
    'preview-bg': mix(accent, NEUTRAL.white, 0.08),
    'preview-border': mix(accent, NEUTRAL.white, 0.26),
    'preview-text': accentStrong,
    'preview-hover-bg': mix(accent, NEUTRAL.white, 0.13),
    'preview-hover-border': mix(accent, NEUTRAL.white, 0.42),
    /* 节日徽章 */
    'badge-rest-bg': SEMANTIC.danger,
    'badge-rest-text': NEUTRAL.white,
    'badge-work-bg': SEMANTIC.warning,
    'badge-work-text': NEUTRAL.white,
    /* 加载 */
    'loading-overlay-bg': alpha(mix(accent, '#f6f7fb', 0.035), 0.9),
    'loading-spinner-border': mix(accent, '#e7eaf2', 0.2),
    'loading-spinner-border-top': accent,
    'loading-text': ink,
    /* 表单 */
    'form-input-border': mix(accent, '#e0e4ee', 0.22),
    'form-input-focus-border': accent,
    'form-input-focus-shadow': alpha(accent, 0.16),
    /* 非玻璃主题显式关闭玻璃模糊 */
    'glass-day-backdrop': 'none',
    'glass-grid-backdrop': 'none',
    /* 阴影 */
    ...SHADOWS_LIGHT,
  };
}

/* ---------------- 深色主题配方 ---------------- */
function buildDark({ accent }) {
  const card = '#141c30';
  const page = '#0b1120';
  return {
    'primary-color': accent,
    /* 深色模式下「强调变体」应更亮而非更深，保证暗底上的可读性 */
    'primary-dark': mix(accent, '#ffffff', 0.3),
    'primary-light': alpha(accent, 0.16),

    'success-color': '#4ade80',
    'info-color': '#60a5fa',
    'warning-color': '#fbbf24',
    'danger-color': '#f87171',

    'background-color': page,
    'card-background': card,
    'text-primary': '#e9edf7',
    'text-secondary': '#9aa6c0',
    'border-color': 'rgba(154, 170, 200, 0.18)',
    'hover-color': '#1b2540',

    'other-month-bg': 'transparent',
    'other-month-border': 'transparent',
    'other-month-text': '#5b6880',
    'current-month-bg': card,
    'current-month-border': 'rgba(154, 170, 200, 0.18)',

    'button-primary-bg': accent,
    'button-primary-hover-bg': mix(accent, '#ffffff', 0.14),
    'button-secondary-bg': '#1b2540',
    'button-secondary-hover-bg': '#243154',
    'button-success-bg': '#16a34a',
    'button-success-hover-bg': '#15803d',
    'button-danger-bg': '#dc2626',
    'button-danger-hover-bg': '#b91c1c',

    'calendar-day-bg': card,
    'calendar-day-border': 'rgba(154, 170, 200, 0.15)',
    'calendar-day-hover-bg': '#1b2540',
    'calendar-day-current-bg': alpha(accent, 0.14),
    'calendar-day-current-border': accent,
    'calendar-day-other-month-opacity': '0.4',
    'calendar-day-weekend-bg': 'transparent',
    'calendar-day-weekend-border': 'transparent',
    'calendar-day-holiday-rest-bg': alpha('#f87171', 0.1),
    'calendar-day-holiday-rest-border': alpha('#f87171', 0.32),
    'calendar-day-holiday-work-bg': alpha('#fbbf24', 0.1),
    'calendar-day-holiday-work-border': alpha('#fbbf24', 0.34),

    'todo-item-bg': '#1b2540',
    'todo-item-border-left': accent,
    'todo-item-hover-bg': '#243154',
    'todo-item-completed-bg': alpha('#4ade80', 0.09),
    'todo-item-completed-border-left': '#4ade80',
    'todo-item-completed-text': '#5b6880',

    'preview-bg': alpha(accent, 0.14),
    'preview-border': alpha(accent, 0.34),
    'preview-text': mix(accent, '#ffffff', 0.35),
    'preview-hover-bg': alpha(accent, 0.22),
    'preview-hover-border': alpha(accent, 0.5),

    'badge-rest-bg': '#dc2626',
    'badge-rest-text': '#ffffff',
    'badge-work-bg': '#d97706',
    'badge-work-text': '#ffffff',

    'loading-overlay-bg': alpha(page, 0.9),
    'loading-spinner-border': 'rgba(154, 170, 200, 0.2)',
    'loading-spinner-border-top': accent,
    'loading-text': '#e9edf7',

    'form-input-border': 'rgba(154, 170, 200, 0.22)',
    'form-input-focus-border': accent,
    'form-input-focus-shadow': alpha(accent, 0.28),
    'glass-day-backdrop': 'none',
    'glass-grid-backdrop': 'none',

    ...SHADOWS_DARK,
  };
}

/* ---------------- 玻璃主题配方（三套共用结构） ---------------- */
function buildGlass({ accent, accentStrong }) {
  return {
    ...buildLight({ accent, accentStrong }),
    /* 表面改为半透明玻璃面（容器白雾要薄，让壁纸色透出来） */
    'background-color': 'rgba(255, 255, 255, 0.1)',
    'card-background': 'rgba(255, 255, 255, 0.62)',
    'border-color': 'rgba(255, 255, 255, 0.66)',
    'hover-color': 'rgba(255, 255, 255, 0.46)',
    'other-month-text': 'rgba(29, 36, 51, 0.34)',
    /* 强调色淡底在玻璃面上统一改用透明度，避免「贴纸感」 */
    'primary-light': alpha(accent, 0.14),
    'todo-item-completed-bg': alpha(SEMANTIC.success, 0.1),
    'todo-item-completed-text': 'rgba(29, 36, 51, 0.45)',
    'preview-hover-bg': alpha(accent, 0.18),
    'calendar-day-bg': 'rgba(255, 255, 255, 0.55)',
    'calendar-day-border': 'rgba(255, 255, 255, 0.62)',
    'calendar-day-hover-bg': 'rgba(255, 255, 255, 0.72)',
    'calendar-day-current-bg': alpha(accent, 0.13),
    'calendar-day-current-border': alpha(accent, 0.75),
    'calendar-day-holiday-rest-bg': alpha(SEMANTIC.danger, 0.08),
    'calendar-day-holiday-rest-border': alpha(SEMANTIC.danger, 0.3),
    'calendar-day-holiday-work-bg': alpha(SEMANTIC.warning, 0.1),
    'calendar-day-holiday-work-border': alpha(SEMANTIC.warning, 0.34),
    'todo-item-bg': 'rgba(255, 255, 255, 0.52)',
    'todo-item-border-left': alpha(accent, 0.85),
    'todo-item-hover-bg': 'rgba(255, 255, 255, 0.68)',
    'preview-bg': alpha(accent, 0.1),
    'preview-border': alpha(accent, 0.28),
    'loading-overlay-bg': 'rgba(255, 255, 255, 0.55)',
    /* 玻璃主题的模糊量由 theme-glass.css 与下方覆盖控制 */
    'glass-day-backdrop': 'blur(28px) saturate(190%)',
    'glass-grid-backdrop': 'none',
    /* 玻璃阴影更轻盈 */
    'shadow-sm': '0 1px 2px rgba(23, 28, 45, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
    'shadow-md': '0 2px 6px -1px rgba(23, 28, 45, 0.06), 0 8px 24px -6px rgba(23, 28, 45, 0.1)',
    'shadow-lg': '0 4px 8px -2px rgba(23, 28, 45, 0.05), 0 16px 40px -10px rgba(23, 28, 45, 0.14)',
    'shadow-xl': '0 8px 16px -4px rgba(23, 28, 45, 0.07), 0 28px 64px -12px rgba(23, 28, 45, 0.2)',
  };
}

/* ---------------- 主题清单 ---------------- */
const THEMES = [
  { id: '',                     cls: null,               comment: '默认 · 极光紫 Aurora Violet', build: () => buildLight({ accent: '#6e56cf', accentStrong: '#5b41bd' }) },
  { id: 'classic-theme',        cls: '.classic-theme',   comment: '经典蓝 Classic Blue',        build: () => buildLight({ accent: '#2563eb', accentStrong: '#1d4ed8' }) },
  { id: 'orange-theme',         cls: '.orange-theme',    comment: '暖橙 Warm Orange',           build: () => buildLight({ accent: '#ea580c', accentStrong: '#c2410c' }) },
  { id: 'green-theme',          cls: '.green-theme',     comment: '护眼绿 Emerald Green',       build: () => buildLight({ accent: '#059669', accentStrong: '#047857' }) },
  { id: 'rose-theme',           cls: '.rose-theme',      comment: '玫瑰粉 Romantic Rose',       build: () => buildLight({ accent: '#e11d48', accentStrong: '#be123c' }) },
  { id: 'lavender-theme',       cls: '.lavender-theme',  comment: '薰衣草 Lavender',            build: () => buildLight({ accent: '#7c3aed', accentStrong: '#6d28d9' }) },
  { id: 'mint-theme',           cls: '.mint-theme',      comment: '薄荷青 Mint Teal',           build: () => buildLight({ accent: '#0d9488', accentStrong: '#0f766e' }) },
  { id: 'amber-theme',          cls: '.amber-theme',     comment: '琥珀金 Amber Gold',          build: () => buildLight({ accent: '#b45309', accentStrong: '#92400e' }) },
  { id: 'primrose-theme',       cls: '.primrose-theme',  comment: '鎏金黄 Primrose Gold',       build: () => buildLight({ accent: '#a16207', accentStrong: '#854d0e' }) },
  { id: 'dark-mode',            cls: '.dark-mode',       comment: '深色模式 Dark',              build: () => buildDark({ accent: '#8b93f8' }) },
  { id: 'glass-theme',          cls: '.glass-theme',     comment: '液态玻璃 Liquid Glass',      build: () => buildGlass({ accent: '#7c3aed', accentStrong: '#6d28d9' }) },
  { id: 'ios-glass-theme',      cls: '.ios-glass-theme', comment: 'iOS 玻璃 iOS Glass',         build: () => buildGlass({ accent: '#0071e3', accentStrong: '#0051d5' }) },
  { id: 'liquid-glass-theme',   cls: '.liquid-glass-theme', comment: '流动玻璃 Flowing Glass',  build: () => buildGlass({ accent: '#9333ea', accentStrong: '#7e22ce' }) },
];

/* ---------------- 序列化 ---------------- */
const GROUPS = [
  ['主色', ['primary-color', 'primary-dark', 'primary-light']],
  ['语义色（跨主题恒定）', ['success-color', 'danger-color', 'warning-color', 'info-color']],
  ['表面 · 文字 · 边框', ['background-color', 'card-background', 'text-primary', 'text-secondary', 'border-color', 'hover-color']],
  ['月份区分', ['current-month-bg', 'current-month-border', 'other-month-bg', 'other-month-border', 'other-month-text', 'calendar-day-other-month-opacity']],
  ['按钮', ['button-primary-bg', 'button-primary-hover-bg', 'button-secondary-bg', 'button-secondary-hover-bg', 'button-success-bg', 'button-success-hover-bg', 'button-danger-bg', 'button-danger-hover-bg']],
  ['日历格子', ['calendar-day-bg', 'calendar-day-border', 'calendar-day-hover-bg', 'calendar-day-current-bg', 'calendar-day-current-border', 'calendar-day-weekend-bg', 'calendar-day-weekend-border', 'calendar-day-holiday-rest-bg', 'calendar-day-holiday-rest-border', 'calendar-day-holiday-work-bg', 'calendar-day-holiday-work-border']],
  ['待办事项', ['todo-item-bg', 'todo-item-border-left', 'todo-item-hover-bg', 'todo-item-completed-bg', 'todo-item-completed-border-left', 'todo-item-completed-text']],
  ['重复预览', ['preview-bg', 'preview-border', 'preview-text', 'preview-hover-bg', 'preview-hover-border']],
  ['节日徽章', ['badge-rest-bg', 'badge-rest-text', 'badge-work-bg', 'badge-work-text']],
  ['加载', ['loading-overlay-bg', 'loading-spinner-border', 'loading-spinner-border-top', 'loading-text']],
  ['表单', ['form-input-border', 'form-input-focus-border', 'form-input-focus-shadow']],
  ['玻璃专属', ['glass-day-backdrop', 'glass-grid-backdrop']],
  ['阴影', ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl']],
];

function serialize(vars) {
  const covered = new Set();
  const chunks = [];
  for (const [title, keys] of GROUPS) {
    const lines = keys.filter((k) => vars[k] !== undefined).map((k) => `  --${k}: ${vars[k]};`);
    if (!lines.length) continue;
    keys.forEach((k) => covered.add(k));
    chunks.push(`  /* ---- ${title} ---- */\n${lines.join('\n')}`);
  }
  // 兜底：任何遗漏的变量按定义顺序追加，避免组件引用落空
  const rest = Object.keys(vars).filter((k) => !covered.has(k));
  if (rest.length) {
    chunks.push(`  /* ---- 其他 ---- */\n${rest.map((k) => `  --${k}: ${vars[k]};`).join('\n')}`);
  }
  return chunks.join('\n\n');
}

/* ---------------- 导出（供单元测试与复用） ---------------- */
export {
  hexToRgb,
  rgbToHex,
  mix,
  alpha,
  NEUTRAL,
  SEMANTIC,
  SHADOWS_LIGHT,
  SHADOWS_DARK,
  buildLight,
  buildDark,
  buildGlass,
  THEMES,
  GROUPS,
  serialize,
};

/** 渲染完整 theme.css 内容（纯函数，无副作用） */
export function renderCss() {
  let css = `/* ============================================================
   智能日历管家 · 设计令牌系统 v2「Aurora」
   本文件由 scripts/build-themes.mjs 生成，请勿直接手改；
   调整配色请修改脚本后运行：node scripts/build-themes.mjs
   ------------------------------------------------------------
   设计原则：
   1. 全部主题共享同一套中性色骨架与分层阴影，观感统一；
   2. 语义色跨主题恒定：休=红系 · 班=琥珀系 · 完成=绿系；
   3. 每套主题只有一个 accent 强调色，其余颜色按固定配方派生，
      从机制上保证任何主题下所有组件颜色一致、协调。
   ============================================================ */

`;

  for (const t of THEMES) {
    const vars = t.build();
    const header = t.cls
      ? `/* ==============================\n   ${t.comment}\n   ============================== */\n${t.cls} {`
      : `/* ==============================\n   ${t.comment}（:root 默认）\n   ============================== */\n:root {`;
    css += `${header}\n${serialize(vars)}\n}\n\n`;
  }
  return css;
}

/* ---------------- 直接运行时才写文件 ---------------- */
const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  writeFileSync(new URL('../src/assets/theme.css', import.meta.url), renderCss());
  console.log('✅ 已生成 src/assets/theme.css');
  THEMES.forEach((t) => console.log(`  · ${t.cls || ':root'}  ${t.comment}`));
}
