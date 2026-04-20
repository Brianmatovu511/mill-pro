const { v4: uuidv4 } = require('uuid');

const LOINC = {
  heartRate:    { code: '8867-4',  display: 'Heart rate',        unit: '/min',  system: 'http://loinc.org' },
  oxygenSat:    { code: '2708-6',  display: 'Oxygen saturation', unit: '%',     system: 'http://loinc.org' },
  temperature:  { code: '8310-5',  display: 'Body temperature',  unit: 'Cel',   system: 'http://loinc.org' },
  bloodPressure:{ code: '55284-4', display: 'Blood pressure',    unit: 'mm[Hg]',system: 'http://loinc.org' },
};

function toObservation(reading, patientId) {
  const loinc = LOINC[reading.type] || { code: reading.type, display: reading.type, unit: reading.unit || '1', system: 'http://loinc.org' };
  return {
    resourceType: 'Observation',
    id: reading.id || uuidv4(),
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'vital-signs',
        display: 'Vital Signs',
      }],
    }],
    code: {
      coding: [{ system: loinc.system, code: loinc.code, display: loinc.display }],
      text: loinc.display,
    },
    subject: { reference: `Patient/${patientId || 'unknown'}` },
    effectiveDateTime: reading.timestamp || new Date().toISOString(),
    valueQuantity: {
      value: reading.value,
      unit: loinc.unit,
      system: 'http://unitsofmeasure.org',
      code: loinc.code,
    },
    device: reading.deviceId ? { reference: `Device/${reading.deviceId}` } : undefined,
  };
}

function toBundle(observations) {
  return {
    resourceType: 'Bundle',
    id: uuidv4(),
    type: 'searchset',
    total: observations.length,
    timestamp: new Date().toISOString(),
    entry: observations.map(obs => ({
      fullUrl: `urn:uuid:${obs.id}`,
      resource: obs,
    })),
  };
}

module.exports = { toObservation, toBundle, LOINC };
