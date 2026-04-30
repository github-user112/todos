function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateRepeatInterval(repeatType, interval) {
  const limits = {
    daily: { min: 1, max: 365, unit: '天' },
    weekly: { min: 1, max: 52, unit: '周' },
    monthly: { min: 1, max: 12, unit: '个月' },
    yearly: { min: 1, max: 10, unit: '年' },
  };

  if (repeatType === 'none') return { valid: true };

  const limit = limits[repeatType];
  if (!limit) return { valid: false, message: '不支持的重复类型' };

  if (!Number.isInteger(interval) || interval < limit.min || interval > limit.max) {
    const typeLabel = { daily: '每日', weekly: '每周', monthly: '每月', yearly: '每年' }[repeatType];
    return {
      valid: false,
      message: `${typeLabel}间隔必须在${limit.min}-${limit.max}${limit.unit}之间`,
    };
  }

  return { valid: true };
}

export { jsonResponse, validateRepeatInterval };
