/**
 * Router pour la réception des écritures comptables brutes
 * et le calcul de la balance générale.
 *
 * Routes (API Key auth — agent desktop) :
 *   POST /push              → Réception des écritures brutes depuis l'agent
 *   GET  /balance           → Calcul dynamique de la balance générale
 *   GET  /syncs             → Historique des synchronisations
 *   GET  /list              → Lister les écritures avec filtres et pagination
 *   PUT  /update            → Modifier une écriture par ID
 *   PUT  /update-batch      → Modifier plusieurs écritures en lot
 *   DELETE /delete           → Supprimer une écriture par ID
 *   POST /delete-batch       → Supprimer des écritures (par IDs, sync_id, société…)
 *   DELETE /delete-by-sync   → Supprimer toutes les écritures d'une synchro
 *   PUT  /replace           → Remplacer toutes les écritures d'une société/exercice/période
 *
 * Routes (JWT auth — interface web) :
 *   GET  /browse            → Lister / rechercher les écritures avec pagination
 *   GET  /browse/companies  → Sociétés présentes
 *   GET  /browse/years      → Exercices disponibles
 *   GET  /browse/journals   → Journaux disponibles
 *   GET  /browse/:id        → Détail d'une écriture
 *   PUT  /browse/:id        → Modifier une écriture
 *   DELETE /browse/:id      → Supprimer une écriture
 *   POST /browse/bulk-delete → Suppression groupée
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '../database.js';
import { requireApiKey } from '../apiKeys.js';
import { requireAuth } from '../auth.js';
import { EcritureComptable, SyncHistory } from '../models/dbModels.js';

const router = Router();

// ── Utilitaires ─────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Gérer le format DD/MM/YYYY (français)
  const frMatch = String(dateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frMatch) {
    const [, dd, mm, yyyy] = frMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // Gérer le format YYYY-MM-DD (déjà ISO)
  const isoMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // Fallback via Date()
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function entryToOut(row) {
  return {
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    fiscal_year: row.fiscal_year,
    period: row.period,
    journal_code: row.journal_code,
    journal_label: row.journal_label,
    entry_number: row.entry_number,
    entry_date: row.entry_date || null,
    account_number: row.account_number,
    account_label: row.account_label,
    auxiliary_number: row.auxiliary_number,
    auxiliary_label: row.auxiliary_label,
    label: row.label,
    debit: row.debit || 0,
    credit: row.credit || 0,
    reference: row.reference,
    document_number: row.document_number,
    analytical_section: row.analytical_section,
    currency: row.currency,
    sync_id: row.sync_id,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function rowToFullOut(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    company_id: row.company_id,
    company_name: row.company_name,
    agent_id: row.agent_id,
    fiscal_year: row.fiscal_year,
    period: row.period,
    journal_code: row.journal_code,
    journal_label: row.journal_label,
    entry_number: row.entry_number,
    entry_date: row.entry_date || null,
    account_number: row.account_number,
    account_label: row.account_label,
    auxiliary_number: row.auxiliary_number,
    auxiliary_label: row.auxiliary_label,
    label: row.label,
    debit: row.debit || 0,
    credit: row.credit || 0,
    reference: row.reference,
    document_number: row.document_number,
    analytical_section: row.analytical_section,
    currency: row.currency,
    sync_id: row.sync_id,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}


// ══════════════════════════════════════════════════════════════════════
//  API Desktop (API Key auth)
// ══════════════════════════════════════════════════════════════════════


/**
 * POST /push — Réception des écritures brutes
 */
router.post('/push', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const syncId = uuidv4();
    const { agent_id, company_id, company_name, fiscal_year, period, data } = req.body;

    const rows = (data || []).map(entry => ({
      tenant_id: tenantId,
      company_id,
      company_name,
      agent_id,
      fiscal_year,
      period: period || null,
      journal_code: entry.journal_code,
      journal_label: entry.journal_label,
      entry_number: entry.entry_number,
      entry_date: parseDate(entry.entry_date),
      account_number: entry.account_number,
      account_label: entry.account_label,
      auxiliary_number: entry.auxiliary_number,
      auxiliary_label: entry.auxiliary_label,
      label: entry.label,
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      reference: entry.reference,
      document_number: entry.document_number,
      analytical_section: entry.analytical_section,
      currency: entry.currency || 'EUR',
      sync_id: syncId,
    }));

    await EcritureComptable.bulkCreate(rows);

    await SyncHistory.create({
      id: syncId,
      tenant_id: tenantId,
      agent_id,
      company_id,
      company_name,
      data_type: 'ecritures_comptables',
      fiscal_year,
      period: period || null,
      records_received: (data || []).length,
      records_processed: rows.length,
      status: 'completed',
      completed_at: new Date(),
    });

    res.json({
      success: true,
      records_received: (data || []).length,
      records_stored: rows.length,
      sync_id: syncId,
      message: `${rows.length} écritures stockées pour ${company_id} (exercice ${fiscal_year}, période ${period || 'toutes'})`,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /balance — Calcul de la balance générale
 */
router.get('/balance', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { company_id, fiscal_year, period } = req.query;
    const fy = parseInt(fiscal_year, 10);

    const where = {
      tenant_id: tenantId,
      company_id,
      fiscal_year: fy,
    };
    if (period) where.period = period;

    const results = await sequelize.query(
      `SELECT account_number, MAX(account_label) AS account_label,
              COALESCE(SUM(debit), 0) AS total_debit,
              COALESCE(SUM(credit), 0) AS total_credit
       FROM ecritures_comptables
       WHERE tenant_id = :tenantId AND company_id = :companyId AND fiscal_year = :fiscalYear
       ${period ? 'AND period = :period' : ''}
       GROUP BY account_number ORDER BY account_number`,
      {
        replacements: { tenantId, companyId: company_id, fiscalYear: fy, period },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );

    const lines = [];
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    for (const row of results) {
      const d = Math.round(parseFloat(row.total_debit) * 100) / 100;
      const c = Math.round(parseFloat(row.total_credit) * 100) / 100;
      lines.push({
        account_number: row.account_number,
        account_label: row.account_label,
        total_debit: d,
        total_credit: c,
        balance: Math.round((d - c) * 100) / 100,
      });
      grandTotalDebit += d;
      grandTotalCredit += c;
    }

    res.json({
      tenant_id: tenantId,
      company_id,
      fiscal_year: fy,
      period: period || null,
      total_debit: Math.round(grandTotalDebit * 100) / 100,
      total_credit: Math.round(grandTotalCredit * 100) / 100,
      lines,
      lines_count: lines.length,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /syncs — Historique des syncs
 */
router.get('/syncs', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { company_id } = req.query;

    const where = { tenant_id: tenantId };
    if (company_id) where.company_id = company_id;

    const records = await SyncHistory.findAll({
      where,
      order: [['started_at', 'DESC']],
      limit: 100,
    });

    res.json(records.map(r => ({
      sync_id: r.id,
      agent_id: r.agent_id,
      company_id: r.company_id,
      company_name: r.company_name,
      fiscal_year: r.fiscal_year,
      period: r.period,
      records_received: r.records_received || 0,
      records_processed: r.records_processed || 0,
      status: r.status || 'unknown',
      started_at: r.started_at ? new Date(r.started_at).toISOString() : null,
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /list — Lister les écritures (API Key)
 */
router.get('/list', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const {
      company_id, fiscal_year, period, journal_code, account_number,
      auxiliary_number, entry_number, date_from, date_to, search,
      page: pageStr, page_size: pageSizeStr,
    } = req.query;

    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const pageSize = Math.min(1000, Math.max(1, parseInt(pageSizeStr || '100', 10)));

    const where = {
      tenant_id: tenantId,
      company_id,
      fiscal_year: parseInt(fiscal_year, 10),
    };

    if (period) where.period = period;
    if (journal_code) where.journal_code = journal_code;
    if (account_number) where.account_number = { [Op.like]: `${account_number}%` };
    if (auxiliary_number) where.auxiliary_number = { [Op.like]: `${auxiliary_number}%` };
    if (entry_number) where.entry_number = entry_number;

    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { account_number: { [Op.like]: term } },
        { account_label: { [Op.like]: term } },
        { label: { [Op.like]: term } },
        { entry_number: { [Op.like]: term } },
        { reference: { [Op.like]: term } },
      ];
    }

    if (date_from) where.entry_date = { ...where.entry_date, [Op.gte]: date_from };
    if (date_to) where.entry_date = { ...(where.entry_date || {}), [Op.lte]: date_to };

    const total = await EcritureComptable.count({ where });
    const offset = (page - 1) * pageSize;
    const rows = await EcritureComptable.findAll({
      where,
      order: [['id', 'ASC']],
      offset,
      limit: pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      items: rows.map(entryToOut),
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * PUT /update — Modifier une seule écriture (API Key)
 */
router.put('/update', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id, fields } = req.body;

    const row = await EcritureComptable.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!row) {
      return res.status(404).json({ detail: `Écriture #${id} non trouvée` });
    }

    if (fields.entry_date) fields.entry_date = parseDate(fields.entry_date);

    for (const [field, value] of Object.entries(fields)) {
      if (value !== undefined) row[field] = value;
    }

    await row.save();
    res.json(entryToOut(row));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * PUT /update-batch — Modifier plusieurs écritures (API Key)
 */
router.put('/update-batch', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { updates } = req.body;
    let updated = 0;
    let errors = 0;
    const details = [];

    for (const item of updates) {
      const row = await EcritureComptable.findOne({
        where: { id: item.id, tenant_id: tenantId },
      });

      if (!row) {
        errors++;
        details.push({ id: item.id, status: 'not_found' });
        continue;
      }

      const changes = item.fields || {};
      if (changes.entry_date) changes.entry_date = parseDate(changes.entry_date);

      for (const [field, value] of Object.entries(changes)) {
        if (value !== undefined) row[field] = value;
      }

      await row.save();
      updated++;
      details.push({ id: item.id, status: 'updated' });
    }

    res.json({ success: errors === 0, updated, errors, details });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * DELETE /delete — Supprimer une écriture (API Key)
 */
router.delete('/delete', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { id } = req.query;

    const row = await EcritureComptable.findOne({
      where: { id: parseInt(id, 10), tenant_id: tenantId },
    });
    if (!row) {
      return res.status(404).json({ detail: `Écriture #${id} non trouvée` });
    }

    await row.destroy();
    res.json({ success: true, deleted: 1, message: `Écriture #${id} supprimée` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * POST /delete-batch — Supprimer des écritures (API Key)
 */
router.post('/delete-batch', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { ids, sync_id, company_id, fiscal_year, period, journal_code, account_number } = req.body;

    let count = 0;

    if (ids && ids.length > 0) {
      count = await EcritureComptable.destroy({
        where: { tenant_id: tenantId, id: { [Op.in]: ids } },
      });
    } else if (sync_id) {
      count = await EcritureComptable.destroy({
        where: { tenant_id: tenantId, sync_id },
      });
    } else if (company_id && fiscal_year) {
      const where = {
        tenant_id: tenantId,
        company_id,
        fiscal_year: parseInt(fiscal_year, 10),
      };
      if (period) where.period = period;
      if (journal_code) where.journal_code = journal_code;
      if (account_number) where.account_number = { [Op.like]: `${account_number}%` };
      count = await EcritureComptable.destroy({ where });
    } else {
      return res.status(400).json({
        detail: "Fournissez 'ids', 'sync_id', ou 'company_id'+'fiscal_year'.",
      });
    }

    res.json({ success: true, deleted: count, message: `${count} écriture(s) supprimée(s)` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * DELETE /delete-by-sync — Supprimer par sync_id (API Key)
 */
router.delete('/delete-by-sync', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const { sync_id } = req.query;

    const count = await EcritureComptable.destroy({
      where: { tenant_id: tenantId, sync_id },
    });

    if (count === 0) {
      return res.status(404).json({ detail: `Aucune écriture pour sync_id=${sync_id}` });
    }

    res.json({ success: true, deleted: count, message: `${count} écriture(s) supprimée(s) pour sync ${sync_id}` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * PUT /replace — Remplacement intégral d'un périmètre (API Key)
 */
router.put('/replace', requireApiKey, async (req, res) => {
  try {
    const tenantId = req.tenant.tenant_id;
    const syncId = uuidv4();
    const { agent_id, company_id, company_name, fiscal_year, period, data } = req.body;
    const fy = parseInt(fiscal_year, 10);

    // 1. Supprimer les anciennes
    const deleteWhere = { tenant_id: tenantId, company_id, fiscal_year: fy };
    if (period) deleteWhere.period = period;
    const deletedCount = await EcritureComptable.destroy({ where: deleteWhere });

    // 2. Insérer les nouvelles
    const rows = (data || []).map(entry => ({
      tenant_id: tenantId,
      company_id,
      company_name,
      agent_id,
      fiscal_year: fy,
      period: period || null,
      journal_code: entry.journal_code,
      journal_label: entry.journal_label,
      entry_number: entry.entry_number,
      entry_date: parseDate(entry.entry_date),
      account_number: entry.account_number,
      account_label: entry.account_label,
      auxiliary_number: entry.auxiliary_number,
      auxiliary_label: entry.auxiliary_label,
      label: entry.label,
      debit: entry.debit || 0,
      credit: entry.credit || 0,
      reference: entry.reference,
      document_number: entry.document_number,
      analytical_section: entry.analytical_section,
      currency: entry.currency || 'EUR',
      sync_id: syncId,
    }));

    await EcritureComptable.bulkCreate(rows);

    // 3. Historique
    await SyncHistory.create({
      id: syncId,
      tenant_id: tenantId,
      agent_id,
      company_id,
      company_name,
      data_type: 'ecritures_comptables',
      fiscal_year: fy,
      period: period || null,
      records_received: (data || []).length,
      records_processed: rows.length,
      status: 'replaced',
      completed_at: new Date(),
    });

    res.json({
      success: true,
      deleted: deletedCount,
      inserted: rows.length,
      sync_id: syncId,
      message: `Remplacement pour ${company_id} exercice ${fy}${period ? ` période ${period}` : ''} : ${deletedCount} supprimée(s), ${rows.length} insérée(s)`,
    });
  } catch (err) {
    console.error('[replace] ERROR:', err.message);
    res.status(500).json({ detail: err.message });
  }
});


// ══════════════════════════════════════════════════════════════════════
//  CRUD — Gestion des écritures depuis l'interface web (JWT auth)
// ══════════════════════════════════════════════════════════════════════


/**
 * GET /browse — Lister les écritures avec pagination & filtres
 */
router.get('/browse', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const {
      company_id, fiscal_year, period, account_number, journal_code,
      auxiliary_number, entry_number, search, date_from, date_to,
      page: pageStr, page_size: pageSizeStr,
      sort_by, sort_desc,
    } = req.query;

    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(pageSizeStr || '50', 10)));

    const where = { tenant_id: tenantId };

    if (company_id) where.company_id = company_id;
    if (fiscal_year) where.fiscal_year = parseInt(fiscal_year, 10);
    if (period) where.period = period;
    if (account_number) where.account_number = { [Op.like]: `${account_number}%` };
    if (journal_code) where.journal_code = journal_code;
    if (auxiliary_number) where.auxiliary_number = { [Op.like]: `${auxiliary_number}%` };
    if (entry_number) where.entry_number = entry_number;

    if (search) {
      const term = `%${search}%`;
      where[Op.or] = [
        { account_number: { [Op.like]: term } },
        { account_label: { [Op.like]: term } },
        { label: { [Op.like]: term } },
        { auxiliary_number: { [Op.like]: term } },
        { auxiliary_label: { [Op.like]: term } },
        { entry_number: { [Op.like]: term } },
        { reference: { [Op.like]: term } },
      ];
    }

    if (date_from) where.entry_date = { ...where.entry_date, [Op.gte]: date_from };
    if (date_to) where.entry_date = { ...(where.entry_date || {}), [Op.lte]: date_to };

    const total = await EcritureComptable.count({ where });

    const sortField = sort_by || 'id';
    const sortOrder = sort_desc === 'true' ? 'DESC' : 'ASC';

    const offset = (page - 1) * pageSize;
    const rows = await EcritureComptable.findAll({
      where,
      order: [[sortField, sortOrder]],
      offset,
      limit: pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      items: rows.map(rowToFullOut),
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /browse/companies — Sociétés présentes dans les écritures
 * NOTE: les routes statiques /browse/xxx DOIVENT être avant /browse/:entry_id
 */
router.get('/browse/companies', requireAuth, async (_req, res) => {
  try {
    const tenantId = 'default';
    const results = await sequelize.query(
      `SELECT company_id, MAX(company_name) AS company_name, COUNT(id) AS entries_count
       FROM ecritures_comptables WHERE tenant_id = :tenantId
       GROUP BY company_id ORDER BY company_id`,
      {
        replacements: { tenantId },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );
    res.json(results.map(r => ({
      company_id: r.company_id,
      company_name: r.company_name,
      entries_count: parseInt(r.entries_count, 10),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /browse/years — Exercices disponibles
 */
router.get('/browse/years', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id } = req.query;

    let sql = `SELECT fiscal_year, COUNT(id) AS count FROM ecritures_comptables WHERE tenant_id = :tenantId`;
    const replacements = { tenantId };
    if (company_id) {
      sql += ` AND company_id = :companyId`;
      replacements.companyId = company_id;
    }
    sql += ` GROUP BY fiscal_year ORDER BY fiscal_year DESC`;

    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });
    res.json(results.map(r => ({
      fiscal_year: r.fiscal_year,
      count: parseInt(r.count, 10),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /browse/journals — Journaux disponibles
 */
router.get('/browse/journals', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year } = req.query;

    let sql = `SELECT journal_code, MAX(journal_label) AS journal_label, COUNT(id) AS count
               FROM ecritures_comptables WHERE tenant_id = :tenantId AND journal_code IS NOT NULL`;
    const replacements = { tenantId };
    if (company_id) {
      sql += ` AND company_id = :companyId`;
      replacements.companyId = company_id;
    }
    if (fiscal_year) {
      sql += ` AND fiscal_year = :fiscalYear`;
      replacements.fiscalYear = parseInt(fiscal_year, 10);
    }
    sql += ` GROUP BY journal_code ORDER BY journal_code`;

    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });
    res.json(results.map(r => ({
      journal_code: r.journal_code,
      journal_label: r.journal_label,
      count: parseInt(r.count, 10),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * POST /browse/bulk-delete — Suppression groupée
 */
router.post('/browse/bulk-delete', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { ids, sync_id, company_id, fiscal_year, period } = req.body;

    let count = 0;

    if (ids && ids.length > 0) {
      count = await EcritureComptable.destroy({
        where: { tenant_id: tenantId, id: { [Op.in]: ids } },
      });
    } else if (sync_id) {
      count = await EcritureComptable.destroy({
        where: { tenant_id: tenantId, sync_id },
      });
    } else if (company_id && fiscal_year) {
      const where = {
        tenant_id: tenantId,
        company_id,
        fiscal_year: parseInt(fiscal_year, 10),
      };
      if (period) where.period = period;
      count = await EcritureComptable.destroy({ where });
    } else {
      return res.status(400).json({
        detail: "Fournissez 'ids', 'sync_id', ou 'company_id' + 'fiscal_year'.",
      });
    }

    res.json({ deleted: count, message: `${count} écriture(s) supprimée(s)` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * GET /browse/:entry_id — Détail d'une écriture
 * NOTE: cette route avec path param DOIT être après les routes statiques
 */
router.get('/browse/:entry_id', requireAuth, async (req, res) => {
  try {
    const row = await EcritureComptable.findByPk(req.params.entry_id);
    if (!row) {
      return res.status(404).json({ detail: 'Écriture non trouvée' });
    }
    res.json(rowToFullOut(row));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * PUT /browse/:entry_id — Modifier une écriture
 */
router.put('/browse/:entry_id', requireAuth, async (req, res) => {
  try {
    const row = await EcritureComptable.findByPk(req.params.entry_id);
    if (!row) {
      return res.status(404).json({ detail: 'Écriture non trouvée' });
    }

    const updateData = req.body;
    if (updateData.entry_date) updateData.entry_date = parseDate(updateData.entry_date);

    for (const [field, value] of Object.entries(updateData)) {
      if (value !== undefined) row[field] = value;
    }

    await row.save();
    res.json(rowToFullOut(row));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});


/**
 * DELETE /browse/:entry_id — Supprimer une écriture
 */
router.delete('/browse/:entry_id', requireAuth, async (req, res) => {
  try {
    const row = await EcritureComptable.findByPk(req.params.entry_id);
    if (!row) {
      return res.status(404).json({ detail: 'Écriture non trouvée' });
    }
    await row.destroy();
    res.json({ success: true, message: `Écriture #${req.params.entry_id} supprimée` });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
