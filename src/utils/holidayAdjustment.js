/**
 * 节假日调整工具函数
 * 用于处理"避开节假日"功能的日期调整逻辑
 */

/**
 * 判断指定日期是否为工作日
 * @param {string} dateStr - 日期字符串（YYYY-MM-DD）
 * @param {Object} holidayData - 节假日数据 { date: { name, type } }
 * @returns {boolean} - 是否为工作日
 */
export function isWorkday(dateStr, holidayData) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const holidayInfo = holidayData?.[dateStr];

  if (holidayInfo) {
    const type = holidayInfo.type;
    // transfer_workday = 补班日（休息日变工作日）
    // public_holiday = 节假日（工作日变休息日）
    if (
      type === 'transfer_workday' ||
      type === 'work_day' ||
      type === 'work' ||
      type === 'workday'
    ) {
      return true;
    }
    if (type === 'public_holiday' || type === 'holiday' || type === 'rest') {
      return false;
    }
  }

  return dayOfWeek !== 0 && dayOfWeek !== 6;
}

export function isHoliday(dateStr, holidayData) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const holidayInfo = holidayData?.[dateStr];

  if (holidayInfo) {
    const type = holidayInfo.type;
    if (
      type === 'transfer_workday' ||
      type === 'work_day' ||
      type === 'work' ||
      type === 'workday'
    ) {
      return false;
    }
    if (type === 'public_holiday' || type === 'holiday' || type === 'rest') {
      return true;
    }
  }

  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * 找到指定日期之前最后一个工作日
 * @param {string} dateStr - 起始日期 YYYY-MM-DD
 * @param {Object} holidayData - 节假日数据
 * @param {number} maxDays - 最多向前查找的天数，默认7天
 * @returns {string} - 调整后的价格日期字符串（YYYY-MM-DD）
 */
export function findLastWorkday(dateStr, holidayData, maxDays = 7) {
  const currentDate = new Date(dateStr);
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 1; i <= maxDays; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = formatDate(checkDate);

    if (isWorkday(checkDateStr, holidayData)) {
      return checkDateStr;
    }
  }

  // 如果找不到，返回原日期
  return dateStr;
}

/**
 * 为待办事项计算实际显示日期（考虑避开节假日选项）
 * @param {Object} todo - 待办事项对象
 * @param {string} dateStr - 原始日期字符串
 * @param {Object} holidayData - 节假日数据
 * @returns {Object} - { adjustedDate, shouldAdjust, reminderDate }
 */
export function adjustTodoDate(todo, dateStr, holidayData) {
  // 兼容两种字段名
  const skipHolidays = todo.skip_holidays ?? todo.skipHolidays;

  // 如果没有开启避开节假日选项，直接返回原日期
  if (!skipHolidays) {
    return {
      adjustedDate: dateStr,
      shouldAdjust: false,
      reminderDate: null,
    };
  }

  // 检查原日期是否为节假日
  if (isHoliday(dateStr, holidayData)) {
    // 找到节假日前最后一个工作日
    const adjustedDate = findLastWorkday(dateStr, holidayData);

    // 计算提醒日期（调整日期的前一天）
    const reminderDateObj = new Date(adjustedDate);
    reminderDateObj.setDate(reminderDateObj.getDate() - 1);
    const reminderDate = formatDate(reminderDateObj);

    return {
      adjustedDate,
      shouldAdjust: true,
      reminderDate,
    };
  }

  return {
    adjustedDate: dateStr,
    shouldAdjust: false,
    reminderDate: null,
  };
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} - 格式化后的日期字符串
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取指定日期的节假日信息
 * @param {string} dateStr - 日期字符串 YYYY-MM-DD
 * @param {Object} holidayData - 节假日数据
 * @returns {Object|null} - 节假日信息或null
 */
export function getHolidayInfo(dateStr, holidayData) {
  return holidayData?.[dateStr] || null;
}
