const bcrypt = require('bcryptjs');
const prisma = require('../db');
const logger = require('./logger');

async function ensureSuperAdmin() {
  try {
    const count = await prisma.superAdmin.count();
    if (count > 0) return;

    const email    = process.env.SUPER_ADMIN_EMAIL    || 'admin@millpro.app';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'MillProAdmin@2026!';
    const name     = process.env.SUPER_ADMIN_NAME     || 'MillPro Administrator';

    await prisma.superAdmin.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });

    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.warn('  Super Admin account created');
    logger.warn(`  Email:    ${email}`);
    logger.warn(`  Password: ${password}`);
    logger.warn('  Visit /super to sign in. Change credentials immediately.');
    logger.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    logger.error('Failed to seed super admin', { error: err.message });
  }
}

module.exports = { ensureSuperAdmin };
