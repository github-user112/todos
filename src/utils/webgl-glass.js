// One WebGL context, one shared wallpaper FBO, and a scissored pass per visible
// date cell. DOM text is intentionally not captured or refracted.
const vertex = `attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
const wallpaper = `precision mediump float;
uniform vec2 uResolution;
void main() {
  vec2 p = gl_FragCoord.xy / uResolution;
  vec3 c = vec3(.88, .92, .98);
  c = mix(c, vec3(.22,.73,.86), .64 * exp(-5.0 * length((p-vec2(.12,.8))*vec2(1.,.8))));
  c = mix(c, vec3(.49,.39,.86), .58 * exp(-4.0 * length(p-vec2(.91,.48))));
  c = mix(c, vec3(.97,.65,.55), .5 * exp(-5.0 * length(p-vec2(.32,.08))));
  // Broad curved ribbons give the lens something to bend, without noisy detail.
  float ribbon = exp(-pow((p.y - .48 - .21*sin(p.x*5.5)) / .065, 2.0));
  float second = exp(-pow((p.y - .19 - .12*cos(p.x*6.0)) / .1, 2.0));
  c = mix(c, vec3(.97,.99,1.), ribbon*.5);
  c = mix(c, vec3(.48,.79,.88), second*.24);
  gl_FragColor = vec4(c, 1.0);
}`;
const glass = `precision mediump float;
uniform sampler2D uBackground;
uniform vec2 uResolution;
uniform vec4 uRect;
uniform float uRadius;
uniform float uHover;
uniform float uCell;
uniform vec2 uPointer;
float distanceToEdge(vec2 p) {
  vec2 q = abs(p) - (uRect.zw*.5 - vec2(uRadius));
  return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - uRadius;
}
void main() {
  vec2 screen = gl_FragCoord.xy;
  vec2 uv = screen/uResolution;
  if (uCell < .5) { gl_FragColor = texture2D(uBackground,uv); return; }
  vec2 p = screen - uRect.xy - uRect.zw*.5;
  float d = distanceToEdge(p);
  float coverage = 1.0-smoothstep(-1.0,1.0,d);
  // Analytic rounded-rectangle normal; the beveled rim bends the wallpaper
  // more than the clear center. This is screen-space refraction, not ray tracing.
  vec2 n = normalize(vec2(distanceToEdge(p+vec2(1.,0.))-distanceToEdge(p-vec2(1.,0.)),
                          distanceToEdge(p+vec2(0.,1.))-distanceToEdge(p-vec2(0.,1.))) + vec2(.0001));
  float rim = exp(-max(-d,0.0)/max(3.0,uRadius*.65));
  vec2 bend = n*rim*(8.0+uHover*8.0) + p*(.012+uHover*.01);
  vec2 sampleUV = (screen-bend)/uResolution;
  vec2 split = n*rim*(.45+uHover*.45)/uResolution;
  vec3 c = vec3(texture2D(uBackground,sampleUV+split).r,
                texture2D(uBackground,sampleUV).g,
                texture2D(uBackground,sampleUV-split).b);
  c = mix(c,vec3(1.),.19);
  float light = dot(n,normalize(vec2(-.5,1.)));
  float edge = exp(-abs(d+1.4)/1.6);
  c += edge*(.17 + .23*max(light,0.0));
  c -= rim*.055*max(-light,0.0);
  vec2 mouse = (screen-uPointer)/max(uRect.z,uRect.w);
  float highlight = exp(-dot(mouse,mouse)*12.0)*uHover;
  c += highlight*.10 + rim*uHover*.045;
  vec3 base = texture2D(uBackground,uv).rgb;
  gl_FragColor = vec4(mix(base,c,coverage),1.0);
}`;

export function createGlassRenderer(canvas) {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const opaque = matchMedia('(prefers-reduced-transparency: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return { dispose() {} };
  let frame = 0, disposed = false, lost = false, dirty = true, last = 0;
  let width = 0, height = 0, dpr = 1;
  let mouse = [-10000, -10000];
  const strengths = new Map();
  const resources = [];
  let backgroundProgram, glassProgram, texture, fbo, quad;
  function program(fragment) {
    const shaders = [ [gl.VERTEX_SHADER,vertex], [gl.FRAGMENT_SHADER,fragment] ].map(([type,source]) => {
      const shader = gl.createShader(type); resources.push(['Shader',shader]);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    });
    const p = gl.createProgram(); resources.push(['Program',p]);
    shaders.forEach(s => gl.attachShader(p,s)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function use(p) {
    gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    const a = gl.getAttribLocation(p,'aPosition'); gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  }
  const uniform = (p,name) => gl.getUniformLocation(p,name);
  function schedule() { if (!disposed && !lost && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
  function invalidate() { dirty = true; schedule(); }
  function draw(time) {
    frame = 0;
    if (opaque.matches) { root.classList.remove('webgl-glass-ready'); return; }
    try {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.round(innerWidth*ratio), h = Math.round(innerHeight*ratio);
      if (w !== width || h !== height || ratio !== dpr) {
        width=w; height=h; dpr=ratio; canvas.width=w; canvas.height=h;
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        dirty=true;
      }
      gl.viewport(0,0,width,height); gl.disable(gl.SCISSOR_TEST);
      if (dirty) {
        gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete wallpaper framebuffer');
        use(backgroundProgram); gl.uniform2f(uniform(backgroundProgram,'uResolution'),width,height);
        gl.drawArrays(gl.TRIANGLES,0,6); dirty=false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      use(glassProgram); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.uniform1i(uniform(glassProgram,'uBackground'),0);
      gl.uniform2f(uniform(glassProgram,'uResolution'),width,height);
      gl.uniform1f(uniform(glassProgram,'uCell'),0); gl.drawArrays(gl.TRIANGLES,0,6);
      gl.uniform1f(uniform(glassProgram,'uCell'),1); gl.enable(gl.SCISSOR_TEST);
      const dt = Math.min((time-last)/1000,.1); last=time;
      let animating=false;
      const cells = new Set(document.querySelectorAll('.calendar-day'));
      for (const cell of strengths.keys()) if (!cells.has(cell)) strengths.delete(cell);
      for (const cell of cells) {
        const r = cell.getBoundingClientRect();
        if (!r.width || r.bottom<0 || r.top>innerHeight || r.right<0 || r.left>innerWidth) continue;
        const target = fine.matches && !reduced.matches && mouse[0]>=r.left && mouse[0]<=r.right && mouse[1]>=r.top && mouse[1]<=r.bottom ? 1 : 0;
        let value = strengths.get(cell) || 0;
        value += (target-value)*(1-Math.exp(-dt*14));
        if (Math.abs(value-target)<.005) value=target; else animating=true;
        strengths.set(cell,value);
        const x=r.left*dpr, y=(innerHeight-r.bottom)*dpr;
        gl.scissor(Math.max(0,Math.floor(x)),Math.max(0,Math.floor(y)),
          Math.max(0,Math.min(width,Math.ceil(r.right*dpr))-Math.max(0,Math.floor(x))),
          Math.max(0,Math.min(height,Math.ceil((innerHeight-r.top)*dpr))-Math.max(0,Math.floor(y))));
        gl.uniform4f(uniform(glassProgram,'uRect'),x,y,r.width*dpr,r.height*dpr);
        gl.uniform1f(uniform(glassProgram,'uRadius'),(parseFloat(getComputedStyle(cell).borderTopLeftRadius)||16)*dpr);
        gl.uniform1f(uniform(glassProgram,'uHover'),value);
        gl.uniform2f(uniform(glassProgram,'uPointer'),mouse[0]*dpr,(innerHeight-mouse[1])*dpr);
        gl.drawArrays(gl.TRIANGLES,0,6);
      }
      gl.disable(gl.SCISSOR_TEST);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL render failed');
      root.classList.add('webgl-glass-ready');
      if (animating) schedule();
    } catch (error) { console.warn('WebGL glass: using CSS fallback',error); dispose(); }
  }
  const move = e => { if (e.pointerType==='touch') return; mouse=[e.clientX,e.clientY]; schedule(); };
  const leave = e => { if (e.relatedTarget) return; mouse=[-10000,-10000]; schedule(); };
  const contextLost = e => { e.preventDefault(); lost=true; root.classList.remove('webgl-glass-ready'); cancelAnimationFrame(frame); frame=0; };
  // Keep CSS fallback after loss; switching away and back creates fresh resources.
  const resize = new ResizeObserver(invalidate);
  const mutations = new MutationObserver(schedule);
  function dispose() {
    if (disposed) return; disposed=true; cancelAnimationFrame(frame);
    root.classList.remove('webgl-glass-ready');
    resize.disconnect(); mutations.disconnect();
    window.removeEventListener('pointermove',move); window.removeEventListener('pointerout',leave);
    window.removeEventListener('resize',invalidate); window.removeEventListener('scroll',schedule,true);
    document.removeEventListener('visibilitychange',schedule);
    canvas.removeEventListener('webglcontextlost',contextLost);
    reduced.removeEventListener('change',schedule); opaque.removeEventListener('change',invalidate);
    resources.forEach(([type,obj]) => gl['delete'+type](obj));
  }
  try {
    backgroundProgram=program(wallpaper); glassProgram=program(glass);
    quad=gl.createBuffer(); resources.push(['Buffer',quad]); gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    texture=gl.createTexture(); resources.push(['Texture',texture]); gl.bindTexture(gl.TEXTURE_2D,texture);
    for (const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    for (const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    fbo=gl.createFramebuffer(); resources.push(['Framebuffer',fbo]); gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    resize.observe(document.querySelector('.calendar-container') || document.body);
    mutations.observe(document.querySelector('.app-container') || document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('pointermove',move,{passive:true}); window.addEventListener('pointerout',leave,{passive:true});
    window.addEventListener('resize',invalidate); window.addEventListener('scroll',schedule,true);
    document.addEventListener('visibilitychange',schedule); canvas.addEventListener('webglcontextlost',contextLost);
    reduced.addEventListener('change',schedule); opaque.addEventListener('change',invalidate);
    invalidate();
  } catch (error) { console.warn('WebGL glass unavailable',error); dispose(); }
  return { dispose };
}
