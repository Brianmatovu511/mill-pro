const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { const { from, to } = req.query; const w = { companyId:req.companyId }; if(from||to) { w.date={}; if(from) w.date.gte=new Date(from); if(to) w.date.lte=new Date(to); } res.json(await prisma.productionBatch.findMany({ where:w, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, maizeIn, flourOut, branOut, wasteKg, shift, machine, fuelCost, packagingUsed, notes } = req.body; const count = await prisma.productionBatch.count({ where: { companyId:req.companyId } }); const b = await prisma.productionBatch.create({ data: { companyId:req.companyId, batchNumber:`B${String(count+1).padStart(4,'0')}`, date:new Date(date), maizeIn:parseFloat(maizeIn)||0, flourOut:parseFloat(flourOut)||0, branOut:parseFloat(branOut)||0, wasteKg:parseFloat(wasteKg)||0, shift, machine, fuelCost:parseFloat(fuelCost)||0, packagingUsed:parseFloat(packagingUsed)||0, notes, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','Batch',b.id,`${maizeIn}kg => ${flourOut}kg`); res.status(201).json(b); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Batch', 'batch');
  try { await prisma.productionBatch.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
