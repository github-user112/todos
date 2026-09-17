// Integration smoke test against a built Todos preview (default 4173).
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const chrome = spawn('chromium-browser', ['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=9334',`--user-data-dir=/tmp/todos-webgl-${Date.now()}`,'about:blank'], {stdio:'ignore'});
const wait = ms => new Promise(r=>setTimeout(r,ms));
let socket;
try {
  let target;
  for (let i=0;i<50;i++) {
    try { target=(await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(t=>t.type==='page'); } catch {}
    if (target) break;
    await wait(100);
  }
  assert.ok(target,'Chromium page target available');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=> {socket.onopen=resolve;socket.onerror=reject;});
  const pending=new Map(); let id=0;
  socket.onmessage=e=> { const m=JSON.parse(e.data); if (m.id) pending.get(m.id)?.(m); };
  async function send(method,params={}) {
    const n=++id;
    const result=await new Promise((resolve,reject)=> {
      const timeout=setTimeout(()=>{pending.delete(n);reject(new Error(`CDP timeout: ${method}`));},10000);
      pending.set(n,m=>{clearTimeout(timeout);pending.delete(n);resolve(m);});
      socket.send(JSON.stringify({id:n,method,params}));
    });
    if (result.error) throw new Error(JSON.stringify(result.error));
    return result.result;
  }
  const evaluate=async expression=> {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.fetch = async (input, opts) => {
    const url = String(input);
    if (url.includes('/api/')) return new Response(JSON.stringify(url.includes('user-settings') ? {theme_type:'webgl-glass'} : []), {headers:{'Content-Type':'application/json'}});
    return originalFetch(input, opts);
  };`.replace('window.fetch =', 'const originalFetch = window.fetch.bind(window); window.fetch =')});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base+'/__preview-theme.html?t=webgl-glass'});
  let state;
  for(let i=0;i<80;i++) {
    state=await evaluate(`({ready:document.documentElement.classList.contains('webgl-glass-ready'), days:document.querySelectorAll('.calendar-day').length})`);
    if(state.ready && state.days) break;
    await wait(100);
  }
  console.log('desktop',state);
  assert.ok(state.ready && state.days,'WebGL first frame and calendar DOM rendered');
  const info=await evaluate(`(() => { const d=document.querySelector('.calendar-day'); const s=getComputedStyle(d); const r=d.getBoundingClientRect(); return {bg:s.backgroundColor,filter:s.backdropFilter,x:r.x+r.width/2,y:r.y+r.height/2,canvasPointer:getComputedStyle(document.querySelector('canvas.webgl-glass-canvas')).pointerEvents}; })()`);
  assert.equal(info.bg,'rgba(0, 0, 0, 0)'); assert.equal(info.filter,'none'); assert.equal(info.canvasPointer,'none');
  await mkdir('dist-shots',{recursive:true});
  async function shot(name) { const r=await send('Page.captureScreenshot',{format:'png'}); await writeFile(`dist-shots/${name}.png`,Buffer.from(r.data,'base64')); return r.data; }
  const before=await shot('webgl-glass-desktop');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:info.x,y:info.y}); await wait(500);
  const after=await shot('webgl-glass-hover');
  assert.notEqual(before,after,'Hover changes rendered image');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await wait(500);
  assert.ok(await evaluate(`document.documentElement.classList.contains('webgl-glass-ready')`));
  await shot('webgl-glass-mobile');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]}); await wait(150);
  assert.equal(await evaluate(`document.documentElement.classList.contains('webgl-glass-ready')`),false);
  await send('Emulation.setEmulatedMedia',{features:[]}); await wait(150);
  await evaluate(`document.querySelector('canvas.webgl-glass-canvas').getContext('webgl').getExtension('WEBGL_lose_context').loseContext()`); await wait(150);
  assert.equal(await evaluate(`document.documentElement.classList.contains('webgl-glass-ready')`),false);
  console.log('PASS: shader compilation, desktop/mobile rendering, hover image change, transparency preference, context-loss fallback');
} finally {socket?.close();chrome.kill('SIGTERM');}
