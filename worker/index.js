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
import {
  handleWeeklySummaryPush,
  handleTestWeeklySummary,
  handleGetWeeklySummarySettings,
  handleUpdateWeeklySummarySettings,
  handleCheckAdminAccess,
} from './handlers/weekly-summary.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const routes = {
  'GET /api/user-settings': handleGetUserSettings,
  'PUT /api/user-settings': handleUpdateUserSettings,
  'GET /api/holidays': handleGetHolidays,
  'GET /api/todos': handleGetTodos,
  'POST /api/todos': handleCreateTodo,
  'PUT /api/todos': handleUpdateTodo,
  'DELETE /api/todos': handleDeleteTodo,
  'PUT /api/todos/reorder': handleReorderTodos,
  'POST /api/completed-instances': handleToggleCompletedInstance,
  'POST /api/deleted-instances': handleCreateDeletedInstance,
  'POST /api/webhook/test': handleTestWebhook,
  'GET /api/data/export': handleExportData,
  'POST /api/data/import': handleImportData,
  'GET /api/weekly-summary/check-access': handleCheckAdminAccess,
  'GET /api/weekly-summary/settings': handleGetWeeklySummarySettings,
  'PUT /api/weekly-summary/settings': handleUpdateWeeklySummarySettings,
  'POST /api/weekly-summary/test': handleTestWeeklySummary,
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      const userId = request.headers.get('X-User-ID');
      if (!userId) return jsonResponse({ error: '缺少用户 ID' }, 401);

      const handler = routes[`${method} ${path}`];
      if (handler) {
        return await handler(request, env, userId);
      }

      return jsonResponse({ error: '无效的 API 路径' }, 404);
    } catch (error) {
      console.error('处理请求时出错:', error);
      return jsonResponse({ error: '服务器内部错误' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    const cron = event.cron;
    if (cron === '0 0 * * *') {
      ctx.waitUntil(handleDailyWebhookPush(env));
    }
    if (cron === '0 1 * * *') {
      ctx.waitUntil(handleWeeklySummaryPush(env));
    }
  },
};
