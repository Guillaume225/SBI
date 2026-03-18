/**
 * SBI - Solution de Business Intelligente
 * Point d'entrée principal de l'API Express
 */

import express from 'express';
import cors from 'cors';

import settings from './app/config.js';
import { initDb } from './app/database.js';

// Importer les modèles pour que Sequelize les connaisse
import './app/models/dbModels.js';

// Routers
import authRouter from './app/routers/auth.js';
import reportsRouter from './app/routers/reports.js';
import syncRouter from './app/routers/sync.js';
import batchRouter from './app/routers/batch.js';
import usersRouter from './app/routers/users.js';
import projectDbRouter from './app/routers/projectDb.js';
import agentRouter from './app/routers/agent.js';
import dataRouter from './app/routers/data.js';
import apiKeysRouter from './app/routers/apiKeys.js';
import entriesRouter from './app/routers/entries.js';
import ranConfigRouter from './app/routers/ranConfig.js';
import societesRouter from './app/routers/societes.js';

const app = express();

// ── Middleware global ───────────────────────────────────────────────
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Sous-application SBI montée sur /sbi_api ───────────────────────
const sbiApp = express.Router();

// Routes de base
sbiApp.get('/', (_req, res) => {
  res.json({
    application: 'SBI - Solution de Business Intelligente',
    version: settings.APP_VERSION,
    documentation: '/sbi_api/docs',
  });
});

sbiApp.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Monter les routers
sbiApp.use('/api/auth', authRouter);
sbiApp.use('/api/reports', reportsRouter);
sbiApp.use('/api/data', syncRouter);
sbiApp.use('/api/data', dataRouter);
sbiApp.use('/api/batch', batchRouter);
sbiApp.use('/api/users', usersRouter);
sbiApp.use('/api/project-db', projectDbRouter);
sbiApp.use('/api/agent', agentRouter);
sbiApp.use('/api/api-keys', apiKeysRouter);
sbiApp.use('/api/entries', entriesRouter);
sbiApp.use('/api/ran-config', ranConfigRouter);
sbiApp.use('/api/societes', societesRouter);

// Monter sbi_app sous /sbi_api
app.use('/sbi_api', sbiApp);

// ── Initialisation et démarrage ─────────────────────────────────────
const PORT = parseInt(process.env.PORT || '8000', 10);

async function start() {
  // Initialiser la base de données
  await initDb();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  SBI API (Node.js/Express) démarré sur http://0.0.0.0:${PORT}`);
    console.log(`  Documentation : http://localhost:${PORT}/sbi_api/`);
    console.log(`  Health check  : http://localhost:${PORT}/sbi_api/health\n`);
  });
}

start().catch(err => {
  console.error('Erreur au démarrage:', err);
  process.exit(1);
});
