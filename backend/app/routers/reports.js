/**
 * Router pour les reportings financiers
 */

import { Router } from 'express';
import { Op, fn, col, literal, where as seqWhere } from 'sequelize';
import { sequelize } from '../database.js';
import { requireAuth } from '../auth.js';
import { EcritureComptable, JournalRAN, Societe } from '../models/dbModels.js';

const router = Router();

// Reportings disponibles
const AVAILABLE_REPORTS = [
  {
    id: 'trial_balance', name: 'Balance Générale', report_type: 'trial_balance',
    description: 'Balance générale des comptes (Trial Balance)',
    icon: 'FaBalanceScale', category: 'financial',
  },
  {
    id: 'balance_sheet', name: 'Bilan Comptable', report_type: 'balance_sheet',
    description: 'Bilan comptable (Actif / Passif)',
    icon: 'FaFileInvoiceDollar', category: 'financial',
  },
  {
    id: 'income_statement', name: 'Compte de Résultat', report_type: 'income_statement',
    description: 'Compte de résultat (Produits & Charges)',
    icon: 'FaChartLine', category: 'financial',
  },
  {
    id: 'sig', name: 'Soldes Intermédiaires de Gestion', report_type: 'sig',
    description: 'SIG - Analyse de la formation du résultat',
    icon: 'FaLayerGroup', category: 'financial',
  },
  {
    id: 'general_ledger', name: 'Grand Livre', report_type: 'general_ledger',
    description: 'Grand Livre général (General Ledger)',
    icon: 'FaBook', category: 'financial',
  },
  {
    id: 'subsidiary_balance', name: 'Balance Auxiliaire', report_type: 'subsidiary_balance',
    description: 'Balance auxiliaire (clients/fournisseurs)',
    icon: 'FaUsers', category: 'auxiliary',
  },
  {
    id: 'analytical_balance', name: 'Balance Analytique', report_type: 'analytical_balance',
    description: 'Balance par axe analytique',
    icon: 'FaProjectDiagram', category: 'analytical',
  },
];

/**
 * GET / — Liste des reportings disponibles
 */
router.get('/', requireAuth, (_req, res) => {
  res.json(AVAILABLE_REPORTS);
});

// ── Balance Générale ────────────────────────────────────────────────

/**
 * GET /trial-balance/companies — Sociétés ayant des données
 */
router.get('/trial-balance/companies', requireAuth, async (_req, res) => {
  try {
    const tenantId = 'default';

    const entriesCompanies = await EcritureComptable.findAll({
      where: { tenant_id: tenantId },
      attributes: [
        'company_id',
        [fn('MAX', col('company_name')), 'company_name'],
        [fn('COUNT', col('id')), 'entries_count'],
      ],
      group: ['company_id'],
      raw: true,
    });

    const registered = {};
    const societes = await Societe.findAll({ where: { tenant_id: tenantId }, raw: true });
    for (const s of societes) {
      registered[s.code] = s;
    }

    const result = entriesCompanies.map(row => {
      const soc = registered[row.company_id];
      return {
        company_id: row.company_id,
        company_name: soc ? soc.name : (row.company_name || row.company_id),
        entries_count: parseInt(row.entries_count, 10),
        is_registered: !!soc,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /trial-balance/years — Exercices disponibles
 */
router.get('/trial-balance/years', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id } = req.query;

    const results = await sequelize.query(
      `SELECT DISTINCT YEAR(entry_date) AS fiscal_year
       FROM ecritures_comptables
       WHERE tenant_id = :tenantId AND company_id = :companyId AND entry_date IS NOT NULL
       ORDER BY fiscal_year DESC`,
      {
        replacements: { tenantId, companyId: company_id },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );

    res.json({
      company_id,
      years: results.map(r => r.fiscal_year).filter(y => y != null),
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /trial-balance/periods — Périodes disponibles
 */
router.get('/trial-balance/periods', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year } = req.query;

    const results = await sequelize.query(
      `SELECT DISTINCT period
       FROM ecritures_comptables
       WHERE tenant_id = :tenantId AND company_id = :companyId
         AND YEAR(entry_date) = :fiscalYear AND period IS NOT NULL
       ORDER BY period`,
      {
        replacements: { tenantId, companyId: company_id, fiscalYear: parseInt(fiscal_year, 10) },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );

    res.json({
      company_id,
      fiscal_year: parseInt(fiscal_year, 10),
      periods: results.map(r => r.period).filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /trial-balance/data — Balance Générale calculée
 */
router.get('/trial-balance/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year, period, date_from, date_to } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. Récupérer les codes journaux RAN actifs
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranSet = new Set(ranRows.map(r => r.journal_code));
    const ranArray = Array.from(ranSet);

    // 2. Construire la requête SQL
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    // Toujours ajouter les paramètres RAN s'il y en a
    if (ranArray.length > 0) {
      ranArray.forEach((code, i) => { replacements[`ran${i}`] = code; });
    }

    if (period) {
      if (ranArray.length > 0) {
        const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
        whereClause += ` AND (period = :period OR journal_code IN (${ranList}))`;
        replacements.period = period;
      } else {
        whereClause += ` AND period = :period`;
        replacements.period = period;
      }
    }

    if (date_from) {
      whereClause += ` AND entry_date >= :dateFrom`;
      replacements.dateFrom = date_from;
    }
    if (date_to) {
      whereClause += ` AND entry_date <= :dateTo`;
      replacements.dateTo = date_to;
    }

    let selectCols;
    if (ranArray.length > 0) {
      const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
      selectCols = `
        account_number,
        MAX(account_label) AS account_label,
        COALESCE(SUM(CASE WHEN journal_code IN (${ranList}) THEN debit ELSE 0 END), 0) AS opening_debit,
        COALESCE(SUM(CASE WHEN journal_code IN (${ranList}) THEN credit ELSE 0 END), 0) AS opening_credit,
        COALESCE(SUM(CASE WHEN journal_code NOT IN (${ranList}) THEN debit ELSE 0 END), 0) AS period_debit,
        COALESCE(SUM(CASE WHEN journal_code NOT IN (${ranList}) THEN credit ELSE 0 END), 0) AS period_credit,
        COALESCE(SUM(debit), 0) AS cumulative_debit,
        COALESCE(SUM(credit), 0) AS cumulative_credit
      `;
    } else {
      selectCols = `
        account_number,
        MAX(account_label) AS account_label,
        0 AS opening_debit,
        0 AS opening_credit,
        COALESCE(SUM(debit), 0) AS period_debit,
        COALESCE(SUM(credit), 0) AS period_credit,
        COALESCE(SUM(debit), 0) AS cumulative_debit,
        COALESCE(SUM(credit), 0) AS cumulative_credit
      `;
    }

    const sql = `SELECT ${selectCols} FROM ecritures_comptables WHERE ${whereClause} GROUP BY account_number ORDER BY account_number`;
    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });

    // 4. Construction de la réponse
    const lines = [];
    const totals = {
      opening_debit: 0, opening_credit: 0,
      period_debit: 0, period_credit: 0,
      cumulative_debit: 0, cumulative_credit: 0,
      balance: 0,
    };

    for (const row of results) {
      const od = Math.round(parseFloat(row.opening_debit || 0) * 100) / 100;
      const oc = Math.round(parseFloat(row.opening_credit || 0) * 100) / 100;
      const pd = Math.round(parseFloat(row.period_debit || 0) * 100) / 100;
      const pc = Math.round(parseFloat(row.period_credit || 0) * 100) / 100;
      const cd = Math.round(parseFloat(row.cumulative_debit || 0) * 100) / 100;
      const cc = Math.round(parseFloat(row.cumulative_credit || 0) * 100) / 100;
      const bal = Math.round((cd - cc) * 100) / 100;

      lines.push({
        account_number: row.account_number,
        account_label: row.account_label,
        opening_debit: od, opening_credit: oc,
        period_debit: pd, period_credit: pc,
        cumulative_debit: cd, cumulative_credit: cc,
        balance: bal,
      });

      totals.opening_debit += od;
      totals.opening_credit += oc;
      totals.period_debit += pd;
      totals.period_credit += pc;
      totals.cumulative_debit += cd;
      totals.cumulative_credit += cc;
      totals.balance += bal;
    }

    for (const k of Object.keys(totals)) {
      totals[k] = Math.round(totals[k] * 100) / 100;
    }

    // Nom de la société
    const soc = await Societe.findOne({
      where: { tenant_id: tenantId, code: company_id },
      raw: true,
    });

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      generated_at: new Date().toISOString(),
      lines,
      lines_count: lines.length,
      totals,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Balance Auxiliaire ──────────────────────────────────────────────

/**
 * GET /subsidiary-balance/accounts — Comptes auxiliaires existants
 */
router.get('/subsidiary-balance/accounts', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year } = req.query;

    const results = await sequelize.query(
      `SELECT account_number, MAX(account_label) AS account_label, COUNT(id) AS entries_count
       FROM ecritures_comptables
       WHERE tenant_id = :tenantId AND company_id = :companyId
         AND YEAR(entry_date) = :fiscalYear
         AND auxiliary_number IS NOT NULL AND auxiliary_number != ''
       GROUP BY account_number
       ORDER BY account_number`,
      {
        replacements: { tenantId, companyId: company_id, fiscalYear: parseInt(fiscal_year, 10) },
        type: sequelize.constructor.QueryTypes.SELECT,
      }
    );

    res.json(results.map(a => ({
      account_number: a.account_number,
      account_label: a.account_label,
      entries_count: parseInt(a.entries_count, 10),
    })));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /subsidiary-balance/data — Balance Auxiliaire calculée
 */
router.get('/subsidiary-balance/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year, period, aux_type, account_filter, date_from, date_to } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. Codes RAN
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranSet = new Set(ranRows.map(r => r.journal_code));
    const ranArray2 = Array.from(ranSet);

    // 2. Requête SQL
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear AND auxiliary_number IS NOT NULL AND auxiliary_number != ''`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    // Toujours ajouter les paramètres RAN s'il y en a
    if (ranArray2.length > 0) {
      ranArray2.forEach((code, i) => { replacements[`ran${i}`] = code; });
    }

    if (aux_type === 'client') {
      whereClause += ` AND account_number LIKE '411%'`;
    } else if (aux_type === 'fournisseur') {
      whereClause += ` AND account_number LIKE '401%'`;
    }

    if (account_filter) {
      whereClause += ` AND account_number LIKE :accountFilter`;
      replacements.accountFilter = `${account_filter}%`;
    }

    if (period) {
      if (ranArray2.length > 0) {
        const ranList = ranArray2.map((_, i) => `:ran${i}`).join(',');
        whereClause += ` AND (period = :period OR journal_code IN (${ranList}))`;
        replacements.period = period;
      } else {
        whereClause += ` AND period = :period`;
        replacements.period = period;
      }
    }

    if (date_from) {
      whereClause += ` AND entry_date >= :dateFrom`;
      replacements.dateFrom = date_from;
    }
    if (date_to) {
      whereClause += ` AND entry_date <= :dateTo`;
      replacements.dateTo = date_to;
    }

    let selectCols;
    if (ranArray2.length > 0) {
      const ranList = ranArray2.map((_, i) => `:ran${i}`).join(',');
      selectCols = `
        account_number, MAX(account_label) AS account_label,
        auxiliary_number, MAX(auxiliary_label) AS auxiliary_label,
        COALESCE(SUM(CASE WHEN journal_code IN (${ranList}) THEN debit ELSE 0 END), 0) AS opening_debit,
        COALESCE(SUM(CASE WHEN journal_code IN (${ranList}) THEN credit ELSE 0 END), 0) AS opening_credit,
        COALESCE(SUM(CASE WHEN journal_code NOT IN (${ranList}) THEN debit ELSE 0 END), 0) AS period_debit,
        COALESCE(SUM(CASE WHEN journal_code NOT IN (${ranList}) THEN credit ELSE 0 END), 0) AS period_credit,
        COALESCE(SUM(debit), 0) AS cumulative_debit,
        COALESCE(SUM(credit), 0) AS cumulative_credit
      `;
    } else {
      selectCols = `
        account_number, MAX(account_label) AS account_label,
        auxiliary_number, MAX(auxiliary_label) AS auxiliary_label,
        0 AS opening_debit, 0 AS opening_credit,
        COALESCE(SUM(debit), 0) AS period_debit,
        COALESCE(SUM(credit), 0) AS period_credit,
        COALESCE(SUM(debit), 0) AS cumulative_debit,
        COALESCE(SUM(credit), 0) AS cumulative_credit
      `;
    }

    const sql = `SELECT ${selectCols} FROM ecritures_comptables WHERE ${whereClause} GROUP BY account_number, auxiliary_number ORDER BY account_number, auxiliary_number`;
    const results = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });

    const lines = [];
    const totals = {
      opening_debit: 0, opening_credit: 0,
      period_debit: 0, period_credit: 0,
      cumulative_debit: 0, cumulative_credit: 0,
      balance: 0,
    };

    for (const row of results) {
      const od = Math.round(parseFloat(row.opening_debit || 0) * 100) / 100;
      const oc = Math.round(parseFloat(row.opening_credit || 0) * 100) / 100;
      const pd = Math.round(parseFloat(row.period_debit || 0) * 100) / 100;
      const pc = Math.round(parseFloat(row.period_credit || 0) * 100) / 100;
      const cd = Math.round(parseFloat(row.cumulative_debit || 0) * 100) / 100;
      const cc = Math.round(parseFloat(row.cumulative_credit || 0) * 100) / 100;
      const bal = Math.round((cd - cc) * 100) / 100;

      lines.push({
        account_number: row.account_number,
        account_label: row.account_label,
        auxiliary_number: row.auxiliary_number,
        auxiliary_label: row.auxiliary_label,
        opening_debit: od, opening_credit: oc,
        period_debit: pd, period_credit: pc,
        cumulative_debit: cd, cumulative_credit: cc,
        balance: bal,
      });

      totals.opening_debit += od;
      totals.opening_credit += oc;
      totals.period_debit += pd;
      totals.period_credit += pc;
      totals.cumulative_debit += cd;
      totals.cumulative_credit += cc;
      totals.balance += bal;
    }

    for (const k of Object.keys(totals)) {
      totals[k] = Math.round(totals[k] * 100) / 100;
    }

    const soc = await Societe.findOne({
      where: { tenant_id: tenantId, code: company_id },
      raw: true,
    });

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      aux_type: aux_type || null,
      generated_at: new Date().toISOString(),
      lines,
      lines_count: lines.length,
      totals,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// ── Bilan Comptable ─────────────────────────────────────────────────

/**
 * Structure PCG du Bilan (Plan Comptable Général français).
 * Chaque rubrique est associée à un filtre de comptes.
 */
const BILAN_STRUCTURE = {
  actif: [
    { section: 'ACTIF IMMOBILISÉ', items: [
      { label: 'Immobilisations incorporelles', filter: '20', amortFilter: '280' },
      { label: 'Immobilisations corporelles', filter: '21', amortFilter: '281' },
      { label: 'Immobilisations en cours', filter: '23', amortFilter: null },
      { label: 'Immobilisations financières', filter: '26,27', amortFilter: '296,297' },
    ]},
    { section: 'ACTIF CIRCULANT', items: [
      { label: 'Stocks et en-cours', filter: '3', amortFilter: '39' },
      { label: 'Clients et comptes rattachés', filter: '411', amortFilter: '491' },
      { label: 'Autres créances', filter: '40,42,43,44,45,46', amortFilter: null },
      { label: 'Valeurs mobilières de placement', filter: '50', amortFilter: '590' },
      { label: 'Disponibilités', filter: '51,52,53,54', amortFilter: null },
      { label: 'Charges constatées d\'avance', filter: '486', amortFilter: null },
    ]},
  ],
  passif: [
    { section: 'CAPITAUX PROPRES', items: [
      { label: 'Capital social', filter: '101' },
      { label: 'Primes d\'émission, de fusion', filter: '104' },
      { label: 'Réserves', filter: '106' },
      { label: 'Report à nouveau', filter: '11' },
      { label: 'Résultat de l\'exercice', filter: '12' },
      { label: 'Subventions d\'investissement', filter: '13' },
      { label: 'Provisions réglementées', filter: '14' },
    ]},
    { section: 'PROVISIONS', items: [
      { label: 'Provisions pour risques et charges', filter: '15' },
    ]},
    { section: 'DETTES', items: [
      { label: 'Emprunts et dettes financières', filter: '16,17' },
      { label: 'Fournisseurs et comptes rattachés', filter: '401' },
      { label: 'Dettes fiscales et sociales', filter: '42,43,44,45', side: 'credit' },
      { label: 'Autres dettes', filter: '46,47', side: 'credit' },
      { label: 'Produits constatés d\'avance', filter: '487' },
    ]},
  ],
};

/**
 * GET /balance-sheet/data — Bilan Comptable calculé à partir de la balance générale
 */
router.get('/balance-sheet/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year, period, date_from, date_to } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. Récupérer les codes journaux RAN actifs
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranArray = Array.from(new Set(ranRows.map(r => r.journal_code)));

    // 2. Construire la requête SQL — soldes par compte
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    if (ranArray.length > 0) {
      ranArray.forEach((code, i) => { replacements[`ran${i}`] = code; });
    }

    if (period) {
      if (ranArray.length > 0) {
        const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
        whereClause += ` AND (period = :period OR journal_code IN (${ranList}))`;
      } else {
        whereClause += ` AND period = :period`;
      }
      replacements.period = period;
    }

    if (date_from) { whereClause += ` AND entry_date >= :dateFrom`; replacements.dateFrom = date_from; }
    if (date_to)   { whereClause += ` AND entry_date <= :dateTo`; replacements.dateTo = date_to; }

    const sql = `
      SELECT account_number,
             MAX(account_label) AS account_label,
             COALESCE(SUM(debit), 0) AS total_debit,
             COALESCE(SUM(credit), 0) AS total_credit
      FROM ecritures_comptables
      WHERE ${whereClause}
      GROUP BY account_number
      ORDER BY account_number
    `;

    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });

    // 3. Indexer les soldes par compte
    const balances = {};
    for (const row of rows) {
      balances[row.account_number] = {
        label: row.account_label,
        debit: parseFloat(row.total_debit) || 0,
        credit: parseFloat(row.total_credit) || 0,
        solde: (parseFloat(row.total_debit) || 0) - (parseFloat(row.total_credit) || 0),
      };
    }

    // 4. Fonction utilitaire : sommer les comptes correspondant à un filtre
    function sumAccounts(filter, mode = 'solde') {
      const prefixes = filter.split(',').map(p => p.trim());
      let total = 0;
      for (const [acct, data] of Object.entries(balances)) {
        if (prefixes.some(p => acct.startsWith(p))) {
          if (mode === 'debit') total += data.debit;
          else if (mode === 'credit') total += data.credit;
          else total += data.solde;
        }
      }
      return total;
    }

    // 5. Construire le bilan ACTIF
    const actifSections = [];
    let totalActifBrut = 0, totalActifAmort = 0, totalActifNet = 0;

    for (const section of BILAN_STRUCTURE.actif) {
      const sectionItems = [];
      let sectionBrut = 0, sectionAmort = 0, sectionNet = 0;

      for (const item of section.items) {
        const brut = Math.round(sumAccounts(item.filter, 'debit') * 100) / 100;
        let amort = 0;
        if (item.amortFilter) {
          amort = Math.round(Math.abs(sumAccounts(item.amortFilter, 'credit')) * 100) / 100;
        }
        const net = Math.round((brut - amort) * 100) / 100;

        sectionItems.push({ label: item.label, brut, amort, net });
        sectionBrut += brut;
        sectionAmort += amort;
        sectionNet += net;
      }

      actifSections.push({
        section: section.section,
        items: sectionItems,
        total_brut: Math.round(sectionBrut * 100) / 100,
        total_amort: Math.round(sectionAmort * 100) / 100,
        total_net: Math.round(sectionNet * 100) / 100,
      });

      totalActifBrut += sectionBrut;
      totalActifAmort += sectionAmort;
      totalActifNet += sectionNet;
    }

    // 6. Construire le bilan PASSIF
    const passifSections = [];
    let totalPassif = 0;

    for (const section of BILAN_STRUCTURE.passif) {
      const sectionItems = [];
      let sectionTotal = 0;

      for (const item of section.items) {
        // Au passif le solde est crédit - débit (sens inverse)
        let montant;
        if (item.side === 'credit') {
          montant = Math.round(sumAccounts(item.filter, 'credit') * 100) / 100;
        } else {
          montant = Math.round(-sumAccounts(item.filter) * 100) / 100;
        }

        sectionItems.push({ label: item.label, montant });
        sectionTotal += montant;
      }

      passifSections.push({
        section: section.section,
        items: sectionItems,
        total: Math.round(sectionTotal * 100) / 100,
      });

      totalPassif += sectionTotal;
    }

    // 7. Nom de la société
    const soc = await Societe.findOne({
      where: { tenant_id: tenantId, code: company_id },
      raw: true,
    });

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      generated_at: new Date().toISOString(),
      actif: {
        sections: actifSections,
        total_brut: Math.round(totalActifBrut * 100) / 100,
        total_amort: Math.round(totalActifAmort * 100) / 100,
        total_net: Math.round(totalActifNet * 100) / 100,
      },
      passif: {
        sections: passifSections,
        total: Math.round(totalPassif * 100) / 100,
      },
      equilibre: Math.round((totalActifNet - totalPassif) * 100) / 100,
    });
  } catch (err) {
    console.error('[balance-sheet/data]', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── Soldes Intermédiaires de Gestion (SIG) ──────────────────────────

/**
 * GET /sig/data — SIG calculé à partir de la balance générale
 *
 * Structure PCG française :
 *  1. Marge commerciale
 *  2. Production de l'exercice
 *  3. Valeur ajoutée
 *  4. Excédent brut d'exploitation (EBE)
 *  5. Résultat d'exploitation
 *  6. Résultat financier
 *  7. Résultat courant avant impôts (RCAI)
 *  8. Résultat exceptionnel
 *  9. Résultat net comptable
 */
router.get('/sig/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year, period, date_from, date_to } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. RAN
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranArray = Array.from(new Set(ranRows.map(r => r.journal_code)));

    // 2. Requête SQL — soldes par compte
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    if (ranArray.length > 0) {
      ranArray.forEach((code, i) => { replacements[`ran${i}`] = code; });
      // Exclure les écritures RAN pour le SIG (on ne veut que l'exercice)
      const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
      whereClause += ` AND journal_code NOT IN (${ranList})`;
    }

    if (period) { whereClause += ` AND period = :period`; replacements.period = period; }
    if (date_from) { whereClause += ` AND entry_date >= :dateFrom`; replacements.dateFrom = date_from; }
    if (date_to) { whereClause += ` AND entry_date <= :dateTo`; replacements.dateTo = date_to; }

    const sql = `
      SELECT account_number,
             MAX(account_label) AS account_label,
             COALESCE(SUM(debit), 0) AS total_debit,
             COALESCE(SUM(credit), 0) AS total_credit
      FROM ecritures_comptables
      WHERE ${whereClause}
      GROUP BY account_number
      ORDER BY account_number
    `;

    const rows = await sequelize.query(sql, { replacements, type: sequelize.constructor.QueryTypes.SELECT });

    // 3. Indexer
    const balances = {};
    for (const row of rows) {
      balances[row.account_number] = {
        debit: parseFloat(row.total_debit) || 0,
        credit: parseFloat(row.total_credit) || 0,
      };
    }

    // Fonction utilitaire : somme crédit ou débit par préfixes
    function sumByPrefix(prefixes, mode) {
      const pList = prefixes.split(',').map(p => p.trim());
      let total = 0;
      for (const [acct, data] of Object.entries(balances)) {
        if (pList.some(p => acct.startsWith(p))) {
          if (mode === 'credit') total += data.credit;
          else if (mode === 'debit') total += data.debit;
          else total += (data.credit - data.debit); // solde créditeur (produits)
        }
      }
      return Math.round(total * 100) / 100;
    }

    // 4. Calcul SIG selon PCG
    // ─ Ventes de marchandises (707) et RRR accordés (7097)
    const ventesMarch = sumByPrefix('707', 'credit') - sumByPrefix('7097', 'debit');
    // ─ Coût d'achat des marchandises vendues (607 - 6097 + variation stocks 6037)
    const achatsMarch = sumByPrefix('607', 'debit') - sumByPrefix('6097', 'credit') + sumByPrefix('6037', 'debit');
    const margeCommerciale = Math.round((ventesMarch - achatsMarch) * 100) / 100;

    // ─ Production vendue (70 sauf 707)
    let productionVendue = 0;
    for (const [acct, data] of Object.entries(balances)) {
      if (acct.startsWith('70') && !acct.startsWith('707') && !acct.startsWith('7097')) {
        productionVendue += data.credit - data.debit;
      }
    }
    productionVendue = Math.round(productionVendue * 100) / 100;
    const productionStockee = sumByPrefix('71', 'net');
    const productionImmobilisee = sumByPrefix('72', 'credit');
    const productionExercice = Math.round((productionVendue + productionStockee + productionImmobilisee) * 100) / 100;

    // ─ Consommations en provenance de tiers (60 sauf 607/6037/6097, 61, 62)
    let consommations = 0;
    for (const [acct, data] of Object.entries(balances)) {
      if (acct.startsWith('60') && !acct.startsWith('607') && !acct.startsWith('6037') && !acct.startsWith('6097')) {
        consommations += data.debit - data.credit;
      }
      if (acct.startsWith('61') || acct.startsWith('62')) {
        consommations += data.debit - data.credit;
      }
    }
    consommations = Math.round(consommations * 100) / 100;

    const valeurAjoutee = Math.round((margeCommerciale + productionExercice - consommations) * 100) / 100;

    // ─ Subventions d'exploitation (74)
    const subventionsExploit = sumByPrefix('74', 'credit');
    // ─ Impôts et taxes (63)
    const impotsTaxes = sumByPrefix('63', 'debit') - sumByPrefix('63', 'credit');
    // ─ Charges de personnel (64)
    const chargesPersonnel = sumByPrefix('64', 'debit') - sumByPrefix('64', 'credit');

    const ebe = Math.round((valeurAjoutee + subventionsExploit - impotsTaxes - chargesPersonnel) * 100) / 100;

    // ─ Autres produits d'exploitation (75, 781, 791)
    const autresProdExploit = sumByPrefix('75,781,791', 'credit') - sumByPrefix('75', 'debit');
    // ─ Autres charges d'exploitation (65, 681)
    const autresChargesExploit = sumByPrefix('65,681', 'debit') - sumByPrefix('65,681', 'credit');
    // ─ Reprises / transferts de charges (781 déjà compté)

    const resultatExploitation = Math.round((ebe + autresProdExploit - autresChargesExploit) * 100) / 100;

    // ─ Produits financiers (76, 786, 796)
    const produitsFinanciers = sumByPrefix('76,786,796', 'credit') - sumByPrefix('76', 'debit');
    // ─ Charges financières (66, 686)
    const chargesFinancieres = sumByPrefix('66,686', 'debit') - sumByPrefix('66,686', 'credit');
    const resultatFinancier = Math.round((produitsFinanciers - chargesFinancieres) * 100) / 100;

    const rcai = Math.round((resultatExploitation + resultatFinancier) * 100) / 100;

    // ─ Produits exceptionnels (77, 787, 797)
    const produitsExcept = sumByPrefix('77,787,797', 'credit') - sumByPrefix('77', 'debit');
    // ─ Charges exceptionnelles (67, 687)
    const chargesExcept = sumByPrefix('67,687', 'debit') - sumByPrefix('67,687', 'credit');
    const resultatExceptionnel = Math.round((produitsExcept - chargesExcept) * 100) / 100;

    // ─ Participation des salariés (691)
    const participation = sumByPrefix('691', 'debit') - sumByPrefix('691', 'credit');
    // ─ Impôt sur les bénéfices (695)
    const impotBenefices = sumByPrefix('695', 'debit') - sumByPrefix('695', 'credit');

    const resultatNet = Math.round((rcai + resultatExceptionnel - participation - impotBenefices) * 100) / 100;

    // Chiffre d'affaires = ventes march + production vendue
    const chiffreAffaires = Math.round((ventesMarch + productionVendue) * 100) / 100;

    // Capacité d'autofinancement (CAF) = résultat net + dotations amort (681,686,687) - reprises (781,786,787) + VNC cessions (675) - produits cessions (775)
    const dotationsAmort = sumByPrefix('681,686,687', 'debit') - sumByPrefix('681,686,687', 'credit');
    const reprisesAmort = sumByPrefix('781,786,787', 'credit') - sumByPrefix('781,786,787', 'debit');
    const vncCessions = sumByPrefix('675', 'debit') - sumByPrefix('675', 'credit');
    const produitsCessions = sumByPrefix('775', 'credit') - sumByPrefix('775', 'debit');
    const caf = Math.round((resultatNet + dotationsAmort - reprisesAmort + vncCessions - produitsCessions) * 100) / 100;

    // 5. Société
    const soc = await Societe.findOne({ where: { tenant_id: tenantId, code: company_id }, raw: true });

    // 6. Construire les lignes structurées
    const sigLines = [
      { key: 'ventes_marchandises', label: 'Ventes de marchandises', montant: ventesMarch, level: 1, type: 'detail' },
      { key: 'cout_achat_march', label: 'Coût d\'achat des marchandises vendues', montant: -achatsMarch, level: 1, type: 'detail' },
      { key: 'marge_commerciale', label: 'Marge commerciale', montant: margeCommerciale, level: 0, type: 'solde' },

      { key: 'production_vendue', label: 'Production vendue', montant: productionVendue, level: 1, type: 'detail' },
      { key: 'production_stockee', label: 'Production stockée', montant: productionStockee, level: 1, type: 'detail' },
      { key: 'production_immobilisee', label: 'Production immobilisée', montant: productionImmobilisee, level: 1, type: 'detail' },
      { key: 'production_exercice', label: 'Production de l\'exercice', montant: productionExercice, level: 0, type: 'solde' },

      { key: 'consommations', label: 'Consommations en provenance de tiers', montant: -consommations, level: 1, type: 'detail' },
      { key: 'valeur_ajoutee', label: 'Valeur ajoutée', montant: valeurAjoutee, level: 0, type: 'solde_important' },

      { key: 'subventions_exploit', label: 'Subventions d\'exploitation', montant: subventionsExploit, level: 1, type: 'detail' },
      { key: 'impots_taxes', label: 'Impôts, taxes et versements assimilés', montant: -impotsTaxes, level: 1, type: 'detail' },
      { key: 'charges_personnel', label: 'Charges de personnel', montant: -chargesPersonnel, level: 1, type: 'detail' },
      { key: 'ebe', label: 'Excédent brut d\'exploitation (EBE)', montant: ebe, level: 0, type: 'solde_important' },

      { key: 'autres_prod_exploit', label: 'Autres produits d\'exploitation', montant: autresProdExploit, level: 1, type: 'detail' },
      { key: 'autres_charges_exploit', label: 'Autres charges d\'exploitation', montant: -autresChargesExploit, level: 1, type: 'detail' },
      { key: 'resultat_exploitation', label: 'Résultat d\'exploitation', montant: resultatExploitation, level: 0, type: 'solde_important' },

      { key: 'produits_financiers', label: 'Produits financiers', montant: produitsFinanciers, level: 1, type: 'detail' },
      { key: 'charges_financieres', label: 'Charges financières', montant: -chargesFinancieres, level: 1, type: 'detail' },
      { key: 'resultat_financier', label: 'Résultat financier', montant: resultatFinancier, level: 0, type: 'solde' },

      { key: 'rcai', label: 'Résultat courant avant impôts (RCAI)', montant: rcai, level: 0, type: 'solde_important' },

      { key: 'produits_except', label: 'Produits exceptionnels', montant: produitsExcept, level: 1, type: 'detail' },
      { key: 'charges_except', label: 'Charges exceptionnelles', montant: -chargesExcept, level: 1, type: 'detail' },
      { key: 'resultat_exceptionnel', label: 'Résultat exceptionnel', montant: resultatExceptionnel, level: 0, type: 'solde' },

      { key: 'participation', label: 'Participation des salariés', montant: -participation, level: 1, type: 'detail' },
      { key: 'impot_benefices', label: 'Impôt sur les bénéfices', montant: -impotBenefices, level: 1, type: 'detail' },
      { key: 'resultat_net', label: 'Résultat net comptable', montant: resultatNet, level: 0, type: 'resultat_final' },

      { key: 'caf', label: 'Capacité d\'autofinancement (CAF)', montant: caf, level: 0, type: 'solde_important' },
    ];

    // Ratios
    const ratios = chiffreAffaires !== 0 ? {
      taux_marge_commerciale: Math.round((margeCommerciale / chiffreAffaires) * 10000) / 100,
      taux_valeur_ajoutee: Math.round((valeurAjoutee / chiffreAffaires) * 10000) / 100,
      taux_ebe: Math.round((ebe / chiffreAffaires) * 10000) / 100,
      taux_resultat_exploitation: Math.round((resultatExploitation / chiffreAffaires) * 10000) / 100,
      taux_resultat_net: Math.round((resultatNet / chiffreAffaires) * 10000) / 100,
      taux_caf: Math.round((caf / chiffreAffaires) * 10000) / 100,
    } : null;

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      generated_at: new Date().toISOString(),
      chiffre_affaires: chiffreAffaires,
      lines: sigLines,
      summary: {
        chiffre_affaires: chiffreAffaires,
        marge_commerciale: margeCommerciale,
        valeur_ajoutee: valeurAjoutee,
        ebe,
        resultat_exploitation: resultatExploitation,
        resultat_financier: resultatFinancier,
        rcai,
        resultat_exceptionnel: resultatExceptionnel,
        resultat_net: resultatNet,
        caf,
      },
      ratios,
    });
  } catch (err) {
    console.error('[sig/data]', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── Compte de Résultat ──────────────────────────────────────────────

/**
 * GET /income-statement/data — Compte de Résultat calculé à partir de la balance générale
 *
 * Structure PCG française en liste :
 *   I.   Produits d'exploitation / Charges d'exploitation → Résultat d'exploitation
 *   II.  Produits financiers / Charges financières → Résultat financier
 *   III. Résultat courant avant impôts
 *   IV.  Produits exceptionnels / Charges exceptionnelles → Résultat exceptionnel
 *   V.   Participation, IS → Résultat net
 */
router.get('/income-statement/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year, period, date_from, date_to } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. RAN
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranArray = Array.from(new Set(ranRows.map(r => r.journal_code)));

    // 2. Requête SQL — soldes par compte (hors RAN)
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    if (ranArray.length > 0) {
      ranArray.forEach((code, i) => { replacements[`ran${i}`] = code; });
      const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
      whereClause += ` AND journal_code NOT IN (${ranList})`;
    }

    if (period) { whereClause += ` AND period = :period`; replacements.period = period; }
    if (date_from) { whereClause += ` AND entry_date >= :dateFrom`; replacements.dateFrom = date_from; }
    if (date_to) { whereClause += ` AND entry_date <= :dateTo`; replacements.dateTo = date_to; }

    const sql = `
      SELECT account_number,
             MAX(account_label) AS account_label,
             COALESCE(SUM(debit), 0) AS total_debit,
             COALESCE(SUM(credit), 0) AS total_credit
      FROM ecritures_comptables
      WHERE ${whereClause}
      GROUP BY account_number
      ORDER BY account_number
    `;
    const rows = await sequelize.query(sql, { replacements, type: sequelize.constructor.QueryTypes.SELECT });

    // 3. Indexer
    const balances = {};
    for (const row of rows) {
      balances[row.account_number] = {
        label: row.account_label,
        debit: parseFloat(row.total_debit) || 0,
        credit: parseFloat(row.total_credit) || 0,
      };
    }

    function sumPrefix(prefixes, mode) {
      const pList = prefixes.split(',').map(p => p.trim());
      let total = 0;
      for (const [acct, data] of Object.entries(balances)) {
        if (pList.some(p => acct.startsWith(p))) {
          if (mode === 'credit') total += data.credit;
          else if (mode === 'debit') total += data.debit;
          else total += (data.credit - data.debit);
        }
      }
      return Math.round(total * 100) / 100;
    }

    const r2 = (v) => Math.round(v * 100) / 100;

    // 4. PRODUITS D'EXPLOITATION
    const venteMarch = sumPrefix('707', 'credit') - sumPrefix('7097', 'debit');
    // Production vendue (70 sauf 707)
    let prodVendue = 0;
    for (const [a, d] of Object.entries(balances)) {
      if (a.startsWith('70') && !a.startsWith('707') && !a.startsWith('7097')) prodVendue += d.credit - d.debit;
    }
    prodVendue = r2(prodVendue);
    const chiffreAffaires = r2(venteMarch + prodVendue);

    const prodStockee = sumPrefix('71');
    const prodImmobilisee = sumPrefix('72', 'credit');
    const subvExploit = sumPrefix('74', 'credit');
    const reprisesProvExploit = sumPrefix('781', 'credit');
    const transfertsCharges = sumPrefix('791', 'credit');
    const autresProdExploit = sumPrefix('75', 'credit') - sumPrefix('75', 'debit');

    const totalProduitsExploit = r2(chiffreAffaires + prodStockee + prodImmobilisee + subvExploit + reprisesProvExploit + transfertsCharges + autresProdExploit);

    // 5. CHARGES D'EXPLOITATION
    const achatsMarch = sumPrefix('607', 'debit') - sumPrefix('6097', 'credit');
    const varStockMarch = sumPrefix('6037', 'debit') - sumPrefix('6037', 'credit');
    // Achats MP et autres approvisionnements (601,602)
    const achatsMP = sumPrefix('601,602', 'debit') - sumPrefix('6091,6092', 'credit');
    const varStockMP = sumPrefix('6031,6032', 'debit') - sumPrefix('6031,6032', 'credit');
    const autresAchats = sumPrefix('604,605,606,608', 'debit') - sumPrefix('6094,6095,6096,6098', 'credit');
    const servicesExt = sumPrefix('61,62', 'debit') - sumPrefix('61,62', 'credit');
    const impotsTaxes = sumPrefix('63', 'debit') - sumPrefix('63', 'credit');
    const chargesPersonnel = sumPrefix('64', 'debit') - sumPrefix('64', 'credit');
    const dotationsAmortExploit = sumPrefix('681', 'debit') - sumPrefix('681', 'credit');
    const autresChargesExploit = sumPrefix('65', 'debit') - sumPrefix('65', 'credit');

    const totalChargesExploit = r2(achatsMarch + varStockMarch + achatsMP + varStockMP + autresAchats + servicesExt + impotsTaxes + chargesPersonnel + dotationsAmortExploit + autresChargesExploit);

    const resultatExploitation = r2(totalProduitsExploit - totalChargesExploit);

    // 6. PRODUITS FINANCIERS
    const prodFinParticipations = sumPrefix('761', 'credit');
    const prodFinAutresTitres = sumPrefix('762', 'credit');
    const autresInteretsProd = sumPrefix('763,764,765,768', 'credit');
    const reprisesProvFin = sumPrefix('786', 'credit');
    const transfertsChargesFin = sumPrefix('796', 'credit');
    const diffChangesProd = sumPrefix('766', 'credit') - sumPrefix('766', 'debit');
    const prodNetsCessions = sumPrefix('767', 'credit') - sumPrefix('767', 'debit');

    const totalProduitsFin = r2(prodFinParticipations + prodFinAutresTitres + autresInteretsProd + reprisesProvFin + transfertsChargesFin + (diffChangesProd > 0 ? diffChangesProd : 0) + (prodNetsCessions > 0 ? prodNetsCessions : 0));

    // 7. CHARGES FINANCIÈRES
    const dotationsProvFin = sumPrefix('686', 'debit') - sumPrefix('686', 'credit');
    const interetsCharges = sumPrefix('661', 'debit') - sumPrefix('661', 'credit');
    const diffChangesCharge = sumPrefix('666', 'debit') - sumPrefix('666', 'credit');
    const autresChargesFin = sumPrefix('664,665,667,668', 'debit') - sumPrefix('664,665,667,668', 'credit');

    const totalChargesFin = r2(dotationsProvFin + interetsCharges + (diffChangesCharge > 0 ? diffChangesCharge : 0) + autresChargesFin);

    const resultatFinancier = r2(totalProduitsFin - totalChargesFin);
    const rcai = r2(resultatExploitation + resultatFinancier);

    // 8. PRODUITS EXCEPTIONNELS
    const prodExceptGestion = sumPrefix('771', 'credit') - sumPrefix('771', 'debit');
    const prodExceptCapital = sumPrefix('775,777,778', 'credit') - sumPrefix('775,777,778', 'debit');
    const reprisesProvExcept = sumPrefix('787', 'credit');
    const transfertsChargesExcept = sumPrefix('797', 'credit');

    const totalProduitsExcept = r2(prodExceptGestion + prodExceptCapital + reprisesProvExcept + transfertsChargesExcept);

    // 9. CHARGES EXCEPTIONNELLES
    const chargesExceptGestion = sumPrefix('671', 'debit') - sumPrefix('671', 'credit');
    const chargesExceptCapital = sumPrefix('675,678', 'debit') - sumPrefix('675,678', 'credit');
    const dotationsProvExcept = sumPrefix('687', 'debit') - sumPrefix('687', 'credit');

    const totalChargesExcept = r2(chargesExceptGestion + chargesExceptCapital + dotationsProvExcept);

    const resultatExceptionnel = r2(totalProduitsExcept - totalChargesExcept);

    // 10. Participation & IS
    const participation = sumPrefix('691', 'debit') - sumPrefix('691', 'credit');
    const impotBenefices = sumPrefix('695', 'debit') - sumPrefix('695', 'credit');

    const totalProduits = r2(totalProduitsExploit + totalProduitsFin + totalProduitsExcept);
    const totalCharges = r2(totalChargesExploit + totalChargesFin + totalChargesExcept + participation + impotBenefices);
    const resultatNet = r2(totalProduits - totalCharges);

    // 11. Société
    const soc = await Societe.findOne({ where: { tenant_id: tenantId, code: company_id }, raw: true });

    // 12. Lignes structurées
    const lines = [
      // ─ PRODUITS D'EXPLOITATION
      { section: 'produits_exploitation', label: 'PRODUITS D\'EXPLOITATION', montant: null, level: 0, type: 'section_header' },
      { section: 'produits_exploitation', label: 'Ventes de marchandises', montant: venteMarch, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Production vendue (biens et services)', montant: prodVendue, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Chiffre d\'affaires net', montant: chiffreAffaires, level: 1, type: 'subtotal' },
      { section: 'produits_exploitation', label: 'Production stockée', montant: prodStockee, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Production immobilisée', montant: prodImmobilisee, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Subventions d\'exploitation', montant: subvExploit, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Reprises sur prov. et amort.', montant: reprisesProvExploit, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Transferts de charges', montant: transfertsCharges, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Autres produits', montant: autresProdExploit, level: 1, type: 'detail' },
      { section: 'produits_exploitation', label: 'Total des produits d\'exploitation', montant: totalProduitsExploit, level: 0, type: 'total_section' },

      // ─ CHARGES D'EXPLOITATION
      { section: 'charges_exploitation', label: 'CHARGES D\'EXPLOITATION', montant: null, level: 0, type: 'section_header' },
      { section: 'charges_exploitation', label: 'Achats de marchandises', montant: achatsMarch, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Variation de stocks (marchandises)', montant: varStockMarch, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Achats de matières premières', montant: achatsMP, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Variation de stocks (MP)', montant: varStockMP, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Autres achats et charges externes', montant: r2(autresAchats + servicesExt), level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Impôts, taxes et versements assimilés', montant: impotsTaxes, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Salaires et traitements', montant: chargesPersonnel, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Dotations aux amort. et provisions', montant: dotationsAmortExploit, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Autres charges', montant: autresChargesExploit, level: 1, type: 'detail' },
      { section: 'charges_exploitation', label: 'Total des charges d\'exploitation', montant: totalChargesExploit, level: 0, type: 'total_section' },

      // ─ RÉSULTAT D'EXPLOITATION
      { section: 'resultat', label: 'RÉSULTAT D\'EXPLOITATION', montant: resultatExploitation, level: 0, type: 'resultat' },

      // ─ PRODUITS FINANCIERS
      { section: 'produits_financiers', label: 'PRODUITS FINANCIERS', montant: null, level: 0, type: 'section_header' },
      { section: 'produits_financiers', label: 'Produits de participations', montant: prodFinParticipations, level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Produits d\'autres titres', montant: prodFinAutresTitres, level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Autres intérêts et produits assimilés', montant: autresInteretsProd, level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Reprises sur prov. et transferts', montant: r2(reprisesProvFin + transfertsChargesFin), level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Différences positives de change', montant: diffChangesProd > 0 ? diffChangesProd : 0, level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Produits nets sur cessions VMP', montant: prodNetsCessions > 0 ? prodNetsCessions : 0, level: 1, type: 'detail' },
      { section: 'produits_financiers', label: 'Total des produits financiers', montant: totalProduitsFin, level: 0, type: 'total_section' },

      // ─ CHARGES FINANCIÈRES
      { section: 'charges_financieres', label: 'CHARGES FINANCIÈRES', montant: null, level: 0, type: 'section_header' },
      { section: 'charges_financieres', label: 'Dotations aux amort. et provisions', montant: dotationsProvFin, level: 1, type: 'detail' },
      { section: 'charges_financieres', label: 'Intérêts et charges assimilées', montant: interetsCharges, level: 1, type: 'detail' },
      { section: 'charges_financieres', label: 'Différences négatives de change', montant: diffChangesCharge > 0 ? diffChangesCharge : 0, level: 1, type: 'detail' },
      { section: 'charges_financieres', label: 'Charges nettes sur cessions VMP', montant: autresChargesFin, level: 1, type: 'detail' },
      { section: 'charges_financieres', label: 'Total des charges financières', montant: totalChargesFin, level: 0, type: 'total_section' },

      // ─ RÉSULTAT FINANCIER
      { section: 'resultat', label: 'RÉSULTAT FINANCIER', montant: resultatFinancier, level: 0, type: 'resultat' },
      { section: 'resultat', label: 'RÉSULTAT COURANT AVANT IMPÔTS', montant: rcai, level: 0, type: 'resultat_important' },

      // ─ PRODUITS EXCEPTIONNELS
      { section: 'produits_exceptionnels', label: 'PRODUITS EXCEPTIONNELS', montant: null, level: 0, type: 'section_header' },
      { section: 'produits_exceptionnels', label: 'Sur opérations de gestion', montant: prodExceptGestion, level: 1, type: 'detail' },
      { section: 'produits_exceptionnels', label: 'Sur opérations en capital', montant: prodExceptCapital, level: 1, type: 'detail' },
      { section: 'produits_exceptionnels', label: 'Reprises sur prov. et transferts', montant: r2(reprisesProvExcept + transfertsChargesExcept), level: 1, type: 'detail' },
      { section: 'produits_exceptionnels', label: 'Total des produits exceptionnels', montant: totalProduitsExcept, level: 0, type: 'total_section' },

      // ─ CHARGES EXCEPTIONNELLES
      { section: 'charges_exceptionnelles', label: 'CHARGES EXCEPTIONNELLES', montant: null, level: 0, type: 'section_header' },
      { section: 'charges_exceptionnelles', label: 'Sur opérations de gestion', montant: chargesExceptGestion, level: 1, type: 'detail' },
      { section: 'charges_exceptionnelles', label: 'Sur opérations en capital', montant: chargesExceptCapital, level: 1, type: 'detail' },
      { section: 'charges_exceptionnelles', label: 'Dotations aux amort. et provisions', montant: dotationsProvExcept, level: 1, type: 'detail' },
      { section: 'charges_exceptionnelles', label: 'Total des charges exceptionnelles', montant: totalChargesExcept, level: 0, type: 'total_section' },

      // ─ RÉSULTAT EXCEPTIONNEL
      { section: 'resultat', label: 'RÉSULTAT EXCEPTIONNEL', montant: resultatExceptionnel, level: 0, type: 'resultat' },

      // ─ PARTICIPATION & IS
      { section: 'fiscal', label: 'Participation des salariés', montant: participation, level: 1, type: 'detail' },
      { section: 'fiscal', label: 'Impôt sur les bénéfices', montant: impotBenefices, level: 1, type: 'detail' },

      // ─ TOTAUX & RÉSULTAT NET
      { section: 'total', label: 'TOTAL DES PRODUITS', montant: totalProduits, level: 0, type: 'grand_total' },
      { section: 'total', label: 'TOTAL DES CHARGES', montant: totalCharges, level: 0, type: 'grand_total' },
      { section: 'total', label: 'RÉSULTAT NET', montant: resultatNet, level: 0, type: 'resultat_final' },
    ];

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      generated_at: new Date().toISOString(),
      chiffre_affaires: chiffreAffaires,
      lines,
      summary: {
        total_produits_exploitation: totalProduitsExploit,
        total_charges_exploitation: totalChargesExploit,
        resultat_exploitation: resultatExploitation,
        total_produits_financiers: totalProduitsFin,
        total_charges_financieres: totalChargesFin,
        resultat_financier: resultatFinancier,
        rcai,
        total_produits_exceptionnels: totalProduitsExcept,
        total_charges_exceptionnelles: totalChargesExcept,
        resultat_exceptionnel: resultatExceptionnel,
        participation,
        impot_benefices: impotBenefices,
        total_produits: totalProduits,
        total_charges: totalCharges,
        resultat_net: resultatNet,
      },
    });
  } catch (err) {
    console.error('[income-statement/data]', err);
    res.status(500).json({ detail: err.message });
  }
});

// ── Grand Livre ─────────────────────────────────────────────────────

/**
 * GET /general-ledger/accounts — Liste des comptes disponibles pour le Grand Livre
 */
router.get('/general-ledger/accounts', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const { company_id, fiscal_year } = req.query;
    const fy = parseInt(fiscal_year, 10);
    if (!company_id || !fy) return res.json([]);

    const sql = `
      SELECT DISTINCT account_number, MAX(account_label) AS account_label
      FROM ecritures_comptables
      WHERE tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fy
      GROUP BY account_number
      ORDER BY account_number
    `;
    const rows = await sequelize.query(sql, {
      replacements: { tenantId, companyId: company_id, fy },
      type: sequelize.constructor.QueryTypes.SELECT,
    });
    res.json(rows);
  } catch (err) {
    console.error('[general-ledger/accounts]', err);
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /general-ledger/data — Grand Livre détaillé
 *
 * Retourne toutes les écritures regroupées par compte, avec solde progressif.
 * Filtres : company_id, fiscal_year, period, account_from, account_to, journal_code
 */
router.get('/general-ledger/data', requireAuth, async (req, res) => {
  try {
    const tenantId = 'default';
    const {
      company_id, fiscal_year, period,
      account_from, account_to,
      journal_code,
      date_from, date_to,
    } = req.query;
    const fy = parseInt(fiscal_year, 10);

    // 1. RAN journals
    const ranRows = await JournalRAN.findAll({
      where: { tenant_id: tenantId, company_id, is_active: true },
      attributes: ['journal_code'],
      raw: true,
    });
    const ranArray = Array.from(new Set(ranRows.map(r => r.journal_code)));

    // 2. Build WHERE clause
    let whereClause = `tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear`;
    const replacements = { tenantId, companyId: company_id, fiscalYear: fy };

    if (ranArray.length > 0) {
      ranArray.forEach((code, i) => { replacements[`ran${i}`] = code; });
      const ranList = ranArray.map((_, i) => `:ran${i}`).join(',');
      whereClause += ` AND journal_code NOT IN (${ranList})`;
    }
    if (period) { whereClause += ` AND period = :period`; replacements.period = period; }
    if (date_from) { whereClause += ` AND entry_date >= :dateFrom`; replacements.dateFrom = date_from; }
    if (date_to) { whereClause += ` AND entry_date <= :dateTo`; replacements.dateTo = date_to; }
    if (account_from) { whereClause += ` AND account_number >= :accountFrom`; replacements.accountFrom = account_from; }
    if (account_to) { whereClause += ` AND account_number <= :accountTo`; replacements.accountTo = account_to; }
    if (journal_code) { whereClause += ` AND journal_code = :journalCode`; replacements.journalCode = journal_code; }

    // 3. Fetch all entries ordered by account then date
    const sql = `
      SELECT
        id, account_number, account_label,
        entry_date, journal_code, journal_label,
        entry_number, label, reference, document_number,
        debit, credit, period, auxiliary_number, auxiliary_label
      FROM ecritures_comptables
      WHERE ${whereClause}
      ORDER BY account_number, entry_date, id
    `;
    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.constructor.QueryTypes.SELECT,
    });

    // 4. Group by account with running balance
    const accountsMap = new Map();
    for (const row of rows) {
      const acct = row.account_number;
      if (!accountsMap.has(acct)) {
        accountsMap.set(acct, {
          account_number: acct,
          account_label: row.account_label || acct,
          entries: [],
          total_debit: 0,
          total_credit: 0,
        });
      }
      const group = accountsMap.get(acct);
      const d = parseFloat(row.debit) || 0;
      const c = parseFloat(row.credit) || 0;
      group.total_debit += d;
      group.total_credit += c;
      const runningBalance = group.total_debit - group.total_credit;

      group.entries.push({
        id: row.id,
        entry_date: row.entry_date,
        journal_code: row.journal_code,
        journal_label: row.journal_label,
        entry_number: row.entry_number,
        label: row.label,
        reference: row.reference,
        document_number: row.document_number,
        debit: d,
        credit: c,
        running_balance: Math.round(runningBalance * 100) / 100,
        period: row.period,
        auxiliary_number: row.auxiliary_number,
        auxiliary_label: row.auxiliary_label,
      });
    }

    // 5. Finalise accounts array
    const accounts = [];
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;
    for (const [, group] of accountsMap) {
      group.total_debit = Math.round(group.total_debit * 100) / 100;
      group.total_credit = Math.round(group.total_credit * 100) / 100;
      group.solde = Math.round((group.total_debit - group.total_credit) * 100) / 100;
      grandTotalDebit += group.total_debit;
      grandTotalCredit += group.total_credit;
      accounts.push(group);
    }

    // 6. Journals list (for filter)
    const journalsSql = `
      SELECT DISTINCT journal_code, MAX(journal_label) AS journal_label
      FROM ecritures_comptables
      WHERE tenant_id = :tenantId AND company_id = :companyId AND YEAR(entry_date) = :fiscalYear
      GROUP BY journal_code
      ORDER BY journal_code
    `;
    const journals = await sequelize.query(journalsSql, {
      replacements: { tenantId, companyId: company_id, fiscalYear: fy },
      type: sequelize.constructor.QueryTypes.SELECT,
    });

    // 7. Company info
    const soc = await Societe.findOne({ where: { tenant_id: tenantId, code: company_id }, raw: true });

    res.json({
      company_id,
      company_name: soc ? soc.name : company_id,
      fiscal_year: fy,
      period: period || null,
      generated_at: new Date().toISOString(),
      filters: {
        account_from: account_from || null,
        account_to: account_to || null,
        journal_code: journal_code || null,
        date_from: date_from || null,
        date_to: date_to || null,
      },
      journals,
      accounts_count: accounts.length,
      entries_count: rows.length,
      accounts,
      totals: {
        total_debit: Math.round(grandTotalDebit * 100) / 100,
        total_credit: Math.round(grandTotalCredit * 100) / 100,
        solde: Math.round((grandTotalDebit - grandTotalCredit) * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[general-ledger/data]', err);
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /:report_type — Endpoint générique (autres rapports)
 */
router.get('/:report_type', requireAuth, (req, res) => {
  const { report_type } = req.params;
  const { company_id, fiscal_year, period_start, period_end } = req.query;

  const report = AVAILABLE_REPORTS.find(r => r.id === report_type);

  res.json({
    report_type,
    title: report ? report.name : report_type,
    company: company_id || null,
    fiscal_year: fiscal_year ? parseInt(fiscal_year, 10) : null,
    generated_at: new Date().toISOString(),
    filters: {
      company_id: company_id || null,
      fiscal_year: fiscal_year ? parseInt(fiscal_year, 10) : null,
      period_start: period_start || null,
      period_end: period_end || null,
    },
    columns: [],
    rows: [],
    totals: null,
  });
});

export default router;
