const jwt = require('jsonwebtoken');
const prisma = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this';

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { company: true } });
    if (!user?.active) return res.status(401).json({ error: 'Account inactive' });
    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch (err) {
    res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  // OWNER always has full access
  if (req.user.role === 'OWNER') return next();
  // SUPERVISOR is read-only — block all write methods
  if (req.user.role === 'SUPERVISOR' && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    return res.status(403).json({ error: 'Supervisors have read-only access' });
  }
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

module.exports = { authenticate, authorize };
