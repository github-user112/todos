/**
 * Cloudflare Workers API 测试
 * ------------------------------------------------------------
 *   1. worker/utils：jsonResponse / validateRepeatInterval；
 *   2. worker/index.js：X-User-ID 校验、路由分发、404/401/400；
 *   3. handlers/todos：创建/更新/删除（含编辑待办新增的
 *      text / repeat_type / repeat_interval / skip_holidays 字段与校验）。
 *
 * 用一个假的 D1（prepare → bind → first/run/all）记录 SQL 与绑定参数。
 *
 * 运行：npm test
 */
import './helpers/env.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { jsonResponse, validateRepeatInterval } from '../worker/utils.js';
import worker from '../worker/index.js';
import {
  handleCreateTodo,
  handleUpdateTodo,
  handleDeleteTodo,
} from '../worker/handlers/todos.js';

/** 行夹具：1970 之外的普通待办 */
const ROW = {
  id: 7,
  text: '旧文本',
  date: '2026-10-08',
  repeat_type: 'weekly',
  repeat_interval: 2,
  end_date: '2026-12-31',
  todo_time: '08:30',
  reminder: 1,
  completed: 0,
  sort_order: 3,
  skip_holidays: 1,
  user_id: 'u1',
};

/** 假 D1：记录每次 prepare/bind，按 SQL 形态返回夹具 */
function createDb({ row = null, allResults = [] } = {}) {
  const calls = [];
  return {
    calls,
    /** 最后一次绑定调用 */
    last: () => calls.at(-1),
    /** 第 n 次出现某关键字的调用 */
    find: (needle) => calls.filter((c) => c.sql.includes(needle)).at(-1),
    prepare(sql) {
      const norm = sql.replace(/\s+/g, ' ').trim();
      return {
        bind(...args) {
          calls.push({ sql: norm, args });
          return {
            async first() {
              if (norm.includes('AND user_id = ?')) {
                // 越权：user_id 对不上就查不到
                return row && args[1] === row.user_id ? row : null;
              }
              return row;
            },
            async run() {
              return { success: true, meta: { last_row_id: row?.id ?? 1, changes: 1 } };
            },
            async all() {
              return { results: allResults };
            },
          };
        },
      };
    },
  };
}

const jsonRequest = (
  body,
  { method = 'PUT', url = 'https://todos.local/api/todos', userId = 'u1' } = {},
) =>
  new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
  });

describe('worker/utils · jsonResponse', () => {
  it('默认 200 且返回 JSON', async () => {
    const res = jsonResponse({ ok: true });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('Content-Type'), /application\/json/);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it('可指定状态码', async () => {
    const res = jsonResponse({ error: 'x' }, 400);
    assert.equal(res.status, 400);
  });
});

describe('worker/utils · validateRepeatInterval', () => {
  it('各类型上下界与错误文案', () => {
    assert.deepEqual(validateRepeatInterval('none', 0), { valid: true });
    assert.equal(validateRepeatInterval('daily', 365).valid, true);
    assert.deepEqual(validateRepeatInterval('daily', 366), {
      valid: false,
      message: '每日间隔必须在1-365天之间',
    });
    assert.equal(validateRepeatInterval('weekly', 52).valid, true);
    assert.equal(validateRepeatInterval('weekly', 53).valid, false);
    assert.equal(validateRepeatInterval('monthly', 12).valid, true);
    assert.equal(validateRepeatInterval('monthly', 13).valid, false);
    assert.equal(validateRepeatInterval('yearly', 10).valid, true);
    assert.equal(validateRepeatInterval('yearly', 11).valid, false);
    assert.equal(validateRepeatInterval('daily', 0).valid, false);
    assert.equal(validateRepeatInterval('daily', 1.5).valid, false);
    assert.equal(validateRepeatInterval('hourly', 1).valid, false);
    assert.equal(validateRepeatInterval('hourly', 1).message, '不支持的重复类型');
  });
});

describe('路由分发', () => {
  const env = { DB: createDb({ row: ROW }) };
  const get = (url, headers = {}) =>
    worker.fetch(new Request(url, { headers: { 'X-User-ID': 'u1', ...headers } }), env, {});

  it('缺少 X-User-ID → 401', async () => {
    const res = await worker.fetch(new Request('https://todos.local/api/todos'), env, {});
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { error: '缺少用户 ID' });
  });

  it('未知路径 → 404', async () => {
    const res = await get('https://todos.local/api/nope');
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: '无效的 API 路径' });
  });

  it('GET /api/todos 缺日期参数 → 400', async () => {
    const res = await get('https://todos.local/api/todos');
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: '缺少开始日期或结束日期参数' });
  });

  it('GET /api/todos 返回三组数据', async () => {
    const res = await get(
      'https://todos.local/api/todos?startDate=2026-10-01&endDate=2026-10-31',
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.todos));
    assert.ok(Array.isArray(body.completedInstances));
    assert.ok(Array.isArray(body.deletedInstances));
  });

  it('PUT /api/todos 打到 handleUpdateTodo', async () => {
    const res = await worker.fetch(
      jsonRequest({ id: ROW.id, text: '改一下' }),
      env,
      {},
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
  });
});

describe('handleCreateTodo', () => {
  const create = async (body, db = createDb({ row: ROW })) => {
    const res = await handleCreateTodo(jsonRequest(body, { method: 'POST' }), { DB: db }, 'u1');
    return { status: res.status, body: await res.json(), db };
  };

  it('缺字段 → 400', async () => {
    assert.equal((await create({ date: '2026-10-08' })).status, 400);
    assert.equal((await create({ text: '买菜' })).status, 400);
  });

  it('重复间隔非法 → 400', async () => {
    const { status, body } = await create({
      text: '买菜',
      date: '2026-10-08',
      repeatType: 'daily',
      repeatInterval: 400,
    });
    assert.equal(status, 400);
    assert.match(body.error, /1-365/);
  });

  it('成功插入并回填默认值', async () => {
    const { status, body, db } = await create({
      text: '买菜',
      date: '2026-10-08',
      repeatType: 'monthly',
      repeatInterval: 3,
      skipHolidays: true,
    });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    // 回读的是假 DB 里的行，但布尔归一化发生在响应侧
    assert.equal(body.todo.id, ROW.id);
    assert.equal(body.todo.skip_holidays, true);

    const insert = db.find('INSERT INTO todos');
    assert.deepEqual(insert.args, [
      '买菜',
      '2026-10-08',
      'monthly',
      3,
      '2039-12-31', // 默认结束日期
      1, // skipHolidays：前端布尔 → 存库 1
      0, // reminder 默认 0
      '09:00', // todoTime 默认 09:00
      'u1',
    ]);
    assert.match(insert.sql, /completed, skip_holidays, reminder, todo_time, user_id/);
  });

  it('响应归一化 skip_holidays / reminder', async () => {
    const { body } = await create(
      { text: '买菜', date: '2026-10-08' },
      createDb({ row: { ...ROW, skip_holidays: 0, reminder: null } }),
    );
    assert.equal(body.todo.skip_holidays, false);
    assert.equal(body.todo.reminder, 0);
  });

  it('不传重复设置时按 none/间隔1 存储', async () => {
    const { db } = await create({ text: '买菜', date: '2026-10-08' });
    const insert = db.find('INSERT INTO todos');
    assert.equal(insert.args[2], 'none');
    assert.equal(insert.args[3], 1);
    assert.equal(insert.args[5], 0);
  });
});

describe('handleUpdateTodo', () => {
  const update = async (body, db = createDb({ row: ROW })) => {
    const res = await handleUpdateTodo(jsonRequest(body), { DB: db }, 'u1');
    return { status: res.status, body: await res.json(), db };
  };

  it('缺 id → 400', async () => {
    const { status, body } = await update({ text: 'x' });
    assert.equal(status, 400);
    assert.equal(body.error, '缺少待办事项 ID');
  });

  it('不存在/越权 → 404', async () => {
    const { status, body } = await update(
      { id: 7, text: 'x' },
      createDb({ row: { ...ROW, user_id: 'other-user' } }),
    );
    assert.equal(status, 404);
    assert.equal(body.error, '待办事项不存在或无权限');
  });

  it('空内容 → 400', async () => {
    const { status, body } = await update({ id: 7, text: '   ' });
    assert.equal(status, 400);
    assert.equal(body.error, '待办内容不能为空');
  });

  it('重复间隔非法 → 400', async () => {
    const { status, body } = await update({
      id: 7,
      repeatType: 'monthly',
      repeatInterval: 99,
    });
    assert.equal(status, 400);
    assert.match(body.error, /1-12/);
  });

  it('只改文本时沿用原有重复规则与提醒设置', async () => {
    const { status, body, db } = await update({ id: 7, text: '  新文本  ' });
    assert.equal(status, 200);
    assert.equal(body.success, true);

    const call = db.find('UPDATE todos');
    assert.deepEqual(call.args, [
      ROW.completed,
      ROW.end_date,
      ROW.todo_time,
      ROW.reminder,
      ROW.date,
      ROW.sort_order,
      '新文本', // 已 trim
      ROW.repeat_type,
      ROW.repeat_interval,
      ROW.skip_holidays,
      ROW.id,
    ]);
    assert.match(
      call.sql,
      /text = \?, repeat_type = \?, repeat_interval = \?, skip_holidays = \? WHERE id = \?/,
    );
  });

  it('可改重复规则与避开节假日开关', async () => {
    const { db } = await update({
      id: 7,
      text: '新文本',
      repeatType: 'monthly',
      repeatInterval: 3,
      skipHolidays: false,
    });
    const args = db.find('UPDATE todos').args;
    assert.equal(args[6], '新文本');
    assert.equal(args[7], 'monthly');
    assert.equal(args[8], 3);
    assert.equal(args[9], 0);
  });

  it('布尔/数值字段转换正确', async () => {
    const { db } = await update({ id: 7, completed: true, reminder: 5, todoTime: '07:15' });
    const args = db.find('UPDATE todos').args;
    assert.equal(args[0], 1); // completed → 1
    assert.equal(args[2], '07:15');
    assert.equal(args[3], 5);
  });
});

describe('改锚点日期（每周五 → 每周日）', () => {
  const update = async (body, db = createDb({ row: ROW })) => {
    const res = await handleUpdateTodo(jsonRequest(body), { DB: db }, 'u1');
    return { status: res.status, body: await res.json(), db };
  };

  it('只改日期：其余字段沿用原值', async () => {
    const { status, body, db } = await update({ id: 7, date: '2026-10-11' });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    const args = db.find('UPDATE todos').args;
    assert.equal(args[4], '2026-10-11', 'date 落到第 5 个绑定参数');
    assert.equal(args[6], ROW.text);
    assert.equal(args[7], ROW.repeat_type);
    assert.equal(args[8], ROW.repeat_interval);
  });

  it('日期 + 重复规则一起改', async () => {
    const { db } = await update({
      id: 7,
      date: '2026-10-11',
      repeatType: 'weekly',
      repeatInterval: 2,
    });
    const args = db.find('UPDATE todos').args;
    assert.equal(args[4], '2026-10-11');
    assert.equal(args[7], 'weekly');
    assert.equal(args[8], 2);
  });

  it('日期格式非法 → 400', async () => {
    for (const bad of ['2026-13-01', '2026-02-30', '2026/10/11', '2026-10-9', '', 'bad']) {
      const { status, body } = await update({ id: 7, date: bad });
      assert.equal(status, 400, `date=${JSON.stringify(bad)}`);
      assert.equal(body.error, '日期格式无效');
    }
  });

  it('结束日期早于开始日期 → 400', async () => {
    const { status, body } = await update({
      id: 7,
      date: '2026-10-11',
      endDate: '2026-10-01',
    });
    assert.equal(status, 400);
    assert.equal(body.error, '结束日期不能早于开始日期');
  });

  it('结束日期等于开始日期是合法的', async () => {
    const { status } = await update({ id: 7, date: '2026-10-11', endDate: '2026-10-11' });
    assert.equal(status, 200);
  });

  it('只改文本时不动日期，也不因历史脏 end_date 被拦', async () => {
    const { status, db } = await update(
      { id: 7, text: '只改文字' },
      createDb({ row: { ...ROW, end_date: '1999-01-01', date: '2020-01-01' } }),
    );
    assert.equal(status, 200, '未传 date 时不校验 end_date');
    const args = db.find('UPDATE todos').args;
    assert.equal(args[4], '2020-01-01');
    assert.equal(args[1], '1999-01-01');
  });

  it('创建时日期格式非法 → 400', async () => {
    const db = createDb({ row: ROW });
    const res = await handleCreateTodo(
      jsonRequest({ text: '买菜', date: '2026-02-30' }, { method: 'POST' }),
      { DB: db },
      'u1',
    );
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: '日期格式无效' });
    assert.equal(db.calls.length, 0, '校验失败不应打到 DB');
  });
});

describe('handleDeleteTodo', () => {
  const remove = async (url, db = createDb({ row: ROW })) =>
    handleDeleteTodo(new Request(url, { method: 'DELETE' }), { DB: db }, 'u1');

  it('缺 id → 400', async () => {
    const res = await remove('https://todos.local/api/todos');
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: '缺少待办事项 ID' });
  });

  it('不存在/越权 → 404', async () => {
    const res = await remove(
      'https://todos.local/api/todos?id=7',
      createDb({ row: { ...ROW, user_id: 'other-user' } }),
    );
    assert.equal(res.status, 404);
  });

  it('删除成功', async () => {
    const db = createDb({ row: ROW });
    const res = await remove('https://todos.local/api/todos?id=7', db);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true });
    const call = db.find('DELETE FROM todos');
    assert.deepEqual(call.args, ['7']); // query 参数是字符串
  });
});
