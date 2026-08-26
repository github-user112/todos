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

const isGlassId = (id) => id.includes('glass-theme');
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
  it('共 18 套主题且 id 唯一', () => {
    assert.equal(THEMES.length, 18);
    assert.equal(new Set(THEMES.map((t) => t.id)).size, 18);
  });

  it('包含默认主题、深色模式与七套玻璃主题（液态玻璃 26 含浅色/深色两个配方块）', () => {
    assert.ok(THEMES.some((t) => t.cls === null), '缺少 :root 默认主题');
    assert.ok(darkTheme, '缺少 dark-mode');
    assert.equal(glassThemes.length, 8, '应有七套玻璃主题（液态玻璃 26 占浅色+深色两块）');
    assert.ok(
      THEMES.some((t) => t.id === 'ios26-glass-theme') &&
        THEMES.some((t) => t.id === 'ios26-glass-theme-dark'),
      '缺少液态玻璃 26 的浅色/深色配方',
    );
    // 节气玻璃三套：霜柿 / 月白 / 竹青
    for (const id of ['persimmon-glass-theme', 'moonlight-glass-theme', 'bamboo-glass-theme']) {
      assert.ok(THEMES.some((t) => t.id === id), `缺少节气玻璃 ${id}`);
    }
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
});

/* ---------------- 液态玻璃 26 · 深色配方 ---------------- */
/** 把 rgba 前景叠到不透明背景上，返回合成后的 hex（用于玻璃面可读性检查） */
function composite(fgRgba, bgHex) {
  const m = fgRgba.match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
  assert.ok(m, `非法 rgba 字符串: ${fgRgba}`);
  const [, r, g, b, a] = m;
  const bg = hexToRgb(bgHex);
  const t = parseFloat(a);
  return rgbToHex([r, g, b].map((c, i) => c * t + bg[i] * (1 - t)));
}

describe('液态玻璃 26 深色配方', () => {
  const darkGlass = THEMES.find((t) => t.id === 'ios26-glass-theme-dark');
  const vars = darkGlass.build();

  it('正文文字对深色壁纸上的玻璃卡片底对比度 ≥ 7:1', () => {
    // 卡片是低透明度白雾，先叠到近似壁纸中调再算对比度
    const cardOnWallpaper = composite(vars['card-background'], '#141a2e');
    assert.ok(
      contrast(vars['text-primary'], cardOnWallpaper) >= 7,
      `实际 ${contrast(vars['text-primary'], cardOnWallpaper).toFixed(2)}:1（合成底 ${cardOnWallpaper}）`,
    );
  });

  it('primary-dark 在暗底上是更亮的强调变体（而非更暗）', () => {
    assert.ok(luminance(vars['primary-dark']) > luminance(vars['primary-color']));
  });

  it('浅色/深色共用同一强调色，跨模式品牌一致', () => {
    const light = THEMES.find((t) => t.id === 'ios26-glass-theme').build();
    assert.equal(light['primary-color'], vars['primary-color']);
    assert.notEqual(vars['text-primary'], light['text-primary'], '深色配方必须换浅色文字');
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
      'orb-rgb-1', 'orb-rgb-2', 'orb-rgb-3', 'stage-a', 'stage-b',
    ]);

    const rootBlock = onDisk.slice(onDisk.indexOf(':root {'), onDisk.indexOf('}', onDisk.indexOf(':root {')));
    const defined = new Set([...rootBlock.matchAll(/^ {2}--([a-z0-9-]+):/gm)].map((m) => m[1]));
    const missing = [...used].filter((v) => !defined.has(v) && !runtimeVars.has(v));
    assert.deepEqual(missing, [], '以下变量在 :root 中缺失');
  });
});
