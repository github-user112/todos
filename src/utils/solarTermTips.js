// 24 节气养生提醒数据
// 基于 lunar-javascript 的 getJieQi() 返回的节气名称匹配

const SOLAR_TERM_TIPS = {
  立春: {
    emoji: '🌱',
    summary: '万物复苏，春气始至',
    tips: [
      '宜早睡早起，舒展身体',
      '饮食宜辛甘发散，少酸收',
      '可多吃韭菜、香菜、春笋',
    ],
    greeting: '今日立春，春天来啦！宜舒展身心，迎接新生 🌸',
  },
  雨水: {
    emoji: '💧',
    summary: '春风化雨，润物无声',
    tips: [
      '注意保暖，预防倒春寒',
      '宜健脾祛湿，多喝粥',
      '可食山药、红枣、薏米',
    ],
    greeting: '今日雨水，润物无声。注意保暖祛湿哦 🌧️',
  },
  惊蛰: {
    emoji: '🐛',
    summary: '春雷乍响，万物萌动',
    tips: [
      '宜养肝护肝，保持心情舒畅',
      '早睡早起，适当运动',
      '可多吃梨润肺，少食辛辣',
    ],
    greeting: '今日惊蛰，春雷唤醒万物。宜养肝护肝，保持好心情 ⛈️',
  },
  春分: {
    emoji: '🌿',
    summary: '昼夜平分，阴阳平衡',
    tips: [
      '宜平肝清热，保持作息规律',
      '饮食宜清淡，多吃时蔬',
      '可食菠菜、荠菜、春笋',
    ],
    greeting: '今日春分，昼夜均分。宜早睡早起，疏肝理气 🌿',
  },
  清明: {
    emoji: '🍃',
    summary: '天清地明，扫墓踏青',
    tips: [
      '宜踏青舒压，抒发肝气',
      '饮食宜柔肝养肝',
      '可食菊花、枸杞、桑葚',
    ],
    greeting: '今日清明，天清地明。宜踏青舒压，追思先人 🍃',
  },
  谷雨: {
    emoji: '🌧️',
    summary: '雨生百谷，春将尽',
    tips: [
      '宜祛湿养脾，防湿邪',
      '避免潮湿环境',
      '可食香椿、豆芽、扁豆',
    ],
    greeting: '今日谷雨，雨润百谷。注意祛湿养脾 🌾',
  },
  立夏: {
    emoji: '☀️',
    summary: '夏日始至，气温渐升',
    tips: [
      '宜养心安神，午间小憩',
      '饮食清淡，少油腻',
      '可多吃苦味菜清心',
    ],
    greeting: '今日立夏，夏日初临。宜养心安神，午间小憩 ☀️',
  },
  小满: {
    emoji: '🌾',
    summary: '麦渐黄熟，未全满',
    tips: [
      '宜清热祛湿，防皮肤问题',
      '饮食清爽，少甜腻',
      '可食绿豆、黄瓜、冬瓜',
    ],
    greeting: '今日小满，麦穗渐满。宜清热祛湿，保持清爽 🌾',
  },
  芒种: {
    emoji: '🌻',
    summary: '有芒之谷可种',
    tips: [
      '宜晚睡早起，中午小憩',
      '多补水，防中暑',
      '可食乌梅、山楂、薏仁',
    ],
    greeting: '今日芒种，忙碌时节。注意补水防暑 🌻',
  },
  夏至: {
    emoji: '🌞',
    summary: '白昼最长，阳气最盛',
    tips: [
      '宜晚睡早起，避免烈日',
      '饮食清淡，多喝汤水',
      '可食莲子、百合、苦瓜',
    ],
    greeting: '今日夏至，白昼最长。宜静心养神，多补水分 🌞',
  },
  小暑: {
    emoji: '🔥',
    summary: '暑气始至，炎热初显',
    tips: [
      '宜防暑降温，少动多静',
      '饮食清淡，忌冰饮过量',
      '可食西瓜、绿豆、丝瓜',
    ],
    greeting: '今日小暑，天气渐热。注意防暑降温 🔥',
  },
  大暑: {
    emoji: '🥵',
    summary: '一年最热，湿热交蒸',
    tips: [
      '宜避暑纳凉，少外出',
      '多喝解暑汤水',
      '可食西瓜、苦瓜、荷叶粥',
    ],
    greeting: '今日大暑，酷暑当头。宜避暑纳凉，注意防暑 🥵',
  },
  立秋: {
    emoji: '🍂',
    summary: '秋风渐起，暑去凉来',
    tips: [
      '宜早睡早起，收敛神气',
      '饮食滋阴润燥',
      '可食银耳、百合、梨',
    ],
    greeting: '今日立秋，暑去凉来。宜养阴润燥，收敛神气 🍂',
  },
  处暑: {
    emoji: '🍁',
    summary: '暑气止矣，秋意渐浓',
    tips: [
      '宜调情志，防秋燥',
      '多喝水，多吃润燥食物',
      '可食蜂蜜、芝麻、梨',
    ],
    greeting: '今日处暑，暑气渐止。注意防秋燥，多补水 🍁',
  },
  白露: {
    emoji: '🌫️',
    summary: '露凝而白，凉意渐生',
    tips: [
      '宜保暖，勿露体',
      '饮食润肺养阴',
      '可食梨、藕、百合',
    ],
    greeting: '今日白露，凉意渐生。注意添衣保暖 🌫️',
  },
  秋分: {
    emoji: '🌙',
    summary: '昼夜均分，秋过半',
    tips: [
      '宜阴阳平衡，早睡早起',
      '饮食宜润燥养阴',
      '可食柿子、石榴、山药',
    ],
    greeting: '今日秋分，昼夜均分。宜养阴润燥，保持平衡 🌙',
  },
  寒露: {
    emoji: '💧',
    summary: '露气寒冷，将凝为霜',
    tips: [
      '宜足部保暖，防寒入体',
      '饮食温润，少寒凉',
      '可食核桃、红枣、山药',
    ],
    greeting: '今日寒露，寒气渐重。注意足部保暖 💧',
  },
  霜降: {
    emoji: '❄️',
    summary: '初霜降临，秋将尽',
    tips: [
      '宜保暖防寒，养胃护胃',
      '饮食温补，忌生冷',
      '可食板栗、柿子、白萝卜',
    ],
    greeting: '今日霜降，秋之末。注意保暖，养胃护胃 ❄️',
  },
  立冬: {
    emoji: '🧣',
    summary: '冬日始至，万物收藏',
    tips: [
      '宜早睡晚起，养精蓄锐',
      '饮食温补，养肾防寒',
      '可食羊肉、牛肉、桂圆',
    ],
    greeting: '今日立冬，冬日来临。宜养精蓄锐，温补御寒 🧣',
  },
  小雪: {
    emoji: '🌨️',
    summary: '初雪飘落，寒气渐重',
    tips: [
      '宜保暖御寒，多晒太阳',
      '饮食温补，保持心情舒畅',
      '可食羊肉、黑木耳、菠菜',
    ],
    greeting: '今日小雪，寒意渐浓。注意御寒保暖 🌨️',
  },
  大雪: {
    emoji: '⛄',
    summary: '雪量增大，万物潜藏',
    tips: [
      '宜早睡晚起，保暖为主',
      '饮食温补，养肾固本',
      '可食牛肉、核桃、板栗',
    ],
    greeting: '今日大雪，天寒地冻。宜温补养肾，注意保暖 ⛄',
  },
  冬至: {
    emoji: '🥟',
    summary: '白昼最短，阴极阳生',
    tips: [
      '宜进补养身，冬至大如年',
      '北方吃饺子，南方吃汤圆',
      '可食羊肉、桂圆、红枣',
    ],
    greeting: '今日冬至，阴极阳生。记得吃饺子/汤圆！冬至快乐 🥟',
  },
  小寒: {
    emoji: '🥶',
    summary: '寒气始烈，未至极',
    tips: [
      '宜御寒保暖，养肾防寒',
      '饮食温热，忌寒凉',
      '可食羊肉、糯米、生姜',
    ],
    greeting: '今日小寒，寒气加剧。注意御寒保暖 🥶',
  },
  大寒: {
    emoji: '🏔️',
    summary: '一年最冷，寒至极点',
    tips: [
      '宜藏精固本，早睡晚起',
      '饮食温补，蓄养元气',
      '可食羊肉、黑豆、红枣',
    ],
    greeting: '今日大寒，寒至极点。宜温补蓄元，静待春来 🏔️',
  },
};

// localStorage key 前缀，记录节气弹窗是否已展示
const SHOWN_KEY_PREFIX = 'solar_term_shown_';

/**
 * 获取今日节气信息（如今天是节气日则返回数据，否则返回 null）
 * 需要 lunar-javascript 已加载
 * @param {Date} date - 日期对象，默认为今天
 * @returns {Object|null} 节气信息 { name, emoji, summary, tips, greeting }
 */
export function getTodaySolarTerm(date = new Date()) {
  try {
    // 动态获取 lunar-javascript 模块
    const lunarModule = getLunarModuleSync();
    if (!lunarModule) return null;

    const Solar = lunarModule.Solar;
    const solar = Solar.fromYmd(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );
    const lunar = solar.getLunar();
    const jieQi = lunar.getJieQi();

    if (jieQi && SOLAR_TERM_TIPS[jieQi]) {
      return { name: jieQi, ...SOLAR_TERM_TIPS[jieQi] };
    }
    return null;
  } catch (e) {
    console.warn('获取节气信息失败:', e);
    return null;
  }
}

// 同步获取已加载的 lunar 模块（lunarUtils 中缓存了模块）
let cachedLunarModule = null;
export function setLunarModule(mod) {
  cachedLunarModule = mod;
}
function getLunarModuleSync() {
  return cachedLunarModule;
}

/**
 * 检查今日节气弹窗是否已经展示过
 * @param {Date} date - 日期对象
 * @returns {boolean}
 */
export function isSolarTermPopupShown(date = new Date()) {
  const key = SHOWN_KEY_PREFIX + formatDateStr(date);
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * 标记今日节气弹窗已展示
 * @param {Date} date - 日期对象
 */
export function markSolarTermPopupShown(date = new Date()) {
  const key = SHOWN_KEY_PREFIX + formatDateStr(date);
  try {
    localStorage.setItem(key, '1');
  } catch {}
}

/**
 * 获取所有 24 节气名称列表
 * @returns {string[]}
 */
export function getAllSolarTermNames() {
  return Object.keys(SOLAR_TERM_TIPS);
}

/**
 * 根据节气名获取养生信息
 * @param {string} name - 节气名
 * @returns {Object|null}
 */
export function getSolarTermTip(name) {
  return SOLAR_TERM_TIPS[name] || null;
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
