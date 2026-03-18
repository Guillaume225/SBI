/**
 * Router pour la gestion des agents desktop
 */

import { Router } from 'express';
import { requireApiKey } from '../apiKeys.js';
import { requireAuth } from '../auth.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// Stockage en mémoire (à remplacer par BDD)
const _agents = {};

/**
 * Middleware hybride : accepte JWT (interface web) ou API Key (agent desktop).
 * Enrichit req.tenant à partir du JWT ou de la clé API.
 */
function requireApiKeyOrAuth(req, res, next) {
  // Si un header X-API-Key est présent, utiliser l'auth API Key
  if (req.headers['x-api-key']) {
    return requireApiKey(req, res, next);
  }
  // Sinon, tenter l'auth JWT
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    // Convertir req.user en req.tenant pour compatibilité
    req.tenant = { tenant_id: req.user.tenant_id };
    next();
  });
}

/**
 * POST /register — Enregistrement d'un nouvel agent desktop
 */
router.post('/register', requireApiKey, (req, res) => {
  const tenantId = req.tenant.tenant_id;
  const { agent_id, agent_name, hostname, source_type, source_name, version } = req.body;

  const agent = {
    agent_id,
    agent_name,
    hostname,
    source_type,
    source_name,
    tenant_id: tenantId,
    status: 'online',
    last_heartbeat: new Date().toISOString(),
    last_sync: null,
    registered_at: new Date().toISOString(),
    version: version || null,
  };
  _agents[agent_id] = agent;
  res.json(agent);
});

/**
 * POST /heartbeat — Signal de vie d'un agent
 */
router.post('/heartbeat', requireApiKey, (req, res) => {
  const { agent_id, status, last_sync } = req.body;

  if (!_agents[agent_id]) {
    return res.status(404).json({ detail: 'Agent non enregistré' });
  }

  const agent = _agents[agent_id];
  if (agent.tenant_id !== req.tenant.tenant_id) {
    return res.status(403).json({ detail: 'Cet agent n\'appartient pas à votre tenant.' });
  }

  agent.status = status || agent.status;
  agent.last_heartbeat = new Date().toISOString();
  if (last_sync) agent.last_sync = last_sync;

  res.json({ status: 'ok' });
});

/**
 * GET / — Liste des agents enregistrés pour ce tenant
 * Accepte JWT (interface web) ou API Key (agent desktop)
 */
router.get('/', requireApiKeyOrAuth, (req, res) => {
  const tenantId = req.tenant.tenant_id;
  const agents = Object.values(_agents).filter(a => a.tenant_id === tenantId);
  res.json(agents);
});

// ── Téléchargement de l'agent desktop ───────────────────────────────

const AGENT_ZIP_PATH = path.resolve('C:/Users/Administrator/SBI/Agent/AgentDesktopSBI.zip');

/**
 * GET /download/info — Infos sur le fichier d'installation disponible
 */
router.get('/download/info', requireAuth, (_req, res) => {
  try {
    if (!fs.existsSync(AGENT_ZIP_PATH)) {
      return res.json({ available: false });
    }
    const stat = fs.statSync(AGENT_ZIP_PATH);
    res.json({
      available: true,
      filename: 'AgentDesktopSBI.zip',
      size: stat.size,
      last_modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    console.error('[agent/download/info]', err);
    res.json({ available: false });
  }
});

/**
 * GET /download — Télécharger l'installable de l'agent desktop
 */
router.get('/download', requireAuth, (_req, res) => {
  try {
    if (!fs.existsSync(AGENT_ZIP_PATH)) {
      return res.status(404).json({ detail: 'Fichier d\'installation introuvable sur le serveur.' });
    }
    res.download(AGENT_ZIP_PATH, 'AgentDesktopSBI.zip');
  } catch (err) {
    console.error('[agent/download]', err);
    res.status(500).json({ detail: err.message });
  }
});

export default router;
