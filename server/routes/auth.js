const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { logAudit } = require('../utils/audit');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// Generate a unique 6-char company code (uppercase alphanumeric, no confusing chars)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const ensureUniqueCode = async (requested) => {
  if (requested) {
    const clean = requested.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (clean.length < 3) throw new Error('Company code must be at least 3 characters');
    const exists = await prisma.company.findUnique({ where: { code: clean } });
    if (exists) throw new Error('That company code is already taken — choose another');
    return clean;
  }
  // Auto-generate unique code
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = genCode();
    const exists = await prisma.company.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique code — please try again');
};

// Lookup company by code (used on login landing)
router.get('/lookup', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Company code is required' });

    const company = await prisma.company.findUnique({
      where: { code: code.toUpperCase().trim() },
      select: { id: true, name: true, code: true, currency: true },
    });
    if (!company) return res.status(404).json({ error: 'No company found with that code. Please check and try again.' });

    const users = await prisma.user.findMany({
      where: { companyId: company.id, active: true },
      select: { id: true, name: true, role: true, email: true },
    });

    res.json({
      company,
      users: users.map(u => ({ id: u.id, name: u.name, role: u.role, email: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null })),
    });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Company users (kept for backward compatibility)
router.get('/company-users/:companyId', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.params.companyId, active: true },
      select: { id: true, name: true, role: true, email: true },
    });
    res.json(users.map(u => ({ ...u, email: u.email ? u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null })));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Register company
router.post('/register', async (req, res) => {
  try {
    const { companyName, companyPhone, companyAddress, currency, companyCode,
            ownerName, ownerEmail, ownerPassword, adminName, adminEmail, adminPassword } = req.body;

    if (!companyName || !ownerName || !ownerPassword)
      return res.status(400).json({ error: 'Company name, owner name and password are required' });
    if (ownerPassword.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await prisma.company.findFirst({ where: { name: companyName } });
    if (existing) return res.status(409).json({ error: 'A company with that name already exists' });

    let code;
    try { code = await ensureUniqueCode(companyCode); }
    catch (e) { return res.status(409).json({ error: e.message }); }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { code, name: companyName, phone: companyPhone, address: companyAddress, currency: currency || 'UGX' },
      });
      const owner = await tx.user.create({
        data: { companyId: company.id, name: ownerName, email: ownerEmail, passwordHash: await bcrypt.hash(ownerPassword, 12), role: 'OWNER' },
      });
      if (adminName && adminPassword && adminPassword.length >= 8) {
        await tx.user.create({
          data: { companyId: company.id, name: adminName, email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'ADMIN' },
        });
      }
      await tx.taskType.createMany({ data: [
        { companyId: company.id, name: 'Milling Machine',  payMode: 'PER_SHIFT', rate: 18000, nightBonus: 6000 },
        { companyId: company.id, name: 'Offloading',       payMode: 'PER_UNIT',  rate: 500 },
        { companyId: company.id, name: 'Onloading',        payMode: 'PER_UNIT',  rate: 500 },
        { companyId: company.id, name: 'Product Transfer', payMode: 'PER_UNIT',  rate: 350 },
        { companyId: company.id, name: 'Packaging',        payMode: 'PER_UNIT',  rate: 450 },
        { companyId: company.id, name: 'Night Security',   payMode: 'PER_SHIFT', rate: 12000 },
        { companyId: company.id, name: 'Quality Check',    payMode: 'PER_SHIFT', rate: 14000 },
        { companyId: company.id, name: 'Cleaning',         payMode: 'PER_SHIFT', rate: 9000 },
      ]});
      await tx.auditLog.create({ data: { companyId: company.id, userId: owner.id, action: 'REGISTER', entity: 'Company', entityId: company.id, details: companyName } });
      return { company, owner };
    });

    res.status(201).json({
      message: 'Company created successfully',
      companyId: result.company.id,
      companyName: result.company.name,
      companyCode: code,
    });
  } catch (err) {
    console.error('Register:', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login — userId (tile select) OR email + password → JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, userId, password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    if (!userId && !email) return res.status(400).json({ error: 'Select a user account' });

    const where = userId ? { id: userId, active: true } : { email, active: true };
    const user = await prisma.user.findFirst({ where, include: { company: true } });
    if (!user) return res.status(401).json({ error: 'User not found or account is inactive' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = jwt.sign({ userId: user.id, companyId: user.companyId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    await logAudit(user.companyId, user.id, 'LOGIN', 'Session', null, 'Password login', req.ip);

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        companyId: user.companyId, companyName: user.company.name,
        companyCurrency: user.company.currency, companyLogo: user.company.logo,
        companyCode: user.company.code,
      },
    });
  } catch (err) {
    console.error('Login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current user
router.get('/me', authenticate, (req, res) => {
  const { passwordHash: _pw, ...u } = req.user;
  res.json({ ...u, companyName: req.user.company.name, companyCurrency: req.user.company.currency, companyLogo: req.user.company.logo, companyCode: req.user.company.code });
});

module.exports = router;
