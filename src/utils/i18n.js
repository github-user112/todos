// 极简 i18n：key 即中文字符串，en 字典缺失时回退中文
import { ref } from 'vue';

export const locale = ref(localStorage.getItem('locale') || 'zh');

export function setLocale(l) {
  locale.value = l;
  localStorage.setItem('locale', l);
}

// 英文翻译表：'中文': 'English'
// ponytail: 节气贴士/黄历等长文案内容保留中文，仅翻译 UI 文案
import en from './i18n-en.js';

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function t(zh) {
  if (locale.value !== 'en') return zh;
  return en[zh] ?? zh;
}

// 模板内拼接 {x} 占位：tf('还有 {n} 天', { n: 3 })
export function tf(zh, vars) {
  let s = t(zh);
  for (const k in vars) s = s.replaceAll(`{${k}}`, vars[k]);
  return s;
}

export function tMonth(monthIndex) {
  return locale.value === 'en' ? MONTH_NAMES_EN[monthIndex] : `${monthIndex + 1}月`;
}

export function isEn() {
  return locale.value === 'en';
}
