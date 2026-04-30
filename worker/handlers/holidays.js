import { jsonResponse } from '../utils.js';

async function handleGetHolidays(request, env, userId) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');

    if (!year) return jsonResponse({ error: '缺少年份参数' }, 400);

    const response = await fetch(
      `https://unpkg.com/holiday-calendar@1.1.6/data/CN/${year}.min.json`,
    );

    if (!response.ok) {
      return jsonResponse({ error: '获取节假日数据失败' }, response.status);
    }

    const data = await response.json();
    return jsonResponse(data);
  } catch (error) {
    console.error('获取节假日数据错误:', error);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

export { handleGetHolidays };
