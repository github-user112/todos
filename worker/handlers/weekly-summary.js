import { jsonResponse } from '../utils.js';

const DEFAULT_ADMIN_UIDS = ['758tvu59bxixb0p811rj2g1743577326022'];

async function getAdminUids(env) {
  const data = await env.SETTINGS.get('admin_uids');
  if (!data) return DEFAULT_ADMIN_UIDS;
  try {
    const uids = JSON.parse(data);
    return Array.isArray(uids) && uids.length > 0 ? uids : DEFAULT_ADMIN_UIDS;
  } catch {
    return DEFAULT_ADMIN_UIDS;
  }
}

async function isAdmin(userId, env) {
  const adminUids = await getAdminUids(env);
  return adminUids.includes(userId);
}

function getDefaultSettings() {
  return {
    enabled: false,
    days: 1,
    webhook_url: '',
    template: `## 📢 周末提醒

📅 日期：{date}
🗓️ 星期：{weekday}
📊 本周第 {week_num} 个工作日（共 {total_workdays} 天）`,
  };
}

async function getWeeklySummarySettings(userId, env) {
  const data = await env.SETTINGS.get(`weekly_summary:${userId}`);
  return data ? JSON.parse(data) : getDefaultSettings();
}

async function saveWeeklySummarySettings(userId, env, settings) {
  await env.SETTINGS.put(`weekly_summary:${userId}`, JSON.stringify(settings));
}

function renderTemplate(
  template,
  { dateStr, weekday, weekNum, totalWorkdays },
) {
  return template
    .replace('{date}', dateStr)
    .replace('{weekday}', weekday)
    .replace('{week_num}', `第${weekNum}个`)
    .replace('{total_workdays}', String(totalWorkdays));
}

async function fetchHolidayData(year) {
  const years = [year, year - 1];
  const map = {};
  for (const y of years) {
    try {
      const response = await fetch(
        `https://unpkg.com/holiday-calendar@1.3.3/data/CN/${y}.min.json`,
      );
      if (!response.ok) continue;
      const data = await response.json();
      if (data && data.dates) {
        data.dates.forEach((item) => {
          map[item.date] = item.type;
        });
      }
    } catch {}
  }
  return map;
}

function isWorkday(dateStr, holidayMap) {
  const type = holidayMap[dateStr];
  if (type === 'public_holiday') return false;
  if (type === 'transfer_workday') return true;
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function getWeekWorkdays(todayStr, holidayMap) {
  const today = new Date(todayStr + 'T00:00:00');
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;

  const workdays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + mondayOffset + i);
    const dateStr = d.toISOString().split('T')[0];
    if (isWorkday(dateStr, holidayMap)) {
      workdays.push(dateStr);
    }
  }
  return workdays;
}

async function handleCheckAdminAccess(request, env, userId) {
  const allowed = await isAdmin(userId, env);
  return jsonResponse({ allowed });
}

async function handleGetWeeklySummarySettings(request, env, userId) {
  if (!(await isAdmin(userId, env))) {
    return jsonResponse({ error: '无权限访问' }, 403);
  }
  try {
    const settings = await getWeeklySummarySettings(userId, env);
    return jsonResponse(settings);
  } catch (error) {
    console.error('获取周报设置失败:', error);
    return jsonResponse({ error: '获取周报设置失败' }, 500);
  }
}

async function handleUpdateWeeklySummarySettings(request, env, userId) {
  if (!(await isAdmin(userId, env))) {
    return jsonResponse({ error: '无权限访问' }, 403);
  }
  try {
    const data = await request.json();
    const settings = {
      enabled: !!data.enabled,
      days: Math.max(1, Math.min(3, data.days || 1)),
      webhook_url: data.webhook_url || '',
      template: data.template || getDefaultSettings().template,
    };
    await saveWeeklySummarySettings(userId, env, settings);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('保存周报设置失败:', error);
    return jsonResponse({ error: '保存周报设置失败' }, 500);
  }
}

async function handleTestWeeklySummary(request, env, userId) {
  if (!(await isAdmin(userId, env))) {
    return jsonResponse({ error: '无权限访问' }, 403);
  }
  try {
    const settings = await getWeeklySummarySettings(userId, env);

    if (!settings.webhook_url) {
      return jsonResponse({ error: '请先设置 Webhook URL' }, 400);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const year = today.getFullYear();
    const holidayMap = await fetchHolidayData(year);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekDays[today.getDay()];
    const workdays = getWeekWorkdays(todayStr, holidayMap);

    if (workdays.length === 0) {
      return jsonResponse({ error: '本周无工作日，不推送' }, 400);
    }

    const weekNum = workdays.indexOf(todayStr) + 1;
    const lastN = workdays.slice(-settings.days);
    const isLast = lastN.includes(todayStr);

    const rendered = renderTemplate(settings.template, {
      dateStr: todayStr,
      weekday,
      weekNum,
      totalWorkdays: workdays.length,
    });

    const payload = { msgtype: 'markdown', markdown: { content: rendered } };

    const response = await fetch(settings.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.errcode && parsed.errcode !== 0) {
        return jsonResponse({
          success: false,
          error: parsed.errmsg || `错误码: ${parsed.errcode}`,
        });
      }
    } catch {}

    return jsonResponse({
      success: true,
      isLastNWorkday: isLast,
      weekWorkdays: workdays,
      lastNDays: lastN,
    });
  } catch (error) {
    console.error('测试周报失败:', error);
    return jsonResponse({ error: '测试周报失败: ' + error.message }, 500);
  }
}

async function handleWeeklySummaryPush(env) {
  try {
    const list = await env.SETTINGS.list({ prefix: 'weekly_summary:' });
    const keys = list.keys || [];
    if (keys.length === 0) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const year = now.getFullYear();
    const holidayMap = await fetchHolidayData(year);

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekDays[now.getDay()];
    const workdays = getWeekWorkdays(todayStr, holidayMap);

    if (workdays.length === 0) return;

    const lastN = workdays.slice(-1);
    const isPushDay = lastN.includes(todayStr);
    if (!isPushDay) return;

    await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const userId = key.name.replace('weekly_summary:', '');
          const raw = await env.SETTINGS.get(key.name);
          const settings = raw ? JSON.parse(raw) : getDefaultSettings();

          if (!settings.enabled || !settings.webhook_url) return;

          const weekNum = workdays.indexOf(todayStr) + 1;
          const rendered = renderTemplate(settings.template, {
            dateStr: todayStr,
            weekday,
            weekNum,
            totalWorkdays: workdays.length,
          });

          const payload = {
            msgtype: 'markdown',
            markdown: { content: rendered },
          };

          await fetch(settings.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (err) {
          console.error(`周报推送失败 [${key.name}]:`, err);
        }
      }),
    );
  } catch (error) {
    console.error('周报推送失败:', error);
  }
}

export {
  handleCheckAdminAccess,
  handleGetWeeklySummarySettings,
  handleUpdateWeeklySummarySettings,
  handleTestWeeklySummary,
  handleWeeklySummaryPush,
};
