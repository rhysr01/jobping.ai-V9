/**
 * Tests for Logger
 * Tests structured logging functionality
 */

import { Logger, createRequestLogger, logger, apiLogger } from '@/Utils/monitoring/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with component name', () => {
      const testLogger = new Logger('test-component');
      expect(testLogger).toBeDefined();
    });

    it('should use default log level when not set', () => {
      const testLogger = new Logger('test');
      testLogger.info('test message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      const testLogger = new Logger('test');
      testLogger.info('should not log');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('setUserId and setRequestId', () => {
    it('should set user ID', () => {
      const testLogger = new Logger('test');
      testLogger.setUserId('user-123');
      testLogger.info('test');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('user=user-123')
      );
    });

    it('should set request ID', () => {
      const testLogger = new Logger('test');
      testLogger.setRequestId('req-456');
      testLogger.info('test');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('req=req-456')
      );
    });
  });

  describe('log levels', () => {
    it('should log info messages', () => {
      const testLogger = new Logger('test');
      testLogger.info('info message');
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('info message')
      );
    });

    it('should log debug messages', () => {
      process.env.LOG_LEVEL = 'debug';
      const testLogger = new Logger('test');
      testLogger.debug('debug message');
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('debug message')
      );
    });

    it('should log warn messages', () => {
      const testLogger = new Logger('test');
      testLogger.warn('warn message');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('warn message')
      );
    });

    it('should log error messages', () => {
      const testLogger = new Logger('test');
      const error = new Error('test error');
      testLogger.error('error message', error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('error message')
      );
    });

    it('should filter logs below minimum level', () => {
      process.env.LOG_LEVEL = 'warn';
      const testLogger = new Logger('test');
      testLogger.info('should not log');
      testLogger.debug('should not log');
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('metadata logging', () => {
    it('should include metadata in logs', () => {
      const testLogger = new Logger('test');
      testLogger.info('test message', { key: 'value', count: 42 });
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('metadata=')
      );
    });

    it('should handle circular references in metadata', () => {
      const testLogger = new Logger('test');
      const circular: any = { self: null };
      circular.self = circular;
      testLogger.info('test', circular);
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('convenience methods', () => {
    it('should log API requests', () => {
      const testLogger = new Logger('api');
      testLogger.apiRequest('GET', '/api/users', 200, 150, 'req-123');
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/users')
      );
    });

    it('should log API errors', () => {
      const testLogger = new Logger('api');
      const error = new Error('API error');
      testLogger.apiError('POST', '/api/users', error, 'req-123');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/users failed')
      );
    });

    it('should log database queries', () => {
      process.env.LOG_LEVEL = 'debug';
      const testLogger = new Logger('db');
      testLogger.databaseQuery('SELECT * FROM users', 50, 10);
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log database errors', () => {
      const testLogger = new Logger('db');
      const error = new Error('DB error');
      testLogger.databaseError('SELECT * FROM users', error);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log email sent events', () => {
      const testLogger = new Logger('email');
      testLogger.emailSent('user@example.com', 'Welcome', true, 200);
      expect(console.info).toHaveBeenCalled();
    });

    it('should log email failures', () => {
      const testLogger = new Logger('email');
      testLogger.emailSent('user@example.com', 'Welcome', false, 200);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log queue jobs', () => {
      const testLogger = new Logger('queue');
      testLogger.queueJob('matching', 'job-123', 'completed', 500);
      expect(console.info).toHaveBeenCalled();
    });

    it('should log user actions', () => {
      const testLogger = new Logger('app');
      testLogger.userAction('user-123', 'signup', { source: 'web' });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      const testLogger = new Logger('app');
      testLogger.performance('matching', 1500, { userCount: 10 });
      expect(console.info).toHaveBeenCalled();
    });

    it('should log security events', () => {
      const testLogger = new Logger('auth');
      testLogger.security('failed_login', 'high', { ip: '1.2.3.4' });
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log critical security events as errors', () => {
      const testLogger = new Logger('auth');
      testLogger.security('breach_attempt', 'critical', { ip: '1.2.3.4' });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('error logging', () => {
    it('should include error details in logs', () => {
      const testLogger = new Logger('test');
      const error = new Error('test error');
      error.stack = 'Error: test error\n    at test.js:1:1';
      testLogger.error('operation failed', error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('test error')
      );
    });

    it('should handle errors without stack traces', () => {
      const testLogger = new Logger('test');
      const error = new Error('test error');
      delete error.stack;
      testLogger.error('operation failed', error);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('singleton loggers', () => {
    it('should export logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should export apiLogger instance', () => {
      expect(apiLogger).toBeInstanceOf(Logger);
    });
  });

  describe('createRequestLogger', () => {
    it('should create request-scoped logger', () => {
      const requestLogger = createRequestLogger('api', 'req-789');
      requestLogger.info('test message');
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('req=req-789')
      );
    });

    it('should include request ID in all logs', () => {
      const requestLogger = createRequestLogger('api', 'req-999');
      requestLogger.info('info');
      requestLogger.error('error', new Error('test'));
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('req=req-999')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('req=req-999')
      );
    });
  });
});
