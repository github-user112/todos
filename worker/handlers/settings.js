import { jsonResponse } from '../utils.js';

async function handleGetUserSettings(request, env, userId) {
  try {
    const settings = await env.DB.prepare(`SELECT * FROM user_settings WHERE user_id = ?`)
      .bind(userId)
      .first();

    if (!settings) {
      return jsonResponse({
        animation_type: 'slide-left',
        theme_type: 'default',
        view_mode: 'today-priority',
        show_todo_list: 0,
        webhook_url: '',
      });
    }

    return jsonResponse({
      animation_type: settings.animation_type,
      theme_type: settings.theme_type,
      view_mode: settings.view_mode,
      show_todo_list: settings.show_todo_list,
      webhook_url: settings.webhook_url || '',
    });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    return jsonResponse({ error: '获取用户设置失败' }, 500);
  }
}

async function handleUpdateUserSettings(request, env, userId) {
  try {
    const data = await request.json();
    const allowedFields = [
      'animation_type',
      'theme_type',
      'view_mode',
      'show_todo_list',
      'webhook_url',
    ];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) return jsonResponse({ error: '没有需要更新的字段' }, 400);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const result = await env.DB.prepare(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
    )
      .bind(...values)
      .run();

    if (result.meta.changes === 0) {
      const fields = ['user_id'];
      const placeholders = ['?'];
      const insertValues = [userId];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(field);
          placeholders.push('?');
          insertValues.push(data[field]);
        }
      }

      await env.DB.prepare(
        `INSERT INTO user_settings (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`,
      )
        .bind(...insertValues)
        .run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('更新用户设置失败:', error);
    return jsonResponse({ error: '更新用户设置失败' }, 500);
  }
}

export { handleGetUserSettings, handleUpdateUserSettings };
