const correlationId = require('../server/middleware/correlationId');
const validate = require('../server/middleware/validate');
const { errorHandler, AppError } = require('../server/middleware/errorHandler');

// ── helpers ──────────────────────────────────────────────────────────────────
function mockRes() {
  const res = { headers: {}, _status: 200, _body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

// ── correlationId middleware ──────────────────────────────────────────────────
describe('correlationId middleware', () => {
  it('generates a uuid when no header is present', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    correlationId(req, res, next);
    expect(req.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing x-correlation-id header', () => {
    const req = { headers: { 'x-correlation-id': 'my-id-123' } };
    const res = mockRes();
    const next = jest.fn();
    correlationId(req, res, next);
    expect(req.correlationId).toBe('my-id-123');
    expect(res.headers['x-correlation-id']).toBe('my-id-123');
  });
});

// ── validate middleware ───────────────────────────────────────────────────────
jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));
const { validationResult } = require('express-validator');

describe('validate middleware', () => {
  it('calls next() when there are no validation errors', () => {
    validationResult.mockReturnValue({ isEmpty: () => true });
    const req = { correlationId: 'abc' };
    const res = mockRes();
    const next = jest.fn();
    validate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 422 with error details when validation fails', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'email', msg: 'Invalid email' }],
    });
    const req = { correlationId: 'xyz' };
    const res = mockRes();
    const next = jest.fn();
    validate(req, res, next);
    expect(res._status).toBe(422);
    expect(res._body.error).toBe('Validation failed');
    expect(res._body.details[0].field).toBe('email');
    expect(next).not.toHaveBeenCalled();
  });
});

// ── errorHandler middleware ───────────────────────────────────────────────────
describe('errorHandler middleware', () => {
  const req = { correlationId: 'corr-1', path: '/test', method: 'GET' };

  it('returns 500 for generic errors', () => {
    const err = new Error('boom');
    const res = mockRes();
    errorHandler(err, req, res, undefined);
    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Internal server error');
  });

  it('returns the AppError statusCode and message', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    const res = mockRes();
    errorHandler(err, req, res, undefined);
    expect(res._status).toBe(404);
    expect(res._body.error).toBe('Not found');
    expect(res._body.code).toBe('NOT_FOUND');
  });

  it('returns 409 for Prisma P2002 (duplicate)', () => {
    const err = new Error('unique constraint');
    err.name = 'PrismaClientKnownRequestError';
    err.code = 'P2002';
    const res = mockRes();
    errorHandler(err, req, res, undefined);
    expect(res._status).toBe(409);
    expect(res._body.error).toBe('Duplicate entry');
  });

  it('returns 404 for Prisma P2025 (not found)', () => {
    const err = new Error('record missing');
    err.name = 'PrismaClientKnownRequestError';
    err.code = 'P2025';
    const res = mockRes();
    errorHandler(err, req, res, undefined);
    expect(res._status).toBe(404);
  });

  it('returns 401 for JWT errors', () => {
    const err = new Error('bad token');
    err.name = 'JsonWebTokenError';
    const res = mockRes();
    errorHandler(err, req, res, undefined);
    expect(res._status).toBe(401);
  });
});
