import { jsonResponse, validateRepeatInterval } from '../utils.js';

async function handleGetTodos(request, env, userId) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return jsonResponse({ error: '缺少开始日期或结束日期参数' }, 400);
  }

  try {
    const todosResult = await env.DB.prepare(
      `SELECT * FROM todos 
       WHERE user_id = ? AND (
         (date BETWEEN ? AND ?) OR
         (repeat_type != 'none' AND date <= ? AND (end_date IS NULL OR end_date >= ?))
       ) AND (end_date IS NULL OR end_date >= ?)
       ORDER BY date, repeat_type, repeat_interval`,
    )
      .bind(userId, startDate, endDate, endDate, startDate, startDate)
      .all();

    const completedInstancesResult = await env.DB.prepare(
      `SELECT * FROM completed_instances WHERE user_id = ? AND date BETWEEN ? AND ?`,
    )
      .bind(userId, startDate, endDate)
      .all();

    const deletedInstancesResult = await env.DB.prepare(
      `SELECT * FROM deleted_instances WHERE user_id = ? AND date BETWEEN ? AND ?`,
    )
      .bind(userId, startDate, endDate)
      .all();

    return jsonResponse({
      todos: todosResult.results || [],
      completedInstances: completedInstancesResult.results || [],
      deletedInstances: deletedInstancesResult.results || [],
    });
  } catch (error) {
    console.error('查询待办事项时出错:', error);
    return jsonResponse({ error: '查询待办事项失败' }, 500);
  }
}

async function handleCreateTodo(request, env, userId) {
  try {
    const data = await request.json();

    if (!data.text || !data.date) {
      return jsonResponse({ error: '缺少必要的字段' }, 400);
    }

    const repeatType = data.repeatType || 'none';
    const repeatInterval = data.repeatInterval || 1;
    const endDate = data.endDate || '2039-12-31';
    const skipHolidays = data.skipHolidays ? 1 : 0;
    const reminder = data.reminder || 0;
    const todoTime = data.todoTime || '09:00';

    const validationResult = validateRepeatInterval(repeatType, repeatInterval);
    if (!validationResult.valid) {
      return jsonResponse({ error: validationResult.message }, 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO todos (text, date, repeat_type, repeat_interval, end_date, completed, skip_holidays, reminder, todo_time, user_id)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    )
      .bind(data.text, data.date, repeatType, repeatInterval, endDate, skipHolidays, reminder, todoTime, userId)
      .run();

    if (result.success) {
      const todo = await env.DB.prepare(`SELECT * FROM todos WHERE id = ?`)
        .bind(result.meta.last_row_id)
        .first();

      return jsonResponse({
        success: true,
        todo: { ...todo, skip_holidays: !!todo.skip_holidays, reminder: todo.reminder || 0 },
      });
    } else {
      throw new Error('插入待办事项失败');
    }
  } catch (error) {
    console.error('创建待办事项时出错:', error);
    return jsonResponse({ error: '创建待办事项失败' }, 500);
  }
}

async function handleUpdateTodo(request, env, userId) {
  try {
    const data = await request.json();

    if (!data.id) return jsonResponse({ error: '缺少待办事项 ID' }, 400);

    const todo = await env.DB.prepare(`SELECT * FROM todos WHERE id = ? AND user_id = ?`)
      .bind(data.id, userId)
      .first();

    if (!todo) return jsonResponse({ error: '待办事项不存在或无权限' }, 404);

    const completed = data.completed !== undefined ? (data.completed ? 1 : 0) : todo.completed;
    const endDate = data.endDate !== undefined ? data.endDate : todo.end_date;
    const todoTime = data.todoTime !== undefined ? data.todoTime : todo.todo_time;
    const reminder = data.reminder !== undefined ? data.reminder : todo.reminder;

    const result = await env.DB.prepare(
      `UPDATE todos SET completed = ?, end_date = ?, todo_time = ?, reminder = ? WHERE id = ?`,
    )
      .bind(completed, endDate, todoTime, reminder, data.id)
      .run();

    return jsonResponse({ success: result.success });
  } catch (error) {
    console.error('更新待办事项时出错:', error);
    return jsonResponse({ error: '更新待办事项失败' }, 500);
  }
}

async function handleDeleteTodo(request, env, userId) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return jsonResponse({ error: '缺少待办事项 ID' }, 400);

    const todo = await env.DB.prepare(`SELECT * FROM todos WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .first();

    if (!todo) return jsonResponse({ error: '待办事项不存在或无权限' }, 404);

    const result = await env.DB.prepare(`DELETE FROM todos WHERE id = ?`).bind(id).run();

    return jsonResponse({ success: result.success });
  } catch (error) {
    console.error('删除待办事项时出错:', error);
    return jsonResponse({ error: '删除待办事项失败' }, 500);
  }
}

export { handleGetTodos, handleCreateTodo, handleUpdateTodo, handleDeleteTodo };
