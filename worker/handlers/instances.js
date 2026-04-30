import { jsonResponse } from '../utils.js';

async function handleToggleCompletedInstance(request, env, userId) {
  try {
    const data = await request.json();

    if (!data.todoId || !data.date) return jsonResponse({ error: '缺少必要的字段' }, 400);

    const todo = await env.DB.prepare(`SELECT * FROM todos WHERE id = ? AND user_id = ?`)
      .bind(data.todoId, userId)
      .first();

    if (!todo) return jsonResponse({ error: '待办事项不存在或无权限' }, 404);

    if (data.allInstances && todo.repeat_type !== 'none') {
      if (data.completed) {
        await env.DB.prepare(`UPDATE todos SET completed = 1 WHERE id = ?`).bind(data.todoId).run();
      } else {
        await env.DB.prepare(`UPDATE todos SET completed = 0 WHERE id = ?`).bind(data.todoId).run();
        await env.DB.prepare(`DELETE FROM completed_instances WHERE todo_id = ?`).bind(data.todoId).run();
      }
      return jsonResponse({ success: true });
    }

    const existingInstance = await env.DB.prepare(
      `SELECT * FROM completed_instances WHERE todo_id = ? AND date = ? AND user_id = ?`,
    )
      .bind(data.todoId, data.date, userId)
      .first();

    let completed = false;

    if (existingInstance) {
      await env.DB.prepare(
        `DELETE FROM completed_instances WHERE todo_id = ? AND date = ? AND user_id = ?`,
      )
        .bind(data.todoId, data.date, userId)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO completed_instances (todo_id, date, user_id) VALUES (?, ?, ?)`,
      )
        .bind(data.todoId, data.date, userId)
        .run();
      completed = true;
    }

    return jsonResponse({ success: true, completed });
  } catch (error) {
    console.error('切换完成状态时出错:', error);
    return jsonResponse({ error: '切换完成状态失败' }, 500);
  }
}

async function handleCreateDeletedInstance(request, env, userId) {
  try {
    const data = await request.json();

    if (!data.todoId || !data.date) return jsonResponse({ error: '缺少必要的字段' }, 400);

    const todo = await env.DB.prepare(`SELECT * FROM todos WHERE id = ? AND user_id = ?`)
      .bind(data.todoId, userId)
      .first();

    if (!todo) return jsonResponse({ error: '待办事项不存在或无权限' }, 404);

    if (data.allInstances && todo.repeat_type !== 'none') {
      await env.DB.prepare(`DELETE FROM todos WHERE id = ?`).bind(data.todoId).run();
      return jsonResponse({ success: true });
    }

    const existingInstance = await env.DB.prepare(
      `SELECT * FROM deleted_instances WHERE todo_id = ? AND date = ? AND user_id = ?`,
    )
      .bind(data.todoId, data.date, userId)
      .first();

    if (!existingInstance) {
      await env.DB.prepare(
        `INSERT INTO deleted_instances (todo_id, date, user_id) VALUES (?, ?, ?)`,
      )
        .bind(data.todoId, data.date, userId)
        .run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('创建删除记录时出错:', error);
    return jsonResponse({ error: '创建删除记录失败' }, 500);
  }
}

export { handleToggleCompletedInstance, handleCreateDeletedInstance };
