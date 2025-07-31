/**
 * JSONP请求工具函数
 * @param {string} url - 请求URL
 * @param {string} callbackName - 回调函数名
 * @returns {Promise} - 返回一个Promise对象
 */
export function jsonp(url, callbackName) {
  return new Promise((resolve, reject) => {
    // 创建script标签
    const script = document.createElement('script');
    // 设置回调函数
    window[callbackName] = function(data) {
      console.log(data);
      resolve(data);
      // 清理回调函数
      delete window[callbackName];
    };
    // 设置script标签的src属性
    script.src = `${url}?callback=${callbackName}`;
    // 处理错误
    script.onerror = function(error) {
      reject(error);
      // 清理回调函数
      delete window[callbackName];
    };
    // 添加到文档
    document.head.appendChild(script);
  });
}