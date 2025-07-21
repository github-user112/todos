export const apiRequest = async (
  endpoint,
  method = 'GET',
  data = null,
  customHeaders = {}
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
  }
};
