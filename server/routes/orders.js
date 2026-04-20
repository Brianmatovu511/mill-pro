const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.order.findMany({ where: { companyId:req.companyId }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, customer, phone, product, quantity, unitPrice, status, notes } = req.body; const qty=parseFloat(quantity)||0, up=parseFloat(unitPrice)||0; const cnt = await prisma.order.count({ where: { companyId:req.companyId } }); const o = await prisma.order.create({ data: { companyId:req.companyId, orderNo:`ORD-${String(cnt+1).padStart(4,'0')}`, date:new Date(date), customer, phone, product, quantity:qty, unitPrice:up, total:qty*up, status:status||'Pending', notes, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','Order',o.id,customer); res.status(201).json(o); } catch { res.status(500).json({ error:'Failed' }); } });

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Order', req.body.customer || req.params.id);
  try { const { customer, phone, product, quantity, unitPrice, status, notes } = req.body; const qty=parseFloat(quantity)||0, up=parseFloat(unitPrice)||0; const o = await prisma.order.update({ where: { id:req.params.id }, data: { customer, phone, product, quantity:qty, unitPrice:up, total:qty*up, status, notes } }); await logAudit(req.companyId,req.user.id,'UPDATE','Order',o.id,`=> ${status}`); res.json(o); } catch { res.status(500).json({ error:'Failed' }); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Order', 'order');
  try { await prisma.order.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
