// 完成待办彩蛋动效偏好管理
// 风格：'confetti' | 'stars' | 'rainbow' | 'all' | 'none'

import { t } from './i18n.js';

const STORAGE_KEY = 'celebration_effect';
const VALID_EFFECTS = ['confetti', 'stars', 'rainbow', 'all', 'none'];

let currentEffect = null;

/**
 * 从 localStorage 读取动效偏好
 * @returns {string}
 */
export function getCelebrationEffect() {
  if (currentEffect !== null) return currentEffect;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    currentEffect = VALID_EFFECTS.includes(v) ? v : 'confetti';
  } catch {
    currentEffect = 'confetti';
  }
  return currentEffect;
}

/**
 * 保存动效偏好到 localStorage
 * @param {string} effect
 */
export function setCelebrationEffect(effect) {
  if (!VALID_EFFECTS.includes(effect)) return;
  currentEffect = effect;
  try {
    localStorage.setItem(STORAGE_KEY, effect);
  } catch {}
}

/**
 * 动效风格选项（供设置页使用）
 */
export const CELEBRATION_OPTIONS = [
  { value: 'confetti', label: t('🎊 彩色纸屑') },
  { value: 'stars', label: t('✨ 星星粒子') },
  { value: 'rainbow', label: t('🌈 彩虹光波') },
  { value: 'all', label: t('🎉 全部动效') },
  { value: 'none', label: t('🚫 关闭动效') },
];
