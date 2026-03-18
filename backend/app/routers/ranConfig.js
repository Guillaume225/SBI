/**
 * Router pour la configuration des journaux RAN (Report à Nouveau) par société.
 * CRUD complet : lister, créer, modifier, supprimer.
 */

import { Router } from 'express';
import { JournalRAN } from '../models/dbModels.js';

const router = Router();

function getTenantId() {
  return 'default';
}

function toOut(j) {
  return {
    id: j.id,
    tenant_id: j.tenant_id,
    company_id: j.company_id,
    journal_code: j.journal_code,
    journal_label: j.journal_label,
    description: j.description,
    is_active: j.is_active,
    created_at: j.created_at ? new Date(j.created_at).toISOString() : null,
    updated_at: j.updated_at ? new Date(j.updated_at).toISOString() : null,
  };
}

/**
 * GET / — Liste des journaux RAN (filtre optionnel par société)
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const where = { tenant_id: tenantId };
    if (req.query.company_id) where.company_id = req.query.company_id;

    const journaux = await JournalRAN.findAll({
      where,
      order: [['company_id', 'ASC'], ['journal_code', 'ASC']],
    });
    res.json(journaux.map(toOut));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * POST / — Créer un journal RAN
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const code = (req.body.journal_code || '').toUpperCase().trim();
    const company = (req.body.company_id || '').toUpperCase().trim();

    const existing = await JournalRAN.findOne({
      where: { tenant_id: tenantId, company_id: company, journal_code: code },
    });
    if (existing) {
      return res.status(409).json({
        detail: `Le code journal '${code}' existe déjà pour la société '${company}'.`,
      });
    }

    const journal = await JournalRAN.create({
      tenant_id: tenantId,
      company_id: company,
      journal_code: code,
      journal_label: req.body.journal_label || null,
      description: req.body.description || null,
      is_active: req.body.is_active !== false,
    });
    res.status(201).json(toOut(journal));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * PUT /:journal_id — Modifier un journal RAN
 */
router.put('/:journal_id', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const journal = await JournalRAN.findOne({
      where: { id: req.params.journal_id, tenant_id: tenantId },
    });
    if (!journal) {
      return res.status(404).json({ detail: 'Journal RAN introuvable.' });
    }

    if (req.body.journal_label != null) journal.journal_label = req.body.journal_label;
    if (req.body.description != null) journal.description = req.body.description;
    if (req.body.is_active != null) journal.is_active = req.body.is_active;
    journal.updated_at = new Date();

    await journal.save();
    res.json(toOut(journal));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * DELETE /:journal_id — Supprimer un journal RAN
 */
router.delete('/:journal_id', async (req, res) => {
  try {
    const tenantId = getTenantId();
    const journal = await JournalRAN.findOne({
      where: { id: req.params.journal_id, tenant_id: tenantId },
    });
    if (!journal) {
      return res.status(404).json({ detail: 'Journal RAN introuvable.' });
    }
    await journal.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
