// 格式化日期为 YYYY-MM-DD
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 计算给定日期所在的周数 (ISO 8601标准)
export function getWeekNumber(date) {
  // 复制日期对象以避免修改原始日期
  const target = new Date(date.valueOf());

  // 设置为该周的周四，确保在同一周内 (ISO 8601标准)
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));

  // 设置为当年的1月4日 (总是属于第一周)
  const jan4 = new Date(target.getFullYear(), 0, 4);

  // 设置为1月4日所在周的周一
  jan4.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));

  // 计算周数
  const weekNumber =
    1 +
    Math.round(
      ((target - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7
    );

  return weekNumber;
}
