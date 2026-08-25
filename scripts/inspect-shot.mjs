/**
 * 截图像素采样器 —— 无头视觉验收辅助。
 * 用法：node scripts/inspect-shot.mjs <png路径>
 * 输出：整图尺寸、若干区域的平均 RGB 与亮度，用于程序化检查
 * 页面底色、玻璃舞台明暗、卡片/格面是否为预期雾白等。
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [, , file] = process.argv;
if (!file) {
  console.error('用法: node scripts/inspect-shot.mjs <png>');
  process.exit(1);
}

const buf = readFileSync(file);

/* ---- 最小 PNG 解码（仅支持 8bit RGBA/RGB，非交错） ---- */
let pos = 8;
let width = 0, height = 0, bitDepth = 0, colorType = 0;
const idat = [];

function readU32(off) {
  return buf.readUInt32BE(off);
}

while (pos < buf.length) {
  const len = readU32(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IHDR') {
    width = readU32(pos + 8);
    height = readU32(pos + 12);
    bitDepth = buf[pos + 16];
    colorType = buf[pos + 17];
    if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
      console.error(`不支持的 PNG 格式: bitDepth=${bitDepth} colorType=${colorType}`);
      process.exit(1);
    }
  } else if (type === 'IDAT') {
    idat.push(buf.subarray(pos + 8, pos + 8 + len));
  } else if (type === 'IEND') break;
  pos += 12 + len;
}

const raw = inflateSync(Buffer.concat(idat));
const bpp = colorType === 6 ? 4 : 3;
const stride = width * bpp;

/* 还原滤波 */
const out = Buffer.alloc(height * stride);
for (let y = 0; y < height; y++) {
  const filter = raw[y * (stride + 1)];
  const rowIn = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  const rowOut = out.subarray(y * stride, (y + 1) * stride);
  const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? rowOut[x - bpp] : 0;
    const b = prev ? prev[x] : 0;
    const c = x >= bpp && prev ? prev[x - bpp] : 0;
    let v = rowIn[x];
    switch (filter) {
      case 0: break;
      case 1: v += a; break;
      case 2: v += b; break;
      case 3: v += Math.floor((a + b) / 2); break;
      case 4: {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        break;
      }
    }
    rowOut[x] = v & 0xff;
  }
}

function px(x, y) {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const i = y * stride + x * bpp;
  return [out[i], out[i + 1], out[i + 2]];
}

/** 区域平均色与相对亮度 */
function region(x0, y0, w, h) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < Math.min(y0 + h, height); y += 2)
    for (let x = x0; x < Math.min(x0 + w, width); x += 2) {
      const p = px(x, y);
      if (!p) continue;
      r += p[0]; g += p[1]; b += p[2]; n++;
    }
  if (!n) return null;
  r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return { rgb: [r, g, b], hex: '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''), lum: +lum.toFixed(3) };
}

console.log(`尺寸: ${width}x${height}`);
const H = height, W = width;
const zones = {
  '页面左上角(底色)': [8, 8, 60, 24],
  '页面上边中(头部区)': [Math.floor(W * 0.35), 18, Math.floor(W * 0.25), 26],
  '网格中心(日历格)': [Math.floor(W * 0.42), Math.floor(H * 0.5), 140, 80],
  '右侧中部(格子)': [Math.floor(W * 0.78), Math.floor(H * 0.5), 120, 70],
  '左下角': [8, H - 32, 60, 24],
};
for (const [name, [x, y, w, h]] of Object.entries(zones)) {
  const s = region(x, y, w, h);
  if (s) console.log(`${name}: ${s.hex}  亮度=${s.lum}  rgb(${s.rgb.join(',')})`);
}
