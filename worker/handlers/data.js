import { jsonResponse } from '../utils.js';

async function handleReorderTodos(request, env, userId) {
  try {
    const data = await request.json();
    const items = data.items;

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: '无效的排序数据' }, 400);
    }

    for (const item of items) {
      if (!item.id || item.sortOrder === undefined) continue;
      await env.DB.prepare(`UPDATE todos SET sort_order = ? WHERE id = ? AND user_id = ?`)
        .bind(item.sortOrder, item.id, userId)
        .run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('排序待办事项失败:', error);
    return jsonResponse({ error: '排序待办事项失败' }, 500);
  }
}

async function handleExportData(request, env, userId) {
  try {
    const todosResult = await env.DB.prepare(`SELECT * FROM todos WHERE user_id = ?`).bind(userId).all();
    const completedResult = await env.DB.prepare(`SELECT * FROM completed_instances WHERE user_id = ?`).bind(userId).all();
    const deletedResult = await env.DB.prepare(`SELECT * FROM deleted_instances WHERE user_id = ?`).bind(userId).all();
    const settingsResult = await env.DB.prepare(`SELECT * FROM user_settings WHERE user_id = ?`).bind(userId).first();

    const exportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      todos: (todosResult.results || []).map((t) => ({
        ...t,
        skip_holidays: !!t.skip_holidays,
      })),
      completedInstances: completedResult.results || [],
      deletedInstances: deletedResult.results || [],
      settings: settingsResult || {},
    };

    return jsonResponse(exportData);
  } catch (error) {
    console.error('导出数据失败:', error);
    return jsonResponse({ error: '导出数据失败' }, 500);
  }
}

async function handleImportData(request, env, userId) {
  try {
    const data = await request.json();

    if (!data.todos || !Array.isArray(data.todos)) {
      return jsonResponse({ error: '无效的导入数据格式' }, 400);
    }

    let importedTodos = 0;
    let importedCompleted = 0;
    let importedDeleted = 0;

    for (const todo of data.todos) {
      if (!todo.text || !todo.date) continue;

      const existing = await env.DB.prepare(`SELECT id FROM todos WHERE id = ? AND user_id = ?`)
        .bind(todo.id, userId)
        .first();

      if (existing) {
        await env.DB.prepare(
          `UPDATE todos SET text = ?, date = ?, repeat_type = ?, repeat_interval = ?, end_date = ?, completed = ?, skip_holidays = ?, reminder = ?, todo_time = ?, sort_order = ? WHERE id = ? AND user_id = ?`,
        )
          .bind(
            todo.text, todo.date, todo.repeat_type || 'none',
            todo.repeat_interval || 1, todo.end_date || '2039-12-31',
            todo.completed || 0, todo.skip_holidays ? 1 : 0,
            todo.reminder || 0, todo.todo_time || '09:00',
            todo.sort_order || 0, todo.id, userId,
          )
          .run();
      } else {
        await env.DB.prepare(
          `INSERT INTO todos (id, text, date, repeat_type, repeat_interval, end_date, completed, skip_holidays, reminder, todo_time, sort_order, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            todo.id, todo.text, todo.date, todo.repeat_type || 'none',
            todo.repeat_interval || 1, todo.end_date || '2039-12-31',
            todo.completed || 0, todo.skip_holidays ? 1 : 0,
            todo.reminder || 0, todo.todo_time || '09:00',
            todo.sort_order || 0, userId,
          )
          .run();
      }
      importedTodos++;
    }

    if (data.completedInstances && Array.isArray(data.completedInstances)) {
      for (const ci of data.completedInstances) {
        if (!ci.todo_id || !ci.date) continue;
        const existing = await env.DB.prepare(
          `SELECT id FROM completed_instances WHERE todo_id = ? AND date = ? AND user_id = ?`,
        )
          .bind(ci.todo_id, ci.date, userId)
          .first();

        if (!existing) {
          await env.DB.prepare(
            `INSERT INTO completed_instances (todo_id, date, user_id) VALUES (?, ?, ?)`,
          )
            .bind(ci.todo_id, ci.date, userId)
            .run();
          importedCompleted++;
        }
      }
    }

    if (data.deletedInstances && Array.isArray(data.deletedInstances)) {
      for (const di of data.deletedInstances) {
        if (!di.todo_id || !di.date) continue;
        const existing = await env.DB.prepare(
          `SELECT id FROM deleted_instances WHERE todo_id = ? AND date = ? AND user_id = ?`,
        )
          .bind(di.todo_id, di.date, userId)
          .first();

        if (!existing) {
          await env.DB.prepare(
            `INSERT INTO deleted_instances (todo_id, date, user_id) VALUES (?, ?, ?)`,
          )
            .bind(di.todo_id, di.date, userId)
            .run();
          importedDeleted++;
        }
      }
    }

    return jsonResponse({
      success: true,
      imported: { todos: importedTodos, completedInstances: importedCompleted, deletedInstances: importedDeleted },
    });
  } catch (error) {
    console.error('导入数据失败:', error);
    return jsonResponse({ error: '导入数据失败' }, 500);
  }
}

export { handleReorderTodos, handleExportData, handleImportData };
