let lunarModule = null;
let lunarLoading = false;
let lunarCallbacks = [];

async function loadLunarModule() {
  if (lunarModule) return lunarModule;
  if (lunarLoading) {
    return new Promise((resolve) => {
      lunarCallbacks.push(resolve);
    });
  }

  lunarLoading = true;
  try {
    const mod = await import('lunar-javascript');
    lunarModule = mod;
    lunarCallbacks.forEach((cb) => cb(mod));
    lunarCallbacks = [];
    return mod;
  } catch (error) {
    lunarLoading = false;
    throw error;
  }
}

const LUNAR_MONTH_NAMES = {
  1: '正月', 2: '二月', 3: '三月', 4: '四月',
  5: '五月', 6: '六月', 7: '七月', 8: '八月',
  9: '九月', 10: '十月', 11: '冬月', 12: '腊月',
};

function computeLunarDateStr(Solar, date) {
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

export function getLunarDateStr(date) {
  if (!lunarModule) return '';
  try {
    return computeLunarDateStr(lunarModule.Solar, date);
  } catch {
    return '';
  }
}

export async function ensureLunarLoaded() {
  await loadLunarModule();
}

export function isLunarLoaded() {
  return !!lunarModule;
}
