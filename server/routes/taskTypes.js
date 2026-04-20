const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.taskType.findMany({ where: { companyId: req.companyId }, orderBy: { name:'asc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { name, payMode, rate, nightBonus } = req.body; const t = await prisma.taskType.create({ data: { companyId:req.companyId, name, payMode, rate:parseFloat(rate)||0, nightBonus:parseFloat(nightBonus)||0 } }); await logAudit(req.companyId,req.user.id,'CREATE','TaskType',t.id,name); res.status(201).json(t); } catch { res.status(500).json({ error:'Failed' }); } });

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'TaskType', req.body.name || req.params.id);
  try { const { name, payMode, rate, nightBonus } = req.body; res.json(await prisma.taskType.update({ where: { id:req.params.id }, data: { name, payMode, rate:parseFloat(rate)||0, nightBonus:parseFloat(nightBonus)||0 } })); } catch { res.status(500).json({ error:'Failed' }); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'TaskType', 'task type');
  try { await prisma.taskType.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
