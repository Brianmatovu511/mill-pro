const router = require('express').Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

// List invoices for the company (newest first)
router.get('/', authenticate, async (req, res) => {
  try {
    const list = await prisma.invoice.findMany({
      where: { companyId: req.companyId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to load invoices' }); }
});

// Single invoice (with company for document rendering)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId }, include: { items: true } });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    res.json({ ...inv, company });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Create an invoice
router.post('/', authenticate, authorize('ADMIN', 'OWNER'), async (req, res) => {
  try {
    const { customer, customerPhone, customerAddress, date, dueDate, status, taxRate, notes, items } = req.body;
    if (!customer || !String(customer).trim()) return res.status(400).json({ error: 'Customer is required' });

    const lineItems = (items || []).map(i => {
      const quantity = parseFloat(i.quantity) || 0;
      const unitPrice = parseFloat(i.unitPrice) || 0;
      return { description: (i.description || 'Item').slice(0, 200), quantity, unitPrice, lineTotal: quantity * unitPrice };
    }).filter(i => i.quantity > 0 || i.unitPrice > 0);
    if (!lineItems.length) return res.status(400).json({ error: 'At least one item is required' });

    const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
    const rate = parseFloat(taxRate) || 0;
    const total = subtotal + (subtotal * rate) / 100;
    const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const invoice = await prisma.invoice.create({
      data: {
        companyId: req.companyId, invoiceNo, customer: String(customer).trim(),
        customerPhone: customerPhone || null, customerAddress: customerAddress || null,
        date: date ? new Date(date) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: ['UNPAID', 'PAID', 'OVERDUE'].includes(status) ? status : 'UNPAID',
        taxRate: rate, subtotal, total, notes: notes || null, createdBy: req.user.name,
        items: { create: lineItems },
      },
      include: { items: true },
    });

    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    await logAudit(req.companyId, req.user.id, 'CREATE', 'Invoice', invoice.id, `${customer} - ${total}`);
    res.status(201).json({ ...invoice, company });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create invoice' }); }
});

// Delete an invoice
router.delete('/:id', authenticate, authorize('ADMIN', 'OWNER'), async (req, res) => {
  try {
    const inv = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!inv) return res.status(404).json({ error: 'Not found' });
    await prisma.invoice.delete({ where: { id: req.params.id } });
    await logAudit(req.companyId, req.user.id, 'DELETE', 'Invoice', req.params.id, inv.invoiceNo);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
