// 提取 src 下所有 t('...') / tf('...') 的中文 key，输出到 stdout（每行一个）
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('../src', import.meta.url).pathname;
const keys = new Set();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(vue|js)$/.test(name)) scan(readFileSync(p, 'utf8'));
  }
}

function scan(code) {
  const re = /\btf?\(\s*(['"])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = re.exec(code))) {
    const s = m[2].replace(/\\(.)/g, '$1');
    if (/[一-鿿]/.test(s)) keys.add(s);
  }
}

walk(root);
console.log([...keys].sort().join('\n'));
console.error(`共 ${keys.size} 个 key`);
