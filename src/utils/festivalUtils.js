// 传统节日计算工具
// 基于 lunar-javascript 计算传统节日的公历日期

let cachedLunarModule = null;
export function setLunarModule(mod) {
  cachedLunarModule = mod;
}

function getModule() {
  return cachedLunarModule;
}

// 传统节日定义
// type: 'lunar' 农历节日 | 'solar' 公历节日 | 'solarterm' 节气节日
const FESTIVAL_DEFS = [
  { key: 'spring_festival', name: '春节', emoji: '🧧', type: 'lunar', month: 1, day: 1, theme: 'rose' },
  { key: 'lantern', name: '元宵节', emoji: '🏮', type: 'lunar', month: 1, day: 15, theme: 'amber' },
  { key: 'qingming', name: '清明节', emoji: '🍃', type: 'solarterm', termName: '清明', theme: 'green' },
  { key: 'dragon_boat', name: '端午节', emoji: '🐉', type: 'lunar', month: 5, day: 5, theme: 'mint' },
  { key: 'qixi', name: '七夕节', emoji: '💕', type: 'lunar', month: 7, day: 7, theme: 'lavender' },
  { key: 'mid_autumn', name: '中秋节', emoji: '🥮', type: 'lunar', month: 8, day: 15, theme: 'primrose' },
  { key: 'double_ninth', name: '重阳节', emoji: '🌼', type: 'lunar', month: 9, day: 9, theme: 'amber' },
  { key: 'new_year_eve', name: '除夕', emoji: '🎆', type: 'newyeareve', theme: 'rose' },
  // 公历节日
  { key: 'new_year', name: '元旦', emoji: '🎊', type: 'solar', month: 1, day: 1, theme: 'default' },
  { key: 'national_day', name: '国庆节', emoji: '🇨🇳', type: 'solar', month: 10, day: 1, theme: 'rose' },
  { key: 'christmas', name: '圣诞节', emoji: '🎄', type: 'solar', month: 12, day: 25, theme: 'green' },
];

/**
 * 计算某年某农历节日的公历日期
 */
function getLunarFestivalDate(year, month, day) {
  const mod = getModule();
  if (!mod) return null;
  try {
    const { Lunar } = mod;
    const lunar = Lunar.fromYmd(year, month, day);
    const solar = lunar.getSolar();
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  } catch {
    return null;
  }
}

/**
 * 计算某年某节气对应的公历日期
 * 使用公历遍历（节气遵循公历，更准确）
 */
function getSolarTermDate(year, termName) {
  const mod = getModule();
  if (!mod) return null;
  try {
    const { Solar } = mod;
    // 遍历公历全年查找节气日
    const start = new Date(year, 0, 1);
    for (let i = 0; i < 366; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d.getFullYear() !== year) break;
      try {
        const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const lunar = solar.getLunar();
        const jieQi = lunar.getJieQi();
        if (jieQi === termName) {
          return d;
        }
      } catch {
        // 跳过无效日期
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 计算某年除夕的公历日期（农历腊月最后一天）
 */
function getNewYearEveDate(year) {
  const mod = getModule();
  if (!mod) return null;
  try {
    const { Lunar } = mod;
    // 除夕是农历腊月（12月）的最后一天，即春节前一天
    // 先找春节（次年正月初一），往前推一天
    const springFestival = getLunarFestivalDate(year + 1, 1, 1);
    if (!springFestival) return null;
    const eve = new Date(springFestival);
    eve.setDate(eve.getDate() - 1);
    return eve;
  } catch {
    return null;
  }
}

/**
 * 获取某个节日在指定年份的公历日期
 */
function getFestivalDateInYear(def, year) {
  switch (def.type) {
    case 'lunar':
      return getLunarFestivalDate(year, def.month, def.day);
    case 'solar':
      return new Date(year, def.month - 1, def.day);
    case 'solarterm':
      return getSolarTermDate(year, def.termName);
    case 'newyeareve':
      return getNewYearEveDate(year);
    default:
      return null;
  }
}

/**
 * 计算两个日期之间的天数差（只比较日期部分）
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
}

/**
 * 获取最近的节日（今天或未来）及倒计时天数
 * @param {Date} fromDate - 起始日期，默认今天
 * @returns {Object|null} { def, date, daysLeft, isToday }
 */
export function getUpcomingFestival(fromDate = new Date()) {
  const mod = getModule();
  if (!mod) return null;

  const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const currentYear = today.getFullYear();

  let best = null;

  for (const def of FESTIVAL_DEFS) {
    // 检查今年和明年的节日
    for (const year of [currentYear, currentYear + 1]) {
      const festivalDate = getFestivalDateInYear(def, year);
      if (!festivalDate) continue;

      const days = daysBetween(today, festivalDate);

      // 只看今天及未来的节日，且在 60 天内
      if (days < 0 || days > 60) continue;

      if (!best || days < best.daysLeft) {
        best = {
          def,
          date: festivalDate,
          daysLeft: days,
          isToday: days === 0,
        };
      }
    }
  }

  return best;
}

/**
 * 检查今天是否是某个传统节日
 * @param {Date} date - 日期，默认今天
 * @returns {Object|null} { def, date } 如果今天是节日
 */
export function getTodayFestival(date = new Date()) {
  const mod = getModule();
  if (!mod) return null;

  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const currentYear = today.getFullYear();

  for (const def of FESTIVAL_DEFS) {
    const festivalDate = getFestivalDateInYear(def, currentYear);
    if (!festivalDate) continue;

    if (
      festivalDate.getFullYear() === today.getFullYear() &&
      festivalDate.getMonth() === today.getMonth() &&
      festivalDate.getDate() === today.getDate()
    ) {
      return { def, date: festivalDate };
    }
  }
  return null;
}

/**
 * 获取所有节日定义
 */
export function getAllFestivals() {
  return FESTIVAL_DEFS;
}
