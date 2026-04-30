import { Solar } from 'lunar-javascript';

const LUNAR_MONTH_NAMES = {
  1: '正月', 2: '二月', 3: '三月', 4: '四月',
  5: '五月', 6: '六月', 7: '七月', 8: '八月',
  9: '九月', 10: '十月', 11: '冬月', 12: '腊月',
};

export function getLunarDateStr(date) {
  const solar = Solar.fromYmd(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const lunar = solar.getLunar();

  const jieQi = lunar.getJieQi();
  if (jieQi) return jieQi;

  const lunarFestivals = lunar.getFestivals();
  if (lunarFestivals.length > 0) return lunarFestivals[0];

  const solarFestivals = solar.getFestivals();
  if (solarFestivals.length > 0) return solarFestivals[0];

  const day = lunar.getDay();
  if (day === 1) {
    const month = lunar.getMonth();
    const prefix = month < 0 ? '闰' : '';
    return prefix + LUNAR_MONTH_NAMES[Math.abs(month)];
  }

  return lunar.getDayInChinese();
}
