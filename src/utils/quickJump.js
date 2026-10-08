/**
 * 左上角日期「快速跳转」纯逻辑
 * ------------------------------------------------------------
 * 供 header 的跳转弹窗与日历容器共用：年份面板（十年区间）、
 * 月份切换、把基准日期切到目标年月（自动收敛到月末）。
 */

/** 合法的年月（年 1-9999，月 0-11，均需为整数） */
export function isValidYM(year, month) {
  return (
    Number.isInteger(year) &&
    year >= 1 &&
    year <= 9999 &&
    Number.isInteger(month) &&
    month >= 0 &&
    month <= 11
  );
}

/** 目标年份是否为闰年 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** 某年某月的天数（1-12 对应 month 0-11） */
export function daysInMonth(year, month) {
  // setUTCFullYear(y, m, d) 直接落年月日，避开 0-99 年份被 Date 映射成 1900+ 的坑
  const d = new Date(0);
  d.setUTCFullYear(year, month + 1, 0); // 0 = 上月最后一天
  d.setUTCHours(0, 0, 0, 0);
  return d.getUTCDate();
}

/** 十年区间的起始年（2026 → 2020，2020 → 2020，2019 → 2010） */
export function decadeStart(year) {
  return Math.floor(year / 10) * 10;
}

/** 十年区间面板上的 10 个年份 */
export function decadeYears(year) {
  const start = decadeStart(year);
  return Array.from({ length: 10 }, (_, i) => start + i);
}

/**
 * 把基准日期切到目标年月，尽量保留原来的“日”
 * 目标月没有这一天（如 1/31 → 2月）时收敛到月末。
 * @param {Date} base 基准日期（不会被修改）
 * @param {number} year 目标年
 * @param {number} month 目标月（0-11）
 * @returns {Date}
 */
export function jumpToYM(base, year, month) {
  if (!(base instanceof Date) || Number.isNaN(base.getTime())) {
    return new Date();
  }
  if (!isValidYM(year, month)) return new Date(base);
  const day = Math.min(base.getDate(), daysInMonth(year, month));
  const d = new Date(base);
  d.setFullYear(year, month, day);
  return d;
}
