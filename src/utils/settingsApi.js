import { apiRequest } from './api';

export async function checkAdminAccess() {
  return apiRequest('/api/weekly-summary/check-access', 'GET');
}

export async function getWeeklySummarySettings() {
  return apiRequest('/api/weekly-summary/settings', 'GET');
}

export async function updateWeeklySummarySettings(settings) {
  return apiRequest('/api/weekly-summary/settings', 'PUT', settings);
}

export async function testWeeklySummary() {
  return apiRequest('/api/weekly-summary/test', 'POST', {});
}
