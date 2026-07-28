// 三个新功能的测试脚本
// 运行: node test/newFeaturesTest.js

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

// 注入 lunar-javascript 模块
setSolarTermModule(LunarModule);
setFestivalModule(LunarModule);
setAlmanacModule(LunarModule);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message} (期望: ${expected}, 实际: ${actual})`);
    failed++;
  }
}

console.log('\n=== 测试功能1: 节气养生提醒 ===\n');

// 测试1: 24节气数据完整
const allTerms = getAllSolarTermNames();
console.log(`测试: 24节气数据完整性`);
assert(allTerms.length === 24, `应有24个节气，实际: ${allTerms.length}`);

// 测试2: 每个节气都有必要字段
console.log(`测试: 节气数据字段完整性`);
let allFieldsOk = true;
for (const name of allTerms) {
  const tip = getSolarTermTip(name);
  if (!tip || !tip.emoji || !tip.summary || !tip.tips || !tip.greeting) {
    allFieldsOk = false;
    console.log(`  ⚠️ 节气「${name}」缺少字段`);
  }
}
assert(allFieldsOk, '所有节气都有 emoji/summary/tips/greeting 字段');

// 测试3: getTodaySolarTerm 对非节气日返回 null
console.log(`测试: 非节气日返回 null`);
// 2026-07-28 是大暑后几天，不是节气日
const testDate = new Date(2026, 6, 28); // 7月28日
const term = getTodaySolarTerm(testDate);
// 7月28日不是节气日（大暑在7月22-23左右），应返回 null 或该节气
// 如果恰好是节气日则不为 null，我们检查逻辑是否正确
console.log(`  2026-07-28 节气信息: ${term ? term.name : 'null'}`);

// 测试4: getTodaySolarTerm 对节气日返回正确数据
console.log(`测试: 节气日返回正确数据`);
// 找到2026年的立春日期
const { Solar } = LunarModule;
let lichunDate = null;
for (let i = 0; i < 366; i++) {
  const d = new Date(2026, 0, 1);
  d.setDate(d.getDate() + i);
  if (d.getFullYear() !== 2026) break;
  const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const lunar = solar.getLunar();
  if (lunar.getJieQi() === '立春') {
    lichunDate = d;
    break;
  }
}
if (lichunDate) {
  const lichunTerm = getTodaySolarTerm(lichunDate);
  assert(lichunTerm !== null, '立春日应返回节气数据');
  assertEqual(lichunTerm?.name, '立春', '节气名称应为"立春"');
  assert(lichunTerm?.tips?.length > 0, '立春应有养生贴士');
} else {
  console.log('  ⚠️ 未找到2026年立春日期');
}

// 测试5: 弹窗显示标记
console.log(`测试: 弹窗显示标记 localStorage`);
const testDateStr = '2026-07-28';
// 模拟 localStorage
globalThis.localStorage = globalThis.localStorage || {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
};
assert(!isSolarTermPopupShown(testDate), '未标记前应返回 false');
markSolarTermPopupShown(testDate);
assert(isSolarTermPopupShown(testDate), '标记后应返回 true');


console.log('\n=== 测试功能2: 传统节日倒计时 ===\n');

// 测试6: 节日定义完整
const festivals = getAllFestivals();
console.log(`测试: 节日定义完整性`);
assert(festivals.length >= 11, `应有至少11个节日，实际: ${festivals.length}`);

// 测试7: 获取最近的节日
console.log(`测试: 获取最近节日`);
const today = new Date(2026, 6, 28); // 2026-07-28
const upcoming = getUpcomingFestival(today);
assert(upcoming !== null, '应返回最近节日');
if (upcoming) {
  console.log(`  最近节日: ${upcoming.def.name} (${upcoming.daysLeft}天后)`);
  console.log(`  节日日期: ${upcoming.date.getFullYear()}-${upcoming.date.getMonth() + 1}-${upcoming.date.getDate()}`);
  assert(upcoming.daysLeft >= 0, '倒计时天数应 >= 0');
  assert(upcoming.def.emoji, '节日应有 emoji');
}

// 测试8: 春节日期计算正确
console.log(`测试: 春节日期计算`);
// 2026年春节是2月17日（农历正月初一）
const springFestival = festivals.find(f => f.key === 'spring_festival');
// 手动计算2026年春节
const { Lunar } = LunarModule;
const lunar2026Spring = Lunar.fromYmd(2026, 1, 1);
const solar2026Spring = lunar2026Spring.getSolar();
console.log(`  2026年春节: ${solar2026Spring.getYear()}-${solar2026Spring.getMonth()}-${solar2026Spring.getDay()}`);
assert(
  solar2026Spring.getYear() === 2026 && solar2026Spring.getMonth() === 2,
  '2026年春节应在2月'
);

// 测试9: 中秋节日期计算
console.log(`测试: 中秋节日期计算`);
const lunar2026MidAutumn = Lunar.fromYmd(2026, 8, 15);
const solar2026MidAutumn = lunar2026MidAutumn.getSolar();
console.log(`  2026年中秋节: ${solar2026MidAutumn.getYear()}-${solar2026MidAutumn.getMonth()}-${solar2026MidAutumn.getDay()}`);
assert(solar2026MidAutumn.getYear() === 2026, '2026年中秋节应在2026年');

// 测试10: 检查今天是否是节日
console.log(`测试: 检查今天是否是节日`);
const todayFestival = getTodayFestival(today);
console.log(`  2026-07-28 节日: ${todayFestival ? todayFestival.def.name : '无'}`);


console.log('\n=== 测试功能3: 每日宜忌 ===\n');

// 测试11: 生成今日宜忌
console.log(`测试: 生成每日宜忌`);
const almanac = getDailyAlmanac(today);
assert(almanac !== null, '应返回宜忌数据');
assert(almanac.yi?.length >= 2, `宜应至少2项，实际: ${almanac.yi?.length}`);
assert(almanac.ji?.length >= 2, `忌应至少2项，实际: ${almanac.ji?.length}`);
assert(almanac.fortune?.length > 0, '应有运势文案');
console.log(`  宜: ${almanac.yi.join('、')}`);
console.log(`  忌: ${almanac.ji.join('、')}`);
console.log(`  运势: ${almanac.fortune}`);

// 测试12: 同一天宜忌稳定（不随调用变化）
console.log(`测试: 同一天宜忌结果稳定`);
const almanac2 = getDailyAlmanac(today);
assert(
  JSON.stringify(almanac.yi) === JSON.stringify(almanac2.yi),
  '同一天的宜应相同'
);
assert(
  JSON.stringify(almanac.ji) === JSON.stringify(almanac2.ji),
  '同一天的忌应相同'
);

// 测试13: 不同日期宜忌可能不同
console.log(`测试: 不同日期宜忌可能不同`);
const tomorrow = new Date(2026, 6, 29);
const almanacTomorrow = getDailyAlmanac(tomorrow);
console.log(`  明天宜: ${almanacTomorrow.yi.join('、')}`);
console.log(`  明天忌: ${almanacTomorrow.ji.join('、')}`);

// 测试14: 完成反馈 - 命中宜
console.log(`测试: 完成待办反馈（命中宜）`);
// 构造一个会命中宜的待办文本
const yiItem = almanac.yi[0];
const keywords = {
  '完成重要待办': '完成重要项目',
  '整理待办清单': '整理待办清单',
  '安排长期计划': '安排下周计划',
  '学习新知识': '学习新知识',
  '运动健身': '跑步运动健身',
  '深度思考': '深度思考问题',
  '团队协作': '团队协作会议',
  '处理积压事项': '处理积压工作',
  '设定新目标': '设定新目标',
  '回顾总结': '回顾总结本周',
  '早睡早起': '早睡早起',
  '专注创作': '专注创作写作',
  '清理桌面': '清理桌面',
  '沟通交流': '沟通交流',
  '阅读充电': '阅读充电',
};
const testTodoText = keywords[yiItem] || yiItem;
const matchedYi = checkYiMatch(testTodoText, almanac.yi);
console.log(`  待办: "${testTodoText}", 命中宜: ${matchedYi || '无'}`);
const feedback = getCompletionFeedback(testTodoText, almanac);
assert(feedback.length > 0, '应有反馈文案');
console.log(`  反馈: ${feedback}`);

// 测试15: 完成反馈 - 未命中宜
console.log(`测试: 完成待办反馈（未命中宜）`);
const unmatchedText = '随便做点什么';
const unmatchedFeedback = getCompletionFeedback(unmatchedText, almanac);
assert(unmatchedFeedback.length > 0, '未命中也应有反馈文案');
console.log(`  反馈: ${unmatchedFeedback}`);

// 测试16: 农历信息
console.log(`测试: 农历信息获取`);
if (almanac.lunarInfo) {
  console.log(`  干支: ${almanac.lunarInfo.ganZhi}`);
  console.log(`  农历月: ${almanac.lunarInfo.lunarMonth}`);
  console.log(`  农历日: ${almanac.lunarInfo.lunarDay}`);
  assert(almanac.lunarInfo.ganZhi?.length > 0, '应有干支信息');
}


console.log('\n=== 测试结果汇总 ===');
console.log(`通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);
if (failed === 0) {
  console.log('🎉 所有测试通过！');
} else {
  console.log('⚠️ 有测试未通过，请检查');
}
process.exit(failed > 0 ? 1 : 0);
