const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

// Monthly summary — last 6 months
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const cid = req.companyId;
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = start.toLocaleDateString('en', { month: 'short', year: '2-digit' });

      const [sa, pa, ea, pya, ba] = await Promise.all([
        prisma.sale.aggregate({ where: { companyId: cid, date: { gte: start, lte: end } }, _sum: { total: true } }),
        prisma.purchase.aggregate({ where: { companyId: cid, date: { gte: start, lte: end } }, _sum: { totalCost: true } }),
        prisma.expense.aggregate({ where: { companyId: cid, date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { companyId: cid, date: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.productionBatch.aggregate({ where: { companyId: cid, date: { gte: start, lte: end } }, _sum: { maizeIn: true, flourOut: true } }),
      ]);

      const revenue = sa._sum.total || 0;
      const costs   = (pa._sum.totalCost || 0) + (ea._sum.amount || 0) + (pya._sum.amount || 0);
      const maizeIn = ba._sum.maizeIn || 0;
      const flourOut = ba._sum.flourOut || 0;

      months.push({
        label,
        revenue,
        costs,
        profit: revenue - costs,
        maizeIn,
        flourOut,
        yield: maizeIn > 0 ? Math.round((flourOut / maizeIn) * 100 * 10) / 10 : 0,
      });
    }

    res.json({ months });
  } catch (e) {
    console.error('Reports/monthly:', e);
    res.status(500).json({ error: 'Failed' });
  }
});

// Top customers by total revenue
router.get('/customers', authenticate, async (req, res) => {
  try {
    const cid = req.companyId;
    const rows = await prisma.sale.groupBy({
      by: ['customer'],
      where: { companyId: cid },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });
    res.json({ customers: rows.map(r => ({ name: r.customer, revenue: r._sum.total || 0, orders: r._count.id })) });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Top employees by total earnings
router.get('/employees', authenticate, async (req, res) => {
  try {
    const cid = req.companyId;
    const rows = await prisma.workLog.groupBy({
      by: ['employeeId'],
      where: { companyId: cid },
      _sum: { totalPay: true },
      _count: { id: true },
      orderBy: { _sum: { totalPay: 'desc' } },
      take: 10,
    });
    const empIds = rows.map(r => r.employeeId);
    const emps = await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true, role: true } });
    const em = Object.fromEntries(emps.map(e => [e.id, e]));
    res.json({ employees: rows.map(r => ({ ...(em[r.employeeId] || { name: 'Unknown' }), earned: r._sum.totalPay || 0, tasks: r._count.id })) });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// Expense breakdown by category
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const cid = req.companyId;
    const { from, to } = req.query;
    const df = {};
    if (from) df.gte = new Date(from);
    if (to)   df.lte = new Date(to);
    const w = from || to ? { date: df } : {};
    const rows = await prisma.expense.groupBy({
      by: ['category'],
      where: { companyId: cid, ...w },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    res.json({ expenses: rows.map(r => ({ category: r.category, amount: r._sum.amount || 0 })) });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
