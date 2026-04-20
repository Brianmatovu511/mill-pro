const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
router.get('/', authenticate, authorize('OWNER','ADMIN'), async (req, res) => { try { res.json(await prisma.auditLog.findMany({ where: { companyId:req.companyId }, include: { user: { select: { name:true } } }, orderBy: { createdAt:'desc' }, take:500 })); } catch { res.status(500).json({ error:'Failed' }); } });
module.exports = router;
