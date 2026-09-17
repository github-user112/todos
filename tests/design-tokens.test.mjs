/**
 * 设计令牌系统「Aurora」单元测试
 * ------------------------------------------------------------
 * 守护本次重设计的核心约定，任何破坏协调性的改动都会在这里失败：
 *   1. 颜色工具函数的正确性；
 *   2. 语义色跨主题恒定（休=红系 · 班=琥珀系 · 完成=绿系）；
 *   3. 强调色派生关系与可读性（对比度）底线；
 *   4. 深色模式表面层级与文字对比度；
 *   5. 玻璃主题半透明表面；
 *   6. 序列化分组无遗漏、生成产物与磁盘文件零漂移。
 *
 * 运行：npm test  （node --test tests/）
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  hexToRgb,
  rgbToHex,
  mix,
  alpha,
  SEMANTIC,
  THEMES,
  GROUPS,
  serialize,
  renderCss,
} from '../scripts/build-themes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------- 测试辅助 ---------------- */
/** WCAG 相对亮度 */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 对比度（两值均为 6 位 hex） */
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const isGlassId = (id) => id.includes('glass');
/** 是否为可计算亮度的实色 hex */
const isSolidHex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);
const lightThemes = THEMES.filter((t) => t.id !== 'dark-mode');
const glassThemes = THEMES.filter((t) => isGlassId(t.id));
const darkTheme = THEMES.find((t) => t.id === 'dark-mode');

/* ---------------- 颜色工具 ---------------- */
describe('颜色工具', () => {
  it('hexToRgb 解析 6 位与 3 位 hex', () => {
    assert.deepEqual(hexToRgb('#6e56cf'), [110, 86, 207]);
    assert.deepEqual(hexToRgb('#fff'), [255, 255, 255]);
    assert.deepEqual(hexToRgb('000000'), [0, 0, 0]);
  });

  it('rgbToHex 输出两位十六进制并夹紧越界值', () => {
    assert.equal(rgbToHex([110, 86, 207]), '#6e56cf');
    assert.equal(rgbToHex([300, -20, 16]), '#ff0010');
  });

  it('mix 的两端点等于参与混合的颜色，中点正确', () => {
    assert.equal(mix('#6e56cf', '#ffffff', 0), '#ffffff');
    assert.equal(mix('#6e56cf', '#ffffff', 1), '#6e56cf');
    assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  });

  it('alpha 输出标准 rgba 字符串', () => {
    assert.equal(alpha('#6e56cf', 0.16), 'rgba(110, 86, 207, 0.16)');
    assert.equal(alpha('#ff0000', 1), 'rgba(255, 0, 0, 1)');
  });
});

/* ---------------- 主题清单 ---------------- */
describe('主题清单', () => {
  it('共 20 套主题且 id 唯一', () => {
    assert.equal(THEMES.length, 20);
    assert.equal(new Set(THEMES.map((t) => t.id)).size, 20);
  });

  it('包含默认主题、深色模式与十套玻璃主题（均为浅色，无深色玻璃变体）', () => {
    assert.ok(THEMES.some((t) => t.cls === null), '缺少 :root 默认主题');
    assert.ok(darkTheme, '缺少 dark-mode');
    assert.equal(glassThemes.length, 10, '应有十套玻璃主题（三套 v3 + ios26 + aurora + fluid + 三套节气 + webgl）');
    assert.ok(
      THEMES.some((t) => t.id === 'ios26-glass-theme'),
      '缺少液态玻璃 26 浅色配方',
    );
    // 深色玻璃变体已按设计移除，只能保留浅色玻璃 + 通用深色模式
    for (const id of ['ios26-glass-theme-dark', 'liquid-aurora-glass-dark', 'fluid-glass-dark']) {
      assert.ok(!THEMES.some((t) => t.id === id), `${id} 已下线，不应再生成`);
    }
    // 节气玻璃三套：霜柿 / 月白 / 竹青
    for (const id of ['persimmon-glass-theme', 'moonlight-glass-theme', 'bamboo-glass-theme']) {
      assert.ok(THEMES.some((t) => t.id === id), `缺少节气玻璃 ${id}`);
    }
  });

  it('WebGL 液态玻璃主题：id / 根类名 / 配方正确', () => {
    const t = THEMES.find((x) => x.id === 'webgl-glass');
    assert.ok(t, '缺少 webgl-glass 主题');
    assert.equal(t.cls, '.webgl-glass-theme');
    const vars = t.build();
    // 与 buildGlass({ accent: '#4361b5', accentStrong: '#304990' }) 的直接产物一致
    assert.equal(vars['primary-color'], '#4361b5');
    assert.equal(vars['primary-dark'], '#304990');
    assert.match(vars['card-background'], /^rgba\(255, 255, 255, 0\.\d+\)$/);
    assert.match(vars['glass-day-backdrop'], /blur\(\d+px\)/);
  });
});

/* ---------------- 亮色 / 玻璃主题配方不变量 ---------------- */
describe('亮色主题配方不变量（含玻璃）', () => {
  for (const t of lightThemes) {
    describe(t.comment, () => {
      const vars = t.build();

      it('语义色跨主题恒定：休=红 / 班=琥珀 / 完成=绿', () => {
        assert.equal(vars['success-color'], SEMANTIC.success);
        assert.equal(vars['danger-color'], SEMANTIC.danger);
        assert.equal(vars['warning-color'], SEMANTIC.warning);
        assert.equal(vars['badge-rest-bg'], SEMANTIC.danger, '休徽章必须用红色系');
        assert.equal(vars['badge-work-bg'], SEMANTIC.warning, '班徽章必须用琥珀色系');
      });

      it(`强调色上铺白字满足最低对比度 ≥ 3:1（实际 ${contrast(vars['primary-color'], '#ffffff').toFixed(2)}）`, () => {
        assert.ok(contrast(vars['primary-color'], '#ffffff') >= 3);
      });

      it('primary-light 是主色的淡色底（亮度更高），保证深色文字可读', () => {
        if (!isSolidHex(vars['primary-light'])) {
          // 玻璃主题的 primary-light 为透明度实现，由玻璃专属用例守护
          assert.match(vars['primary-light'], /^rgba\(/);
          return;
        }
        assert.ok(luminance(vars['primary-light']) > luminance(vars['primary-color']));
      });

      it('按钮悬停态与常态不同', () => {
        assert.notEqual(vars['button-primary-bg'], vars['button-primary-hover-bg']);
      });

      it('周末不铺设色块（仅日期数字着色，保持画面安静）', () => {
        assert.equal(vars['calendar-day-weekend-bg'], 'transparent');
        assert.equal(vars['calendar-day-weekend-border'], 'transparent');
      });

      it('边框是弱化的发丝线（远浅于次级文字）', () => {
        if (!isSolidHex(vars['border-color'])) {
          // 玻璃主题边框为白色半透明发丝线
          assert.match(vars['border-color'], /^rgba\(255, 255, 255, 0\.\d+\)$/);
          return;
        }
        assert.ok(luminance(vars['border-color']) > luminance(vars['text-secondary']));
      });
    });
  }
});

/* ---------------- 深色模式 ---------------- */
describe('深色模式配方', () => {
  const vars = darkTheme.build();

  it('表面亮度递增：页面 < 卡片 < 悬停，形成层级', () => {
    const bg = luminance(vars['background-color']);
    const card = luminance(vars['card-background']);
    const hover = luminance(vars['hover-color']);
    assert.ok(bg < card && card < hover, `应满足 bg<card<hover，实际 ${bg}<${card}<${hover}`);
  });

  it('primary-dark 在暗底上是更亮的强调变体（而非更暗）', () => {
    assert.ok(luminance(vars['primary-dark']) > luminance(vars['primary-color']));
  });

  it(`正文文字对卡片背景对比度 ≥ 7:1（实际 ${contrast(vars['text-primary'], vars['card-background']).toFixed(2)}）`, () => {
    assert.ok(contrast(vars['text-primary'], vars['card-background']) >= 7);
  });
});

/* ---------------- 玻璃主题 ---------------- */
describe('玻璃主题配方', () => {
  for (const t of glassThemes) {
    describe(t.comment, () => {
      const vars = t.build();

      it('卡片为半透明白玻璃面', () => {
        assert.match(vars['card-background'], /^rgba\(255, 255, 255, 0\.\d+\)$/);
      });

      it('日期格启用背景模糊', () => {
        assert.match(vars['glass-day-backdrop'], /blur\(\d+px\)/);
      });

      it('强调淡底使用透明度而非实色，避免玻璃面贴纸感', () => {
        assert.match(vars['primary-light'], /^rgba\(/);
      });
    });
  }

  it('非玻璃主题显式关闭模糊', () => {
    for (const t of THEMES.filter((x) => !isGlassId(x.id))) {
      const vars = t.build();
      assert.equal(vars['glass-day-backdrop'], 'none', `${t.id} 应显式关闭 day backdrop`);
    }
  });

  it('液态玻璃 26 深色配方已随深色玻璃选项下线', () => {
    assert.ok(!THEMES.some((t) => t.id === 'ios26-glass-theme-dark'), '深色玻璃配方应已移除');
  });
});

/* ---------------- 浅色玻璃可读性 ---------------- */
/** 把 rgba 前景叠到不透明背景上，返回合成后的 hex（用于玻璃面可读性检查） */
function composite(fgRgba, bgHex) {
  const m = fgRgba.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
  assert.ok(m, `非法 rgba 字符串: ${fgRgba}`);
  const [, r, g, b, a] = m;
  const bg = hexToRgb(bgHex);
  const t = parseFloat(a);
  return rgbToHex([r, g, b].map((c, i) => c * t + bg[i] * (1 - t)));
}

describe('玻璃主题可读性', () => {
  for (const t of glassThemes) {
    it(`${t.comment}：正文对玻璃面合成底对比度 ≥ 4.5:1`, () => {
      const vars = t.build();
      const cardOnWallpaper = composite(vars['card-background'], '#dfe3ee');
      assert.ok(
        contrast(vars['text-primary'], cardOnWallpaper) >= 4.5,
        `实际 ${contrast(vars['text-primary'], cardOnWallpaper).toFixed(2)}:1（合成底 ${cardOnWallpaper}）`,
      );
    });
  }

  it('强调色跨浅色玻璃主题满足白字 3:1 底线', () => {
    for (const t of glassThemes) {
      const vars = t.build();
      const c = contrast(vars['primary-color'], '#ffffff');
      assert.ok(c >= 3, `${t.comment} 实际 ${c.toFixed(2)}`);
    }
  });
});

/* ---------------- 序列化完整性 ---------------- */
describe('序列化完整性', () => {
  it('GROUPS 分组覆盖所有已定义变量（不触发兜底追加）', () => {
    for (const t of THEMES) {
      const cssBlock = serialize(t.build());
      assert.ok(
        !cssBlock.includes('/* ---- 其他 ---- */'),
        `${t.id || ':root'} 存在未归组变量，请补充到 GROUPS`,
      );
    }
  });

  it('renderCss 包含每个主题的选择器块', () => {
    const css = renderCss();
    assert.ok(css.startsWith('/*'));
    for (const t of THEMES) {
      const selector = t.cls ?? ':root';
      assert.ok(css.includes(selector), `缺少 ${selector}`);
    }
  });
});

/* ---------------- 生成产物回归 ---------------- */
describe('生成产物回归（src/assets/theme.css）', () => {
  const onDisk = readFileSync(path.join(ROOT, 'src/assets/theme.css'), 'utf8');

  it('磁盘文件与 renderCss() 输出逐字节一致（禁止手改生成文件）', () => {
    assert.equal(onDisk, renderCss());
  });

  it(':root 覆盖 src 下全部被引用的主题变量', () => {
    // 收集 src 下所有 var(--x) 引用
    function walk(dir) {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') return [];
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : /\.(vue|css|js|mjs)$/.test(e.name) ? [p] : [];
      });
    }
    const used = new Set();
    for (const f of walk(path.join(ROOT, 'src'))) {
      const s = readFileSync(f, 'utf8');
      for (const m of s.matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1].replace('--', ''));
    }
    // 运行时由 JS 注入或组件局部设置的变量，不属于主题令牌
    const runtimeVars = new Set([
      'week-count', 'dx', 'dy', 'rot', 'scale', 'direction',
      'dynamic-bg', 'dynamic-overlay', 'i',
      // 玻璃主题的壁纸舞台配色，仅定义在 html.<glass> 选择器上（theme-glass.css）
      'orb-rgb-1', 'orb-rgb-2', 'orb-rgb-3', 'orb-rgb-4', 'orb-rgb-5', 'stage-a', 'stage-b',
      'fg-x', 'fg-y', 'fg-shine', 'fg-tint', 'fg-surface-alpha',
      'fg-edge', 'fg-rim', 'fg-shade', 'fg-shadow', 'fg-panel-alpha',
      // 每格浅色玻璃配方：只在玻璃主题作用域定义
      'day-glass-sheen', 'day-glass-fill', 'day-glass-shadow',
    ]);

    const rootBlock = onDisk.slice(onDisk.indexOf(':root {'), onDisk.indexOf('}', onDisk.indexOf(':root {')));
    const defined = new Set([...rootBlock.matchAll(/^ {2}--([a-z0-9-]+):/gm)].map((m) => m[1]));
    const missing = [...used].filter((v) => !defined.has(v) && !runtimeVars.has(v));
    assert.deepEqual(missing, [], '以下变量在 :root 中缺失');
  });
});
