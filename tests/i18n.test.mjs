/**
 * i18n 测试
 * ------------------------------------------------------------
 *   1. t / tf / tMonth 的中英文行为与回退；
 *   2. 翻译完整性：源码里每个 t()/tf() 中文 key 都必须有英文词条；
 *   3. 占位符一致性：{x} 在中英文之间不能丢失；
 *   4. 词条本身不能是空字符串。
 *
 * 完整性检查复用 scripts/extract-i18n-keys.mjs（单一事实来源）。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { locale, t, tf, tMonth, isEn, setLocale } from '../src/utils/i18n.js';
import en from '../src/utils/i18n-en.js';

after(() => setLocale('zh'));

describe('t', () => {
  it('默认中文原样返回', () => {
    assert.equal(locale.value, 'zh');
    assert.equal(t('删除'), '删除');
    assert.equal(isEn(), false);
  });

  it('英文模式查表', () => {
    setLocale('en');
    assert.equal(t('删除'), 'Delete');
    assert.equal(t('今天'), 'Today');
    assert.equal(t('上一月'), 'Previous month');
    assert.equal(isEn(), true);
    setLocale('zh');
  });

  it('缺词条时回退中文（不会显示 undefined）', () => {
    setLocale('en');
    assert.equal(t('这个文案没有翻译'), '这个文案没有翻译');
    setLocale('zh');
  });
});

describe('tf', () => {
  it('替换 {x} 占位符（中文）', () => {
    assert.equal(tf('还有 {n} 天', { n: 3 }), '还有 3 天');
  });

  it('替换 {x} 占位符（英文）', () => {
    setLocale('en');
    assert.equal(tf('还有 {n} 天', { n: 7 }), '7 days left');
    assert.equal(
      tf('确定要删除「{text}」吗？此操作不可撤销。', { text: '买牛奶' }),
      'Delete "买牛奶"? This cannot be undone.',
    );
    setLocale('zh');
  });

  it('缺词条时占位符仍然被替换', () => {
    assert.equal(tf('占位 {a} 和 {b}', { a: 1, b: 2 }), '占位 1 和 2');
  });
});

describe('tMonth', () => {
  it('中文 1月-12月', () => {
    assert.equal(tMonth(0), '1月');
    assert.equal(tMonth(9), '10月');
    assert.equal(tMonth(11), '12月');
  });

  it('英文 January-December', () => {
    setLocale('en');
    assert.equal(tMonth(0), 'January');
    assert.equal(tMonth(9), 'October');
    assert.equal(tMonth(11), 'December');
    setLocale('zh');
  });
});

describe('setLocale 持久化', () => {
  it('写入 localStorage 并可恢复', () => {
    setLocale('en');
    assert.equal(localStorage.getItem('locale'), 'en');
    assert.equal(locale.value, 'en');
    setLocale('zh');
    assert.equal(localStorage.getItem('locale'), 'zh');
  });
});

describe('翻译完整性', () => {
  const keys = execFileSync('node', ['scripts/extract-i18n-keys.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf8',
  })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it('能提取到源码中的中文 key', () => {
    assert.ok(keys.length > 100, `只提取到 ${keys.length} 个 key`);
  });

  it('每个源码 key 都有英文词条', () => {
    const missing = keys.filter((k) => !(k in en));
    assert.deepEqual(missing, [], `缺少英文词条：${missing.join('、')}`);
  });

  it('英文词条是非空字符串', () => {
    const empty = Object.entries(en)
      .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
      .map(([k]) => k);
    assert.deepEqual(empty, [], `空词条：${empty.join('、')}`);
  });

  it('占位符在中英文之间一致', () => {
    const bad = Object.entries(en)
      .filter(([k, v]) => {
        const a = placeholders(k).join(',');
        const b = placeholders(v).join(',');
        return a !== b;
      })
      .map(([k, v]) => `${k} → ${v}`);
    assert.deepEqual(bad, [], `占位符不一致：\n${bad.join('\n')}`);
  });

  it('源码 key 全部是中文（key 即中文的设计约定）', () => {
    const nonZh = keys.filter((k) => !/[一-鿿]/.test(k));
    assert.deepEqual(nonZh, [], `非中文 key：${nonZh.join('、')}`);
  });
});
