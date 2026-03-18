/**
 * Router d'authentification
 */

import { Router } from 'express';
import { createAccessToken, verifyPassword, getPasswordHash } from '../auth.js';

const router = Router();

// Utilisateur par défaut (à remplacer par la BDD)
const _defaultUsers = {
  admin: {
    id: '1',
    username: 'admin',
    email: 'admin@sbi.local',
    full_name: 'Administrateur',
    role: 'admin',
    tenant_id: 'default',
    is_active: true,
    password_hash: getPasswordHash('admin'),
    created_at: '2026-01-01T00:00:00',
    last_login: null,
  },
};

/**
 * POST /login — Connexion utilisateur
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = _defaultUsers[username];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({
      detail: 'Nom d\'utilisateur ou mot de passe incorrect',
    });
  }

  const token = createAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    tenant_id: user.tenant_id,
  });

  return res.json({
    access_token: token,
    token_type: 'bearer',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_id: user.tenant_id,
      is_active: user.is_active,
      created_at: user.created_at,
      last_login: user.last_login,
    },
  });
});

/**
 * POST /logout — Déconnexion (invalidation côté client)
 */
router.post('/logout', (_req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

export default router;
