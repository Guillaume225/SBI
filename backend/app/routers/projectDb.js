/**
 * Router pour la base de données projet (configurations)
 */

import { Router } from 'express';
import { requireAuth } from '../auth.js';

const router = Router();

/**
 * GET / — Informations sur la base de données du projet
 */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    status: 'connected',
    driver: 'SQL Server',
    tables: [],
    message: 'Base de données projet configurée',
  });
});

/**
 * GET /tables — Liste des tables de la base de données
 */
router.get('/tables', requireAuth, (_req, res) => {
  // TODO: Requête réelle vers SQL Server
  res.json({ tables: [] });
});

/**
 * GET /tables/:table_name — Explorer les données d'une table
 */
router.get('/tables/:table_name', requireAuth, (req, res) => {
  // TODO: Requête réelle vers SQL Server
  res.json({
    table: req.params.table_name,
    columns: [],
    rows: [],
    total_rows: 0,
  });
});

export default router;
