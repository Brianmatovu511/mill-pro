const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.stockAdjustment.findMany({ where: { companyId:req.companyId }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, itemType, quantity, reason, notes } = req.body; const a = await prisma.stockAdjustment.create({ data: { companyId:req.companyId, date:new Date(date), itemType, quantity:parseFloat(quantity)||0, reason, notes, createdBy:req.user.name } }); await logAudit(req.companyId,req.user.id,'CREATE','StockAdj',a.id,`${itemType}: ${quantity} (${reason})`); res.status(201).json(a); } catch { res.status(500).json({ error:'Failed' }); } });
module.exports = router;
