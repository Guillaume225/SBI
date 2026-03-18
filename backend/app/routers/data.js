/**
 * Router pour la réception des données depuis les agents
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireApiKey } from '../apiKeys.js';

const router = Router();

/**
 * POST /push — Réception des données poussées par un agent desktop
 */
router.post('/push', requireApiKey, (req, res) => {
  const tenantId = req.tenant.tenant_id;
  const { data, data_type } = req.body;

  // TODO: Stocker les données en BDD
  const syncId = uuidv4();
  const recordsCount = (data || []).length;

  res.json({
    success: true,
    records_received: recordsCount,
    records_processed: recordsCount,
    message: `${recordsCount} enregistrements reçus pour ${data_type} (tenant: ${tenantId})`,
    sync_id: syncId,
  });
});

export default router;
