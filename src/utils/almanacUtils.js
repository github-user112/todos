// 每日宜忌（黄历风格）生成工具
// 基于农历干支 + 日期哈希生成稳定的每日宜忌建议
// 宜忌内容贴合待办应用场景

let cachedLunarModule = null;
export function setLunarModule(mod) {
  cachedLunarModule = mod;
}

function getModule() {
  return cachedLunarModule;
}

// 宜：适合做的事（贴合待办场景）
const YI_ACTIVITIES = [
  '完成重要待办',
  '整理待办清单',
  '安排长期计划',
  '学习新知识',
  '运动健身',
  '深度思考',
  '团队协作',
  '处理积压事项',
  '设定新目标',
  '回顾总结',
  '早睡早起',
  '专注创作',
  '清理桌面',
  '沟通交流',
  '阅读充电',
];

// 忌：不适合做的事
const JI_ACTIVITIES = [
  '拖延摸鱼',
  '熬夜刷手机',
  '盲目接活',
  '冲动决策',
  '过度焦虑',
  '杂乱无章',
  '久坐不动',
  '跳过计划',
  '多线程切换',
  '忽视休息',
  '暴饮暴食',
  '推迟重要事项',
  '忘记记录',
  '无效社交',
  '过度完美主义',
];

// 吉时建议
const LUCKY_HOURS = [
  '辰时 (7-9点)',
  '巳时 (9-11点)',
  '午时 (11-13点)',
  '申时 (15-17点)',
  '酉时 (17-19点)',
  '戌时 (19-21点)',
];

// 趣味运势文案
const FORTUNE_TIPS = [
  '今日元气满满，效率翻倍！',
  '宜专注，忌分心，事半功倍。',
  '天时地利人和，加油干！',
  '今日宜行动，别光想不做。',
  '保持节奏，稳步前进。',
  '今日灵感涌现，宜记录。',
  '劳逸结合，方能长久。',
  '今日宜断舍离，清空杂念。',
  '稳扎稳打，步步为营。',
  '今日宜社交，拓展人脉。',
];

/**
 * 基于日期生成稳定的伪随机数（种子哈希）
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * 从数组中基于种子选取 n 个不重复元素
 */
function pickFromArray(arr, count, seed) {
  const result = [];
  const pool = [...arr];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(seededRandom(seed + i * 7) * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * 获取今日农历信息字符串（天干地支等）
 */
function getLunarDayInfo(date) {
  const mod = getModule();
  if (!mod) return null;
  try {
    const { Solar } = mod;
    const solar = Solar.fromYmd(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
    const lunar = solar.getLunar();

    return {
      ganZhi: lunar.getDayInGanZhi(), // 干支，如"甲子"
      lunarMonth: lunar.getMonthInChinese(), // 如"正月"
      lunarDay: lunar.getDayInChinese(), // 如"初一"
      month: lunar.getMonth(),
      day: lunar.getDay(),
      year: lunar.getYear(),
    };
  } catch {
    return null;
  }
}

/**
 * 生成今日宜忌
 * @param {Date} date - 日期，默认今天
 * @returns {Object} { yi: [], ji: [], luckyHour: '', fortune: '', lunarInfo: {} }
 */
export function getDailyAlmanac(date = new Date()) {
  const lunarInfo = getLunarDayInfo(date);

  // 使用日期作为种子，保证同一天结果稳定
  const seed = date.getFullYear() * 10000 +
    (date.getMonth() + 1) * 100 +
    date.getDate();

  const yiCount = 2 + Math.floor(seededRandom(seed) * 2); // 2-3 个宜
  const jiCount = 2 + Math.floor(seededRandom(seed + 1) * 2); // 2-3 个忌

  const yi = pickFromArray(YI_ACTIVITIES, yiCount, seed + 2);
  const ji = pickFromArray(JI_ACTIVITIES, jiCount, seed + 3);
  const luckyHour = LUCKY_HOURS[Math.floor(seededRandom(seed + 4) * LUCKY_HOURS.length)];
  const fortune = FORTUNE_TIPS[Math.floor(seededRandom(seed + 5) * FORTUNE_TIPS.length)];

  return {
    yi,
    ji,
    luckyHour,
    fortune,
    lunarInfo,
  };
}

/**
 * 检查已完成的待办是否命中今日"宜"
 * @param {string} todoText - 待办文本
 * @param {string[]} yiList - 今日宜列表
 * @returns {string|null} 命中的宜项，或 null
 */
export function checkYiMatch(todoText, yiList) {
  if (!todoText || !yiList) return null;
  const text = todoText.toLowerCase();
  for (const yi of yiList) {
    // 简单关键词匹配
    const keywords = extractKeywords(yi);
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        return yi;
      }
    }
  }
  return null;
}

// 从宜忌文案中提取关键词
function extractKeywords(activity) {
  const keywordMap = {
    '完成重要待办': ['完成', '重要', '待办'],
    '整理待办清单': ['整理', '清单', '清理'],
    '安排长期计划': ['计划', '安排', '长期'],
    '学习新知识': ['学习', '读书', '看书', '课程'],
    '运动健身': ['运动', '健身', '跑步', '锻炼', '瑜伽'],
    '深度思考': ['思考', '分析', '规划'],
    '团队协作': ['会议', '讨论', '协作', '团队'],
    '处理积压事项': ['积压', '处理', '完成'],
    '设定新目标': ['目标', '设定'],
    '回顾总结': ['回顾', '总结', '复盘'],
    '早睡早起': ['早睡', '早起'],
    '专注创作': ['写作', '创作', '设计', '编码', '编程'],
    '清理桌面': ['清理', '整理', '打扫'],
    '沟通交流': ['沟通', '交流', '联系', '电话'],
    '阅读充电': ['阅读', '看书', '读书'],
  };
  return keywordMap[activity] || [];
}

/**
 * 完成待办后的趣味反馈文案
 * @param {string} todoText - 完成的待办文本
 * @param {Object} almanac - 今日宜忌数据
 * @returns {string} 反馈文案
 */
export function getCompletionFeedback(todoText, almanac) {
  if (!almanac) return '🎉 完成一项待办！';

  const matchedYi = checkYiMatch(todoText, almanac.yi);
  if (matchedYi) {
    const feedbacks = [
      `🎉 今日宜「${matchedYi}」，宜忌应验！好运+1`,
      `✨ 顺应天时，「${matchedYi}」完成！今日运势大吉`,
      `🌟 你完成了今日宜做的事，福气满满！`,
      `🏆 宜「${matchedYi}」已达成，今日是高效的一天！`,
    ];
    // 用待办文本长度做种子，稳定选取
    const seed = todoText.length;
    return feedbacks[Math.floor(seededRandom(seed) * feedbacks.length)];
  }

  // 普通完成反馈
  const normalFeedbacks = [
    '🎉 又完成一项！继续保持！',
    '✅ 滴！完成卡 +1',
    '💪 今日进度 +1，加油！',
    '🎊 完成啦！你可以的！',
  ];
  const seed = todoText.length;
  return normalFeedbacks[Math.floor(seededRandom(seed) * normalFeedbacks.length)];
}
