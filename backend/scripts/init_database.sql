-- ================================================================
-- SBI - Script de création de la base de données
-- ================================================================

-- Créer la base de données
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SBI')
BEGIN
    CREATE DATABASE SBI;
END
GO

USE SBI;
GO

-- ================================================================
-- TABLE: Tenants (Organisations / Clients)
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tenants')
BEGIN
    CREATE TABLE tenants (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        code NVARCHAR(50) UNIQUE NOT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END
GO

-- ================================================================
-- TABLE: Utilisateurs
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(50) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        username NVARCHAR(100) UNIQUE NOT NULL,
        email NVARCHAR(200),
        full_name NVARCHAR(200),
        password_hash NVARCHAR(500) NOT NULL,
        role NVARCHAR(50) DEFAULT 'viewer',
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        last_login DATETIME2 NULL
    );
END
GO

-- ================================================================
-- TABLE: Sociétés
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'companies')
BEGIN
    CREATE TABLE companies (
        id NVARCHAR(50) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        code NVARCHAR(50) NOT NULL,
        name NVARCHAR(200) NOT NULL,
        fiscal_year_start NVARCHAR(10),
        source_agent NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE()
    );
END
GO

-- ================================================================
-- TABLE: Agents Desktop
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'agents')
BEGIN
    CREATE TABLE agents (
        agent_id NVARCHAR(50) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        agent_name NVARCHAR(200) NOT NULL,
        hostname NVARCHAR(200),
        source_type NVARCHAR(50),
        source_name NVARCHAR(200),
        api_key_hash NVARCHAR(500),
        status NVARCHAR(20) DEFAULT 'offline',
        last_heartbeat DATETIME2 NULL,
        last_sync DATETIME2 NULL,
        registered_at DATETIME2 DEFAULT GETUTCDATE(),
        version NVARCHAR(50) NULL
    );
END
GO

-- ================================================================
-- TABLE: Plan comptable
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'chart_of_accounts')
BEGIN
    CREATE TABLE chart_of_accounts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        company_id NVARCHAR(50) NOT NULL REFERENCES companies(id),
        account_number NVARCHAR(20) NOT NULL,
        account_label NVARCHAR(500),
        account_type NVARCHAR(50),
        account_class NVARCHAR(10),
        is_active BIT DEFAULT 1,
        INDEX idx_account (tenant_id, company_id, account_number)
    );
END
GO

-- ================================================================
-- TABLE: Écritures comptables (données de balance)
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'accounting_entries')
BEGIN
    CREATE TABLE accounting_entries (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        company_id NVARCHAR(50) NOT NULL REFERENCES companies(id),
        fiscal_year INT NOT NULL,
        period NVARCHAR(10),
        journal_code NVARCHAR(20),
        entry_date DATE,
        account_number NVARCHAR(20) NOT NULL,
        auxiliary_number NVARCHAR(20),
        label NVARCHAR(500),
        debit DECIMAL(18,2) DEFAULT 0,
        credit DECIMAL(18,2) DEFAULT 0,
        reference NVARCHAR(200),
        document_number NVARCHAR(100),
        analytical_section NVARCHAR(50),
        sync_id NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        INDEX idx_entries (tenant_id, company_id, fiscal_year, account_number),
        INDEX idx_entries_period (tenant_id, company_id, fiscal_year, period)
    );
END
GO

-- ================================================================
-- TABLE: Balances (données agrégées)
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'trial_balances')
BEGIN
    CREATE TABLE trial_balances (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        company_id NVARCHAR(50) NOT NULL REFERENCES companies(id),
        fiscal_year INT NOT NULL,
        period NVARCHAR(10),
        account_number NVARCHAR(20) NOT NULL,
        account_label NVARCHAR(500),
        opening_debit DECIMAL(18,2) DEFAULT 0,
        opening_credit DECIMAL(18,2) DEFAULT 0,
        period_debit DECIMAL(18,2) DEFAULT 0,
        period_credit DECIMAL(18,2) DEFAULT 0,
        cumulative_debit DECIMAL(18,2) DEFAULT 0,
        cumulative_credit DECIMAL(18,2) DEFAULT 0,
        balance DECIMAL(18,2) DEFAULT 0,
        sync_id NVARCHAR(50),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        INDEX idx_balance (tenant_id, company_id, fiscal_year, account_number)
    );
END
GO

-- ================================================================
-- TABLE: Historique de synchronisation
-- ================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sync_history')
BEGIN
    CREATE TABLE sync_history (
        id NVARCHAR(50) PRIMARY KEY,
        tenant_id NVARCHAR(50) NOT NULL REFERENCES tenants(id),
        agent_id NVARCHAR(50) NOT NULL REFERENCES agents(agent_id),
        company_id NVARCHAR(50) NOT NULL,
        data_type NVARCHAR(50) NOT NULL,
        records_received INT DEFAULT 0,
        records_processed INT DEFAULT 0,
        status NVARCHAR(20) DEFAULT 'completed',
        error_message NVARCHAR(MAX),
        started_at DATETIME2 DEFAULT GETUTCDATE(),
        completed_at DATETIME2 NULL
    );
END
GO

-- ================================================================
-- Insertion du tenant par défaut
-- ================================================================
IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'default')
BEGIN
    INSERT INTO tenants (id, name, code) VALUES ('default', 'Organisation par défaut', 'DEFAULT');
END
GO

-- ================================================================
-- Insertion de l'utilisateur admin par défaut
-- ================================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (id, tenant_id, username, email, full_name, password_hash, role)
    VALUES ('1', 'default', 'admin', 'admin@sbi.local', 'Administrateur',
            '$2b$12$placeholder_hash_replace_on_first_run', 'admin');
END
GO
