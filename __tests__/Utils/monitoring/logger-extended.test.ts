/**
 * Comprehensive tests for Logger
 * Tests log levels, formatting, convenience methods
 */

import { Logger } from '@/Utils/monitoring/logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LOG_LEVEL;

    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    logger = new Logger('test-component');
  });

  afterEach(() => {
    consoleSpy.debug.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log info messages', () => {
      logger.info('Test message');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      process.env.LOG_LEVEL = 'debug';
      logger = new Logger('test');

      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should filter debug when level is info', () => {
      process.env.LOG_LEVEL = 'info';
      logger = new Logger('test');

      logger.debug('Debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    it('should log API requests', () => {
      logger.apiRequest('GET', '/api/test', 200, 100, 'req-123');

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log API errors', () => {
      const error = new Error('API error');
      logger.apiError('POST', '/api/test', error, 'req-123');

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should log database queries', () => {
      process.env.LOG_LEVEL = 'debug';
      logger = new Logger('test-component');
      logger.databaseQuery('SELECT * FROM users', 50, 10);

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should log email sends', () => {
      logger.emailSent('user@example.com', 'Test Subject', true, 200);

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log queue jobs', () => {
      logger.queueJob('matching', 'job-123', 'completed', 500);

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log user actions', () => {
      logger.userAction('user-123', 'signup', { tier: 'free' });

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      logger.performance('matching', 1000, { userCount: 10 });

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe('Context', () => {
    it('should include user ID in logs', () => {
      logger.setUserId('user-123');
      logger.info('Test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('user=user-123');
    });

    it('should include request ID in logs', () => {
      logger.setRequestId('req-456');
      logger.info('Test message');

      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('req=req-456');
    });
  });
});

