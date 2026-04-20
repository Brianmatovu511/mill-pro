const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.purchase.findMany({ where: { companyId:req.companyId }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, supplier, itemType, quantity, unit, unitCost, notes } = req.body; const qty=parseFloat(quantity)||0, uc=parseFloat(unitCost)||0; const p = await prisma.purchase.create({ data: { companyId:req.companyId, date:new Date(date), supplier, itemType:itemType||'MAIZE', quantity:qty, unit:unit||'kg', unitCost:uc, totalCost:qty*uc, notes, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','Purchase',p.id,`${itemType} - ${qty}`); res.status(201).json(p); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Purchase', 'purchase');
  try { await prisma.purchase.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
