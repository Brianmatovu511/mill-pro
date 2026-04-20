const { AppError } = require('../server/middleware/errorHandler');

describe('AppError', () => {
  it('sets statusCode and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isOperational).toBe(true);
  });

  it('is an instance of Error', () => {
    expect(new AppError('oops', 500)).toBeInstanceOf(Error);
  });
});
