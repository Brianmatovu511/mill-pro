/**
 * Centralized runtime configuration.
 *
 * Every environment-derived value the server depends on is resolved here once,
 * so the rest of the codebase imports a single source of truth instead of
 * re-reading `process.env` (and re-declaring defaults) in scattered modules.
 *
 * Note: the JWT signing secret previously had two different fallback values
 * across the codebase — tokens were signed with one default and verified with
 * another, which broke authentication whenever JWT_SECRET was left unset.
 * Resolving it in one place removes that inconsistency.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  bcryptRounds: 12,

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@millpro.app',
    password: process.env.SUPER_ADMIN_PASSWORD || 'MillProAdmin@2026!',
    name: process.env.SUPER_ADMIN_NAME || 'MillPro Administrator',
  },
};

config.isProduction = config.env === 'production';

module.exports = config;
