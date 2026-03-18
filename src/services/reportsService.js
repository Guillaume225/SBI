import api from './api';

/**
 * Service pour les reportings financiers
 */
const reportsService = {
  /** Liste des reportings disponibles */
  getAvailableReports: () => api.get('/reports'),

  /** Données d'un reporting */
  getReport: (reportType, params = {}) => api.get(`/reports/${reportType}`, { params }),

  /** Balance générale */
  getTrialBalance: (params) => api.get('/reports/trial_balance', { params }),

  /** Bilan */
  getBalanceSheet: (params) => api.get('/reports/balance_sheet', { params }),

  /** Compte de résultat */
  getIncomeStatement: (params) => api.get('/reports/income_statement', { params }),

  /** SIG */
  getSIG: (params) => api.get('/reports/sig', { params }),

  /** Grand livre */
  getGeneralLedger: (params) => api.get('/reports/general_ledger', { params }),

  /** Balance auxiliaire */
  getSubsidiaryBalance: (params) => api.get('/reports/subsidiary_balance', { params }),
};

export default reportsService;
