const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
router.get('/export', authenticate, authorize('OWNER','ADMIN'), async (req, res) => { try {
  const cid = req.companyId;
  const [co,us,em,tt,wl,py,ba,pu,ex,sl,od,cu,sa] = await Promise.all([
    prisma.company.findUnique({ where: { id:cid } }), prisma.user.findMany({ where: { companyId:cid }, select: { id:true,name:true,email:true,phone:true,role:true } }),
    prisma.employee.findMany({ where: { companyId:cid } }), prisma.taskType.findMany({ where: { companyId:cid } }),
    prisma.workLog.findMany({ where: { companyId:cid } }), prisma.payment.findMany({ where: { companyId:cid } }),
    prisma.productionBatch.findMany({ where: { companyId:cid } }), prisma.purchase.findMany({ where: { companyId:cid } }),
    prisma.expense.findMany({ where: { companyId:cid } }), prisma.sale.findMany({ where: { companyId:cid }, include: { items:true } }),
    prisma.order.findMany({ where: { companyId:cid } }), prisma.customer.findMany({ where: { companyId:cid } }),
    prisma.stockAdjustment.findMany({ where: { companyId:cid } }),
  ]);
  res.json({ version:'2.1', exportedAt:new Date().toISOString(), company:co, users:us, employees:em, taskTypes:tt, workLogs:wl, payments:py, batches:ba, purchases:pu, expenses:ex, sales:sl, orders:od, customers:cu, stockAdjustments:sa });
} catch { res.status(500).json({ error:'Failed' }); } });
module.exports = router;
