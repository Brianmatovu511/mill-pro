const router = require('express').Router();
const prisma = require('../db');
const { authenticate } = require('../middleware/auth');

const CATEGORIES = ['GENERAL', 'BUG', 'FEATURE_REQUEST', 'COMPLAINT', 'OTHER'];

// List my company's feedback
router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.feedback.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch { res.status(500).json({ error: 'Failed to load feedback' }); }
});

// Submit feedback
router.post('/', authenticate, async (req, res) => {
  try {
    const { category, subject, message } = req.body;
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'Subject is required' });
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });
    if (subject.length > 200)        return res.status(400).json({ error: 'Subject too long' });
    if (message.length > 5000)       return res.status(400).json({ error: 'Message too long' });

    const item = await prisma.feedback.create({
      data: {
        companyId: req.companyId,
        userId:    req.user.id,
        userName:  req.user.name,
        userRole:  req.user.role,
        category:  CATEGORIES.includes(category) ? category : 'GENERAL',
        subject:   subject.trim(),
        message:   message.trim(),
      },
    });
    res.status(201).json(item);
  } catch { res.status(500).json({ error: 'Failed to submit feedback' }); }
});

// Delete (only by submitter or owner)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const fb = await prisma.feedback.findUnique({ where: { id: req.params.id } });
    if (!fb || fb.companyId !== req.companyId) return res.status(404).json({ error: 'Feedback not found' });
    if (fb.userId !== req.user.id && req.user.role !== 'OWNER') return res.status(403).json({ error: 'Cannot delete' });
    await prisma.feedback.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed to delete' }); }
});

module.exports = router;
