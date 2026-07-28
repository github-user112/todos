// 动态背景主题工具
// 根据时间段 + 天气动态调整页面背景
// 天气 API 失败时自动降级为纯时间段背景

const STORAGE_KEY = 'dynamic_background_enabled';
const WEATHER_CACHE_KEY = 'weather_cache';
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 分钟缓存

let enabled = null;
let listeners = new Set();

/**
 * 读取是否启用动态背景
 */
export function isDynamicBackgroundEnabled() {
  if (enabled !== null) return enabled;
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    enabled = false;
  }
  return enabled;
}

/**
 * 启用/禁用动态背景
 */
export function setDynamicBackgroundEnabled(value) {
  enabled = !!value;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {}
  notifyListeners();
  if (enabled) {
    applyDynamicBackground();
  } else {
    removeDynamicBackground();
  }
}

/**
 * 根据小时获取时间段
 */
export function getTimePeriod(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night'; // 21-5
}

/**
 * 获取天气（带缓存）
 * 使用 Open-Meteo 免费 API（无需 key，无 CORS 限制）
 * 失败返回 null
 */
export async function fetchWeather() {
  // 检查缓存
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < WEATHER_CACHE_TTL) {
        return data.weather;
      }
    }
  } catch {}

  try {
    // 先获取位置（超时 5s）
    const coords = await getCoords(5000);
    // 调用 Open-Meteo API
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=weather_code,temperature_2m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('weather API error');
    const data = await res.json();
    const weather = {
      code: data.current?.weather_code,
      temp: data.current?.temperature_2m,
      condition: mapWeatherCode(data.current?.weather_code),
    };
    // 写缓存
    try {
      localStorage.setItem(
        WEATHER_CACHE_KEY,
        JSON.stringify({ weather, timestamp: Date.now() }),
      );
    } catch {}
    return weather;
  } catch (e) {
    console.warn('获取天气失败，使用纯时间段背景:', e.message);
    return null;
  }
}

// WMO Weather Code 映射
function mapWeatherCode(code) {
  if (code == null) return 'unknown';
  if (code === 0) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain';
  if (code <= 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloudy';
}

function getCoords(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation not supported'));
      return;
    }
    const timer = setTimeout(() => reject(new Error('geolocation timeout')), timeout);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { timeout, maximumAge: 600000 },
    );
  });
}

/**
 * 根据时间段和天气生成背景样式
 */
export function buildBackgroundStyle(period, weather) {
  // 基础时间段渐变
  const periodGradients = {
    morning: {
      bg: 'linear-gradient(135deg, #fff5e6 0%, #ffe0b3 30%, #ffd1dc 70%, #e0e7ff 100%)',
      overlay: 'radial-gradient(ellipse at 30% 20%, rgba(255,200,100,0.25) 0%, transparent 60%)',
    },
    noon: {
      bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #e0e7ff 100%)',
      overlay: 'radial-gradient(ellipse at 50% 10%, rgba(135,206,250,0.3) 0%, transparent 60%)',
    },
    afternoon: {
      bg: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 40%, #fecaca 80%, #fbcfe8 100%)',
      overlay: 'radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.2) 0%, transparent 60%)',
    },
    evening: {
      bg: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 30%, #a855f7 70%, #6366f1 100%)',
      overlay: 'radial-gradient(ellipse at 50% 80%, rgba(244,63,94,0.25) 0%, transparent 60%)',
    },
    night: {
      bg: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      overlay: 'radial-gradient(ellipse at 70% 20%, rgba(139,92,246,0.2) 0%, transparent 60%)',
    },
  };

  let base = periodGradients[period] || periodGradients.noon;

  // 根据天气调整
  if (weather) {
    switch (weather.condition) {
      case 'rain':
        base = {
          bg: 'linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)',
          overlay: 'radial-gradient(ellipse at 50% 0%, rgba(148,163,184,0.4) 0%, transparent 70%)',
        };
        break;
      case 'snow':
        base = {
          bg: 'linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 50%, #ffffff 100%)',
          overlay: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 70%)',
        };
        break;
      case 'thunder':
        base = {
          bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
          overlay: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%)',
        };
        break;
      case 'fog':
        base = {
          bg: 'linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 50%, #d1d5db 100%)',
          overlay: 'radial-gradient(ellipse at 50% 0%, rgba(229,231,235,0.5) 0%, transparent 70%)',
        };
        break;
      case 'cloudy':
        base = {
          bg: 'linear-gradient(135deg, #cbd5e1 0%, #e2e8f0 50%, #f1f5f9 100%)',
          overlay: 'radial-gradient(ellipse at 50% 0%, rgba(203,213,225,0.4) 0%, transparent 70%)',
        };
        break;
      // clear / unknown 用时间段基础渐变
    }
  }

  return base;
}

/**
 * 应用动态背景到 body
 */
export async function applyDynamicBackground() {
  if (!isDynamicBackgroundEnabled()) return;

  const period = getTimePeriod();
  const weather = await fetchWeather();
  const style = buildBackgroundStyle(period, weather);

  const root = document.documentElement;
  root.style.setProperty('--dynamic-bg', style.bg);
  root.style.setProperty('--dynamic-overlay', style.overlay);
  document.body.classList.add('dynamic-background');
}

/**
 * 移除动态背景
 */
export function removeDynamicBackground() {
  const root = document.documentElement;
  root.style.removeProperty('--dynamic-bg');
  root.style.removeProperty('--dynamic-overlay');
  document.body.classList.remove('dynamic-background');
}

/**
 * 监听动态背景开关变化
 */
export function onDynamicBackgroundChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(enabled));
}

/**
 * 启动定时刷新（每小时检查一次时间段变化）
 */
let refreshTimer = null;
export function startDynamicBackgroundRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (isDynamicBackgroundEnabled()) {
      applyDynamicBackground();
    }
  }, 60 * 60 * 1000); // 1小时
}

export function stopDynamicBackgroundRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
