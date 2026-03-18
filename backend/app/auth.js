/**
 * Authentification JWT pour SBI
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import settings from './config.js';

/**
 * Vérifie un mot de passe en clair contre un hash bcrypt.
 */
function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compareSync(plainPassword, hashedPassword);
}

/**
 * Hash un mot de passe avec bcrypt.
 */
function getPasswordHash(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * Crée un token JWT.
 */
function createAccessToken(data, expiresInMinutes) {
  const exp = expiresInMinutes || settings.ACCESS_TOKEN_EXPIRE_MINUTES;
  return jwt.sign(data, settings.SECRET_KEY, {
    algorithm: settings.ALGORITHM,
    expiresIn: `${exp}m`,
  });
}

/**
 * Middleware Express pour protéger les routes avec JWT.
 * Ajoute req.user avec le payload décodé.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      detail: 'Identifiants invalides',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, settings.SECRET_KEY, {
      algorithms: [settings.ALGORITHM],
    });
    req.user = {
      user_id: payload.sub,
      tenant_id: payload.tenant_id,
      ...payload,
    };
    next();
  } catch {
    return res.status(401).json({
      detail: 'Identifiants invalides',
    });
  }
}

export { verifyPassword, getPasswordHash, createAccessToken, requireAuth };
