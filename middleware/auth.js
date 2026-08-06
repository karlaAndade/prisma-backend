// middleware/auth.js
const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado. Iniciá sesión de nuevo.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

// Verifica el token SOLO si la petición pide ?all=1, sin usar next().
// Devuelve true si puede seguir, false si ya mandó una respuesta de error.
function checkAdminIfAll(req, res) {
  if (!req.query.all) return true;

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No autorizado. Iniciá sesión de nuevo.' });
    return false;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch (err) {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
    return false;
  }
}

module.exports = { requireAdmin, checkAdminIfAll };