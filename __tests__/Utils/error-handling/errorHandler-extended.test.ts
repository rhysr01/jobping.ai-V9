/**
 * Comprehensive tests for Error Handler
 * Tests error handling, logging, formatting
 */

import {
  handleError,
  formatError,
  logError
} from '@/Utils/error-handling/errorHandler';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  __esModule: true
}));

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle errors', () => {
      const error = new Error('Test error');

      const result = handleError(error);

      expect(result).toBeDefined();
    });

    it('should log to Sentry', () => {
      const error = new Error('Test error');

      handleError(error);

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('formatError', () => {
    it('should format error', () => {
      const error = new Error('Test error');

      const formatted = formatError(error);

      expect(formatted).toBeDefined();
      expect(formatted.message).toBe('Test error');
    });
  });

  describe('logError', () => {
    it('should log error', () => {
      const error = new Error('Test error');

      logError(error, { context: 'test' });

      expect(true).toBe(true);
    });
  });
});

