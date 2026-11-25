/**
 * 节假日加载年份测试（collectYears / normalizeYears）
 * ------------------------------------------------------------
 * 背景：日历「今日优先」视图固定渲染 35 天，年末会跨到次年 1 月。
 * 只按 currentDate 的年份加载，会漏掉次年 1 月的元旦数据。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectYears, normalizeYears } from '../src/utils/holidayYears.js';
import {
  isHoliday,
  isWorkday,
  findLastWorkday,
} from '../src/utils/holidayAdjustment.js';

/** 复刻「今日优先」窗口：当前周周一往前推一周起算，共 35 天 */
function buildTodayPriorityWindow(todayStr) {
  const view = new Date(`${todayStr}T00:00:00`);
  const offsetToMonday = view.getDay() === 0 ? 6 : view.getDay() - 1;
  const monday = new Date(view);
  monday.setDate(view.getDate() - offsetToMonday);
  const start = new Date(monday);
  start.setDate(start.getDate() - 7);

  const days = [];
  for (let i = 0; i < 35; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

describe('collectYears', () => {
  it('12 月的今日优先窗口跨年时返回两个年份', () => {
    const window = buildTodayPriorityWindow('2026-12-15');
    assert.equal(window.length, 35);
    assert.equal(window[0].toISOString().slice(0, 10), '2026-12-07');
    assert.equal(window[34].toISOString().slice(0, 10), '2027-01-10');
    assert.deepEqual(collectYears(window), [2026, 2027]);
  });

  it('窗口完全落在同一年时只返回一个年份', () => {
    assert.deepEqual(collectYears(buildTodayPriorityWindow('2026-06-10')), [2026]);
  });

  it('支持 YYYY-MM-DD 字符串与年份数字', () => {
    assert.deepEqual(
      collectYears(['2026-12-31', '2027-01-01', 2028, new Date('2025-03-02T00:00:00')]),
      [2025, 2026, 2027, 2028],
    );
  });

  it('去重并升序', () => {
    assert.deepEqual(collectYears(['2027-01-02', '2026-12-31', '2026-12-01']), [2026, 2027]);
  });

  it('空值不抛错', () => {
    assert.deepEqual(collectYears([]), []);
    assert.deepEqual(collectYears(undefined), []);
    assert.deepEqual(collectYears(null), []);
    assert.deepEqual(collectYears(['bad-date', null, undefined, {}]), []);
  });
});

describe('normalizeYears', () => {
  it('兼容单年与数组两种入参', () => {
    assert.deepEqual(normalizeYears(2026), [2026]);
    assert.deepEqual(normalizeYears([2027, 2026]), [2026, 2027]);
  });

  it('剔除重复与非法值', () => {
    assert.deepEqual(normalizeYears([2026, 2026, '2026', 2027]), [2026, 2027]);
    assert.deepEqual(normalizeYears([null, undefined, 'abc', 1.5]), []);
  });

  it('支持日期字符串与 Date', () => {
    assert.deepEqual(normalizeYears(['2027-01-01', new Date('2026-12-31T00:00:00')]), [2026, 2027]);
  });
});

// 2027 年元旦（1/1 周五、1/2 周六、1/3 周日）+ 2026-12-31 周四
const crossYearData = {
  '2027-01-01': { name: '元旦', type: 'public_holiday' },
  '2027-01-02': { name: '元旦', type: 'public_holiday' },
  '2027-01-03': { name: '元旦', type: 'public_holiday' },
};

describe('跨年窗口的节假日判断', () => {
  it('加载了次年数据后，元旦被识别为节假日', () => {
    assert.equal(isHoliday('2027-01-01', crossYearData), true);
    assert.equal(isWorkday('2027-01-01', crossYearData), false);
  });

  it('缺少次年数据时，元旦被误判为工作日（修复前的缺陷）', () => {
    assert.equal(isHoliday('2027-01-01', { ...crossYearData, '2027-01-01': undefined }), false);
  });

  it('元旦的待办顺延到 2026-12-31（周四）', () => {
    assert.equal(findLastWorkday('2027-01-01', crossYearData), '2026-12-31');
  });
});
