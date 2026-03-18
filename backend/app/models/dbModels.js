/**
 * Modèles Sequelize ORM — Tables de la base de données SBI
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../database.js';

// ── Écritures comptables ────────────────────────────────────────────

const EcritureComptable = sequelize.define('EcritureComptable', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  tenant_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  company_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  company_name: DataTypes.STRING(200),
  agent_id: DataTypes.STRING(50),
  fiscal_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  period: DataTypes.STRING(10),
  journal_code: DataTypes.STRING(20),
  journal_label: DataTypes.STRING(200),
  entry_number: DataTypes.STRING(50),
  entry_date: DataTypes.DATEONLY,
  account_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  account_label: DataTypes.STRING(500),
  auxiliary_number: DataTypes.STRING(20),
  auxiliary_label: DataTypes.STRING(500),
  label: DataTypes.STRING(500),
  debit: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  credit: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  reference: DataTypes.STRING(200),
  document_number: DataTypes.STRING(100),
  analytical_section: DataTypes.STRING(50),
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'EUR',
  },
  sync_id: DataTypes.STRING(50),
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'ecritures_comptables',
  timestamps: false,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['tenant_id', 'company_id', 'fiscal_year'], name: 'idx_ecr_tenant_company_year' },
    { fields: ['tenant_id', 'company_id', 'fiscal_year', 'account_number'], name: 'idx_ecr_account' },
    { fields: ['tenant_id', 'company_id', 'fiscal_year', 'period'], name: 'idx_ecr_period' },
    { fields: ['sync_id'], name: 'idx_ecr_sync' },
  ],
});

// ── Historique des synchronisations ─────────────────────────────────

const SyncHistory = sequelize.define('SyncHistory', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
  },
  tenant_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  agent_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  company_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  company_name: DataTypes.STRING(200),
  data_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  fiscal_year: DataTypes.INTEGER,
  period: DataTypes.STRING(10),
  records_received: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  records_processed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'completed',
  },
  error_message: DataTypes.TEXT,
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completed_at: DataTypes.DATE,
}, {
  tableName: 'sync_history',
  timestamps: false,
  indexes: [
    { fields: ['tenant_id'] },
  ],
});

// ── Sociétés ────────────────────────────────────────────────────────

const Societe = sequelize.define('Societe', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenant_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  siret: DataTypes.STRING(20),
  address: DataTypes.STRING(500),
  fiscal_year_start: DataTypes.STRING(10),
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'EUR',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'societes',
  timestamps: false,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['tenant_id', 'code'], unique: true, name: 'idx_soc_tenant_code' },
  ],
});

// ── Journaux RAN ────────────────────────────────────────────────────

const JournalRAN = sequelize.define('JournalRAN', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenant_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  company_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  journal_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  journal_label: DataTypes.STRING(200),
  description: DataTypes.STRING(500),
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'journaux_ran',
  timestamps: false,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['tenant_id', 'company_id', 'journal_code'], unique: true, name: 'idx_ran_tenant_company_code' },
  ],
});

export { EcritureComptable, SyncHistory, Societe, JournalRAN };
