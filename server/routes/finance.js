const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
router.get('/', authenticate, authorize('OWNER','ADMIN'), async (req, res) => { try {
  const { from, to } = req.query; const cid = req.companyId;
  const df = {}; if(from) df.gte = new Date(from); if(to) df.lte = new Date(to);
  const w = from||to ? { date:df } : {};
  const [sa,pa,ea,pya,ba,ebc] = await Promise.all([
    prisma.sale.aggregate({ where: { companyId:cid, ...w }, _sum: { total:true } }),
    prisma.purchase.aggregate({ where: { companyId:cid, ...w }, _sum: { totalCost:true } }),
    prisma.expense.aggregate({ where: { companyId:cid, ...w }, _sum: { amount:true } }),
    prisma.payment.aggregate({ where: { companyId:cid, ...w }, _sum: { amount:true } }),
    prisma.productionBatch.findMany({ where: { companyId:cid, ...w }, select: { maizeIn:true, flourOut:true } }),
    prisma.expense.groupBy({ by:['category'], where: { companyId:cid, ...w }, _sum: { amount:true }, orderBy: { _sum: { amount:'desc' } } }),
  ]);
  const rev=sa._sum.total||0, pur=pa._sum.totalCost||0, exp=ea._sum.amount||0, lab=pya._sum.amount||0, tc=pur+exp+lab;
  const bI=ba.reduce((s,b)=>s+b.maizeIn,0), bO=ba.reduce((s,b)=>s+b.flourOut,0);
  res.json({ revenue:rev, purchases:pur, expenses:exp, labour:lab, totalCosts:tc, netProfit:rev-tc, margin:rev>0?Math.round(((rev-tc)/rev)*100):0, yieldRate:bI>0?((bO/bI)*100).toFixed(1):null, maizeIn:bI, flourOut:bO, expensesByCategory:ebc.map(e=>({ category:e.category, amount:e._sum.amount })) });
} catch { res.status(500).json({ error:'Failed' }); } });
module.exports = router;
