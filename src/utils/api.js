import { setLoading } from './loading.js';
import { t } from './i18n.js';

const UID_KEY = 'todos_user_id';
// 合法 uid：6-128 位字母数字 / 连字符 / 下划线
// 兼容老版 generateHash 产物（纯字母数字约 26 位）与新版 UUID（含连字符 36 位）
const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;

/** 生成密码学强随机 uid：优先 crypto.randomUUID，兜底 getRandomValues 手搓 v4 UUID */
function generateUid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
  // 极老环境兜底（非密码学安全，仅作保底）
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * 取当前用户 ID（不登录方案：本地高熵 uid，持有即权限）
 *
 * 优先级：
 *   1. URL ?uid= —— 仅作「恢复 / 迁移」入口，读到即固化到 localStorage 并从 URL 抹掉
 *      （避免分享链接 / 浏览器历史 / referer 泄露 uid）
 *   2. localStorage —— 常规来源，跨刷新持久
 *   3. 首次访问 —— 生成强随机 uid 并固化
 *
 * 永远返回非空合法 uid。别人猜不到你的 uid 即无法越权（128 位随机不可枚举）。
 * 代价：换设备 / 清浏览器数据 = 丢数据，需靠 ?uid=<自己的uid> 手动迁移，或用数据导出。
 */
export const getUserId = () => {
  // 1. URL ?uid= 作为恢复 / 迁移入口
  const params = new URLSearchParams(window.location.search);
  const urlUid = params.get('uid');
  if (urlUid && UID_RE.test(urlUid)) {
    localStorage.setItem(UID_KEY, urlUid);
    params.delete('uid');
    // 保留 hash 路由，否则从 #/settings 之类的页面恢复身份会被重置到首页
    const qs = params.toString();
    const hash = location.hash || '';
    window.history.replaceState(
      null,
      '',
      qs ? `${location.pathname}?${qs}${hash}` : `${location.pathname}${hash}`,
    );
    return urlUid;
  }
  // 2. localStorage 持久化
  const stored = localStorage.getItem(UID_KEY);
  if (stored && UID_RE.test(stored)) return stored;
  // 3. 首次：生成强随机 uid 并固化
  const uid = generateUid();
  localStorage.setItem(UID_KEY, uid);
  return uid;
};

export const apiRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  customHeaders = {},
  showLoading = false,
) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': getUserId(),
    ...customHeaders,
  };

  const options = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  if (showLoading) {
    setLoading(true);
  }

  try {
    const response = await fetch(endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || t('请求失败'));
    }

    return result;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  } finally {
    if (showLoading) {
      setLoading(false);
    }
  }
};
