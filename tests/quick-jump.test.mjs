/**
 * 左上角日期「快速跳转」纯逻辑测试
 * ------------------------------------------------------------
 *   1. 年月合法性与闰年；
 *   2. 目标月天数（含 0-99 年份不被 Date 映射成 1900+ 的坑）；
 *   3. 十年区间面板的年份分组；
 *   4. jumpToYM：保留原“日”、月末收敛、不改动基准日期。
 *
 * 运行：npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidYM,
  isLeapYear,
  daysInMonth,
  decadeStart,
  decadeYears,
  jumpToYM,
} from '../src/utils/quickJump.js';

describe('quickJump · 年月校验', () => {
  it('接受合法年月', () => {
    assert.equal(isValidYM(2026, 0), true);
    assert.equal(isValidYM(2026, 11), true);
    assert.equal(isValidYM(1, 0), true);
    assert.equal(isValidYM(9999, 6), true);
  });

  it('拒绝越界与非整数', () => {
    assert.equal(isValidYM(2026, 12), false);
    assert.equal(isValidYM(2026, -1), false);
    assert.equal(isValidYM(0, 0), false);
    assert.equal(isValidYM(10000, 0), false);
    assert.equal(isValidYM(2026.5, 0), false);
    assert.equal(isValidYM(2026, 3.5), false);
    assert.equal(isValidYM('2026', 0), false);
    assert.equal(isValidYM(NaN, NaN), false);
  });
});

describe('quickJump · 闰年与月天数', () => {
  it('闰年判定（四百年规则）', () => {
    assert.equal(isLeapYear(2024), true);
    assert.equal(isLeapYear(2026), false);
    assert.equal(isLeapYear(1900), false);
    assert.equal(isLeapYear(2000), true);
    assert.equal(isLeapYear(2100), false);
    assert.equal(isLeapYear(400), true);
  });

  it('常规月份天数', () => {
    assert.equal(daysInMonth(2026, 0), 31);
    assert.equal(daysInMonth(2026, 3), 30);
    assert.equal(daysInMonth(2026, 11), 31);
  });

  it('二月跟随闰年', () => {
    assert.equal(daysInMonth(2024, 1), 29);
    assert.equal(daysInMonth(2026, 1), 28);
    assert.equal(daysInMonth(2100, 1), 28);
    assert.equal(daysInMonth(2000, 1), 29);
  });

  it('0-99 年份不被 Date 构造映射成 1900+', () => {
    // 20 年是闰年 → 29 天；100 年非闰年 → 28 天
    assert.equal(daysInMonth(20, 1), 29);
    assert.equal(daysInMonth(100, 1), 28);
  });
});

describe('quickJump · 十年区间', () => {
  it('十年起始年', () => {
    assert.equal(decadeStart(2026), 2020);
    assert.equal(decadeStart(2020), 2020);
    assert.equal(decadeStart(2019), 2010);
    assert.equal(decadeStart(2000), 2000);
  });

  it('面板返回 10 个连续年份', () => {
    assert.deepEqual(decadeYears(2026), [
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029,
    ]);
    assert.equal(decadeYears(1999).length, 10);
    assert.equal(decadeYears(1999)[0], 1990);
    assert.equal(decadeYears(1999)[9], 1999);
  });
});

describe('quickJump · jumpToYM', () => {
  it('保留原来的“日”', () => {
    const base = new Date(2026, 0, 15, 9, 30);
    const d = jumpToYM(base, 2026, 6);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 6);
    assert.equal(d.getDate(), 15);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 30);
  });

  it('目标月没有这一天时收敛到月末（1/31 → 2/28）', () => {
    const d = jumpToYM(new Date(2026, 0, 31), 2026, 1);
    assert.equal(d.getMonth(), 1);
    assert.equal(d.getDate(), 28);
  });

  it('闰年 2/29 → 非闰年 2/28', () => {
    const d = jumpToYM(new Date(2024, 1, 29), 2026, 1);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 1);
    assert.equal(d.getDate(), 28);
  });

  it('目标月存在这一天则原样保留（4/30 → 3/30）', () => {
    const d = jumpToYM(new Date(2026, 3, 30), 2026, 2);
    assert.equal(d.getMonth(), 2);
    assert.equal(d.getDate(), 30);
  });

  it('跨年跳转', () => {
    const d = jumpToYM(new Date(2026, 9, 8), 2027, 2);
    assert.equal(d.getFullYear(), 2027);
    assert.equal(d.getMonth(), 2);
    assert.equal(d.getDate(), 8);
  });

  it('不修改基准日期', () => {
    const base = new Date(2026, 0, 31, 15, 30);
    const before = base.getTime();
    jumpToYM(base, 2026, 1);
    assert.equal(base.getTime(), before);
    assert.equal(base.getMonth(), 0);
    assert.equal(base.getDate(), 31);
  });

  it('非法年月原样返回', () => {
    const base = new Date(2026, 0, 31);
    assert.equal(jumpToYM(base, 2026, 12).getTime(), base.getTime());
    assert.equal(jumpToYM(base, -1, 0).getTime(), base.getTime());
  });

  it('基准日期非法时回退到今天', () => {
    const d = jumpToYM(new Date('not a date'), 2026, 0);
    assert.equal(d.getFullYear(), new Date().getFullYear());
    assert.ok(!Number.isNaN(d.getTime()));
  });
});
