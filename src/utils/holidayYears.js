/**
 * 节假日加载年份工具
 * ------------------------------------------------------------
 * 日历视图会跨年：「今日优先」模式固定渲染 35 天（当前周周一往前一周起算），
 * 2026 年 12 月的窗口会一直伸到 2027 年 1 月。
 *
 * 若只按 currentDate 的年份加载节假日，次年 1 月这一段就会没有节假日数据，
 * 元旦（2027-01-01 周五）会被误判成工作日，导致「避开节假日」的待办
 * 不会被顺延。这里提供纯函数，让组件按「视图窗口实际覆盖的年份」加载。
 */

/** 把 Date / 年份数字 / YYYY-MM-DD 字符串 归一化为年份数字 */
function toYear(value) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    return Number.isFinite(year) ? year : null;
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === 'string') {
    const matched = /^(\d{4})/.exec(value);
    return matched ? Number(matched[1]) : null;
  }
  return null;
}

/**
 * 收集一组日期覆盖到的年份（去重、升序）
 * @param {Array<Date|string|number>} dates - 日期集合
 * @returns {number[]} 年份数组，例如 [2026, 2027]
 */
export function collectYears(dates) {
  const years = new Set();
  for (const item of dates || []) {
    const year = toYear(item);
    if (year) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * 归一化「需要加载的年份」入参：支持单年、数组，自动去重排序并剔除非法值
 * @param {number|number[]|string|string[]|null|undefined} input
 * @returns {number[]} 年份数组
 */
export function normalizeYears(input) {
  const list = Array.isArray(input) ? input : [input];
  const years = new Set();
  for (const item of list) {
    const year = toYear(item);
    if (year) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}
