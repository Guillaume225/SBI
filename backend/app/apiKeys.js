/**
 * Gestion des clés API par tenant.
 * Chaque tenant dispose d'une clé API unique que l'agent desktop
 * utilise pour s'authentifier et associer les données au bon tenant.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const API_KEYS_FILE = path.join(DATA_DIR, 'api_keys.json');

// ── Fonctions internes ──────────────────────────────────────────────

function _loadKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function _saveKeys(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── API publique ────────────────────────────────────────────────────

function generateApiKey(tenantId, tenantName = '') {
  const apiKey = `sbi_${crypto.randomBytes(32).toString('base64url')}`;
  const keys = _loadKeys();
  keys[apiKey] = {
    tenant_id: tenantId,
    tenant_name: tenantName,
    created_at: new Date().toISOString(),
    active: true,
  };
  _saveKeys(keys);
  return apiKey;
}

function revokeApiKey(apiKey) {
  const keys = _loadKeys();
  if (keys[apiKey]) {
    keys[apiKey].active = false;
    keys[apiKey].revoked_at = new Date().toISOString();
    _saveKeys(keys);
    return true;
  }
  return false;
}

function validateApiKey(apiKey) {
  const keys = _loadKeys();
  const entry = keys[apiKey];
  if (entry && entry.active) {
    return entry;
  }
  return null;
}

function listApiKeys() {
  const keys = _loadKeys();
  return Object.entries(keys).map(([key, info]) => ({
    api_key: key.substring(0, 8) + '...' + key.slice(-4),
    api_key_full: key,
    tenant_id: info.tenant_id,
    tenant_name: info.tenant_name || '',
    created_at: info.created_at,
    active: info.active !== false,
  }));
}

/**
 * Middleware Express pour valider la clé API dans le header X-API-Key.
 * Ajoute req.tenant avec les infos du tenant.
 */
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      detail: 'Clé API manquante. Ajoutez le header X-API-Key.',
    });
  }
  const tenantInfo = validateApiKey(apiKey);
  if (!tenantInfo) {
    return res.status(403).json({
      detail: 'Clé API invalide ou révoquée.',
    });
  }
  req.tenant = tenantInfo;
  next();
}

export { generateApiKey, revokeApiKey, validateApiKey, listApiKeys, requireApiKey };
