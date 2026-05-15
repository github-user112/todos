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
📊 本周第 {week_num} 个工作日（共 {total_workdays} 天）

📋 今日待办（{todo_count} 项）：
{todo_list}`,
  };
}

async function getWeeklySummarySettings(userId, env) {
  const data = await env.SETTINGS.get(`weekly_summary:${userId}`);
  return data ? JSON.parse(data) : getDefaultSettings();
}

async function saveWeeklySummarySettings(userId, env, settings) {
  await env.SETTINGS.put(
    `weekly_summary:${userId}`,
    JSON.stringify(settings),
  );
}

function renderTemplate(template, { dateStr, weekday, weekNum, totalWorkdays, todos }) {
  const todoLines = todos
    .map((t, i) => `${i + 1}. [${t.todo_time || '09:00'}] ${t.text}`)
    .join('\n');
  return template
    .replace('{date}', dateStr)
    .replace('{weekday}', weekday)
    .replace('{week_num}', `第${weekNum}个`)
    .replace('{total_workdays}', String(totalWorkdays))
    .replace('{todo_count}', String(todos.length))
    .replace('{todo_list}', todoLines || '（无待办）');
}

async function fetchHolidayData(year) {
  try {
    const response = await fetch(
      `https://unpkg.com/holiday-calendar@1.1.6/data/CN/${year}.min.json`,
    );
    if (!response.ok) return {};
    const data = await response.json();
    const map = {};
    if (data && data.dates) {
      data.dates.forEach((item) => {
        map[item.date] = item.type;
      });
    }
    return map;
  } catch {
    return {};
  }
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

function matchesDate(todo, dateStr) {
  const todoDate = new Date(todo.date + 'T00:00:00');
  const targetDate = new Date(dateStr + 'T00:00:00');
  const interval = todo.repeat_interval || 1;
  const endDate = todo.end_date ? new Date(todo.end_date + 'T00:00:00') : null;

  if (targetDate < todoDate) return false;
  if (endDate && targetDate > endDate) return false;

  const type = todo.repeat_type;
  if (type === 'daily') {
    const diffDays = Math.round((targetDate - todoDate) / 86400000);
    return diffDays % interval === 0;
  } else if (type === 'weekly') {
    const diffDays = Math.round((targetDate - todoDate) / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    return diffDays % 7 === 0 && diffWeeks % interval === 0;
  } else if (type === 'monthly') {
    const monthDiff =
      (targetDate.getFullYear() - todoDate.getFullYear()) * 12 +
      (targetDate.getMonth() - todoDate.getMonth());
    return (
      targetDate.getDate() === todoDate.getDate() && monthDiff % interval === 0
    );
  } else if (type === 'yearly') {
    const yearDiff = targetDate.getFullYear() - todoDate.getFullYear();
    return (
      targetDate.getMonth() === todoDate.getMonth() &&
      targetDate.getDate() === todoDate.getDate() &&
      yearDiff % interval === 0
    );
  }

  return false;
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
    const weekNum = workdays.indexOf(todayStr) + 1;
    const lastN = workdays.slice(-settings.days);
    const isLast = lastN.includes(todayStr);

    const nonRepeatingResult = await env.DB.prepare(
      `SELECT * FROM todos WHERE user_id = ? AND date = ? AND (repeat_type = 'none' OR repeat_type IS NULL) AND completed = 0`,
    )
      .bind(userId, todayStr)
      .all();

    const repeatingResult = await env.DB.prepare(
      `SELECT * FROM todos WHERE user_id = ? AND repeat_type != 'none' AND date <= ? AND (end_date IS NULL OR end_date >= ?) AND completed = 0`,
    )
      .bind(userId, todayStr, todayStr)
      .all();

    const nonRepeatingTodos = nonRepeatingResult.results || [];
    const repeatingTodos = (repeatingResult.results || []).filter((todo) =>
      matchesDate(todo, todayStr),
    );
    const todos = [...nonRepeatingTodos, ...repeatingTodos];

    const rendered = renderTemplate(settings.template, {
      dateStr: todayStr,
      weekday,
      weekNum,
      totalWorkdays: workdays.length,
      todos,
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
      todoCount: todos.length,
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

    await Promise.allSettled(
      keys.map(async (key) => {
        try {
          const userId = key.name.replace('weekly_summary:', '');
          const raw = await env.SETTINGS.get(key.name);
          const settings = raw ? JSON.parse(raw) : getDefaultSettings();

          if (!settings.enabled || !settings.webhook_url) return;

          const lastN = workdays.slice(-settings.days);
          if (!lastN.includes(todayStr)) return;

          const nonRepeatingResult = await env.DB.prepare(
            `SELECT * FROM todos WHERE user_id = ? AND date = ? AND (repeat_type = 'none' OR repeat_type IS NULL) AND completed = 0`,
          )
            .bind(userId, todayStr)
            .all();

          const repeatingResult = await env.DB.prepare(
            `SELECT * FROM todos WHERE user_id = ? AND repeat_type != 'none' AND date <= ? AND (end_date IS NULL OR end_date >= ?) AND completed = 0`,
          )
            .bind(userId, todayStr, todayStr)
            .all();

          const nonRepeatingTodos = nonRepeatingResult.results || [];
          const repeatingTodos = (repeatingResult.results || []).filter((todo) =>
            matchesDate(todo, todayStr),
          );
          const todos = [...nonRepeatingTodos, ...repeatingTodos];

          const completedResult = await env.DB.prepare(
            `SELECT todo_id, date FROM completed_instances WHERE user_id = ? AND date = ?`,
          )
            .bind(userId, todayStr)
            .all();

          const completedIds = new Set(
            (completedResult.results || []).map((ci) => `${ci.todo_id}-${ci.date}`),
          );

          const activeTodos = todos.filter(
            (todo) => !completedIds.has(`${todo.id}-${todayStr}`),
          );

          if (activeTodos.length === 0) return;

          const weekNum = workdays.indexOf(todayStr) + 1;
          const rendered = renderTemplate(settings.template, {
            dateStr: todayStr,
            weekday,
            weekNum,
            totalWorkdays: workdays.length,
            todos: activeTodos,
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
