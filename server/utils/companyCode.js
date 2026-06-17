const prisma = require('../db');

// Uppercase alphanumeric without easily-confused characters (no 0/O, 1/I).
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

/**
 * Resolves a unique company code. If the caller supplied one it is normalized
 * and checked for availability; otherwise a random code is generated and
 * retried until it does not collide.
 *
 * Shared by the public registration route and the super-admin company-creation
 * route, which previously each carried their own copy of this logic.
 *
 * @param {string} [requested] optional caller-chosen code
 * @returns {Promise<string>} an available, normalized company code
 * @throws {Error} if a requested code is invalid/taken or generation fails
 */
async function ensureUniqueCode(requested) {
  if (requested) {
    const clean = requested.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (clean.length < 3) throw new Error('Company code must be at least 3 characters');
    const exists = await prisma.company.findUnique({ where: { code: clean } });
    if (exists) throw new Error('That company code is already taken — choose another');
    return clean;
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    const exists = await prisma.company.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique code — please try again');
}

module.exports = { ensureUniqueCode, generateCode };
