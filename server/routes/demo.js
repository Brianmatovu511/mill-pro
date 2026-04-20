const router = require('express').Router();
const prisma = require('../db');
const logger = require('../utils/logger');

// POST /api/demo/activity  — one-button write (no auth required)
router.post('/activity', async (req, res, next) => {
  try {
    const maizeKg     = Math.round(80 + Math.random() * 120);        // 80–200 kg
    const flourKg     = Math.round(maizeKg * (0.68 + Math.random() * 0.07)); // 68–75% yield
    const efficiency  = Math.round((flourKg / maizeKg) * 100 * 10) / 10;

    const log = await prisma.millActivityLog.create({
      data: {
        activity:   'production_check',
        maizeKg,
        flourKg,
        efficiency,
        notes: 'Demo button press',
      },
    });

    logger.info('Mill activity logged', { id: log.id, maizeKg, flourKg, efficiency, correlationId: req.correlationId });
    res.status(201).json({ success: true, log });
  } catch (err) {
    next(err);
  }
});

// GET /api/demo/activities  — last 10 activity logs
router.get('/activities', async (req, res, next) => {
  try {
    const logs = await prisma.millActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
