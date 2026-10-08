/**
 * 测试环境垫片（必须作为测试文件的第一个 import）
 * ------------------------------------------------------------
 * 1) 固定为 UTC：断言日期不随宿主机时区漂移；
 * 2) 补 localStorage：部分工具模块在加载期就读它（i18n、节气弹窗标记等），
 *    Node 里没有这个全局对象，不垫片会直接抛 ReferenceError。
 */
process.env.TZ = 'UTC';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}
