import { setLoading } from './loading';

export const getUserId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('uid') || '';
};

export const apiRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  customHeaders = {},
  showLoading = false,
) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-User-ID': getUserId(),
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
      setLoading(false);
    }
  }
};
