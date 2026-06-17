const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { jwt: jwtConfig } = require('../config');

const requireSuperAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const decoded = jwt.verify(header.split(' ')[1], jwtConfig.secret);
    if (decoded.type !== 'super') return res.status(403).json({ error: 'Super admin access required' });
    const admin = await prisma.superAdmin.findUnique({ where: { id: decoded.adminId } });
    if (!admin?.active) return res.status(401).json({ error: 'Account inactive' });
    req.superAdmin = admin;
    next();
  } catch (err) {
    res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token' });
  }
};

module.exports = { requireSuperAdmin };
