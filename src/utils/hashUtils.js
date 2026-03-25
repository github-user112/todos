/**
 * 生成随机哈希值作为用户ID
 * @returns {string} 生成的哈希值
 */
export function generateHash() {
  // 生成一个随机字符串
  const randomStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // 获取当前时间戳
  const timestamp = new Date().getTime().toString()

  // 组合并返回
  return randomStr + timestamp
}

