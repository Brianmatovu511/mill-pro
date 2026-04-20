const { toObservation, toBundle } = require('../server/fhir/mapper');
const { validateObservation } = require('../server/fhir/validator');

describe('FHIR Mapper', () => {
  const reading = { type: 'heartRate', value: 72, patientId: 'p1', timestamp: '2025-01-01T12:00:00Z' };

  it('maps a heart rate reading to a valid FHIR Observation', () => {
    const obs = toObservation(reading, 'p1');
    expect(obs.resourceType).toBe('Observation');
    expect(obs.status).toBe('final');
    expect(obs.code.coding[0].code).toBe('8867-4');
    expect(obs.subject.reference).toBe('Patient/p1');
    expect(obs.valueQuantity.value).toBe(72);
  });

  it('assigns a uuid when no id is provided', () => {
    const obs = toObservation(reading, 'p1');
    expect(obs.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('wraps observations in a FHIR Bundle', () => {
    const obs1 = toObservation(reading, 'p1');
    const obs2 = toObservation({ type: 'oxygenSat', value: 98, timestamp: '2025-01-01T12:01:00Z' }, 'p1');
    const bundle = toBundle([obs1, obs2]);
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('searchset');
    expect(bundle.total).toBe(2);
    expect(bundle.entry).toHaveLength(2);
  });
});

describe('FHIR Validator', () => {
  it('passes a valid observation', () => {
    const obs = toObservation({ type: 'temperature', value: 37.1, timestamp: '2025-01-01T12:00:00Z' }, 'p2');
    const { valid } = validateObservation(obs);
    expect(valid).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const { valid, errors } = validateObservation({ resourceType: 'Observation' });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('status'))).toBe(true);
  });

  it('fails on wrong resourceType', () => {
    const { valid, errors } = validateObservation({ resourceType: 'Patient', status: 'final', code: {}, subject: {} });
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/resourceType/);
  });

  it('fails on invalid status', () => {
    const { valid, errors } = validateObservation({ resourceType: 'Observation', status: 'bad', code: {}, subject: {} });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('Invalid status'))).toBe(true);
  });
});
