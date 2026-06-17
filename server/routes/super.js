const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { requireSuperAdmin } = require('../middleware/superAuth');
const logger = require('../utils/logger');
const { ensureUniqueCode } = require('../utils/companyCode');
const { jwt: jwtConfig, bcryptRounds } = require('../config');

// ─── Auth ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const admin = await prisma.superAdmin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!admin?.active) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    await prisma.superAdmin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
    const token = jwt.sign({ adminId: admin.id, type: 'super' }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    logger.error('Super login failed', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireSuperAdmin, (req, res) => {
  const { passwordHash: _pw, ...a } = req.superAdmin;
  res.json(a);
});

router.put('/me/password', requireSuperAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const ok = await bcrypt.compare(currentPassword, req.superAdmin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
  await prisma.superAdmin.update({ where: { id: req.superAdmin.id }, data: { passwordHash: await bcrypt.hash(newPassword, bcryptRounds) } });
  res.json({ ok: true });
});

// ─── Platform Overview ────────────────────────────
router.get('/overview', requireSuperAdmin, async (_req, res) => {
  try {
    const [totalCompanies, activeCompanies, blockedCompanies, totalUsers, totalEmployees, totalBatches, totalSales, totalFeedback, openFeedback, recentCompanies, recentLogins] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.company.count({ where: { status: 'BLOCKED' } }),
      prisma.user.count({ where: { active: true } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.productionBatch.count(),
      prisma.sale.count(),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'OPEN' } }),
      prisma.company.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, code: true, createdAt: true, status: true } }),
      prisma.user.findMany({ where: { lastLogin: { not: null } }, orderBy: { lastLogin: 'desc' }, take: 8, select: { id: true, name: true, email: true, role: true, lastLogin: true, company: { select: { name: true, code: true } } } }),
    ]);
    // Companies grouped by month (last 6 months)
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0,0,0,0);
    const cs = await prisma.company.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
    const buckets = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); d.setDate(1);
      buckets[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0;
    }
    cs.forEach(c => {
      const k = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth()+1).padStart(2,'0')}`;
      if (k in buckets) buckets[k]++;
    });
    const growth = Object.entries(buckets).map(([month, count]) => ({ month, count }));

    res.json({
      counts: { totalCompanies, activeCompanies, blockedCompanies, totalUsers, totalEmployees, totalBatches, totalSales, totalFeedback, openFeedback },
      growth,
      recentCompanies,
      recentLogins,
    });
  } catch (err) {
    logger.error('Super overview failed', { error: err.message });
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

// ─── Companies CRUD ───────────────────────────────
router.get('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && ['ACTIVE','BLOCKED'].includes(status)) where.status = status;
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q.toUpperCase() } }];
    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, employees: true, batches: true, sales: true, feedback: true } } },
    });
    res.json(companies);
  } catch (err) {
    logger.error('Super list companies', { error: err.message });
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

router.get('/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, name: true, email: true, phone: true, role: true, active: true, lastLogin: true, createdAt: true } },
        _count: { select: { users: true, employees: true, batches: true, sales: true, purchases: true, expenses: true, customers: true, orders: true, feedback: true } },
      },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const recentFeedback = await prisma.feedback.findMany({ where: { companyId: company.id }, orderBy: { createdAt: 'desc' }, take: 5 });
    res.json({ ...company, recentFeedback });
  } catch (err) {
    logger.error('Super get company', { error: err.message });
    res.status(500).json({ error: 'Failed to load company' });
  }
});

router.post('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const { companyName, companyPhone, companyAddress, currency, companyCode,
            ownerName, ownerEmail, ownerPassword, adminName, adminEmail, adminPassword } = req.body;
    if (!companyName || !ownerName || !ownerPassword || ownerPassword.length < 8)
      return res.status(400).json({ error: 'Company name, owner name, and 8+ char password are required' });

    let code;
    try { code = await ensureUniqueCode(companyCode); }
    catch (e) { return res.status(409).json({ error: e.message }); }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { code, name: companyName, phone: companyPhone, address: companyAddress, currency: currency || 'UGX' },
      });
      await tx.user.create({
        data: { companyId: company.id, name: ownerName, email: ownerEmail, passwordHash: await bcrypt.hash(ownerPassword, bcryptRounds), role: 'OWNER' },
      });
      if (adminName && adminPassword && adminPassword.length >= 8) {
        await tx.user.create({
          data: { companyId: company.id, name: adminName, email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, bcryptRounds), role: 'ADMIN' },
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
      return company;
    });
    res.status(201).json({ id: result.id, name: result.name, code: result.code });
  } catch (err) {
    logger.error('Super create company', { error: err.message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email or code already in use' });
    res.status(500).json({ error: 'Failed to create company' });
  }
});

router.patch('/companies/:id/status', requireSuperAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['ACTIVE','BLOCKED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: {
        status,
        blockedAt:    status === 'BLOCKED' ? new Date() : null,
        blockedReason: status === 'BLOCKED' ? (reason || null) : null,
      },
    });
    res.json({ id: company.id, status: company.status });
  } catch (err) {
    logger.error('Super toggle status', { error: err.message });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/companies/:id', requireSuperAdmin, async (req, res) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    logger.error('Super delete company', { error: err.message });
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// ─── User Password Reset (any user in any company) ──
router.post('/users/:id/reset-password', requireSuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash: await bcrypt.hash(newPassword, bcryptRounds) },
      select: { id: true, name: true, email: true },
    });
    res.json({ ok: true, user });
  } catch (err) {
    logger.error('Super reset password', { error: err.message });
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── Feedback Inbox ──────────────────────────────
router.get('/feedback', requireSuperAdmin, async (req, res) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status && ['OPEN','IN_PROGRESS','RESOLVED','DISMISSED'].includes(status)) where.status = status;
    if (q) where.OR = [{ subject: { contains: q, mode: 'insensitive' } }, { message: { contains: q, mode: 'insensitive' } }];
    const items = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true, code: true } } },
    });
    res.json(items);
  } catch (err) {
    logger.error('Super list feedback', { error: err.message });
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

router.patch('/feedback/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { status, response } = req.body;
    const data = {};
    if (status && ['OPEN','IN_PROGRESS','RESOLVED','DISMISSED'].includes(status)) data.status = status;
    if (response !== undefined) {
      data.response = response;
      data.respondedAt = new Date();
      data.respondedBy = req.superAdmin.id;
    }
    const updated = await prisma.feedback.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    logger.error('Super update feedback', { error: err.message });
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

module.exports = router;
