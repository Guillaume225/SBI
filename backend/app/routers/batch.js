/**
 * Router pour la planification des tâches batch
 */

import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getJobs } from '../batchScheduler.js';

const router = Router();

/**
 * GET / — Liste des tâches batch planifiées
 */
router.get('/', requireAuth, (_req, res) => {
  res.json({ jobs: getJobs() });
});

/**
 * GET /status — État du planificateur
 */
router.get('/status', requireAuth, (_req, res) => {
  res.json({ scheduler: 'running', jobs_count: getJobs().length });
});

export default router;
