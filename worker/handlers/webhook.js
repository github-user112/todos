import { jsonResponse } from '../utils.js';

function detectWebhookType(url) {
  if (url.includes('qyapi.weixin.qq.com')) return 'wecom';
  if (url.includes('oapi.dingtalk.com')) return 'dingtalk';
  if (url.includes('hooks.slack.com')) return 'slack';
  return 'generic';
}

function buildWecomMarkdownPayload(dateStr, todos) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(dateStr + 'T00:00:00');
  const weekDay = weekDays[date.getDay()];

  let content = `## 📋 待办提醒 <font color="info">${dateStr} 星期${weekDay}</font>\n`;

  if (todos.length === 0) {
    content += `\n> 暂无待办事项，今天轻松一下 🎉`;
  } else {
    content += `\n> 今日共有 <font color="warning">${todos.length}</font> 项待办\n`;

    const sorted = [...todos].sort((a, b) => {
      return (a.todo_time || '09:00').localeCompare(b.todo_time || '09:00');
    });

    sorted.forEach((todo, index) => {
      const time = todo.todo_time || '09:00';
      const repeatLabel = todo.repeat_type && todo.repeat_type !== 'none' ? '🔄' : '';
      const holidayLabel = todo.skip_holidays ? '⛔' : '';
      content += `\n<font color="comment">${index + 1}.</font> <font color="info">[${time}]</font> ${todo.text} ${repeatLabel}${holidayLabel}`;
    });
  }

  return { msgtype: 'markdown', markdown: { content } };
}

function buildDingtalkMarkdownPayload(dateStr, todos) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(dateStr + 'T00:00:00');
  const weekDay = weekDays[date.getDay()];

  let text = `## 📋 待办提醒 ${dateStr} 星期${weekDay}\n\n`;

  if (todos.length === 0) {
    text += `暂无待办事项，今天轻松一下 🎉`;
  } else {
    text += `今日共有 **${todos.length}** 项待办\n\n`;

    const sorted = [...todos].sort((a, b) => {
      return (a.todo_time || '09:00').localeCompare(b.todo_time || '09:00');
    });

    sorted.forEach((todo, index) => {
      const time = todo.todo_time || '09:00';
      const repeatLabel = todo.repeat_type && todo.repeat_type !== 'none' ? '🔄' : '';
      text += `${index + 1}. [${time}] ${todo.text} ${repeatLabel}\n`;
    });
  }

  return { msgtype: 'markdown', markdown: { title: `📋 待办提醒 ${dateStr}`, text } };
}

function buildGenericPayload(dateStr, todos) {
  const items = todos.map((todo) => ({
    id: todo.id,
    text: todo.text,
    time: todo.todo_time || '09:00',
    reminder: todo.reminder || 0,
    repeat_type: todo.repeat_type,
    skip_holidays: !!todo.skip_holidays,
  }));

  return { date: dateStr, count: items.length, todos: items };
}

function buildWebhookRequest(webhookUrl, dateStr, todos) {
  const type = detectWebhookType(webhookUrl);
  let payload;

  switch (type) {
    case 'wecom':
      payload = buildWecomMarkdownPayload(dateStr, todos);
      break;
    case 'dingtalk':
      payload = buildDingtalkMarkdownPayload(dateStr, todos);
      break;
    default:
      payload = buildGenericPayload(dateStr, todos);
  }

  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

async function handleTestWebhook(request, env, userId) {
  try {
    const settings = await env.DB.prepare(`SELECT webhook_url FROM user_settings WHERE user_id = ?`)
      .bind(userId)
      .first();

    const webhookUrl = settings?.webhook_url;
    if (!webhookUrl) return jsonResponse({ error: '请先设置 Webhook URL' }, 400);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todosResult = await env.DB.prepare(
      `SELECT * FROM todos WHERE user_id = ? AND date = ? AND completed = 0`,
    )
      .bind(userId, todayStr)
      .all();

    const todos = todosResult.results || [];
    const { headers, body } = buildWebhookRequest(webhookUrl, todayStr, todos);

    const response = await fetch(webhookUrl, { method: 'POST', headers, body });

    const responseBody = await response.text();
    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.errcode && parsed.errcode !== 0) {
        return jsonResponse({
          success: false,
          status: response.status,
          error: parsed.errmsg || `错误码: ${parsed.errcode}`,
          todoCount: todos.length,
        });
      }
    } catch {}

    return jsonResponse({
      success: true,
      status: response.status,
      todoCount: todos.length,
      webhookType: detectWebhookType(webhookUrl),
    });
  } catch (error) {
    console.error('测试 Webhook 失败:', error);
    return jsonResponse({ error: '测试 Webhook 失败: ' + error.message }, 500);
  }
}

async function handleDailyWebhookPush(env) {
  try {
    const usersResult = await env.DB.prepare(
      `SELECT user_id, webhook_url FROM user_settings WHERE webhook_url IS NOT NULL AND webhook_url != ''`,
    ).all();

    const users = usersResult.results || [];
    if (users.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          const todosResult = await env.DB.prepare(
            `SELECT * FROM todos WHERE user_id = ? AND date <= ? AND (end_date IS NULL OR end_date >= ?) AND completed = 0`,
          )
            .bind(user.user_id, todayStr, todayStr)
            .all();

          const allTodos = todosResult.results || [];
          const todayTodos = allTodos.filter((todo) => {
            if (todo.date === todayStr) return true;
            if (todo.repeat_type && todo.repeat_type !== 'none') {
              return todo.date <= todayStr;
            }
            return false;
          });

          if (todayTodos.length === 0) return;

          const completedResult = await env.DB.prepare(
            `SELECT todo_id, date FROM completed_instances WHERE user_id = ? AND date = ?`,
          )
            .bind(user.user_id, todayStr)
            .all();

          const completedIds = new Set(
            (completedResult.results || []).map((ci) => `${ci.todo_id}-${ci.date}`),
          );

          const activeTodos = todayTodos.filter((todo) => {
            return !completedIds.has(`${todo.id}-${todayStr}`);
          });

          if (activeTodos.length === 0) return;

          const { headers, body } = buildWebhookRequest(user.webhook_url, todayStr, activeTodos);

          await fetch(user.webhook_url, { method: 'POST', headers, body });
        } catch (err) {
          console.error(`Webhook 推送失败 [${user.user_id}]:`, err);
        }
      }),
    );

    console.log(`Webhook 推送完成: ${results.length} 个用户`);
  } catch (error) {
    console.error('每日 Webhook 推送失败:', error);
  }
}

export { handleTestWebhook, handleDailyWebhookPush };
