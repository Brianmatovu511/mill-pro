const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');
const { num, dateRangeWhere } = require('../utils/query');

router.get('/', authenticate, async (req, res) => { try { const { from, to } = req.query; const w = { companyId:req.companyId, ...dateRangeWhere(from, to) }; res.json(await prisma.productionBatch.findMany({ where:w, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, maizeIn, flourOut, branOut, wasteKg, shift, machine, fuelCost, packagingUsed, notes } = req.body; const count = await prisma.productionBatch.count({ where: { companyId:req.companyId } }); const b = await prisma.productionBatch.create({ data: { companyId:req.companyId, batchNumber:`B${String(count+1).padStart(4,'0')}`, date:new Date(date), maizeIn:num(maizeIn), flourOut:num(flourOut), branOut:num(branOut), wasteKg:num(wasteKg), shift, machine, fuelCost:num(fuelCost), packagingUsed:num(packagingUsed), notes, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','Batch',b.id,`${maizeIn}kg => ${flourOut}kg`); res.status(201).json(b); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Batch', 'batch');
  try { await prisma.productionBatch.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
