const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'barbercut_secret_2026';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Solo administradores' });
    next();
  });
}

function requireWorker(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin','trabajador'].includes(req.user.role))
      return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

module.exports = { signToken, verifyToken, requireAuth, requireAdmin, requireWorker };
