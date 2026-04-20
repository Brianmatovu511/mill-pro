const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { const { employeeId, taskTypeId, from, to } = req.query; const w = { companyId:req.companyId }; if(employeeId) w.employeeId=employeeId; if(taskTypeId) w.taskTypeId=taskTypeId; if(from||to) { w.date={}; if(from) w.date.gte=new Date(from); if(to) w.date.lte=new Date(to); } res.json(await prisma.workLog.findMany({ where:w, include: { employee: { select: { name:true } }, taskType: { select: { name:true,payMode:true } } }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { employeeId, taskTypeId, date, shift, quantity, hours, notes } = req.body; const tt = await prisma.taskType.findFirst({ where: { id:taskTypeId, companyId:req.companyId } }); if(!tt) return res.status(400).json({ error:'Invalid task type' }); let pay=0; if(tt.payMode==='PER_UNIT') pay=(parseFloat(quantity)||0)*tt.rate; else if(tt.payMode==='PER_HOUR') pay=(parseFloat(hours)||0)*tt.rate; else pay=tt.rate; if(shift==='Night') pay+=tt.nightBonus||0; const wl = await prisma.workLog.create({ data: { companyId:req.companyId, employeeId, taskTypeId, date:new Date(date), shift:shift||'Day', quantity:parseFloat(quantity)||0, hours:parseFloat(hours)||0, totalPay:pay, notes, createdBy:req.user.name }, include: { employee: { select: { name:true } }, taskType: { select: { name:true } } } }); await logAudit(req.companyId,req.user.id,'CREATE','WorkLog',wl.id,`${wl.employee.name} - ${wl.taskType.name} - ${pay}`); res.status(201).json(wl); } catch(e) { console.error(e); res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'WorkLog', 'work log');
  try { await prisma.workLog.delete({ where: { id:req.params.id } }); await logAudit(req.companyId,req.user.id,'DELETE','WorkLog',req.params.id,''); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
