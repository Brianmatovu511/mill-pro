const bcrypt = require('bcryptjs');
const prisma = require('../db');
const logger = require('./logger');
const { superAdmin, bcryptRounds } = require('../config');

async function ensureSuperAdmin() {
  try {
    const count = await prisma.superAdmin.count();
    if (count > 0) return;

    const { email, password, name } = superAdmin;

    await prisma.superAdmin.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, bcryptRounds) },
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
