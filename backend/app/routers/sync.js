/**
 * Router pour la synchronisation des données
 */

import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();

// Stockage en mémoire (à remplacer par BDD)
const _syncStatuses = {};
const _companies = {};

/**
 * GET /sync — État de synchronisation de tous les agents
 */
router.get('/sync', requireAuth, (_req, res) => {
  res.json(Object.values(_syncStatuses));
});

/**
 * GET /companies — Liste des sociétés configurées
 */
router.get('/companies', requireAuth, (req, res) => {
  const tenantId = req.user.tenant_id || '';
  const filtered = Object.values(_companies).filter(c => c.tenant_id === tenantId);
  res.json(filtered);
});

export default router;
