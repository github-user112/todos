/**
 * 节假日调休判断测试（isWorkday / isHoliday / findLastWorkday）
 * ------------------------------------------------------------
 * 以 2026-10 国庆周为样本（10/1 周四、10/3 周六、10/4 周日、10/5 周一）。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWorkday,
  isHoliday,
  findLastWorkday,
} from '../src/utils/holidayAdjustment.js';

const HOLIDAY = (type) => ({ type });
const data = {
  '2026-10-01': HOLIDAY('public_holiday'),
  '2026-10-02': HOLIDAY('public_holiday'),
  '2026-10-05': HOLIDAY('public_holiday'),
  '2026-10-10': HOLIDAY('transfer_workday'), // 周六补班
};

describe('isWorkday', () => {
  it('无节假日数据时按周末判断', () => {
    assert.equal(isWorkday('2026-10-08', {}), true); // 周四
    assert.equal(isWorkday('2026-10-03', {}), false); // 周六
    assert.equal(isWorkday('2026-10-04', {}), false); // 周日
    assert.equal(isWorkday('2026-10-08', undefined), true); // 空数据不抛错
  });

  it('法定节假日把工作日变成休息日', () => {
    assert.equal(isWorkday('2026-10-01', data), false); // 周四但放假
    assert.equal(isWorkday('2026-10-05', data), false); // 周一但放假
  });

  it('调休上班把周末变成工作日', () => {
    assert.equal(isWorkday('2026-10-10', data), true); // 周六补班
  });

  it('未知 type 回退到周末判断', () => {
    assert.equal(isWorkday('2026-10-03', { '2026-10-03': { type: 'whatever' } }), false);
    assert.equal(isWorkday('2026-10-08', { '2026-10-08': { type: 'whatever' } }), true);
  });

  it('兼容其它 type 别名', () => {
    assert.equal(isWorkday('2026-10-03', { '2026-10-03': { type: 'work_day' } }), true);
    assert.equal(isWorkday('2026-10-03', { '2026-10-03': { type: 'rest' } }), false);
    assert.equal(isWorkday('2026-10-08', { '2026-10-08': { type: 'holiday' } }), false);
  });
});

describe('isHoliday', () => {
  it('与 isWorkday 互补', () => {
    for (const day of ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-08', '2026-10-10']) {
      assert.equal(isHoliday(day, data), !isWorkday(day, data), day);
    }
  });

  it('调休上班不算节假日', () => {
    assert.equal(isHoliday('2026-10-10', data), false);
    assert.equal(isHoliday('2026-10-10', {}), true); // 无数据时按周末算
  });
});

describe('findLastWorkday', () => {
  it('周日往前找最近工作日（→ 周五）', () => {
    assert.equal(findLastWorkday('2026-10-04', {}), '2026-10-02');
  });

  it('跳过法定节假日', () => {
    // 10/5 周一放假 → 10/4 周日、10/3 周六 → 10/2 也是假期 → 10/1 假期 → 9/30 周三
    assert.equal(findLastWorkday('2026-10-06', data), '2026-09-30');
  });

  it('工作日本身就是最近工作日', () => {
    assert.equal(findLastWorkday('2026-10-08', data), '2026-10-07');
  });

  it('超过 maxDays 找不到时返回原日期', () => {
    assert.equal(findLastWorkday('2026-10-04', {}, 1), '2026-10-04');
    assert.equal(findLastWorkday('2026-10-04', {}, 0), '2026-10-04');
  });

  it('不会改动传入日期', () => {
    findLastWorkday('2026-10-04', data);
    assert.equal('2026-10-04', '2026-10-04');
  });
});
