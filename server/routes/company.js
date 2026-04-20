const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.company.findUnique({ where: { id: req.companyId } })); } catch { res.status(500).json({ error: 'Failed' }); } });
router.put('/', authenticate, authorize('OWNER','ADMIN'), async (req, res) => { try { const { name, phone, address, currency } = req.body; res.json(await prisma.company.update({ where: { id: req.companyId }, data: { name, phone, address, currency } })); } catch { res.status(500).json({ error: 'Failed' }); } });
module.exports = router;
