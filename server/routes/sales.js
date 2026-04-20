const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { submitPending } = require('../utils/pending');

router.get('/', authenticate, async (req, res) => { try { res.json(await prisma.sale.findMany({ where: { companyId:req.companyId }, include: { items:true }, orderBy: { date:'desc' } })); } catch { res.status(500).json({ error:'Failed' }); } });

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => { try { const { date, customer, phone, payMethod, items, notes, paidAmount } = req.body; const rcpt = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`; const si = (items||[]).map(i=>({ itemType:i.type||'FLOUR', quantity:parseFloat(i.qty)||0, unitPrice:parseFloat(i.unitPrice)||0, lineTotal:(parseFloat(i.qty)||0)*(parseFloat(i.unitPrice)||0) })); const total = si.reduce((s,i)=>s+i.lineTotal,0); const sale = await prisma.sale.create({ data: { companyId:req.companyId, date:new Date(date), customer, phone, receiptNo:rcpt, payMethod:payMethod||'Cash', total, paidAmount:parseFloat(paidAmount)||total, notes, createdBy:req.user.name, items: { create:si } }, include: { items:true } }); await logAudit(req.companyId,req.user.id,'CREATE','Sale',sale.id,`${customer} - ${total}`); res.status(201).json(sale); } catch(e) { console.error(e); res.status(500).json({ error:'Failed' }); } });

router.get('/:id/receipt', authenticate, async (req, res) => { try { const s = await prisma.sale.findFirst({ where: { id:req.params.id, companyId:req.companyId }, include: { items:true } }); const co = await prisma.company.findUnique({ where: { id:req.companyId } }); if(!s) return res.status(404).json({ error:'Not found' }); res.json({ ...s, company:co }); } catch { res.status(500).json({ error:'Failed' }); } });

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  if (req.user.role === 'ADMIN') return submitPending(req, res, 'Sale', 'sale');
  try { await prisma.sale.delete({ where: { id:req.params.id } }); res.json({ message:'Deleted' }); } catch { res.status(500).json({ error:'Failed' }); }
});

module.exports = router;
