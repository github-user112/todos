/**
 * 重复待办「锚点日期」推导测试
 * ------------------------------------------------------------
 *   1. 日期解析/格式化/有效性（含 2/30、闰年）；
 *   2. 星期 / 月几号 / 年月日三种语义化切换，含「落在同一周期内的哪一天」；
 *   3. 月末与闰日收敛（31 号 → 2 月月末、2/29 → 非闰年 2/28）；
 *   4. 下限规则：重复待办不能早于今天，不重复待办不受限；
 *   5. 校验：格式非法 / 结束日期早于开始日期。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDateStr,
  parseLocalDate,
  toDateStr,
  todayStr,
  weekdayIndexOf,
  addDaysStr,
  clampDateStr,
  stepDateStr,
  setWeekdayStr,
  setMonthDayStr,
  setYearlyStr,
  applyAnchorPatch,
  validateAnchor,
  isMonthEndClamped,
} from '../src/utils/repeatAnchor.js';

const TODAY = '2026-10-09'; // 周五

describe('日期解析与格式化', () => {
  it('识别合法日期', () => {
    assert.equal(isValidDateStr('2026-10-09'), true);
    assert.equal(isValidDateStr('2024-02-29'), true);
    assert.equal(isValidDateStr('2026-02-28'), true);
  });

  it('拒绝不存在的日期与非法格式', () => {
    assert.equal(isValidDateStr('2026-02-30'), false);
    assert.equal(isValidDateStr('2026-13-01'), false);
    assert.equal(isValidDateStr('2026-00-10'), false);
    assert.equal(isValidDateStr('2026-10-00'), false);
    assert.equal(isValidDateStr('2023-02-29'), false, '平年没有 2/29');
    assert.equal(isValidDateStr('2026-10-9'), false);
    assert.equal(isValidDateStr('26-10-09'), false);
    assert.equal(isValidDateStr(''), false);
    assert.equal(isValidDateStr(null), false);
    assert.equal(isValidDateStr(undefined), false);
    assert.equal(isValidDateStr(20261009), false);
  });

  it('按本地零点解析（不受 UTC 偏移影响）', () => {
    const d = parseLocalDate('2026-10-09');
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 9);
    assert.equal(d.getDate(), 9);
    assert.equal(d.getHours(), 0);
    assert.equal(toDateStr(d), '2026-10-09');
    assert.equal(parseLocalDate('2026-02-30'), null);
  });

  it('星期与加减天数', () => {
    assert.equal(weekdayIndexOf('2026-10-09'), 5); // 周五
    assert.equal(weekdayIndexOf('2026-10-11'), 0); // 周日
    assert.equal(weekdayIndexOf('bad'), -1);
    assert.equal(addDaysStr('2026-10-09', 2), '2026-10-11');
    assert.equal(addDaysStr('2026-10-31', 1), '2026-11-01');
    assert.equal(addDaysStr('2026-01-01', -1), '2025-12-31');
    assert.equal(addDaysStr('2024-02-28', 1), '2024-02-29', '闰日');
    assert.equal(addDaysStr('2026-02-28', 1), '2026-03-01');
    assert.equal(addDaysStr('bad', 1), null);
  });

  it('todayStr 就是本地今天', () => {
    const now = new Date();
    assert.equal(todayStr(), toDateStr(now));
  });
});

describe('setWeekdayStr · 每周几', () => {
  it('在同一周内换星期（周五 → 周日）', () => {
    assert.equal(setWeekdayStr('2026-10-09', 0), '2026-10-11');
    assert.equal(setWeekdayStr('2026-10-09', 1), '2026-10-05', '同一周的周一更早');
    assert.equal(setWeekdayStr('2026-10-09', 6), '2026-10-10');
    assert.equal(setWeekdayStr('2026-10-09', 5), '2026-10-09', '选自己不变');
  });

  it('结果始终落在同一周（周一为周首）', () => {
    // 2026-10-11 是周日，其所在周为 10/05(周一)-10/11(周日)
    assert.equal(setWeekdayStr('2026-10-11', 1), '2026-10-05');
    assert.equal(setWeekdayStr('2026-10-11', 0), '2026-10-11');
    assert.equal(setWeekdayStr('2026-10-07', 3), '2026-10-07');
    assert.equal(setWeekdayStr('2026-10-07', 0), '2026-10-11');
  });

  it('支持周日为周首', () => {
    // 周首=周日时，10/09(周五) 所在周是 10/04(周日)-10/10(周六)
    assert.equal(setWeekdayStr('2026-10-09', 0, { weekStart: 0 }), '2026-10-04');
    assert.equal(setWeekdayStr('2026-10-09', 6, { weekStart: 0 }), '2026-10-10');
  });

  it('早于下限时按整周往后推到最近的同一星期', () => {
    // 锚点是很久以前的周五，选周一(同周更早) → 推到下限之后的最近周一
    assert.equal(setWeekdayStr('2024-01-05', 1, { minDate: '2026-10-09' }), '2026-10-12');
    // 选周日落在 2024-01-07，同样早于下限 → 推到最近的周日
    assert.equal(setWeekdayStr('2024-01-05', 0, { minDate: '2026-10-09' }), '2026-10-11');
    // 本来就不早于下限则原地不动
    assert.equal(setWeekdayStr('2026-10-09', 0, { minDate: '2026-10-09' }), '2026-10-11');
  });

  it('跨月/跨年不丢周期', () => {
    assert.equal(setWeekdayStr('2026-01-02', 0), '2026-01-04'); // 周五 → 同周周日
    assert.equal(setWeekdayStr('2025-12-31', 1), '2025-12-29');
  });

  it('非法输入返回 null', () => {
    assert.equal(setWeekdayStr('2026-10-09', 7), null);
    assert.equal(setWeekdayStr('2026-10-09', -1), null);
    assert.equal(setWeekdayStr('2026-10-09', 1.5), null);
    assert.equal(setWeekdayStr('bad', 1), null);
  });
});

describe('setMonthDayStr · 每月几号', () => {
  it('同月改日号', () => {
    assert.equal(setMonthDayStr('2026-10-09', 15), '2026-10-15');
    assert.equal(setMonthDayStr('2026-10-09', 1), '2026-10-01');
    assert.equal(setMonthDayStr('2026-10-09', 9), '2026-10-09');
  });

  it('超出当月天数收敛到月末', () => {
    assert.equal(setMonthDayStr('2026-01-31', 31), '2026-01-31');
    assert.equal(setMonthDayStr('2026-02-10', 31), '2026-02-28');
    assert.equal(setMonthDayStr('2024-02-10', 31), '2024-02-29', '闰年 2 月');
    assert.equal(setMonthDayStr('2026-04-10', 31), '2026-04-30');
    assert.equal(isMonthEndClamped('2026-02-28', 31), true);
    assert.equal(isMonthEndClamped('2026-01-31', 31), false);
    assert.equal(isMonthEndClamped('2026-01-15', 31), false);
  });

  it('早于下限时按月往后推', () => {
    assert.equal(setMonthDayStr('2024-01-05', 8, { minDate: '2026-10-09' }), '2026-11-08');
    assert.equal(setMonthDayStr('2026-10-05', 8, { minDate: '2026-10-09' }), '2026-11-08');
    // 目标日号 8 号早于下限 → 顺延到下个月 8 号，而不是留在过去
    assert.equal(setMonthDayStr('2026-10-20', 8, { minDate: '2026-10-09' }), '2026-11-08');
  });

  it('非法日号返回 null', () => {
    assert.equal(setMonthDayStr('2026-10-09', 0), null);
    assert.equal(setMonthDayStr('2026-10-09', 32), null);
    assert.equal(setMonthDayStr('2026-10-09', 15.5), null);
    assert.equal(setMonthDayStr('bad', 15), null);
  });
});

describe('setYearlyStr · 每年几月几号', () => {
  it('改月份保留日号', () => {
    assert.equal(setYearlyStr('2026-10-09', 12, 9), '2026-12-09');
    assert.equal(setYearlyStr('2026-10-09', 3, 9), '2026-03-09');
    assert.equal(setYearlyStr('2026-10-09', 10, 9), '2026-10-09');
  });

  it('2/29 在非闰年落到 2/28（与日历渲染规则一致）', () => {
    assert.equal(setYearlyStr('2024-02-29', 2, 29), '2024-02-29');
    // 锚点早于下限时推进到下一年 2 月，该年只有 28 天 → 收敛
    assert.equal(setYearlyStr('2024-02-29', 2, 29, { minDate: '2025-01-01' }), '2025-02-28');
    assert.equal(setYearlyStr('2024-02-29', 3, 29), '2024-03-29');
  });

  it('早于下限时按年往后推', () => {
    assert.equal(setYearlyStr('2020-06-09', 5, 9, { minDate: '2026-10-09' }), '2027-05-09');
    assert.equal(setYearlyStr('2020-12-09', 1, 9, { minDate: '2026-10-09' }), '2027-01-09');
    // 目标 2026-01-09 早于下限 → 推到 2027-01-09
    assert.equal(setYearlyStr('2026-12-09', 1, 9, { minDate: '2026-10-09' }), '2027-01-09');
    // 目标不早于下限则保持当年
    assert.equal(setYearlyStr('2026-12-09', 12, 9, { minDate: '2026-10-09' }), '2026-12-09');
  });

  it('非法参数返回 null', () => {
    assert.equal(setYearlyStr('2026-10-09', 0, 9), null);
    assert.equal(setYearlyStr('2026-10-09', 13, 9), null);
    assert.equal(setYearlyStr('2026-10-09', 10, 0), null);
    assert.equal(setYearlyStr('2026-10-09', 10, 32), null);
    assert.equal(setYearlyStr('bad', 10, 9), null);
  });
});

describe('applyAnchorPatch · 统一入口', () => {
  it('按补丁类型分派', () => {
    assert.equal(applyAnchorPatch('2026-10-09', { weekday: 0 }), '2026-10-11');
    assert.equal(applyAnchorPatch('2026-10-09', { monthDay: 20 }), '2026-10-20');
    assert.equal(applyAnchorPatch('2026-10-09', { month: 1 }), '2026-01-09');
    assert.equal(applyAnchorPatch('2026-10-09', { month: 1, day: 20 }), '2026-01-20');
    assert.equal(applyAnchorPatch('2026-10-09', { dateStr: '2026-11-01' }), '2026-11-01');
    assert.equal(applyAnchorPatch('2026-10-09', {}), '2026-10-09');
  });

  it('重复待办自动带今天下限，不重复待办不限', () => {
    const patch = { weekday: 1 }; // 同周周一，比 10/09 更早
    assert.equal(
      applyAnchorPatch('2026-10-09', patch, { repeatType: 'weekly', minDate: TODAY }),
      '2026-10-12',
    );
    assert.equal(
      applyAnchorPatch('2026-10-09', patch, { repeatType: 'none', minDate: TODAY }),
      '2026-10-05',
    );
    // 未传 minDate 时，重复待办默认以今天为下限
    assert.equal(applyAnchorPatch('2026-10-09', patch, { repeatType: 'weekly' }), '2026-10-12');
    assert.equal(applyAnchorPatch('2026-10-09', patch, { repeatType: 'none' }), '2026-10-05');
  });

  it('直接给日期也遵守下限（仅重复待办）', () => {
    assert.equal(
      applyAnchorPatch('2026-10-09', { dateStr: '2020-01-01' }, { repeatType: 'daily', minDate: TODAY }),
      TODAY,
    );
    assert.equal(
      applyAnchorPatch('2026-10-09', { dateStr: '2020-01-01' }, { repeatType: 'none', minDate: TODAY }),
      '2020-01-01',
    );
  });

  it('非法基准日回退到今天后再套用补丁', () => {
    assert.equal(applyAnchorPatch('bad', { monthDay: 5 }), setMonthDayStr(todayStr(), 5));
    assert.equal(applyAnchorPatch('bad', {}), todayStr());
  });

  it('非法补丁值退回原锚点，不产生 NaN 日期', () => {
    assert.equal(applyAnchorPatch('2026-10-09', { weekday: 9 }), '2026-10-09');
    assert.equal(applyAnchorPatch('2026-10-09', { monthDay: 99 }), '2026-10-09');
    assert.equal(applyAnchorPatch('2026-10-09', { month: 99 }), '2026-10-09');
    assert.equal(applyAnchorPatch('2026-10-09', { dateStr: '2026-13-40' }), '2026-10-09');
  });
});

describe('stepDateStr / clampDateStr', () => {
  it('前后步进遵守下限', () => {
    assert.equal(stepDateStr('2026-10-09', 1), '2026-10-10');
    assert.equal(stepDateStr('2026-10-09', -1), '2026-10-08');
    assert.equal(stepDateStr('2026-10-09', -3, { minDate: TODAY }), TODAY);
    assert.equal(stepDateStr('bad', 1), 'bad');
  });

  it('clamp 行为', () => {
    assert.equal(clampDateStr('2020-01-01', TODAY), TODAY);
    assert.equal(clampDateStr('2027-01-01', TODAY), '2027-01-01');
    assert.equal(clampDateStr('2020-01-01'), '2020-01-01');
    assert.equal(clampDateStr('bad', TODAY), TODAY);
  });
});

describe('validateAnchor', () => {
  it('合法锚点通过', () => {
    assert.deepEqual(validateAnchor('2026-10-09', { repeatType: 'weekly', minDate: TODAY }), {
      valid: true,
    });
    assert.deepEqual(validateAnchor('2026-10-09', { endDate: '2026-12-31' }), { valid: true });
    assert.deepEqual(validateAnchor('2026-10-09', { endDate: '2026-10-09' }), { valid: true });
  });

  it('格式非法', () => {
    assert.equal(validateAnchor('2026-02-30', {}).code, 'INVALID_DATE');
    assert.equal(validateAnchor('2026/10/09', {}).code, 'INVALID_DATE');
    assert.equal(validateAnchor('', {}).code, 'INVALID_DATE');
  });

  it('结束日期早于开始日期', () => {
    assert.equal(validateAnchor('2026-10-09', { endDate: '2026-10-08' }).code, 'END_BEFORE_START');
    assert.equal(validateAnchor('2026-10-09', { endDate: '' }).valid, true);
    // 结束日期本身非法时不误报（历史脏数据不该挡住编辑）
    assert.equal(validateAnchor('2026-10-09', { endDate: 'bad' }).valid, true);
  });

  it('重复待办不能早于今天，不重复待办可以', () => {
    assert.equal(validateAnchor('2020-01-01', { repeatType: 'weekly', minDate: TODAY }).code, 'BEFORE_TODAY');
    assert.equal(validateAnchor('2020-01-01', { repeatType: 'none', minDate: TODAY }).valid, true);
    assert.equal(validateAnchor(TODAY, { repeatType: 'daily', minDate: TODAY }).valid, true);
  });
});
