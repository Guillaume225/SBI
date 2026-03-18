/**
 * SBI - Configuration de la base de données (Sequelize + SQL Server)
 */

import { Sequelize } from 'sequelize';
import settings from './config.js';

const sequelize = new Sequelize(settings.DB_NAME, settings.DB_USER, settings.DB_PASSWORD, {
  host: settings.DB_SERVER,
  port: settings.DB_PORT,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  },
  logging: settings.DEBUG ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

/**
 * Initialise la base de données (sync des modèles).
 */
async function initDb() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connexion à la base de données établie.');
    // Sync toutes les tables (ne supprime pas les existantes)
    await sequelize.sync({ alter: false });
    console.log('✓ Tables synchronisées.');
  } catch (error) {
    console.error('✗ Erreur de connexion à la base de données:', error.message);
  }
}

export { sequelize, initDb };
