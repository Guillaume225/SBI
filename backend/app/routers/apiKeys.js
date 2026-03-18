/**
 * Router pour la gestion des clés API (administration)
 */

import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { generateApiKey, revokeApiKey, listApiKeys } from '../apiKeys.js';

const router = Router();

/**
 * POST /generate — Génère une nouvelle clé API pour un tenant
 */
router.post('/generate', requireAuth, (req, res) => {
  const { tenant_id, tenant_name } = req.body;
  const apiKey = generateApiKey(tenant_id, tenant_name || '');

  res.json({
    api_key: apiKey,
    tenant_id,
    tenant_name: tenant_name || '',
    message: `Clé API générée pour le tenant '${tenant_id}'. Conservez cette clé précieusement, elle ne sera plus affichée.`,
  });
});

/**
 * GET /list — Liste toutes les clés API
 */
router.get('/list', requireAuth, (_req, res) => {
  res.json(listApiKeys());
});

/**
 * POST /revoke — Révoque une clé API
 */
router.post('/revoke', requireAuth, (req, res) => {
  const { api_key } = req.body;
  const success = revokeApiKey(api_key);
  if (!success) {
    return res.status(404).json({ detail: 'Clé API introuvable.' });
  }
  res.json({ message: 'Clé API révoquée avec succès.' });
});

export default router;
