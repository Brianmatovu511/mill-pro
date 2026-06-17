/**
 * Small query/coercion helpers shared across routes.
 */

/**
 * Coerces a request value to a finite number, falling back to 0 — the exact
 * `parseFloat(x) || 0` pattern that was repeated inline throughout the routes.
 * @param {*} value
 * @returns {number}
 */
const num = (value) => parseFloat(value) || 0;

/**
 * Builds a Prisma `where` fragment for an optional `[from, to]` date range.
 * Returns `{}` when neither bound is supplied so it can be spread safely into
 * any `where` clause.
 *
 * @param {string|Date} [from]
 * @param {string|Date} [to]
 * @param {string} [field='date'] the date column to filter on
 * @returns {object}
 */
function dateRangeWhere(from, to, field = 'date') {
  if (!from && !to) return {};
  const range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return { [field]: range };
}

module.exports = { num, dateRangeWhere };
