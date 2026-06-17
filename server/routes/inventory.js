const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { computeInventory } = require('../utils/inventory');

router.get('/', authenticate, async (req, res) => {
  try {
    res.json(await computeInventory(req.companyId));
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
