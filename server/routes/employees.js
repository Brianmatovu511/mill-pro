const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.employee.findMany({ where: { companyId: req.companyId }, orderBy: { name:'asc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { name, phone, role, active } = req.body; const e = await prisma.employee.create({ data: { companyId:req.companyId, name, phone, role, active:active!==false } }); await logAudit(req.companyId,req.user.id,'CREATE','Employee',e.id,name); res.status(201).json(e); } catch { res.status(500).json({ error:'Failed' }); } });

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Employee', req.body.name || req.params.id);
  try { const { name, phone, role, active } = req.body; res.json(await prisma.employee.update({ where: { id:req.params.id }, data: { name, phone, role, active } })); } catch { res.status(500).json({ error:'Failed' }); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Employee', 'employee');
  try { await prisma.employee.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

router.get('/:id/statement', authenticate, async (req, res) => { try { const { from, to } = req.query; const df = {}; if(from) df.gte = new Date(from); if(to) df.lte = new Date(to); const w = from||to ? { date:df } : {}; const [wl,py] = await Promise.all([prisma.workLog.findMany({ where: { employeeId:req.params.id, companyId:req.companyId, ...w }, include: { taskType: { select: { name:true } } }, orderBy: { date:'desc' } }), prisma.payment.findMany({ where: { employeeId:req.params.id, companyId:req.companyId, ...w }, orderBy: { date:'desc' } })]); const te=wl.reduce((s,x)=>s+x.totalPay,0), tp=py.reduce((s,x)=>s+x.amount,0); res.json({ workLogs:wl, payments:py, totalEarned:te, totalPaid:tp, balance:te-tp }); } catch { res.status(500).json({ error:'Failed' }); } });

module.exports = router;
