import {
  HTTP_STATUS,
  ERROR_CODES,
  API_MESSAGES,
  ENV,
  TIMEOUTS,
  type HttpStatusCode,
  type ErrorCode,
  type ApiMessage,
} from '@/lib/constants';

describe('constants', () => {
  describe('HTTP_STATUS', () => {
    it('should have success status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });

    it('should have client error status codes', () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });

    it('should have server error status codes', () => {
      expect(HTTP_STATUS.INTERNAL_ERROR).toBe(500);
      expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe('ERROR_CODES', () => {
    it('should have authentication error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
      expect(ERROR_CODES.INVALID_TOKEN).toBe('INVALID_TOKEN');
    });

    it('should have validation error codes', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.MISSING_FIELDS).toBe('MISSING_FIELDS');
      expect(ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT');
    });

    it('should have resource error codes', () => {
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(ERROR_CODES.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
    });

    it('should have system error codes', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_CODES.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });

    it('should have matching-specific error codes', () => {
      expect(ERROR_CODES.MATCHING_FAILED).toBe('MATCHING_FAILED');
      expect(ERROR_CODES.AI_TIMEOUT).toBe('AI_TIMEOUT');
      expect(ERROR_CODES.NO_JOBS_AVAILABLE).toBe('NO_JOBS_AVAILABLE');
    });
  });

  describe('API_MESSAGES', () => {
    it('should have success messages', () => {
      expect(API_MESSAGES.SUCCESS).toBeDefined();
      expect(API_MESSAGES.CREATED).toBeDefined();
      expect(API_MESSAGES.UPDATED).toBeDefined();
    });

    it('should have auth messages', () => {
      expect(API_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(API_MESSAGES.FORBIDDEN).toBeDefined();
      expect(API_MESSAGES.INVALID_CREDENTIALS).toBeDefined();
    });

    it('should have validation messages', () => {
      expect(API_MESSAGES.VALIDATION_FAILED).toBeDefined();
      expect(API_MESSAGES.MISSING_REQUIRED_FIELDS).toBeDefined();
    });

    it('should have matching messages', () => {
      expect(API_MESSAGES.MATCHING_SUCCESS).toBeDefined();
      expect(API_MESSAGES.MATCHING_FAILED).toBeDefined();
      expect(API_MESSAGES.NO_MATCHES_FOUND).toBeDefined();
    });
  });

  describe('ENV', () => {
    it('should have environment detection functions', () => {
      expect(typeof ENV.isDevelopment).toBe('function');
      expect(typeof ENV.isProduction).toBe('function');
      expect(typeof ENV.isTest).toBe('function');
    });

    it('should detect development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      expect(ENV.isDevelopment()).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(ENV.isProduction()).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      expect(ENV.isTest()).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    it('should detect test mode from flag', () => {
      const originalFlag = process.env.JOBPING_TEST_MODE;
      process.env.JOBPING_TEST_MODE = '1';
      expect(ENV.isTest()).toBe(true);
      process.env.JOBPING_TEST_MODE = originalFlag;
    });
  });

  describe('TIMEOUTS', () => {
    it('should have timeout values', () => {
      expect(TIMEOUTS.API_REQUEST).toBeGreaterThan(0);
      expect(TIMEOUTS.DATABASE_QUERY).toBeGreaterThan(0);
      expect(TIMEOUTS.AI_MATCHING).toBeGreaterThan(0);
      expect(TIMEOUTS.WEBHOOK_PROCESSING).toBeGreaterThan(0);
      expect(TIMEOUTS.EMAIL_SEND).toBeGreaterThan(0);
    });

    it('should have reasonable timeout values', () => {
      expect(TIMEOUTS.API_REQUEST).toBe(30000);
      expect(TIMEOUTS.DATABASE_QUERY).toBe(10000);
      expect(TIMEOUTS.AI_MATCHING).toBe(20000);
    });
  });

  describe('Type exports', () => {
    it('should export HttpStatusCode type', () => {
      const status: HttpStatusCode = HTTP_STATUS.OK;
      expect(status).toBe(200);
    });

    it('should export ErrorCode type', () => {
      const code: ErrorCode = ERROR_CODES.VALIDATION_ERROR;
      expect(code).toBe('VALIDATION_ERROR');
    });

    it('should export ApiMessage type', () => {
      const message: ApiMessage = API_MESSAGES.SUCCESS;
      expect(message).toBeDefined();
    });
  });
});

