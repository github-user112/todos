/**
 * 偏好/偏好类工具测试
 * ------------------------------------------------------------
 *   1. theme-selection：下线主题映射到对应浅色玻璃；
 *   2. hashUtils：用户 ID 生成格式与离散性；
 *   3. celebrationUtils：完成动效偏好读写与非法值过滤；
 *   4. reminderState：提醒条目增删与 15s 自动消散（mock 定时器）。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTheme } from '../src/utils/theme-selection.js';
import { generateHash } from '../src/utils/hashUtils.js';
import {
  getCelebrationEffect,
  setCelebrationEffect,
  CELEBRATION_OPTIONS,
} from '../src/utils/celebrationUtils.js';
import {
  activeReminders,
  addReminder,
  dismissReminder,
} from '../src/utils/reminderState.js';

describe('normalizeTheme', () => {
  it('下线的深色玻璃映射到浅色版本', () => {
    assert.equal(normalizeTheme('ios26-glass-dark'), 'ios26-glass');
    assert.equal(normalizeTheme('liquid-aurora-glass-dark'), 'liquid-aurora-glass');
    assert.equal(normalizeTheme('fluid-glass-dark'), 'fluid-glass');
  });

  it('普通主题原样返回', () => {
    for (const key of ['dark', 'glass', 'ios-glass', 'aurora', 'light']) {
      assert.equal(normalizeTheme(key), key);
    }
  });

  it('未知值原样返回', () => {
    assert.equal(normalizeTheme('not-a-theme'), 'not-a-theme');
    assert.equal(normalizeTheme(''), '');
  });
});

describe('generateHash', () => {
  it('返回字母数字串且带时间戳后缀', () => {
    const hash = generateHash();
    assert.equal(typeof hash, 'string');
    assert.match(hash, /^[0-9a-z]+\d{13,}$/);
    assert.ok(hash.length > 20);
  });

  it('多次生成不重复', () => {
    const set = new Set(Array.from({ length: 50 }, generateHash));
    assert.equal(set.size, 50);
  });
});

describe('celebrationUtils', () => {
  it('默认动效为 confetti', () => {
    assert.equal(getCelebrationEffect(), 'confetti');
  });

  it('保存偏好并回读', () => {
    setCelebrationEffect('stars');
    assert.equal(getCelebrationEffect(), 'stars');
    assert.equal(localStorage.getItem('celebration_effect'), 'stars');
  });

  it('非法值被忽略', () => {
    setCelebrationEffect('stars');
    setCelebrationEffect('sparkles'); // 不在允许列表
    assert.equal(getCelebrationEffect(), 'stars');
    assert.equal(localStorage.getItem('celebration_effect'), 'stars');
  });

  it('选项表覆盖全部合法动效', () => {
    assert.equal(CELEBRATION_OPTIONS.length, 5);
    for (const opt of CELEBRATION_OPTIONS) {
      assert.equal(typeof opt.value, 'string');
      assert.equal(typeof opt.label, 'string');
      assert.ok(opt.label.length > 0);
    }
    assert.deepEqual(
      CELEBRATION_OPTIONS.map((o) => o.value),
      ['confetti', 'stars', 'rainbow', 'all', 'none'],
    );
  });
});

describe('reminderState', () => {
  // 该模块用 setTimeout 做 15s 自动消散；全程用 mock 定时器，
  // 既免掉真实的 15 秒等待，也避免挂起的定时器拖住测试进程。
  before(() => mock.timers.enable({ apis: ['setTimeout'] }));
  after(() => mock.timers.reset());

  it('新增提醒会进入列表并带唯一 key', () => {
    addReminder({
      todo: { text: '喝水' },
      dateStr: '2026-10-08',
      timeDesc: '10:00',
      todoTime: '10:00',
      reminderDesc: '提前 5 分钟',
    });
    addReminder({
      todo: { text: '吃药' },
      dateStr: '2026-10-08',
      timeDesc: '11:00',
      todoTime: '11:00',
      reminderDesc: '准时',
    });
    assert.equal(activeReminders.value.length, 2);
    assert.notEqual(activeReminders.value[0].key, activeReminders.value[1].key);
    assert.equal(activeReminders.value[0].text, '喝水');
    assert.equal(activeReminders.value[1].reminderDesc, '准时');
  });

  it('按 key 消散', () => {
    const [first] = activeReminders.value;
    dismissReminder(first.key);
    assert.equal(
      activeReminders.value.some((r) => r.key === first.key),
      false,
    );
    assert.equal(activeReminders.value.length, 1);
    dismissReminder('not-exist'); // 不存在的 key 是 no-op
    assert.equal(activeReminders.value.length, 1);
  });

  it('15 秒后自动消散', () => {
    addReminder({
      todo: { text: '自动消失' },
      dateStr: '2026-10-08',
      timeDesc: '12:00',
      todoTime: '12:00',
      reminderDesc: 'x',
    });
    const key = activeReminders.value.at(-1).key;
    assert.ok(activeReminders.value.some((r) => r.key === key));
    mock.timers.tick(14_000);
    assert.ok(activeReminders.value.some((r) => r.key === key), '未到时间不消失');
    mock.timers.tick(1_000);
    assert.ok(!activeReminders.value.some((r) => r.key === key), '到期自动消失');
    assert.equal(activeReminders.value.length, 0, '所有提醒都已消散');
  });
});
