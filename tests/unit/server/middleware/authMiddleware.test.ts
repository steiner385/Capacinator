import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock the auth service
jest.mock('../../../../src/server/services/auth/index.js', () => ({
  authService: {
    verifyAccessToken: jest.fn()
  },
  AuthError: class AuthError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
}));

import { requireAuth, optionalAuth, requireAdmin } from '../../../../src/server/middleware/authMiddleware';

describe('Auth Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let mockAuthService: any;

  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    isSystemAdmin: false,
    userRoleId: 'role-456'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked service
    const authModule = jest.requireMock('../../../../src/server/services/auth/index.js');
    mockAuthService = authModule.authService;

    mockRequest = {
      headers: {},
      get: jest.fn()
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('requireAuth', () => {
    test('should call next() with valid Bearer token', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      const middleware = requireAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.authUser).toEqual(mockPayload);
      expect(mockRequest.user).toEqual({
        id: mockPayload.userId,
        name: mockPayload.name,
        email: mockPayload.email,
        is_system_admin: mockPayload.isSystemAdmin,
        user_role_id: mockPayload.userRoleId
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should return 401 when Authorization header is missing', async () => {
      const middleware = requireAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN',
        message: 'Authorization header is missing'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 for invalid token format (no Bearer prefix)', async () => {
      mockRequest.headers.authorization = 'invalid-token';

      const middleware = requireAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 for expired token', async () => {
      mockRequest.headers.authorization = 'Bearer expired-token';

      const authModule = jest.requireMock('../../../../src/server/services/auth/index.js');
      const AuthError = authModule.AuthError;
      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      });

      const middleware = requireAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'TOKEN_EXPIRED',
        message: 'Token expired'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return 401 for invalid token', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';

      const authModule = jest.requireMock('../../../../src/server/services/auth/index.js');
      const AuthError = authModule.AuthError;
      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      });

      const middleware = requireAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    test('should call next() with valid Bearer token and attach user', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      const middleware = optionalAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.authUser).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should call next() without user when no token provided', async () => {
      const middleware = optionalAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.authUser).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should call next() without user when token is invalid', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const middleware = optionalAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.authUser).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    test('should continue even with malformed authorization header', async () => {
      mockRequest.headers.authorization = 'malformed';

      const middleware = optionalAuth();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    test('should call next() for system admin user', async () => {
      const adminPayload = { ...mockPayload, isSystemAdmin: true };
      mockRequest.headers.authorization = 'Bearer admin-token';
      mockAuthService.verifyAccessToken.mockReturnValue(adminPayload);

      const middleware = requireAdmin();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('should return 403 for non-admin user', async () => {
      mockRequest.headers.authorization = 'Bearer user-token';
      mockAuthService.verifyAccessToken.mockReturnValue(mockPayload);

      const middleware = requireAdmin();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        code: 'NOT_ADMIN',
        message: 'System administrator access required'
      });
    });

    test('should return 401 when no token provided', async () => {
      const middleware = requireAdmin();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
});
