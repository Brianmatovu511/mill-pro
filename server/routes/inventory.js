const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');
router.get('/', authenticate, async (req, res) => { try {
  const cid = req.companyId;
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
  res.json(inv);
} catch { res.status(500).json({ error:'Failed' }); } });
module.exports = router;
