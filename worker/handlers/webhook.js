import { jsonResponse } from '../utils.js';

let holidayCache = {};
let holidayCacheYear = null;

async function ensureHolidayData(year) {
  if (holidayCacheYear === year && Object.keys(holidayCache).length) return
  try {
    const res = await fetch(`https://unpkg.com/holiday-calendar@1.3.3/data/CN/${year}.min.json`)
    if (res.ok) {
      const data = await res.json()
      const map = {}
      ;(data.dates || []).forEach(item => { map[item.date] = { name: item.name_cn, type: item.type } })
      holidayCache = map
      holidayCacheYear = year
    }
  } catch {}
}

function isHolidayDate(dateStr) {
  const info = holidayCache[dateStr]
  if (!info) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.getDay() === 0 || d.getDay() === 6
  }
  return info.type === 'public_holiday' || info.type === 'holiday' || info.type === 'rest'
}

function isWorkdayDate(dateStr) {
  return !isHolidayDate(dateStr)
}

function findLastWorkday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  for (let i = 1; i <= 7; i++) {
    const check = new Date(d)
    check.setDate(check.getDate() - i)
    if (isWorkdayDate(check.toISOString().split('T')[0])) return check.toISOString().split('T')[0]
  }
  return dateStr
}

function getHolidayBlock(startStr) {
  const block = []
  const d = new Date(startStr + 'T00:00:00')
  for (let i = 0; i < 30; i++) {
    const dateStr = d.toISOString().split('T')[0]
    if (isHolidayDate(dateStr)) {
      block.push(dateStr)
      d.setDate(d.getDate() + 1)
    } else {
      break
    }
  }
  return block
}

function matchesDate(todo, dateStr) {
  const todoDate = new Date(todo.date + 'T00:00:00')
  const targetDate = new Date(dateStr + 'T00:00:00')
  const interval = todo.repeat_interval || 1
  const endDate = todo.end_date ? new Date(todo.end_date + 'T00:00:00') : null

  if (targetDate < todoDate) return false
  if (endDate && targetDate > endDate) return false

  const type = todo.repeat_type
  if (type === 'daily') {
    const diffDays = Math.round((targetDate - todoDate) / 86400000)
    return diffDays % interval === 0
  } else if (type === 'weekly') {
    const diffDays = Math.round((targetDate - todoDate) / 86400000)
    const diffWeeks = Math.floor(diffDays / 7)
    return diffDays % 7 === 0 && diffWeeks % interval === 0
  } else if (type === 'monthly') {
    const monthDiff = (targetDate.getFullYear() - todoDate.getFullYear()) * 12 + (targetDate.getMonth() - todoDate.getMonth())
    return targetDate.getDate() === todoDate.getDate() && monthDiff % interval === 0
  } else if (type === 'yearly') {
    const yearDiff = targetDate.getFullYear() - todoDate.getFullYear()
    return targetDate.getMonth() === todoDate.getMonth() && targetDate.getDate() === todoDate.getDate() && yearDiff % interval === 0
  }
  return false
}

function collectPushableTodos(todos, todayStr, holidayBlock) {
  const result = []
  const seen = new Set()
  const todayIsHoliday = isHolidayDate(todayStr)
  const lastWorkdays = new Set(holidayBlock.map(d => findLastWorkday(d)))

  for (const todo of todos) {
    if (todo.completed) continue
    const skipHolidays = !!todo.skip_holidays

    if (!todo.repeat_type || todo.repeat_type === 'none') {
      let displayDate = todo.date
      if (skipHolidays && isHolidayDate(todo.date)) {
        displayDate = findLastWorkday(todo.date)
      }
      if (displayDate === todayStr && !seen.has(todo.id)) {
        seen.add(todo.id)
        result.push({ ...todo, date: todayStr })
      }
      continue
    }

    const todoDateObj = new Date(todo.date + 'T00:00:00')
    const endDate = todo.end_date ? new Date(todo.end_date + 'T00:00:00') : null

    if (matchesDate(todo, todayStr)) {
      if (!skipHolidays || !todayIsHoliday) {
        if (!seen.has(todo.id)) {
          seen.add(todo.id)
          result.push({ ...todo, date: todayStr })
        }
      }
    }

    if (skipHolidays && todayIsHoliday) continue
    if (!skipHolidays) continue
    if (!lastWorkdays.has(todayStr)) continue

    for (const holidayDate of holidayBlock) {
      if (findLastWorkday(holidayDate) !== todayStr) continue

      const holidayObj = new Date(holidayDate + 'T00:00:00')
      if (holidayObj < todoDateObj) continue
      if (endDate && holidayObj > endDate) continue

      if (matchesDate(todo, holidayDate)) {
        if (!seen.has(todo.id)) {
          seen.add(todo.id)
          result.push({ ...todo, date: todayStr, _originalHolidayDate: holidayDate })
        }
      }
    }
  }

  return result
}

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

async function collectAndPushUserTodos(userId, webhookUrl, todayStr, today, env) {
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const holidayBlock = getHolidayBlock(tomorrow.toISOString().split('T')[0])

  const weekLater = new Date(today)
  weekLater.setDate(weekLater.getDate() + 7)
  const weekLaterStr = weekLater.toISOString().split('T')[0]

  const nonRepeatingResult = await env.DB.prepare(
    `SELECT * FROM todos WHERE user_id = ? AND date BETWEEN ? AND ? AND (repeat_type = 'none' OR repeat_type IS NULL) AND completed = 0`,
  )
    .bind(userId, todayStr, weekLaterStr)
    .all()

  const repeatingResult = await env.DB.prepare(
    `SELECT * FROM todos WHERE user_id = ? AND repeat_type != 'none' AND date <= ? AND (end_date IS NULL OR end_date >= ?) AND completed = 0`,
  )
    .bind(userId, todayStr, todayStr)
    .all()

  const allTodos = [
    ...(nonRepeatingResult.results || []),
    ...(repeatingResult.results || []),
  ]

  if (allTodos.length === 0) return []

  const pushable = collectPushableTodos(allTodos, todayStr, holidayBlock)
  if (pushable.length === 0) return []

  const completedResult = await env.DB.prepare(
    `SELECT todo_id, date FROM completed_instances WHERE user_id = ? AND date = ?`,
  )
    .bind(userId, todayStr)
    .all()

  const completedIds = new Set(
    (completedResult.results || []).map(ci => `${ci.todo_id}-${ci.date}`),
  )

  return pushable.filter(todo => !completedIds.has(`${todo.id}-${todayStr}`))
}

async function handleTestWebhook(request, env, userId) {
  try {
    const settings = await env.DB.prepare(`SELECT webhook_url FROM user_settings WHERE user_id = ?`)
      .bind(userId)
      .first()

    const webhookUrl = settings?.webhook_url
    if (!webhookUrl) return jsonResponse({ error: '请先设置 Webhook URL' }, 400)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    await ensureHolidayData(today.getFullYear())

    const activeTodos = await collectAndPushUserTodos(userId, webhookUrl, todayStr, today, env)
    if (activeTodos.length === 0) {
      return jsonResponse({ success: true, todoCount: 0, message: '今天没有需要推送的待办' })
    }

    const { headers, body } = buildWebhookRequest(webhookUrl, todayStr, activeTodos)
    const response = await fetch(webhookUrl, { method: 'POST', headers, body })

    const responseBody = await response.text()
    try {
      const parsed = JSON.parse(responseBody)
      if (parsed.errcode && parsed.errcode !== 0) {
        return jsonResponse({
          success: false,
          status: response.status,
          error: parsed.errmsg || `错误码: ${parsed.errcode}`,
          todoCount: activeTodos.length,
        })
      }
    } catch {}

    return jsonResponse({
      success: true,
      status: response.status,
      todoCount: activeTodos.length,
      webhookType: detectWebhookType(webhookUrl),
    })
  } catch (error) {
    console.error('测试 Webhook 失败:', error)
    return jsonResponse({ error: '测试 Webhook 失败: ' + error.message }, 500)
  }
}

async function handleDailyWebhookPush(env) {
  try {
    const usersResult = await env.DB.prepare(
      `SELECT user_id, webhook_url FROM user_settings WHERE webhook_url IS NOT NULL AND webhook_url != ''`,
    ).all()

    const users = usersResult.results || []
    if (users.length === 0) return

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    await ensureHolidayData(today.getFullYear())

    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          const activeTodos = await collectAndPushUserTodos(user.user_id, user.webhook_url, todayStr, today, env)
          if (activeTodos.length === 0) return

          const { headers, body } = buildWebhookRequest(user.webhook_url, todayStr, activeTodos)
          await fetch(user.webhook_url, { method: 'POST', headers, body })
        } catch (err) {
          console.error(`Webhook 推送失败 [${user.user_id}]:`, err)
        }
      }),
    )

    console.log(`Webhook 推送完成: ${results.length} 个用户`)
  } catch (error) {
    console.error('每日 Webhook 推送失败:', error)
  }
}

export { handleTestWebhook, handleDailyWebhookPush };
