const prisma = require('../db');

const logAudit = async (companyId, userId, action, entity, entityId, details, ipAddress) => {
  try {
    await prisma.auditLog.create({
      data: { companyId, userId, action, entity, entityId, details: details?.slice(0, 500), ipAddress }
    });
  } catch (e) {
    console.error('[AUDIT]', e.message);
  }
};

module.exports = { logAudit };
