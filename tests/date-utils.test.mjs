/**
 * 日期工具测试（formatDate / getWeekNumber）
 * ------------------------------------------------------------
 * ISO 8601 周数：含 1月4日的周为第 1 周、周一为一周起点，
 * 因此跨年周（如 2025-12-29）应算作新一年的第 1 周。
 *
 * 运行：npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, getWeekNumber } from '../src/utils/dateUtils.js';

const d = (s) => new Date(s);

describe('formatDate', () => {
  it('补零为 YYYY-MM-DD', () => {
    assert.equal(formatDate(new Date(2026, 0, 1)), '2026-01-01');
    assert.equal(formatDate(new Date(2026, 8, 8)), '2026-09-08');
    assert.equal(formatDate(new Date(2026, 11, 31)), '2026-12-31');
  });

  it('与本地时间一致（不受 UTC 影响）', () => {
    const date = new Date(2026, 5, 15, 23, 59);
    assert.equal(formatDate(date), '2026-06-15');
  });
});

describe('getWeekNumber', () => {
  it('年初：含 1月4日的那周为第 1 周', () => {
    assert.equal(getWeekNumber(d('2026-01-01')), 1); // 周四
    assert.equal(getWeekNumber(d('2026-01-04')), 1); // 周日（第 1 周收尾）
    assert.equal(getWeekNumber(d('2026-01-05')), 2); // 周一（第 2 周开始）
  });

  it('跨年周归属到新一年', () => {
    assert.equal(getWeekNumber(d('2025-12-29')), 1); // 2026 年第 1 周
    assert.equal(getWeekNumber(d('2024-12-30')), 1); // 2025 年第 1 周
  });

  it('年末为第 52/53 周', () => {
    assert.equal(getWeekNumber(d('2026-12-31')), 53);
    assert.equal(getWeekNumber(d('2020-12-31')), 53);
    assert.equal(getWeekNumber(d('2026-10-08')), 41);
    assert.equal(getWeekNumber(d('2026-02-28')), 9);
  });

  it('全年周数单调不减且落在 1-53', () => {
    let prev = getWeekNumber(d('2026-01-01'));
    assert.ok(prev >= 1 && prev <= 53);
    for (let i = 1; i < 365; i++) {
      const day = new Date(2026, 0, 1);
      day.setDate(day.getDate() + i);
      const wn = getWeekNumber(day);
      assert.ok(wn >= 1 && wn <= 53, `${day.toDateString()} → ${wn}`);
      assert.ok(wn === prev || wn === prev + 1, `${day.toDateString()}: ${prev} → ${wn}`);
      prev = wn;
    }
  });

  it('不修改传入的日期对象', () => {
    const day = d('2026-10-08');
    const t = day.getTime();
    getWeekNumber(day);
    assert.equal(day.getTime(), t);
  });
});
