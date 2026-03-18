import api from './api';

/**
 * Service pour la synchronisation et les agents
 */
const syncService = {
  /** État de synchronisation */
  getSyncStatus: () => api.get('/data/sync'),

  /** Liste des sociétés */
  getCompanies: () => api.get('/data/companies'),

  /** Liste des agents */
  getAgents: () => api.get('/agent'),
};

export default syncService;
