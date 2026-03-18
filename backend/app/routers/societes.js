/**
 * Router pour la gestion des sociétés (dossiers comptables).
 * CRUD : lister, créer, modifier, supprimer.
 */

import { Router } from 'express';
import { Societe } from '../models/dbModels.js';
import { requireApiKey } from '../apiKeys.js';

const router = Router();

function getTenantId() {
  return 'default';
}

function toOut(s) {
  return {
    id: s.id,
    tenant_id: s.tenant_id,
    code: s.code,
    name: s.name,
    siret: s.siret,
    address: s.address,
    fiscal_year_start: s.fiscal_year_start,
    currency: s.currency,
    is_active: s.is_active,
    created_at: s.created_at ? new Date(s.created_at).toISOString() : null,
  };
}

/**
 * GET /check/:code — Vérifier l'existence d'une société par son code.
 * Utilisé par l'agent desktop avant l'envoi de données.
 * Authentification : clé API (X-API-Key).
 *
 * Réponses :
 *   200  { exists: true,  company: { id, code, name, ... } }
 *   200  { exists: false, company: null }
 */
router.get('/check/:code', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant?.tenant_id || 'default';
    const code = (req.params.code || '').toUpperCase().trim();

    if (!code) {
      return res.status(400).json({ detail: 'Le code société est requis.' });
    }

    const societe = await Societe.findOne({
      where: { tenant_id: tenantId, code },
    });

    if (societe && societe.is_active) {
      return res.json({ exists: true, company: toOut(societe) });
    }

    res.json({ exists: false, company: null });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET / — Liste des sociétés
 */
router.get('/', async (_req, res) => {
  try {
    const tenantId = getTenantId();
    const societes = await Societe.findAll({
      where: { tenant_id: tenantId },
      order: [['code', 'ASC']],
    });
    res.json(societes.map(toOut));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * POST / — Créer une société
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const code = (req.body.code || '').toUpperCase().trim();

    const existing = await Societe.findOne({
      where: { tenant_id: tenantId, code },
    });
    if (existing) {
      return res.status(409).json({ detail: `La société '${code}' existe déjà.` });
    }

    const societe = await Societe.create({
      tenant_id: tenantId,
      code,
      name: (req.body.name || '').trim(),
      siret: req.body.siret || null,
      address: req.body.address || null,
      fiscal_year_start: req.body.fiscal_year_start || null,
      currency: req.body.currency || 'EUR',
    });
    res.status(201).json(toOut(societe));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * PUT /:societe_id — Modifier une société
 */
router.put('/:societe_id', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const societe = await Societe.findOne({
      where: { id: req.params.societe_id, tenant_id: tenantId },
    });
    if (!societe) {
      return res.status(404).json({ detail: 'Société introuvable.' });
    }

    const data = req.body;
    if (data.name != null) societe.name = data.name.trim();
    if (data.siret != null) societe.siret = data.siret;
    if (data.address != null) societe.address = data.address;
    if (data.fiscal_year_start != null) societe.fiscal_year_start = data.fiscal_year_start;
    if (data.currency != null) societe.currency = data.currency;
    if (data.is_active != null) societe.is_active = data.is_active;
    societe.updated_at = new Date();

    await societe.save();
    res.json(toOut(societe));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * DELETE /:societe_id — Supprimer une société
 */
router.delete('/:societe_id', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const societe = await Societe.findOne({
      where: { id: req.params.societe_id, tenant_id: tenantId },
    });
    if (!societe) {
      return res.status(404).json({ detail: 'Société introuvable.' });
    }
    await societe.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
