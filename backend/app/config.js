/**
 * SBI - Solution de Business Intelligente
 * Configuration de l'application
 */

import dotenv from 'dotenv';
dotenv.config();

const settings = {
  // Application
  APP_NAME: process.env.APP_NAME || 'SBI',
  APP_VERSION: process.env.APP_VERSION || '0.0.0',
  DEBUG: process.env.DEBUG === 'true',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Reverse proxy path prefix
  ROOT_PATH: process.env.ROOT_PATH || '/sbi_api',

  // Base de données SQL Server
  DB_TYPE: process.env.DB_TYPE || 'mssql',
  DB_SERVER: process.env.DB_SERVER || 'localhost',
  DB_NAME: process.env.DB_NAME || 'SBI',
  DB_USER: process.env.DB_USER || 'sa',
  DB_PASSWORD: process.env.DB_PASSWORD || 'Toi&MoiSaFait1',
  DB_TRUSTED_CONNECTION: process.env.DB_TRUSTED_CONNECTION === 'true',
  DB_PORT: parseInt(process.env.DB_PORT || '1433', 10),

  // JWT
  SECRET_KEY: process.env.SECRET_KEY || 'sbi-secret-key-change-in-production',
  ALGORITHM: 'HS256',
  ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '480', 10),

  // IA
  AI_PROVIDER: process.env.AI_PROVIDER || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || '',
};

export default settings;
