import {
  handleGetTodos,
  handleCreateTodo,
  handleUpdateTodo,
  handleDeleteTodo,
} from './handlers/todos.js';
import {
  handleToggleCompletedInstance,
  handleCreateDeletedInstance,
} from './handlers/instances.js';
import {
  handleGetUserSettings,
  handleUpdateUserSettings,
} from './handlers/settings.js';
import { handleGetHolidays } from './handlers/holidays.js';
import {
  handleTestWebhook,
  handleDailyWebhookPush,
} from './handlers/webhook.js';
import {
  handleReorderTodos,
  handleExportData,
  handleImportData,
} from './handlers/data.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      const userId = request.headers.get('X-User-ID');
      if (!userId) return jsonResponse({ error: '缺少用户 ID' }, 401);

      if (path === '/api/user-settings' && method === 'GET') {
        return await handleGetUserSettings(request, env, userId);
      } else if (path === '/api/user-settings' && method === 'PUT') {
        return await handleUpdateUserSettings(request, env, userId);
      } else if (path === '/api/holidays') {
        return handleGetHolidays(request, env, userId);
      } else if (path === '/api/todos' && method === 'GET') {
        return await handleGetTodos(request, env, userId);
      } else if (path === '/api/todos' && method === 'POST') {
        return await handleCreateTodo(request, env, userId);
      } else if (path === '/api/todos' && method === 'PUT') {
        return await handleUpdateTodo(request, env, userId);
      } else if (path === '/api/todos' && method === 'DELETE') {
        return await handleDeleteTodo(request, env, userId);
      } else if (path === '/api/todos/reorder' && method === 'PUT') {
        return await handleReorderTodos(request, env, userId);
      } else if (path === '/api/completed-instances' && method === 'POST') {
        return await handleToggleCompletedInstance(request, env, userId);
      } else if (path === '/api/deleted-instances' && method === 'POST') {
        return await handleCreateDeletedInstance(request, env, userId);
      } else if (path === '/api/webhook/test' && method === 'POST') {
        return await handleTestWebhook(request, env, userId);
      } else if (path === '/api/data/export' && method === 'GET') {
        return await handleExportData(request, env, userId);
      } else if (path === '/api/data/import' && method === 'POST') {
        return await handleImportData(request, env, userId);
      } else {
        return jsonResponse({ error: '无效的 API 路径' }, 404);
      }
    } catch (error) {
      console.error('处理请求时出错:', error);
      return jsonResponse({ error: '服务器内部错误' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleDailyWebhookPush(env));
  },
};
