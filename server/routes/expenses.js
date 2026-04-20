const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.expense.findMany({ where: { companyId:req.companyId }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, category, amount, notes, recurring } = req.body; const e = await prisma.expense.create({ data: { companyId:req.companyId, date:new Date(date), category, amount:parseFloat(amount)||0, notes, recurring:recurring||false, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','Expense',e.id,`${category} - ${amount}`); res.status(201).json(e); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Expense', 'expense');
  try { await prisma.expense.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
