/**
 * 重复待办的「锚点日期」推导
 * ------------------------------------------------------------
 * 重复实例完全由「锚点日期 + 重复类型 + 间隔」推导（见 repeatUtils.shouldShowRepeatingTodo），
 * 所以「每周五改成每周日」本质就是改锚点日期。这里把推导规则做成纯函数，便于单测：
 *   1. 解析/格式化一律走本地日期——new Date('2026-10-09') 会按 UTC 解析，必须避开；
 *   2. 目标超出时收敛（31 号 → 2 月月末、闰日 → 28 日），不抛错；
 *   3. 重复待办的锚点不允许早于今天（minDate），不重复的待办不受此限制。
 *
 * 注意：把锚点往后推会让「起点」变化（用户主动改了周期相位），
 * 但间隔保持不变；预览（RepeatPreview）展示的就是最终结果。
 */
import { formatDate } from './dateUtils.js';
import { daysInMonth } from './quickJump.js';

/** YYYY-MM-DD 且真实存在（排除 2026-02-30 这类） */
export function isValidDateStr(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m - 1);
}

/** 'YYYY-MM-DD' → 本地零点的 Date；非法返回 null */
export function parseLocalDate(dateStr) {
  if (!isValidDateStr(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → 'YYYY-MM-DD' */
export function toDateStr(date) {
  return formatDate(date);
}

export function todayStr() {
  return formatDate(new Date());
}

/** 0=周日 … 6=周六 */
export function weekdayIndexOf(dateStr) {
  return parseLocalDate(dateStr)?.getDay() ?? -1;
}

export function addDaysStr(dateStr, days) {
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** ISO 串可直接字典序比较；无下限则原样返回，输入非法时回退到下限 */
export function clampDateStr(dateStr, minDate = '') {
  if (!minDate) return dateStr;
  if (!isValidDateStr(dateStr)) return minDate;
  return dateStr < minDate ? minDate : dateStr;
}

/** ±N 天，并遵守 minDate 下限 */
export function stepDateStr(dateStr, delta, { minDate = '' } = {}) {
  const next = addDaysStr(dateStr, delta);
  if (next === null) return dateStr;
  return clampDateStr(next, minDate);
}

/** 指定年月的第 day 天，day 超出该月天数时收敛到月末；month 可超出 0-11（自动进位） */
function monthDayAt(year, monthIndex, day) {
  const first = new Date(year, monthIndex, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  return toDateStr(new Date(y, m, Math.min(day, daysInMonth(y, m))));
}

/**
 * 把锚点挪到「包含它的那一周」里的目标星期（可能早于原锚点，最多 6 天）。
 * 结果早于 minDate 时按整周继续往后推（间隔相位不变）。
 */
export function setWeekdayStr(dateStr, target, { weekStart = 1, minDate = '' } = {}) {
  const d = parseLocalDate(dateStr);
  if (!d || !Number.isInteger(target) || target < 0 || target > 6) return null;
  const curOffset = ((d.getDay() - weekStart) + 7) % 7;
  const targetOffset = ((target - weekStart) + 7) % 7;
  let out = addDaysStr(toDateStr(d), targetOffset - curOffset);
  for (let i = 0; minDate && out < minDate && i < 600; i++) out = addDaysStr(out, 7);
  return out;
}

/** 每月几号；超出当月天数收敛到月末；结果早于 minDate 时按月往后推 */
export function setMonthDayStr(dateStr, day, { minDate = '' } = {}) {
  const d = parseLocalDate(dateStr);
  if (!d || !Number.isInteger(day) || day < 1 || day > 31) return null;
  let monthIndex = d.getMonth();
  let out = monthDayAt(d.getFullYear(), monthIndex, day);
  for (let i = 0; minDate && out < minDate && i < 600; i++) {
    monthIndex += 1;
    out = monthDayAt(d.getFullYear(), monthIndex, day);
  }
  return out;
}

/** 每年几月几号；日超出收敛到月末；结果早于 minDate 时按年往后推 */
export function setYearlyStr(dateStr, month, day, { minDate = '' } = {}) {
  const d = parseLocalDate(dateStr);
  if (!d || !Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  let year = d.getFullYear();
  let out = monthDayAt(year, month - 1, day);
  for (let i = 0; minDate && out < minDate && i < 400; i++) {
    year += 1;
    out = monthDayAt(year, month - 1, day);
  }
  return out;
}

/**
 * 统一入口：按补丁推导新锚点
 * @param {string} dateStr 当前锚点
 * @param {{weekday?:number, monthDay?:number, month?:number, day?:number, dateStr?:string}} patch
 * @param {{repeatType?:string, minDate?:string}} opts repeatType 为 'none' 时不设下限
 */
export function applyAnchorPatch(dateStr, patch = {}, { repeatType = 'none', minDate = '' } = {}) {
  const base = isValidDateStr(dateStr) ? dateStr : todayStr();
  const guard = repeatType === 'none' ? '' : minDate || todayStr();

  if (patch.weekday !== undefined) {
    return setWeekdayStr(base, patch.weekday, { minDate: guard }) ?? base;
  }
  if (patch.monthDay !== undefined) {
    return setMonthDayStr(base, patch.monthDay, { minDate: guard }) ?? base;
  }
  if (patch.month !== undefined || patch.day !== undefined) {
    const d = parseLocalDate(base);
    return (
      setYearlyStr(base, patch.month ?? d.getMonth() + 1, patch.day ?? d.getDate(), {
        minDate: guard,
      }) ?? base
    );
  }
  if (patch.dateStr !== undefined) {
    if (!isValidDateStr(patch.dateStr)) return base;
    return guard ? clampDateStr(patch.dateStr, guard) : patch.dateStr;
  }
  return base;
}

/**
 * 校验锚点：格式 / 结束日期 / 是否早于今天（仅重复待办）
 * @returns {{valid: true} | {valid: false, code: string}}
 */
export function validateAnchor(dateStr, { endDate = '', repeatType = 'none', minDate = '' } = {}) {
  if (!isValidDateStr(dateStr)) return { valid: false, code: 'INVALID_DATE' };
  if (isValidDateStr(endDate) && endDate < dateStr) {
    return { valid: false, code: 'END_BEFORE_START' };
  }
  if (repeatType !== 'none' && minDate && dateStr < minDate) {
    return { valid: false, code: 'BEFORE_TODAY' };
  }
  return { valid: true };
}

/** 锚点是否被月末收敛（用户选了目标月不存在的日号） */
export function isMonthEndClamped(dateStr, day) {
  const d = parseLocalDate(dateStr);
  if (!d || !Number.isInteger(day)) return false;
  return day > daysInMonth(d.getFullYear(), d.getMonth());
}
