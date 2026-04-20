const prisma = require('../db');

const submitPending = async (req, res, entity, label) => {
  const action = req.method === 'DELETE' ? 'DELETE' : 'EDIT';
  await prisma.pendingAction.create({
    data: {
      companyId:   req.companyId,
      requestedBy: req.user.id,
      action,
      entity,
      entityId:    req.params.id,
      entityData:  action === 'EDIT' ? req.body : null,
      entityLabel: label || req.params.id,
    },
  });
  const msg = action === 'DELETE'
    ? 'Delete request submitted for owner approval'
    : 'Edit request submitted for owner approval';
  return res.status(202).json({ pending: true, message: msg });
};

module.exports = { submitPending };
