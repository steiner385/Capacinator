import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock the database before importing AuthService
jest.mock('../../../../../src/server/database/index.js', () => ({
  db: jest.fn()
}));

import { AuthService, AuthError } from '../../../../../src/server/services/auth/AuthService';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: jest.Mock;

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    is_system_admin: false,
    user_role_id: 'role-456'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    authService = new AuthService();

    // Get the mocked db
    const dbModule = jest.requireMock('../../../../../src/server/database/index.js');
    mockDb = dbModule.db as jest.Mock;
  });

  describe('generateTokens', () => {
    test('should generate valid access and refresh tokens', () => {
      const tokens = authService.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    test('should include user info in access token payload', () => {
      const tokens = authService.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.accessToken) as any;

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.name).toBe(mockUser.name);
      expect(decoded.isSystemAdmin).toBe(mockUser.is_system_admin);
      expect(decoded.userRoleId).toBe(mockUser.user_role_id);
    });

    test('should include userId and type in refresh token', () => {
      const tokens = authService.generateTokens(mockUser);
      const decoded = jwt.decode(tokens.refreshToken) as any;

      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token and return payload', () => {
      const tokens = authService.generateTokens(mockUser);
      const payload = authService.verifyAccessToken(tokens.accessToken);

      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
    });

    test('should throw AuthError for invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow(AuthError);
    });

    test('should throw AuthError with INVALID_TOKEN code for malformed token', () => {
      try {
        authService.verifyAccessToken('invalid-token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('INVALID_TOKEN');
      }
    });

    test('should throw AuthError for expired token', () => {
      // Create a token that's already expired
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        'test-secret',
        { expiresIn: '-1s' }
      );

      try {
        authService.verifyAccessToken(expiredToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('verifyRefreshToken', () => {
    test('should verify valid refresh token and return userId', () => {
      const tokens = authService.generateTokens(mockUser);
      const userId = authService.verifyRefreshToken(tokens.refreshToken);

      expect(userId).toBe(mockUser.id);
    });

    test('should throw AuthError for invalid refresh token', () => {
      expect(() => {
        authService.verifyRefreshToken('invalid-token');
      }).toThrow(AuthError);
    });

    test('should throw AuthError when using access token as refresh token', () => {
      const tokens = authService.generateTokens(mockUser);

      try {
        authService.verifyRefreshToken(tokens.accessToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('getUserById', () => {
    test('should return user when found', async () => {
      // Setup mock chain
      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(mockUser);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      const user = await authService.getUserById('user-123');

      expect(user).toEqual(mockUser);
    });

    test('should return null when user not found', async () => {
      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(null);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      const user = await authService.getUserById('nonexistent-user');

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    test('should return user when found', async () => {
      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(mockUser);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      const user = await authService.getUserByEmail('john@example.com');

      expect(user).toEqual(mockUser);
    });
  });

  describe('loginByPersonId', () => {
    test('should return tokens for valid user', async () => {
      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(mockUser);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      const tokens = await authService.loginByPersonId('user-123');

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
    });

    test('should throw AuthError for invalid user', async () => {
      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(null);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      await expect(authService.loginByPersonId('invalid-user')).rejects.toThrow(AuthError);
    });
  });

  describe('refreshAccessToken', () => {
    test('should return new tokens for valid refresh token', async () => {
      const initialTokens = authService.generateTokens(mockUser);

      const mockWhere = jest.fn().mockReturnThis();
      const mockFirst = jest.fn().mockResolvedValue(mockUser);
      const mockSelect = jest.fn().mockReturnValue({ where: mockWhere, first: mockFirst });
      mockWhere.mockReturnValue({ first: mockFirst });

      mockDb.mockReturnValue({
        select: mockSelect
      });

      const newTokens = await authService.refreshAccessToken(initialTokens.refreshToken);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens).toHaveProperty('expiresIn');
      // Verify the new tokens are valid
      const decoded = authService.verifyAccessToken(newTokens.accessToken);
      expect(decoded.userId).toBe(mockUser.id);
    });

    test('should throw AuthError for invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow(AuthError);
    });
  });
});
