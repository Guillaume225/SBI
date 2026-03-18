/**
 * Router pour la gestion des utilisateurs
 */

import { Router } from 'express';
import { requireAuth, getPasswordHash } from '../auth.js';

const router = Router();

// Stockage en mémoire (à remplacer par BDD)
const _users = {};

/**
 * GET / — Liste des utilisateurs
 */
router.get('/', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Accès non autorisé' });
  }
  res.json(Object.values(_users));
});

/**
 * POST / — Créer un nouvel utilisateur
 */
router.post('/', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Accès non autorisé' });
  }
  // TODO: Stocker en BDD
  res.status(201).json({ message: 'Utilisateur créé' });
});

/**
 * GET /me — Informations de l'utilisateur connecté
 */
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

/**
 * PUT /:user_id — Modifier un utilisateur
 */
router.put('/:user_id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Accès non autorisé' });
  }
  res.json({ message: `Utilisateur ${req.params.user_id} modifié` });
});

/**
 * DELETE /:user_id — Supprimer un utilisateur
 */
router.delete('/:user_id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Accès non autorisé' });
  }
  res.json({ message: `Utilisateur ${req.params.user_id} supprimé` });
});

export default router;
