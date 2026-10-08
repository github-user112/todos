/**
 * todos 前端 UI 自测（CDP + headless chromium，无额外依赖）
 *
 * 前置：先起 API（wrangler dev）与前端（vite，/api 代理指向该 API）
 *   npx wrangler dev --port 8788 --local
 *   npx vite                      # 默认 5173，代理到 8787；如 API 端口不同需改代理
 *   APP_URL=http://127.0.0.1:5173 node scripts/selftest-ui.mjs
 *
 * 覆盖：
 *  1. 待办操作菜单自适应定位（下方放不下 → 上方弹出，且始终在视口内）
 *  2. 点击待办 → 编辑 → 修改内容 → 保存 → 数据落地
 *  3. 全局 loading 计数只增不减（1,2,3,4,5…）
 *  4. 删除确认弹窗（自研 ConfirmDialog，桌面端重复待办三选一 / Esc 取消）
 *  5. 左上角日期快速跳转（月份面板 / 十年区间面板 / 跳转 / 面板内回到今天）
 *  6. 移动端：底部抽屉操作菜单 + 底部式删除确认弹窗
 *  7. 玻璃主题下确认弹窗遮罩与「添加待办」弹窗同款（共用 .add-todo-popup 主题规则）
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const APP = process.env.APP_URL || 'http://127.0.0.1:5173';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/todos-selftest-shots';
const API = APP;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = `selftest-${Date.now()}`;

let failures = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`  ✔ ${msg}`);
  else {
    failures++;
    console.log(`  ✘ ${msg} ${extra}`);
  }
};

mkdirSync(SHOT_DIR, { recursive: true });

const chrome = spawn(
  'chromium-browser',
  [
    '--headless=new',
    '--no-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--remote-debugging-port=9335',
    `--user-data-dir=/tmp/todos-selftest-${Date.now()}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      target = (await (await fetch('http://127.0.0.1:9335/json/list')).json()).find(
        (t) => t.type === 'page',
      );
    } catch {}
    if (target) break;
    await wait(100);
  }
  if (!target) throw new Error('chromium CDP 不可用');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    socket.onopen = res;
    socket.onerror = rej;
  });
  const pending = new Map();
  let id = 0;
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  };
  const send = async (method, params = {}) => {
    const n = ++id;
    const res = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error(`CDP timeout: ${method}`));
      }, 30000);
      pending.set(n, (m) => {
        clearTimeout(timer);
        pending.delete(n);
        resolve(m);
      });
      socket.send(JSON.stringify({ id: n, method, params }));
    });
    if (res.error) throw new Error(JSON.stringify(res.error));
    return res.result;
  };
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        '页面执行异常: ' +
          (r.exceptionDetails.exception?.description ||
            r.exceptionDetails.text),
      );
    }
    return r.result.value;
  };
  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${SHOT_DIR}/${name}.png`, Buffer.from(data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  // 关掉可能挡住点击的浮层（节气弹窗 / 移动端抽屉）
  const dismissOverlays = () =>
    ev(`(() => {
      const btns = [
        '.solar-term-overlay .close-btn',
        '.solar-term-overlay .got-it-btn',
        '.drawer-overlay .drawer-close',
      ];
      let closed = false;
      for (const sel of btns) {
        const el = document.querySelector(sel);
        if (el) { el.click(); closed = true; }
      }
      return closed;
    })()`);

  // ---------- 造数据 ----------
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const dates = [1, 5, 8, 15, 20, 25, 31].map((d) => `${y}-${m}-${String(d).padStart(2, '0')}`);
  for (const [i, date] of dates.entries()) {
    const res = await fetch(`${API}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': uid },
      body: JSON.stringify({ text: `自测待办${i + 1}`, date }),
    });
    const body = await res.json();
    if (!body.success) throw new Error('造数据失败: ' + JSON.stringify(body));
  }

  // ========== 桌面端 ==========
  console.log('\n[桌面端 1440x900]');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: `${APP}/?uid=${uid}` });
  await ev(`new Promise((res) => {
    const t0 = Date.now();
    (function poll() {
      if (document.querySelectorAll('.todo-item').length >= 7) return res(true);
      if (Date.now() - t0 > 20000) return res(false);
      setTimeout(poll, 200);
    })();
  })`);
  await wait(1800);
  await dismissOverlays();
  await wait(600);

  // ---- 1. 菜单自适应定位 ----
  console.log('\n[1] 操作菜单自适应定位');
  const posResults = await ev(`(async () => {
    const out = [];
    const items = [...document.querySelectorAll('.todo-item')];
    for (const it of items) {
      document.body.click();
      await new Promise(r => setTimeout(r, 60));
      it.click();
      await new Promise(r => setTimeout(r, 120));
      const menu = document.querySelector('.todo-actions');
      if (!menu) { out.push({ err: 'menu missing' }); continue; }
      const ir = it.getBoundingClientRect();
      const mr = menu.getBoundingClientRect();
      out.push({
        item: { top: ir.top, bottom: ir.bottom, left: ir.left, text: it.textContent.trim() },
        menu: { top: mr.top, bottom: mr.bottom, left: mr.left, right: mr.right, h: mr.height, w: mr.width },
        vh: window.innerHeight,
        vw: window.innerWidth,
        buttons: [...menu.querySelectorAll('.action-btn')].map(b => b.textContent.trim()),
        pos: getComputedStyle(menu).position,
      });
    }
    document.body.click();
    return out;
  })()`);

  ok(posResults.length === 7, `共检测 ${posResults.length}/7 个待办菜单`);
  let flipSeen = 0;
  let belowSeen = 0;
  for (const r of posResults) {
    if (r.err) {
      ok(false, '菜单渲染失败', r.err);
      continue;
    }
    const inViewport =
      r.menu.top >= 0 &&
      r.menu.bottom <= r.vh + 0.5 &&
      r.menu.left >= 0 &&
      r.menu.right <= r.vw + 0.5;
    const wantAbove = r.item.bottom + r.menu.h + 6 > r.vh;
    const isAbove = r.menu.bottom <= r.item.top + 1;
    const isBelow = r.menu.top >= r.item.bottom - 1;
    if (wantAbove) flipSeen++;
    else belowSeen++;
    ok(
      inViewport && (wantAbove ? isAbove : isBelow),
      `${r.item.text} → ${wantAbove ? '上方' : '下方'}弹出 (menu.top=${Math.round(r.menu.top)}, item.bottom=${Math.round(r.item.bottom)})`,
      JSON.stringify(r),
    );
  }
  ok(flipSeen > 0, `底部翻转到上方的场景 ${flipSeen} 个`, '(至少 1 个)');
  ok(belowSeen > 0, `正常下方弹出的场景 ${belowSeen} 个`);
  const btns = posResults[0]?.buttons || [];
  ok(
    btns.length === 3 && btns.some((b) => b.includes('编辑')),
    `菜单含 完成/编辑/删除 三个按钮 → [${btns.join(', ')}]`,
  );
  await shot('desktop-menu');

  // ---- 2. 编辑待办 ----
  console.log('\n[2] 编辑待办');
  const editResult = await ev(`(async () => {
    const items = [...document.querySelectorAll('.todo-item')];
    const it = items[0];
    const before = it.querySelector('.todo-text').textContent;
    it.click();
    await new Promise(r => setTimeout(r, 150));
    const editBtn = document.querySelector('.todo-actions .edit-btn');
    if (!editBtn) return { err: 'no edit button' };
    editBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const popup = document.querySelector('.todo-form-popup');
    if (!popup) return { err: 'popup not open' };
    const title = popup.querySelector('.popup-header h2').textContent;
    const input = popup.querySelector('.todo-input');
    const prefilled = input.value;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, before + '（已修改）');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    popup.querySelector('.btn-save').click();
    await new Promise(r => setTimeout(r, 1200));
    const stillOpen = !!document.querySelector('.todo-form-popup');
    const after = [...document.querySelectorAll('.todo-item .todo-text')]
      .map(n => n.textContent);
    const loadingVisible = !!document.querySelector('.loading-overlay');
    return { before, prefilled, title, stillOpen, after, loadingVisible };
  })()`);

  ok(!editResult.err, '点击编辑打开弹窗', JSON.stringify(editResult));
  ok(
    editResult.title?.includes('编辑'),
    `弹窗标题为编辑态 → "${editResult.title}"`,
  );
  ok(
    editResult.prefilled === editResult.before,
    `输入框回填原文 → "${editResult.prefilled}"`,
  );
  ok(!editResult.stillOpen, '保存后弹窗关闭');
  ok(
    (editResult.after || []).some((t) => t.includes('（已修改）')),
    `列表文本已更新 → ${(editResult.after || []).join(' | ')}`,
  );
  await shot('desktop-edit-saved');

  // 服务端校验
  const serverCheck = await (await fetch(`${API}/api/todos?startDate=${dates[0]}&endDate=${dates[dates.length - 1]}`, {
    headers: { 'X-User-ID': uid },
  })).json();
  const saved = (serverCheck.todos || []).find((t) => (t.text || '').includes('（已修改）'));
  ok(!!saved, '服务端已持久化修改后的内容', JSON.stringify(serverCheck.todos?.[0]));

  // ---- 3. 全局 loading 计数 ----
  console.log('\n[3] 全局 loading 计数（只增不减）');
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 5200,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await ev(`(async () => {
    const it = [...document.querySelectorAll('.todo-item')][1];
    it.click();
    await new Promise(r => setTimeout(r, 200));
    const done = document.querySelector('.todo-actions .complete-btn');
    if (done) done.click();
  })()`);
  await wait(400);
  const counts = [];
  for (let i = 0; i < 14; i++) {
    const v = await ev(`(() => {
      const el = document.querySelector('.flip-pages .page');
      return el ? Number(el.textContent) : null;
    })()`);
    if (v !== null) counts.push(v);
    await wait(500);
  }
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  console.log(`   采样到的计数序列: ${counts.join(', ')}`);
  ok(counts.length > 0, 'loading 覆盖层出现并显示计数');
  const nonDecreasing = counts.every((v, i) => i === 0 || v >= counts[i - 1]);
  const strictSteps = counts.filter((v, i) => i > 0 && v > counts[i - 1]).length;
  const distinct = [...new Set(counts)];
  ok(nonDecreasing, '计数只增不减（不循环回 1,2,3）');
  ok(strictSteps >= 3, `计数发生 ${strictSteps} 次递增（期望 >= 3）`);
  ok(
    distinct.join(',') === distinct.slice().sort((a, b) => a - b).join(','),
    `取值序列递增: ${distinct.join(' → ')}`,
  );
  ok(Math.max(...counts, 0) >= 4, `计数超过 3，最大值 ${Math.max(...counts, 0)}`);
  await shot('desktop-loading');
  // 等 loading 结束
  await ev(`new Promise((res) => {
    const t0 = Date.now();
    (function poll() {
      if (!document.querySelector('.loading-overlay')) return res(true);
      if (Date.now() - t0 > 25000) return res(false);
      setTimeout(poll, 300);
    })();
  })`);
  await wait(300);

  // ---- 4. 删除确认弹窗（自研，与全局风格一致） ----
  console.log('\n[4] 删除确认弹窗（重复待办 · 桌面端）');
  const repeatRes = await fetch(`${API}/api/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-ID': uid },
    body: JSON.stringify({
      text: '自测重复待办',
      date: `${y}-${m}-18`,
      repeatType: 'daily',
    }),
  });
  ok((await repeatRes.json()).success === true, '造一个每日重复待办');
  await send('Page.navigate', { url: `${APP}/?uid=${uid}` });
  await ev(`new Promise((res) => {
    const t0 = Date.now();
    (function poll() {
      if ([...document.querySelectorAll('.todo-item')]
        .some(el => el.textContent.includes('自测重复待办'))) return res(true);
      if (Date.now() - t0 > 20000) return res(false);
      setTimeout(poll, 200);
    })();
  })`);
  await wait(1800);
  await dismissOverlays();
  await wait(400);

  const openRepeatDelete = () =>
    ev(`(async () => {
      document.body.click();
      await new Promise(r => setTimeout(r, 80));
      const it = [...document.querySelectorAll('.todo-item')]
        .find(el => el.textContent.includes('自测重复待办'));
      if (!it) return { err: 'repeat todo not found' };
      it.click();
      await new Promise(r => setTimeout(r, 250));
      const del = document.querySelector('.todo-actions .delete-btn');
      if (!del) return { err: 'no delete button' };
      del.click();
      await new Promise(r => setTimeout(r, 450));
      const ov = document.querySelector('.confirm-overlay');
      if (!ov) return { err: 'no confirm dialog' };
      const card = ov.querySelector('.confirm-card');
      const cr = card.getBoundingClientRect();
      return {
        title: ov.querySelector('.confirm-title')?.textContent,
        buttons: [...ov.querySelectorAll('.confirm-btn')].map(b => b.textContent.trim()),
        variants: [...ov.querySelectorAll('.confirm-btn')]
          .map(b => b.className.includes('is-danger') ? 'danger' : 'secondary'),
        cardRadius: getComputedStyle(card).borderTopLeftRadius,
        scrimBlur: getComputedStyle(ov).backdropFilter,
        inViewport:
          cr.top >= 0 && cr.bottom <= window.innerHeight + 0.5 &&
          cr.left >= 0 && cr.right <= window.innerWidth + 0.5,
        z: Number(getComputedStyle(ov).zIndex),
      };
    })()`);

  const dlg = await openRepeatDelete();
  ok(!dlg.err, '重复待办点删除弹出确认框', JSON.stringify(dlg));
  ok(dlg.title?.includes('删除重复事件'), `标题 → "${dlg.title}"`);
  ok(
    JSON.stringify(dlg.buttons) ===
      JSON.stringify(['仅删除当前事件', '删除所有重复事件']) &&
      JSON.stringify(dlg.variants) === JSON.stringify(['secondary', 'danger']),
    `按钮 → [${(dlg.buttons || []).join(' / ')}] (${(dlg.variants || []).join('/')})`,
  );
  ok(dlg.inViewport, '确认框完整落在视口内');
  ok(dlg.z >= 2600, `层级高于抽屉/添加弹窗（z-index=${dlg.z}）`);
  await shot('desktop-confirm-delete');

  await ev(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await wait(200);
  // 同上：轮询等遮罩淡出结束
  const afterEsc = await ev(`(async () => {
    let open = true;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      open = !!document.querySelector('.confirm-overlay');
      if (!open) break;
    }
    return {
      open,
      remain: [...document.querySelectorAll('.todo-item')]
        .filter(el => el.textContent.includes('自测重复待办')).length,
    };
  })()`);
  ok(!afterEsc.open, 'Esc 关闭确认框（取消）');
  ok(afterEsc.remain > 0, `取消后待办仍在（${afterEsc.remain} 个重复实例）`);

  const dlg2 = await openRepeatDelete();
  ok(!dlg2.err, '再次打开确认框');
  await ev(`(async () => {
    document.querySelector('.confirm-overlay .confirm-btn.is-danger')?.click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
  const remainAfterDelete = await ev(
    `[...document.querySelectorAll('.todo-item')]
      .filter(el => el.textContent.includes('自测重复待办')).length`,
  );
  ok(remainAfterDelete === 0, `确认删除后所有重复实例移除（剩余 ${remainAfterDelete}）`);
  await wait(400);

  // ---- 5. 左上角日期快速跳转（月/年） ----
  console.log('\n[5] 左上角日期快速跳转（月/年）');
  const jumpClick = (expr) =>
    ev(`(async () => {
      const el = ${expr};
      if (!el) return false;
      el.click();
      await new Promise(r => setTimeout(r, 320));
      return true;
    })()`);
  const readJump = () =>
    ev(`(() => {
      const pop = document.querySelector('.date-jump');
      if (!pop) return { err: 'no popup' };
      const r = pop.getBoundingClientRect();
      const cells = [...pop.querySelectorAll('.jump-cell')];
      const texts = cells.map(c => c.textContent.trim());
      return {
        label: pop.querySelector('.jump-label')?.textContent.trim(),
        cells: cells.length,
        mode: texts.every(t => /^\\d{4}$/.test(t)) ? 'year' : 'month',
        firstCell: texts[0],
        inViewport:
          r.left >= -0.5 && r.right <= innerWidth + 0.5 &&
          r.top >= -0.5 && r.bottom <= innerHeight + 0.5,
        title: document.querySelector('.header-title .title-main')?.textContent.trim(),
        year: document.querySelector('.header-title .title-sub')?.textContent.trim(),
      };
    })()`);
  const titleInfo = () =>
    ev(`(() => ({
      title: document.querySelector('.header-title .title-main')?.textContent.trim(),
      year: document.querySelector('.header-title .title-sub')?.textContent.trim(),
      months: [...document.querySelectorAll('.calendar-day')]
        .map(d => d.getAttribute('data-date') || '')
        .filter(s => s.startsWith('2025-03')).length,
      nowMonths: [...document.querySelectorAll('.calendar-day')]
        .map(d => d.getAttribute('data-date') || '')
        .filter(s => s.startsWith('2026-10')).length,
      open: !!document.querySelector('.date-jump'),
    }))()`);

  ok(
    await jumpClick(`document.querySelector('.header-title .title-trigger')`),
    '点击左上角标题打开跳转面板',
  );
  const j1 = await readJump();
  ok(!j1.err, '面板已弹出', JSON.stringify(j1));
  ok(j1.mode === 'month' && j1.cells === 12, `月份面板 12 格 → ${j1.cells} 格（首格「${j1.firstCell}」）`);
  ok(j1.label === '2026', `面板年份跟随当前视图 → ${j1.label}`);
  ok(j1.title === '10月' && j1.year === '2026', `标题 → ${j1.title} ${j1.year}`);
  ok(j1.inViewport, '面板完整落在视口内');
  await shot('desktop-date-jump');

  // 标题 → 年份面板（十年区间）
  ok(await jumpClick(`document.querySelector('.date-jump .jump-label')`), '点年份切到年份面板');
  const j2 = await readJump();
  ok(j2.mode === 'year' && j2.cells === 10, `年份面板 10 格 → ${j2.cells} 格`);
  ok(j2.label === '2020–2029', `十年区间 → ${j2.label}`);

  // › / ‹ 快速切换十年
  ok(
    await jumpClick(`[...document.querySelectorAll('.date-jump .jump-nav')][1]`),
    '点 › 切到下一个十年',
  );
  ok((await readJump()).label === '2030–2039', '下一个十年 → 2030–2039');
  await jumpClick(`[...document.querySelectorAll('.date-jump .jump-nav')][0]`);
  ok((await readJump()).label === '2020–2029', '点 ‹ 回到 2020–2029');

  // 选年份 → 回到月份面板
  ok(
    await jumpClick(
      `[...document.querySelectorAll('.date-jump .jump-cell')].find(c => c.textContent.trim() === '2025')`,
    ),
    '选中 2025 年',
  );
  const j3 = await readJump();
  ok(j3.mode === 'month' && j3.label === '2025', `回到月份面板 → ${j3.label}`);

  // 选月份 → 视图跳到 2025-03，面板关闭
  ok(
    await jumpClick(
      `[...document.querySelectorAll('.date-jump .jump-cell')].find(c => c.textContent.trim() === '3月')`,
    ),
    '选中 3 月',
  );
  await wait(600);
  const j4 = await titleInfo();
  ok(!j4.open, '选完月份后面板自动关闭');
  ok(
    j4.title === '3月' && j4.year === '2025',
    `标题跳到 → ${j4.title} ${j4.year}`,
  );
  ok(j4.months > 0, `日历已切到 2025-03（命中 ${j4.months} 个 3 月日期格）`);
  await shot('desktop-date-jump-2025-03');

  // 面板内「今天」一键回到今天
  await jumpClick(`document.querySelector('.header-title .title-trigger')`);
  ok(await jumpClick(`document.querySelector('.date-jump .jump-today')`), '面板内点「今天」');
  await wait(600);
  const j5 = await titleInfo();
  ok(
    j5.title === '10月' && j5.year === '2026',
    `「今天」回到 → ${j5.title} ${j5.year}`,
  );
  ok(j5.nowMonths > 0, `日历回到 2026-10（命中 ${j5.nowMonths} 个日期格）`);

  // Esc 关闭
  await jumpClick(`document.querySelector('.header-title .title-trigger')`);
  ok((await readJump()).label === '2026', '重新打开仍是当前年');
  await ev(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await wait(300);
  ok(!(await titleInfo()).open, 'Esc 关闭跳转面板');

  // ---- 层叠与命中：面板必须真的盖在日历之上 ----
  // 玻璃主题 / 动态背景下，头部会因 backdrop-filter 成为层叠上下文，而日历格子的
  // z-index 高达 10 —— 面板若留在头部里会被下方格子盖住、按钮点不动。只看矩形位置
  // 发现不了这种问题，必须用 elementFromPoint 做命中测试 + 区域覆盖采样。
  const pressEsc = () =>
    ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  const jumpHit = () =>
    ev(`(() => {
      const pop = document.querySelector('.date-jump');
      if (!pop) return { err: 'no popup' };
      const navs = [...pop.querySelectorAll('.jump-nav')];
      const inside = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && pop.contains(top);
      };
      const pr = pop.getBoundingClientRect();
      // 内缩 10px 采样：面板是圆角矩形，紧贴圆角的点本来就落在面板之外
      let over = 0, total = 0;
      for (let x = pr.left + 10; x < pr.right - 10; x += 6) {
        for (let y = pr.top + 10; y < pr.bottom - 10; y += 6) {
          total++;
          const top = document.elementFromPoint(x, y);
          if (!top || !pop.contains(top)) over++;
        }
      }
      // 表面不透明度：玻璃家族与其它弹窗一样用 0.82 厚玻璃，普通主题则完全不透明
      const parseAlpha = (css) => {
        const m = css.match(/rgba?\(([^)]+)\)/);
        if (!m) return 1;
        const p = m[1].split(',').map((s) => parseFloat(s));
        return p.length === 4 ? p[3] : 1;
      };
      return {
        hits: {
          prev: inside(navs[0]),
          next: inside(navs[1]),
          label: inside(pop.querySelector('.jump-label')),
          month: inside(pop.querySelector('.jump-cell')),
          today: inside(pop.querySelector('.jump-today')),
        },
        over,
        total,
        fits:
          pr.left >= -0.5 && pr.right <= innerWidth + 0.5 &&
          pr.top >= -0.5 && pr.bottom <= innerHeight + 0.5,
        rect: [Math.round(pr.left), Math.round(pr.top), Math.round(pr.width), Math.round(pr.height)],
        parent: pop.parentElement?.tagName,
        bg: getComputedStyle(pop).backgroundColor,
        alpha: parseAlpha(getComputedStyle(pop).backgroundColor),
      };
    })()`);

  const stackConfigs = [
    ['默认主题', `document.body.classList.remove('dynamic-background');
       document.documentElement.classList.remove('ios26-glass-theme');`, 0.99],
    ['动态背景', `document.body.classList.add('dynamic-background');`, 0.8],
    ['玻璃主题', `document.body.classList.remove('dynamic-background');
       document.documentElement.classList.add('ios26-glass-theme');`, 0.8],
  ];
  for (const [name, setup, minAlpha] of stackConfigs) {
    await ev(setup);
    await dismissOverlays();
    await jumpClick(`document.querySelector('.header-title .title-trigger')`);
    const st = await jumpHit();
    if (st.err) {
      ok(false, `${name}：跳转面板能打开`, JSON.stringify(st));
      continue;
    }
    const blocked = Object.entries(st.hits)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    ok(
      blocked.length === 0,
      `${name}：面板控件全部可点（prev/next/label/month/today）`,
      `被挡：${blocked.join(',')}`,
    );
    ok(st.over === 0, `${name}：面板不被日历内容覆盖`, `采样 ${st.over}/${st.total} 点被盖`);
    ok(st.fits, `${name}：面板完整在视口内`, JSON.stringify(st.rect));
    ok(st.parent === 'BODY', `${name}：面板挂在 body 上（脱离头部层叠上下文）`, String(st.parent));
    ok(
      st.alpha >= minAlpha,
      `${name}：面板足够不透明（≥${minAlpha}）`,
      `alpha=${st.alpha} 背景=${st.bg}`,
    );
    await shot(`desktop-date-jump-stack-${name}`);
    await pressEsc();
    await wait(250);
  }
  await ev(`document.body.classList.remove('dynamic-background');
            document.documentElement.classList.remove('ios26-glass-theme');`);
  await wait(200);

  // ========== 移动端 ==========
  console.log('\n[移动端 390x844]');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await send('Page.navigate', { url: `${APP}/?uid=${uid}` });
  await ev(`new Promise((res) => {
    const t0 = Date.now();
    (function poll() {
      if (document.querySelectorAll('.todo-item').length >= 7) return res(true);
      if (Date.now() - t0 > 20000) return res(false);
      setTimeout(poll, 200);
    })();
  })`);
  await wait(1800);
  await dismissOverlays();
  await wait(600);
  const mobile = await ev(`(async () => {
    const items = [...document.querySelectorAll('.todo-item')];
    const it = items[items.length - 1];
    it.click();
    await new Promise(r => setTimeout(r, 250));
    const menu = document.querySelector('.todo-actions');
    if (!menu) return { err: 'no menu' };
    const mr = menu.getBoundingClientRect();
    return {
      pos: getComputedStyle(menu).position,
      bottomGap: window.innerHeight - mr.bottom,
      top: mr.top,
      left: mr.left,
      right: mr.right,
      vw: window.innerWidth,
      buttons: [...menu.querySelectorAll('.action-btn')].map(b => b.textContent.trim()),
      docOverflow: mr.right <= window.innerWidth + 0.5 && mr.left >= -0.5,
    };
  })()`);
  ok(!mobile.err, '移动端点击待办弹出操作菜单', JSON.stringify(mobile));
  ok(mobile.pos === 'fixed', `固定在底部 → position=${mobile.pos}`);
  ok(mobile.bottomGap <= 1, `贴近屏幕底边（bottom gap=${mobile.bottomGap.toFixed(1)}px）`);
  ok(mobile.docOverflow, `宽度未溢出（left=${mobile.left}, right=${mobile.right}, vw=${mobile.vw}）`);
  ok(
    mobile.buttons?.length === 3,
    `三个按钮横排 → [${(mobile.buttons || []).join(', ')}]`,
  );
  await shot('mobile-menu');

  // ---- 移动端的快速跳转面板（点按目标/不溢出） ----
  const mJump = await ev(`(async () => {
    document.body.click();
    await new Promise(r => setTimeout(r, 150));
    document.querySelector('.header-title .title-trigger')?.click();
    await new Promise(r => setTimeout(r, 350));
    const pop = document.querySelector('.date-jump');
    if (!pop) return { err: 'no popup' };
    const r = pop.getBoundingClientRect();
    const cell = pop.querySelector('.jump-cell');
    return {
      cells: pop.querySelectorAll('.jump-cell').length,
      left: Math.round(r.left),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
      fits: r.left >= -0.5 && r.right <= innerWidth + 0.5,
      inViewport: r.top >= -0.5 && r.bottom <= innerHeight + 0.5,
      cellH: cell ? Math.round(cell.getBoundingClientRect().height) : 0,
      hitOk: (() => {
        const nav = pop.querySelector('.jump-nav');
        if (!nav) return false;
        const b = nav.getBoundingClientRect();
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !!top && pop.contains(top);
      })(),
    };
  })()`);
  ok(!mJump.err, '移动端打开快速跳转面板', JSON.stringify(mJump));
  ok(mJump.cells === 12, `12 个月份格 → ${mJump.cells}`);
  ok(mJump.hitOk, '移动端面板首行按钮可点（未被日历覆盖）');
  ok(
    mJump.fits && mJump.inViewport,
    `面板未溢出（left=${mJump.left}, right=${mJump.right}, bottom=${mJump.bottom}）`,
  );
  ok(mJump.cellH >= 36, `月份格点按高度 ${mJump.cellH}px（>= 36）`);
  await shot('mobile-date-jump');
  await ev(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  await wait(300);

  // ---- 6. 移动端删除确认（底部抽屉式） ----
  console.log('\n[6] 移动端删除确认弹窗');
  await ev(`(async () => {
    document.body.click();
    await new Promise(r => setTimeout(r, 150));
    // 移动端点日期格是「添加待办」，待办列表从头部按钮打开
    document.querySelector('.header-right .icon-btn')?.click();
    await new Promise(r => setTimeout(r, 800));
  })()`);
  const mConfirm = await ev(`(async () => {
    const delBtn = document.querySelector('.drawer-overlay .row-action-btn.delete')
      || document.querySelector('.row-action-btn.delete');
    if (!delBtn) return { err: 'no drawer delete button' };
    delBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const ov = document.querySelector('.confirm-overlay');
    if (!ov) return { err: 'no confirm dialog' };
    const card = ov.querySelector('.confirm-card');
    const cr = card.getBoundingClientRect();
    const btns = [...ov.querySelectorAll('.confirm-btn')];
    return {
      title: ov.querySelector('.confirm-title')?.textContent,
      bottomGap: window.innerHeight - cr.bottom,
      fullWidth: Math.abs(cr.width - window.innerWidth) < 1,
      radius: getComputedStyle(card).borderTopLeftRadius,
      btnCount: btns.length,
      btnHeight: btns[0] ? Math.round(btns[0].getBoundingClientRect().height) : 0,
      z: Number(getComputedStyle(ov).zIndex),
    };
  })()`);
  ok(!mConfirm.err, '移动端抽屉删除按钮弹出确认框', JSON.stringify(mConfirm));
  ok(
    mConfirm.bottomGap <= 1 && mConfirm.fullWidth,
    `底部抽屉贴底满宽（gap=${mConfirm.bottomGap?.toFixed(1)}px）`,
  );
  ok(
    Number.parseFloat(mConfirm.radius) >= 16,
    `顶部圆角 ${mConfirm.radius}`,
  );
  ok(mConfirm.btnCount === 2, `两个按钮 → ${mConfirm.btnCount}`);
  ok(
    mConfirm.btnHeight >= 44,
    `按钮触控高度 ${mConfirm.btnHeight}px（>= 44）`,
  );
  ok(mConfirm.z >= 2600, `层级高于抽屉（z-index=${mConfirm.z}）`);
  await shot('mobile-confirm-delete');
  await ev(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`,
  );
  // 遮罩有淡出动画，轮询等它消失，避免把过渡帧误判成没关掉
  const mAfter = await ev(`(async () => {
    let open = true;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      open = !!document.querySelector('.confirm-overlay');
      if (!open) break;
    }
    return { open, rows: document.querySelectorAll('.todo-row').length };
  })()`);
  ok(mAfter.open === false, 'Esc 关闭移动端确认框');
  ok(mAfter.rows > 0, `待办列表仍完好（${mAfter.rows} 行）`);

  // ---- 7. 玻璃主题下遮罩与「添加待办」弹窗同款 ----
  console.log('\n[7] 玻璃主题遮罩一致性');
  await ev(`document.documentElement.classList.add('ios26-glass-theme')`);
  await wait(200);
  const themed = await ev(`(async () => {
    const delBtn = document.querySelector('.drawer-overlay .row-action-btn.delete')
      || document.querySelector('.row-action-btn.delete');
    if (!delBtn) return { err: 'no drawer delete button' };
    delBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const ov = document.querySelector('.confirm-overlay');
    if (!ov) return { err: 'no confirm dialog' };
    const cs = getComputedStyle(ov);
    // 用一个同 class 的探针元素对比：确认遮罩与「添加待办」弹窗走同一套主题规则
    const probe = document.createElement('div');
    probe.className = 'add-todo-popup';
    document.body.appendChild(probe);
    const probeBg = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return {
      bg: cs.backgroundColor,
      blur: cs.backdropFilter || cs.webkitBackdropFilter,
      baseBg: 'rgba(23, 28, 45, 0.45)',
      popupBg: probeBg,
    };
  })()`);
  if (!themed.err) await shot('mobile-confirm-glass');
  await ev(
    `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));` +
      `document.documentElement.classList.remove('ios26-glass-theme');`,
  );
  ok(!themed.err, '玻璃主题下能弹出确认框', JSON.stringify(themed));
  ok(
    themed.bg !== themed.baseBg,
    `遮罩已被主题接管 → ${themed.bg}（基础值 ${themed.baseBg}）`,
  );
  ok(
    /blur/.test(themed.blur || ''),
    `遮罩带毛玻璃模糊 → ${themed.blur}`,
  );
  ok(
    themed.popupBg === themed.bg,
    `与「添加待办」弹窗遮罩同值（添加=${themed.popupBg}）`,
  );

  console.log(
    failures === 0
      ? '\n✅ 全部自测通过'
      : `\n❌ 自测失败项: ${failures}`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
} catch (e) {
  console.error('自测异常:', e);
  process.exitCode = 1;
} finally {
  try {
    socket?.close();
  } catch {}
  chrome.kill();
  // 主流程已跑完即退出：chromium/WS 句柄可能仍挂在事件循环上，否则 test:ui 会卡住
  process.exit(process.exitCode ?? 0);
}
