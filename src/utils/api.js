import { setLoading } from './loading';

export const apiRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  customHeaders = {},
  showLoading = false
) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': window.location.hash.substring(1),
    ...customHeaders,
  };

  const options = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  if (showLoading) {
    // 请求开始，显示加载
    setLoading(true);
  }

  try {
    const response = await fetch(endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '请求失败');
    }

    return result;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  } finally {
    if (showLoading) {
      // 请求结束，隐藏加载
      setLoading(false);
    }
  }
};
