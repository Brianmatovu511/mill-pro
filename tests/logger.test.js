const logger = require('../server/utils/logger');

describe('Logger', () => {
  it('has info, warn, error, debug methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('logs without throwing', () => {
    expect(() => logger.info('test message', { correlationId: 'abc' })).not.toThrow();
    expect(() => logger.error('error message', { stack: 'trace' })).not.toThrow();
  });
});
