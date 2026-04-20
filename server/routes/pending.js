const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// Map entity names to Prisma operations
const getOps = (entity) => ({
  Employee:  { del: (id) => prisma.employee.delete({ where: { id } }),          upd: (id, d) => prisma.employee.update({ where: { id }, data: { name: d.name, phone: d.phone, role: d.role, active: d.active } }) },
  WorkLog:   { del: (id) => prisma.workLog.delete({ where: { id } }) },
  Payment:   { del: (id) => prisma.payment.delete({ where: { id } }) },
  Batch:     { del: (id) => prisma.productionBatch.delete({ where: { id } }) },
  Purchase:  { del: (id) => prisma.purchase.delete({ where: { id } }) },
  Expense:   { del: (id) => prisma.expense.delete({ where: { id } }) },
  Sale:      { del: (id) => prisma.sale.delete({ where: { id } }) },
  Order:     { del: (id) => prisma.order.delete({ where: { id } }),             upd: (id, d) => { const q=parseFloat(d.quantity)||0, u=parseFloat(d.unitPrice)||0; return prisma.order.update({ where: { id }, data: { customer: d.customer, phone: d.phone, product: d.product, quantity: q, unitPrice: u, total: q*u, status: d.status, notes: d.notes } }); } },
  Customer:  { del: (id) => prisma.customer.delete({ where: { id } }),          upd: (id, d) => prisma.customer.update({ where: { id }, data: { name: d.name, phone: d.phone, email: d.email, address: d.address } }) },
  TaskType:  { del: (id) => prisma.taskType.delete({ where: { id } }),          upd: (id, d) => prisma.taskType.update({ where: { id }, data: { name: d.name, payMode: d.payMode, rate: parseFloat(d.rate)||0, nightBonus: parseFloat(d.nightBonus)||0 } }) },
})[entity];

// List all pending actions for this company (OWNER only)
router.get('/', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    res.json(await prisma.pendingAction.findMany({
      where: { companyId: req.companyId },
      include: {
        requester: { select: { id: true, name: true, role: true } },
        reviewer:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }));
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Count pending (for nav badge)
router.get('/count', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const count = await prisma.pendingAction.count({ where: { companyId: req.companyId, status: 'PENDING' } });
    res.json({ count });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Approve — execute the action
router.put('/:id/approve', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const pa = await prisma.pendingAction.findFirst({ where: { id: req.params.id, companyId: req.companyId, status: 'PENDING' } });
    if (!pa) return res.status(404).json({ error: 'Not found or already reviewed' });

    const ops = getOps(pa.entity);
    if (ops) {
      try {
        if (pa.action === 'DELETE') await ops.del(pa.entityId);
        else if (pa.action === 'EDIT' && ops.upd) await ops.upd(pa.entityId, pa.entityData);
      } catch (e) { console.error('Execute pending:', e.message); }
    }

    await prisma.pendingAction.update({ where: { id: pa.id }, data: { status: 'APPROVED', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNote: req.body.note || null } });
    await logAudit(req.companyId, req.user.id, `APPROVED_${pa.action}`, pa.entity, pa.entityId, pa.entityLabel || '');
    res.json({ message: 'Approved and executed' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed' }); }
});

// Reject — discard the request
router.put('/:id/reject', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const pa = await prisma.pendingAction.findFirst({ where: { id: req.params.id, companyId: req.companyId, status: 'PENDING' } });
    if (!pa) return res.status(404).json({ error: 'Not found or already reviewed' });
    await prisma.pendingAction.update({ where: { id: pa.id }, data: { status: 'REJECTED', reviewedBy: req.user.id, reviewedAt: new Date(), reviewNote: req.body.note || null } });
    await logAudit(req.companyId, req.user.id, `REJECTED_${pa.action}`, pa.entity, pa.entityId, pa.entityLabel || '');
    res.json({ message: 'Rejected' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
