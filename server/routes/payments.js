const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { const { employeeId, from, to } = req.query; const w = { companyId:req.companyId }; if(employeeId) w.employeeId=employeeId; if(from||to) { w.date={}; if(from) w.date.gte=new Date(from); if(to) w.date.lte=new Date(to); } res.json(await prisma.payment.findMany({ where:w, include: { employee: { select: { name:true } } }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { employeeId, date, amount, method, type, notes } = req.body; const p = await prisma.payment.create({ data: { companyId:req.companyId, employeeId, date:new Date(date), amount:parseFloat(amount)||0, method:method||'Cash', type:type||'WEEKLY', notes, createdBy:req.user.name }, include: { employee: { select: { name:true } } } }); await logAudit(req.companyId,req.user.id,'CREATE','Payment',p.id,`${p.employee.name} - ${amount}`); res.status(201).json(p); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Payment', 'payment');
  try { await prisma.payment.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
