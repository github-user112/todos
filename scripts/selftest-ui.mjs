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
 *  4. 移动端底部抽屉（贴底、不溢出、三按钮横排）
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
    const popup = document.querySelector('.add-todo-popup');
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
    const stillOpen = !!document.querySelector('.add-todo-popup');
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
}
