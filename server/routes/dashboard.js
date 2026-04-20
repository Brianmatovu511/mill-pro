const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
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
  // Inventory
  const [tp,tb,tsi,tadj] = await Promise.all([
    prisma.purchase.findMany({ where: { companyId:cid }, select: { itemType:true, quantity:true } }),
    prisma.productionBatch.findMany({ where: { companyId:cid }, select: { maizeIn:true, flourOut:true, branOut:true } }),
    prisma.saleItem.findMany({ where: { sale: { companyId:cid } }, select: { itemType:true, quantity:true } }),
    prisma.stockAdjustment.findMany({ where: { companyId:cid }, select: { itemType:true, quantity:true } }),
  ]);
  const inv = { RAW_MAIZE:0, FLOUR:0, BRAN:0, PACKAGING:0 };
  tp.forEach(p=>{ if(p.itemType==='MAIZE') inv.RAW_MAIZE+=p.quantity; else if(p.itemType==='PACKAGING') inv.PACKAGING+=p.quantity; });
  tb.forEach(b=>{ inv.RAW_MAIZE-=b.maizeIn; inv.FLOUR+=b.flourOut; inv.BRAN+=b.branOut; });
  tsi.forEach(i=>{ if(i.itemType==='FLOUR') inv.FLOUR-=i.quantity; else if(i.itemType==='BRAN') inv.BRAN-=i.quantity; });
  tadj.forEach(a=>{ if(inv[a.itemType]!==undefined) inv[a.itemType]+=a.quantity; });
  // Owed wages
  const [allWL,allPY] = await Promise.all([prisma.workLog.aggregate({ where: { companyId:cid }, _sum: { totalPay:true } }), prisma.payment.aggregate({ where: { companyId:cid }, _sum: { amount:true } })]);
  const owed = (allWL._sum.totalPay||0)-(allPY._sum.amount||0);
  res.json({ employees:ec, weekPayroll:wp._sum.amount||0, monthSales:mSV, netProfit:mSV-mEV-mPV-mPY, yieldRate:mI>0?((mF/mI)*100).toFixed(1):null, pendingOrders:po, inventory:inv, wagesOwed:Math.max(0,owed), recentWorkLogs:rwl, recentBatches:rb });
} catch(e) { console.error(e); res.status(500).json({ error:'Failed' }); } });
module.exports = router;
