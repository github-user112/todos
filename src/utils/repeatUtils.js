/**
 * 重复事件计算工具函数
 * 支持自定义间隔的重复事件计算逻辑
 */

/**
 * 计算重复事件是否应该在指定日期显示
 * @param {Date} todoDate - 原始待办事项日期
 * @param {Date} currentDate - 当前检查的日期
 * @param {string} repeatType - 重复类型 ('none', 'daily', 'weekly', 'monthly', 'yearly')
 * @param {number} interval - 间隔值，默认为1
 * @param {Date} endDate - 结束日期，可选
 * @returns {boolean} - 是否应该显示
 */
export function shouldShowRepeatingTodo(todoDate, currentDate, repeatType, interval = 1, endDate = null) {
  // 当前日期不能早于原始日期
  if (currentDate < todoDate) {
    return false;
  }
  
  // 如果设置了结束日期，且当前日期超过了结束日期，则不显示
  if (endDate && currentDate > endDate) {
    return false;
  }
  
  // 不重复的事件
  if (!repeatType || repeatType === 'none') {
    return false;
  }
  
  // 间隔必须为正整数
  if (!Number.isInteger(interval) || interval < 1) {
    return false;
  }
  
  switch (repeatType) {
    case 'daily':
      return shouldShowDailyInterval(todoDate, currentDate, interval);
    case 'weekly':
      return shouldShowWeeklyInterval(todoDate, currentDate, interval);
    case 'monthly':
      return shouldShowMonthlyInterval(todoDate, currentDate, interval);
    case 'yearly':
      return shouldShowYearlyInterval(todoDate, currentDate, interval);
    default:
      return false;
  }
}

/**
 * 每日间隔计算
 * @param {Date} todoDate - 原始待办事项日期
 * @param {Date} currentDate - 当前检查的日期
 * @param {number} interval - 天数间隔
 * @returns {boolean}
 */
function shouldShowDailyInterval(todoDate, currentDate, interval) {
  const dayDiff = Math.floor(
    (currentDate.getTime() - todoDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return dayDiff >= 0 && dayDiff % interval === 0;
}

/**
 * 每周间隔计算
 * @param {Date} todoDate - 原始待办事项日期
 * @param {Date} currentDate - 当前检查的日期
 * @param {number} interval - 周数间隔
 * @returns {boolean}
 */
function shouldShowWeeklyInterval(todoDate, currentDate, interval) {
  // 检查星期是否匹配
  if (todoDate.getDay() !== currentDate.getDay()) {
    return false;
  }
  
  const weekDiff = Math.floor(
    (currentDate.getTime() - todoDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
  return weekDiff >= 0 && weekDiff % interval === 0;
}

/**
 * 每月间隔计算
 * @param {Date} todoDate - 原始待办事项日期
 * @param {Date} currentDate - 当前检查的日期
 * @param {number} interval - 月数间隔
 * @returns {boolean}
 */
function shouldShowMonthlyInterval(todoDate, currentDate, interval) {
  // 检查日期是否匹配（处理月末情况）
  const adjustedCurrentDate = adjustMonthEndDate(
    todoDate, 
    currentDate.getFullYear(), 
    currentDate.getMonth()
  );
  
  if (adjustedCurrentDate.getDate() !== currentDate.getDate()) {
    return false;
  }
  
  // 计算月份差
  const monthDiff = 
    (currentDate.getFullYear() - todoDate.getFullYear()) * 12 + 
    (currentDate.getMonth() - todoDate.getMonth());
  
  return monthDiff >= 0 && monthDiff % interval === 0;
}

/**
 * 每年间隔计算
 * @param {Date} todoDate - 原始待办事项日期
 * @param {Date} currentDate - 当前检查的日期
 * @param {number} interval - 年数间隔
 * @returns {boolean}
 */
function shouldShowYearlyInterval(todoDate, currentDate, interval) {
  // 检查月份和日期是否匹配（处理闰年2月29日的情况）
  if (todoDate.getMonth() !== currentDate.getMonth()) {
    return false;
  }
  
  // 处理闰年2月29日的特殊情况
  const todoDay = todoDate.getDate();
  const currentDay = currentDate.getDate();
  
  if (todoDay === 29 && todoDate.getMonth() === 1) { // 2月29日
    // 如果当前年不是闰年，在2月28日显示
    const isCurrentLeapYear = isLeapYear(currentDate.getFullYear());
    if (!isCurrentLeapYear && currentDay === 28) {
      // 允许在非闰年的2月28日显示原本2月29日的事件
    } else if (currentDay !== todoDay) {
      return false;
    }
  } else if (todoDay !== currentDay) {
    return false;
  }
  
  const yearDiff = currentDate.getFullYear() - todoDate.getFullYear();
  return yearDiff >= 0 && yearDiff % interval === 0;
}

/**
 * 处理月末日期（如31号在2月不存在的情况）
 * @param {Date} originalDate - 原始日期
 * @param {number} targetYear - 目标年份
 * @param {number} targetMonth - 目标月份
 * @returns {Date} - 调整后的日期
 */
function adjustMonthEndDate(originalDate, targetYear, targetMonth) {
  const originalDay = originalDate.getDate();
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  // 如果原日期大于目标月份的天数，使用目标月份的最后一天
  const adjustedDay = Math.min(originalDay, daysInTargetMonth);
  
  return new Date(targetYear, targetMonth, adjustedDay);
}

/**
 * 判断是否为闰年
 * @param {number} year - 年份
 * @returns {boolean}
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 验证重复间隔值
 * @param {string} repeatType - 重复类型
 * @param {number} interval - 间隔值
 * @returns {object} - 验证结果 {valid: boolean, message?: string}
 */
export function validateRepeatInterval(repeatType, interval) {
  const limits = {
    daily: { min: 1, max: 365, unit: '天' },
    weekly: { min: 1, max: 52, unit: '周' },
    monthly: { min: 1, max: 12, unit: '个月' },
    yearly: { min: 1, max: 10, unit: '年' }
  };
  
  if (repeatType === 'none') {
    return { valid: true };
  }
  
  const limit = limits[repeatType];
  if (!limit) {
    return { valid: false, message: '不支持的重复类型' };
  }
  
  if (!Number.isInteger(interval) || interval < limit.min || interval > limit.max) {
    return { 
      valid: false, 
      message: `${repeatType === 'daily' ? '每日' : 
                repeatType === 'weekly' ? '每周' : 
                repeatType === 'monthly' ? '每月' : '每年'}间隔必须在${limit.min}-${limit.max}${limit.unit}之间` 
    };
  }
  
  return { valid: true };
}

/**
 * 获取重复事件的下一个日期
 * @param {Date} todoDate - 原始待办事项日期
 * @param {string} repeatType - 重复类型
 * @param {number} interval - 间隔值
 * @param {number} count - 获取后续几个日期，默认为1
 * @returns {Date[]} - 下一个/几个重复日期数组
 */
export function getNextRepeatDates(todoDate, repeatType, interval = 1, count = 1) {
  const dates = [];
  
  if (!repeatType || repeatType === 'none') {
    return dates;
  }
  
  for (let i = 1; i <= count; i++) {
    let nextDate;
    
    switch (repeatType) {
      case 'daily':
        nextDate = new Date(todoDate);
        nextDate.setDate(todoDate.getDate() + (interval * i));
        break;
        
      case 'weekly':
        nextDate = new Date(todoDate);
        nextDate.setDate(todoDate.getDate() + (interval * 7 * i));
        break;
        
      case 'monthly':
        nextDate = new Date(todoDate);
        nextDate.setMonth(todoDate.getMonth() + (interval * i));
        // 处理月末日期调整
        if (nextDate.getDate() !== todoDate.getDate()) {
          nextDate = adjustMonthEndDate(todoDate, nextDate.getFullYear(), nextDate.getMonth());
        }
        break;
        
      case 'yearly':
        nextDate = new Date(todoDate);
        nextDate.setFullYear(todoDate.getFullYear() + (interval * i));
        // 处理闰年2月29日的情况
        if (todoDate.getMonth() === 1 && todoDate.getDate() === 29 && !isLeapYear(nextDate.getFullYear())) {
          nextDate.setDate(28); // 非闰年调整为2月28日
        }
        break;
        
      default:
        continue;
    }
    
    if (nextDate) {
      dates.push(nextDate);
    }
  }
  
  return dates;
}