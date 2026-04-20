const router = require('express').Router();
const { body, query, param } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { toObservation, toBundle } = require('../fhir/mapper');
const { validateObservation } = require('../fhir/validator');
const logger = require('../utils/logger');

const FHIR_CONTENT_TYPE = 'application/fhir+json';

// In-memory store (replace with DB in production)
const store = [];

// GET /api/fhir/Observation  — search observations
router.get('/Observation', authenticate, [
  query('patient').optional().isString().trim().escape(),
  query('_count').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['final', 'preliminary', 'amended', 'cancelled']),
], validate, (req, res) => {
  const { patient, _count = 20, status } = req.query;
  let results = [...store];
  if (patient) results = results.filter(o => o.subject?.reference?.includes(patient));
  if (status)  results = results.filter(o => o.status === status);
  results = results.slice(-(_count));

  logger.info('FHIR Observation search', {
    correlationId: req.correlationId,
    count: results.length,
    filters: { patient, status },
  });

  res.type(FHIR_CONTENT_TYPE).json(toBundle(results));
});

// GET /api/fhir/Observation/:id
router.get('/Observation/:id', authenticate, [
  param('id').isUUID(),
], validate, (req, res) => {
  const obs = store.find(o => o.id === req.params.id);
  if (!obs) return res.status(404).type(FHIR_CONTENT_TYPE).json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'error', code: 'not-found', diagnostics: `Observation/${req.params.id} not found` }],
  });
  res.type(FHIR_CONTENT_TYPE).json(obs);
});

// POST /api/fhir/Observation  — create from raw sensor reading
router.post('/Observation', authenticate, [
  body('type').isString().trim().notEmpty(),
  body('value').isNumeric(),
  body('patientId').isString().trim().notEmpty(),
  body('timestamp').optional().isISO8601(),
  body('deviceId').optional().isString().trim().escape(),
], validate, (req, res) => {
  const obs = toObservation(req.body, req.body.patientId);
  const { valid, errors } = validateObservation(obs);
  if (!valid) return res.status(422).type(FHIR_CONTENT_TYPE).json({
    resourceType: 'OperationOutcome',
    issue: errors.map(e => ({ severity: 'error', code: 'invalid', diagnostics: e })),
  });

  store.push(obs);
  logger.info('FHIR Observation created', { correlationId: req.correlationId, id: obs.id });
  res.status(201).type(FHIR_CONTENT_TYPE).json(obs);
});

// GET /api/fhir/metadata — capability statement
router.get('/metadata', (req, res) => {
  res.type(FHIR_CONTENT_TYPE).json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['application/fhir+json'],
    rest: [{
      mode: 'server',
      resource: [{
        type: 'Observation',
        interaction: [
          { code: 'read' },
          { code: 'search-type' },
          { code: 'create' },
        ],
        searchParam: [
          { name: 'patient', type: 'reference' },
          { name: 'status', type: 'token' },
          { name: '_count', type: 'number' },
        ],
      }],
    }],
  });
});

module.exports = router;
