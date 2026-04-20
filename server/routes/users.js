const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// OWNER only — list users
router.get('/', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    res.json(await prisma.user.findMany({
      where: { companyId: req.companyId },
      select: { id:true, name:true, email:true, phone:true, role:true, active:true, lastLogin:true, createdAt:true },
      orderBy: { createdAt: 'asc' },
    }));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// OWNER only — create user
router.post('/', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const u = await prisma.user.create({
      data: { companyId: req.companyId, name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: role || 'SUPERVISOR' },
      select: { id:true, name:true, email:true, role:true },
    });
    await logAudit(req.companyId, req.user.id, 'CREATE', 'User', u.id, name);
    res.status(201).json(u);
  } catch(e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed' });
  }
});

// OWNER only — update user (name, email, role, active, password)
router.put('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { name, email, phone, role, active, password } = req.body;
    const data = {};
    if (name     !== undefined) data.name   = name;
    if (email    !== undefined) data.email  = email;
    if (phone    !== undefined) data.phone  = phone;
    if (role     !== undefined) data.role   = role;
    if (active   !== undefined) data.active = active;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    res.json(await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id:true, name:true, email:true, role:true, active:true },
    }));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// OWNER only — delete user
router.delete('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
