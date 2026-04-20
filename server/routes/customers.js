const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.customer.findMany({ where: { companyId:req.companyId }, orderBy: { name:'asc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { name, phone, email, address } = req.body; res.status(201).json(await prisma.customer.create({ data: { companyId:req.companyId, name, phone, email, address } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Customer', req.body.name || req.params.id);
  try { const { name, phone, email, address } = req.body; res.json(await prisma.customer.update({ where: { id:req.params.id }, data: { name, phone, email, address } })); } catch { res.status(500).json({ error:'Failed' }); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Customer', 'customer');
  try { await prisma.customer.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
