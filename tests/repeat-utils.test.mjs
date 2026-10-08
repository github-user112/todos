/**
 * 重复事件逻辑测试
 * ------------------------------------------------------------
 * 覆盖（其中大部分用例移植自 test/repeatFunctionTest.js 与
 * test/backwardCompatibilityTest.js，并改为直接断言真实模块）：
 *   1. shouldShowRepeatingTodo：日/周/月/年 + 间隔 + 月末/闰日 + 守卫条件；
 *   2. validateRepeatInterval：各类型上下界与错误信息；
 *   3. getNextRepeatDates / …WithEndDate：后续日期与结束日期截断；
 *   4. 向后兼容：老数据没有 repeat_interval 时等价于间隔 1。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowRepeatingTodo,
  validateRepeatInterval,
  getNextRepeatDates,
  getNextRepeatDatesWithEndDate,
} from '../src/utils/repeatUtils.js';

const d = (s) => new Date(s);
const show = (todoDate, date, type, interval = 1, endDate = null) =>
  shouldShowRepeatingTodo(d(todoDate), d(date), type, interval, endDate);

describe('shouldShowRepeatingTodo · 每日间隔', () => {
  it('每 2 天', () => {
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', 2), true);
    assert.equal(show('2024-01-01', '2024-01-02', 'daily', 2), false);
    assert.equal(show('2024-01-01', '2024-01-03', 'daily', 2), true);
    assert.equal(show('2024-01-01', '2024-01-04', 'daily', 2), false);
    assert.equal(show('2024-01-01', '2024-01-05', 'daily', 2), true);
  });

  it('每天（间隔 1）', () => {
    assert.equal(show('2024-01-01', '2024-01-07', 'daily', 1), true);
  });

  it('早于原始日期不显示', () => {
    assert.equal(show('2024-01-05', '2024-01-04', 'daily', 1), false);
  });
});

describe('shouldShowRepeatingTodo · 每周间隔', () => {
  it('每 3 周（2024-01-01 是周一）', () => {
    assert.equal(show('2024-01-01', '2024-01-01', 'weekly', 3), true);
    assert.equal(show('2024-01-01', '2024-01-08', 'weekly', 3), false);
    assert.equal(show('2024-01-01', '2024-01-15', 'weekly', 3), false);
    assert.equal(show('2024-01-01', '2024-01-22', 'weekly', 3), true);
    assert.equal(show('2024-01-01', '2024-02-12', 'weekly', 3), true);
  });

  it('星期不匹配不显示', () => {
    assert.equal(show('2024-01-01', '2024-01-03', 'weekly', 1), false);
  });
});

describe('shouldShowRepeatingTodo · 每月间隔', () => {
  it('每 2 个月', () => {
    assert.equal(show('2024-01-15', '2024-01-15', 'monthly', 2), true);
    assert.equal(show('2024-01-15', '2024-02-15', 'monthly', 2), false);
    assert.equal(show('2024-01-15', '2024-03-15', 'monthly', 2), true);
    assert.equal(show('2024-01-15', '2024-04-15', 'monthly', 2), false);
    assert.equal(show('2024-01-15', '2024-05-15', 'monthly', 2), true);
  });

  it('月末日期按月末收敛', () => {
    assert.equal(show('2024-01-31', '2024-01-31', 'monthly', 1), true);
    assert.equal(show('2024-01-31', '2024-02-29', 'monthly', 1), true); // 闰年 2 月
    assert.equal(show('2024-01-31', '2024-03-31', 'monthly', 1), true);
    assert.equal(show('2024-01-31', '2024-04-30', 'monthly', 1), true); // 4 月只有 30 天
    assert.equal(show('2024-01-31', '2024-05-31', 'monthly', 1), true);
    assert.equal(show('2024-01-31', '2024-02-28', 'monthly', 1), false); // 闰年不能落在 28
  });

  it('非目标日不显示', () => {
    assert.equal(show('2024-01-15', '2024-03-16', 'monthly', 1), false);
  });
});

describe('shouldShowRepeatingTodo · 每年间隔', () => {
  it('每 2 年', () => {
    assert.equal(show('2024-03-15', '2024-03-15', 'yearly', 2), true);
    assert.equal(show('2024-03-15', '2025-03-15', 'yearly', 2), false);
    assert.equal(show('2024-03-15', '2026-03-15', 'yearly', 2), true);
    assert.equal(show('2024-03-15', '2027-03-15', 'yearly', 2), false);
    assert.equal(show('2024-03-15', '2028-03-15', 'yearly', 2), true);
  });

  it('2/29 在非闰年落到 2/28', () => {
    assert.equal(show('2024-02-29', '2025-02-28', 'yearly', 1), true);
    assert.equal(show('2024-02-29', '2025-03-01', 'yearly', 1), false);
    assert.equal(show('2024-02-29', '2028-02-29', 'yearly', 1), true);
  });
});

describe('shouldShowRepeatingTodo · 守卫条件', () => {
  it('不重复/未知类型不显示', () => {
    assert.equal(show('2024-01-01', '2024-01-01', 'none', 1), false);
    assert.equal(show('2024-01-01', '2024-01-01', undefined, 1), false);
    assert.equal(show('2024-01-01', '2024-01-01', '', 1), false);
    assert.equal(show('2024-01-01', '2024-01-01', 'hourly', 1), false);
  });

  it('非法间隔不显示', () => {
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', 0), false);
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', -1), false);
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', 1.5), false);
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', '2'), false);
    assert.equal(show('2024-01-01', '2024-01-01', 'daily', NaN), false);
  });

  it('结束日期之后不显示', () => {
    assert.equal(show('2024-01-01', '2024-01-03', 'daily', 1, d('2024-01-05')), true);
    assert.equal(show('2024-01-01', '2024-01-05', 'daily', 1, d('2024-01-05')), true);
    assert.equal(show('2024-01-01', '2024-01-06', 'daily', 1, d('2024-01-05')), false);
  });

  it('向后兼容：老数据缺省间隔等价于间隔 1', () => {
    const cases = [
      { type: 'daily', date: '2024-01-01' },
      { type: 'weekly', date: '2024-01-01' },
      { type: 'monthly', date: '2024-01-01' },
      { type: 'yearly', date: '2024-01-01' },
      { type: 'none', date: '2024-01-01' },
    ];
    const probes = ['2024-01-01', '2024-01-02', '2024-01-08', '2024-02-01', '2025-01-01'];
    for (const c of cases) {
      for (const probe of probes) {
        assert.equal(
          shouldShowRepeatingTodo(d(c.date), d(probe), c.type, undefined),
          shouldShowRepeatingTodo(d(c.date), d(probe), c.type, 1),
          `${c.type} @ ${probe}`,
        );
      }
    }
  });
});

describe('validateRepeatInterval', () => {
  it('各类型上下界', () => {
    for (const [type, min, max] of [
      ['daily', 1, 365],
      ['weekly', 1, 52],
      ['monthly', 1, 12],
      ['yearly', 1, 10],
    ]) {
      assert.equal(validateRepeatInterval(type, min).valid, true, `${type}=${min}`);
      assert.equal(validateRepeatInterval(type, max).valid, true, `${type}=${max}`);
      assert.equal(validateRepeatInterval(type, min - 1).valid, false, `${type}=${min - 1}`);
      assert.equal(validateRepeatInterval(type, max + 1).valid, false, `${type}=${max + 1}`);
      assert.equal(validateRepeatInterval(type, 1.5).valid, false, `${type}=1.5`);
    }
    assert.equal(validateRepeatInterval('daily', 366).valid, false);
    assert.equal(validateRepeatInterval('weekly', 53).valid, false);
    assert.equal(validateRepeatInterval('monthly', 13).valid, false);
    assert.equal(validateRepeatInterval('yearly', 11).valid, false);
  });

  it('none 恒通过，未知类型拒绝', () => {
    assert.deepEqual(validateRepeatInterval('none', 0), { valid: true });
    const unknown = validateRepeatInterval('hourly', 1);
    assert.equal(unknown.valid, false);
    assert.equal(unknown.message, '不支持的重复类型');
  });

  it('错误信息带上下界', () => {
    const msg = validateRepeatInterval('daily', 366).message;
    assert.match(msg, /每日/);
    assert.match(msg, /1-365/);
    assert.match(msg, /天/);
    const monthly = validateRepeatInterval('monthly', 0).message;
    assert.match(monthly, /每月/);
    assert.match(monthly, /1-12/);
  });
});

describe('getNextRepeatDates', () => {
  it('每日取后续若干天', () => {
    const got = getNextRepeatDates(d('2024-01-01'), 'daily', 2, 3).map((x) =>
      x.toISOString().slice(0, 10),
    );
    assert.deepEqual(got, ['2024-01-03', '2024-01-05', '2024-01-07']);
  });

  it('每周按 7×间隔推进', () => {
    const got = getNextRepeatDates(d('2024-01-01'), 'weekly', 2, 2).map((x) =>
      x.toISOString().slice(0, 10),
    );
    assert.deepEqual(got, ['2024-01-15', '2024-01-29']);
  });

  it('每月处理月末（1/31 → 2/29 → 3/31）', () => {
    const got = getNextRepeatDates(d('2024-01-31'), 'monthly', 1, 2).map((x) =>
      x.toISOString().slice(0, 10),
    );
    assert.deepEqual(got, ['2024-02-29', '2024-03-31']);
  });

  it('每年 2/29 落到非闰年 2/28', () => {
    const got = getNextRepeatDates(d('2024-02-29'), 'yearly', 1, 2).map((x) =>
      x.toISOString().slice(0, 10),
    );
    assert.deepEqual(got, ['2025-02-28', '2026-02-28']);
  });

  it('不重复返回空数组', () => {
    assert.deepEqual(getNextRepeatDates(d('2024-01-01'), 'none', 1, 3), []);
    assert.deepEqual(getNextRepeatDates(d('2024-01-01'), undefined, 1, 3), []);
  });
});

describe('getNextRepeatDatesWithEndDate', () => {
  it('超过结束日期即截断', () => {
    const got = getNextRepeatDatesWithEndDate(
      d('2024-01-01'),
      'daily',
      1,
      5,
      '2024-01-03',
    ).map((x) => x.toISOString().slice(0, 10));
    assert.deepEqual(got, ['2024-01-02', '2024-01-03']);
  });

  it('无结束日期等同于 getNextRepeatDates', () => {
    const a = getNextRepeatDatesWithEndDate(d('2024-01-01'), 'daily', 1, 4, '');
    const b = getNextRepeatDates(d('2024-01-01'), 'daily', 1, 4);
    assert.deepEqual(
      a.map((x) => x.getTime()),
      b.map((x) => x.getTime()),
    );
  });

  it('不重复返回空数组', () => {
    assert.deepEqual(
      getNextRepeatDatesWithEndDate(d('2024-01-01'), 'none', 1, 3, '2024-12-31'),
      [],
    );
  });
});
