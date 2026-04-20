const REQUIRED_FIELDS = ['resourceType', 'status', 'code', 'subject'];
const VALID_STATUSES = ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'];

function validateObservation(obs) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!obs[field]) errors.push(`Missing required field: ${field}`);
  }
  if (obs.resourceType && obs.resourceType !== 'Observation')
    errors.push(`resourceType must be 'Observation', got '${obs.resourceType}'`);
  if (obs.status && !VALID_STATUSES.includes(obs.status))
    errors.push(`Invalid status: ${obs.status}`);
  if (obs.valueQuantity && typeof obs.valueQuantity.value !== 'number')
    errors.push('valueQuantity.value must be a number');
  return { valid: errors.length === 0, errors };
}

module.exports = { validateObservation };
