const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
const { computeInventory } = require('../utils/inventory');
router.get('/', authenticate, async (req, res) => { try {
  const cid = req.companyId, now = new Date();
  const wkS = new Date(now); wkS.setDate(now.getDate()-now.getDay()+1); wkS.setHours(0,0,0,0);
  const mS = new Date(now.getFullYear(), now.getMonth(), 1);
  const [ec, wp, ms, me, mp, mpy, po, mb, rwl, rb] = await Promise.all([
    prisma.employee.count({ where: { companyId:cid, active:true } }),
    prisma.payment.aggregate({ where: { companyId:cid, date: { gte:wkS } }, _sum: { amount:true } }),
    prisma.sale.aggregate({ where: { companyId:cid, date: { gte:mS } }, _sum: { total:true } }),
    prisma.expense.aggregate({ where: { companyId:cid, date: { gte:mS } }, _sum: { amount:true } }),
    prisma.purchase.aggregate({ where: { companyId:cid, date: { gte:mS } }, _sum: { totalCost:true } }),
    prisma.payment.aggregate({ where: { companyId:cid, date: { gte:mS } }, _sum: { amount:true } }),
    prisma.order.count({ where: { companyId:cid, status: { notIn:['Completed','Cancelled'] } } }),
    prisma.productionBatch.findMany({ where: { companyId:cid, date: { gte:mS } }, select: { maizeIn:true, flourOut:true } }),
    prisma.workLog.findMany({ where: { companyId:cid }, include: { employee: { select: { name:true } }, taskType: { select: { name:true } } }, orderBy: { createdAt:'desc' }, take:8 }),
    prisma.productionBatch.findMany({ where: { companyId:cid }, orderBy: { createdAt:'desc' }, take:8 }),
  ]);
  const mI=mb.reduce((s,b)=>s+b.maizeIn,0), mF=mb.reduce((s,b)=>s+b.flourOut,0);
  const mSV=ms._sum.total||0, mEV=me._sum.amount||0, mPV=mp._sum.totalCost||0, mPY=mpy._sum.amount||0;
  // Inventory (shared calculation — see utils/inventory.js)
  const inv = await computeInventory(cid);
  // Owed wages
  const [allWL,allPY] = await Promise.all([prisma.workLog.aggregate({ where: { companyId:cid }, _sum: { totalPay:true } }), prisma.payment.aggregate({ where: { companyId:cid }, _sum: { amount:true } })]);
  const owed = (allWL._sum.totalPay||0)-(allPY._sum.amount||0);
  res.json({ employees:ec, weekPayroll:wp._sum.amount||0, monthSales:mSV, netProfit:mSV-mEV-mPV-mPY, yieldRate:mI>0?((mF/mI)*100).toFixed(1):null, pendingOrders:po, inventory:inv, wagesOwed:Math.max(0,owed), recentWorkLogs:rwl, recentBatches:rb });
} catch(e) { console.error(e); res.status(500).json({ error:'Failed' }); } });
module.exports = router;
