/**
 * 节气贴士 / 传统节日 / 每日宜忌 测试
 * ------------------------------------------------------------
 * 移植自 test/newFeaturesTest.js，改为 node:test 断言真实模块
 * （lunar-javascript 通过 setLunarModule 注入）。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import LunarModule from 'lunar-javascript';
import {
  getTodaySolarTerm,
  isSolarTermPopupShown,
  markSolarTermPopupShown,
  getAllSolarTermNames,
  getSolarTermTip,
  setLunarModule as setSolarTermModule,
} from '../src/utils/solarTermTips.js';
import {
  getUpcomingFestival,
  getTodayFestival,
  getAllFestivals,
  setLunarModule as setFestivalModule,
} from '../src/utils/festivalUtils.js';
import {
  getDailyAlmanac,
  getCompletionFeedback,
  checkYiMatch,
  setLunarModule as setAlmanacModule,
} from '../src/utils/almanacUtils.js';

setSolarTermModule(LunarModule);
setFestivalModule(LunarModule);
setAlmanacModule(LunarModule);

const { Solar, Lunar } = LunarModule;

/** 某天的节气名（''/null 表示非节气日） */
const jieQiOf = (year, month, day) =>
  Solar.fromYmd(year, month, day).getLunar().getJieQi() || '';

/** 在指定年份里找某个节气的公历日期 */
function findJieQi(year, name) {
  const base = new Date(year, 0, 1);
  for (let i = 0; i < 366; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    if (d.getFullYear() !== year) break;
    if (jieQiOf(d.getFullYear(), d.getMonth() + 1, d.getDate()) === name) return d;
  }
  return null;
}

describe('节气贴士', () => {
  it('24 个节气齐全', () => {
    const names = getAllSolarTermNames();
    assert.equal(names.length, 24);
    assert.ok(names.includes('立春'));
    assert.ok(names.includes('冬至'));
    assert.equal(new Set(names).size, 24);
  });

  it('每个节气都有 emoji/摘要/贴士/问候语', () => {
    for (const name of getAllSolarTermNames()) {
      const tip = getSolarTermTip(name);
      assert.ok(tip, `缺少「${name}」数据`);
      assert.ok(tip.emoji, `「${name}」缺 emoji`);
      assert.ok(tip.summary, `「${name}」缺 summary`);
      assert.ok(Array.isArray(tip.tips) && tip.tips.length > 0, `「${name}」缺 tips`);
      assert.ok(tip.greeting, `「${name}」缺 greeting`);
    }
  });

  it('未知节气名返回 null', () => {
    assert.equal(getSolarTermTip('不存在的节气'), null);
  });

  it('节气日返回该节气，非节气日返回 null', () => {
    const lichun = findJieQi(2026, '立春');
    assert.ok(lichun, '应能找到 2026 年立春');
    const term = getTodaySolarTerm(lichun);
    assert.ok(term, '立春日应返回节气数据');
    assert.equal(term.name, '立春');
    assert.ok(term.tips.length > 0);

    // 找一个非节气日
    const plain = (function () {
      const base = new Date(2026, 6, 1);
      for (let i = 0; i < 30; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        if (!jieQiOf(d.getFullYear(), d.getMonth() + 1, d.getDate())) return d;
      }
      return null;
    })();
    assert.ok(plain, '应能找到非节气日');
    assert.equal(getTodaySolarTerm(plain), null);
  });

  it('弹窗当天只标记一次（localStorage）', () => {
    const day = new Date(2026, 6, 28);
    assert.equal(isSolarTermPopupShown(day), false);
    markSolarTermPopupShown(day);
    assert.equal(isSolarTermPopupShown(day), true);
    assert.equal(localStorage.getItem('solar_term_shown_2026-07-28'), '1');
    // 别的日期不受影响
    assert.equal(isSolarTermPopupShown(new Date(2026, 6, 29)), false);
  });
});

describe('传统节日', () => {
  it('节日定义完整', () => {
    const festivals = getAllFestivals();
    assert.ok(festivals.length >= 11, `只有 ${festivals.length} 个节日`);
    for (const f of festivals) {
      assert.ok(f.key && f.name && f.emoji, `节日字段缺失：${JSON.stringify(f)}`);
    }
    assert.equal(new Set(festivals.map((f) => f.key)).size, festivals.length, 'key 不重复');
  });

  it('2026 年春节在 2 月', () => {
    const lunar = Lunar.fromYmd(2026, 1, 1).getSolar();
    assert.equal(lunar.getYear(), 2026);
    assert.equal(lunar.getMonth(), 2);
    const spring = new Date(2026, lunar.getMonth() - 1, lunar.getDay());
    const hit = getTodayFestival(spring);
    assert.ok(hit, `${spring.toDateString()} 应命中节日`);
    assert.equal(hit.def.key, 'spring_festival');
  });

  it('指定公历节日当天能命中', () => {
    assert.equal(getTodayFestival(new Date(2026, 0, 1))?.def.key, 'new_year');
    assert.equal(getTodayFestival(new Date(2026, 9, 1))?.def.key, 'national_day');
    assert.equal(getTodayFestival(new Date(2026, 11, 25))?.def.key, 'christmas');
    assert.equal(getTodayFestival(new Date(2026, 6, 28)), null);
  });

  it('节日倒计时落在 60 天内', () => {
    const upcoming = getUpcomingFestival(new Date(2026, 6, 28));
    assert.ok(upcoming, '2026-07-28 起应能找到 60 天内的节日');
    assert.ok(upcoming.daysLeft >= 0 && upcoming.daysLeft <= 60, `${upcoming.daysLeft}`);
    assert.ok(upcoming.def.emoji);
    assert.ok(upcoming.date instanceof Date);
  });

  it('当天有节日时倒计时为 0', () => {
    const upcoming = getUpcomingFestival(new Date(2026, 0, 1));
    assert.ok(upcoming);
    assert.equal(upcoming.daysLeft, 0);
    assert.equal(upcoming.isToday, true);
    assert.equal(upcoming.def.key, 'new_year');
  });

  it('2026 年中秋节属于 2026 年', () => {
    const lunar = Lunar.fromYmd(2026, 8, 15).getSolar();
    assert.equal(lunar.getYear(), 2026);
  });
});

describe('每日宜忌', () => {
  const day = new Date(2026, 6, 28);

  it('生成宜忌与运势', () => {
    const a = getDailyAlmanac(day);
    assert.ok(a, '应返回宜忌数据');
    assert.ok(a.yi.length >= 2, `宜只有 ${a.yi.length} 项`);
    assert.ok(a.ji.length >= 2, `忌只有 ${a.ji.length} 项`);
    assert.ok(a.fortune && a.fortune.length > 0, '缺运势文案');
    assert.ok(a.luckyHour && a.luckyHour.length > 0, '缺吉时');
  });

  it('同一天结果稳定（哈希取值不随机）', () => {
    const a = getDailyAlmanac(day);
    const b = getDailyAlmanac(day);
    assert.deepEqual(a.yi, b.yi);
    assert.deepEqual(a.ji, b.ji);
    assert.equal(a.fortune, b.fortune);
  });

  it('附带农历干支信息', () => {
    const a = getDailyAlmanac(day);
    assert.ok(a.lunarInfo, '应有农历信息');
    assert.ok(a.lunarInfo.ganZhi?.length > 0, '应有干支');
    assert.ok(a.lunarInfo.lunarMonth, '应有农历月');
    assert.ok(a.lunarInfo.lunarDay, '应有农历日');
  });

  it('完成反馈：命中宜与未命中都有文案', () => {
    const almanac = getDailyAlmanac(day);

    const yiItem = almanac.yi[0];
    const matched = checkYiMatch(yiItem, almanac.yi);
    assert.equal(matched, yiItem, '宜项关键词应能命中自身');

    const feedback = getCompletionFeedback(yiItem, almanac);
    assert.equal(typeof feedback, 'string');
    assert.ok(feedback.length > 0, '命中宜应有反馈文案');

    const miss = getCompletionFeedback('随便做点什么', almanac);
    assert.ok(miss.length > 0, '未命中也应有反馈文案');
  });

  it('空文本不误命中', () => {
    assert.equal(checkYiMatch('', getDailyAlmanac(day).yi), null);
    assert.equal(checkYiMatch(null, null), null);
  });
});
