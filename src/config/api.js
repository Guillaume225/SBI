/**
 * Configuration API pour SBI
 */

const API_BASE_URL = '/sbi_api/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,

  // Reports
  REPORTS: `${API_BASE_URL}/reports`,
  REPORT_DETAIL: (type) => `${API_BASE_URL}/reports/${type}`,

  // Data & Sync
  DATA_SYNC: `${API_BASE_URL}/data/sync`,
  DATA_PUSH: `${API_BASE_URL}/data/push`,
  DATA_COMPANIES: `${API_BASE_URL}/data/companies`,

  // Agent
  AGENT_LIST: `${API_BASE_URL}/agent`,
  AGENT_REGISTER: `${API_BASE_URL}/agent/register`,
  AGENT_HEARTBEAT: `${API_BASE_URL}/agent/heartbeat`,

  // Users
  USERS: `${API_BASE_URL}/users`,
  USER_ME: `${API_BASE_URL}/users/me`,

  // Batch
  BATCH: `${API_BASE_URL}/batch`,
  BATCH_STATUS: `${API_BASE_URL}/batch/status`,

  // Project DB
  PROJECT_DB: `${API_BASE_URL}/project-db`,
  PROJECT_DB_TABLES: `${API_BASE_URL}/project-db/tables`,
};

export default API_BASE_URL;
