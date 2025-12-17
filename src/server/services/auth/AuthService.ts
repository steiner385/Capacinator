import jwt from 'jsonwebtoken';
import { db } from '../../database/index.js';
import { config } from '../../config/environment.js';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  isSystemAdmin: boolean;
  userRoleId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  is_system_admin: boolean;
  user_role_id?: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor() {
    this.jwtSecret = config.auth.jwtSecret;
    this.jwtExpiresIn = config.auth.jwtExpiresIn;
    this.refreshExpiresIn = config.auth.jwtRefreshExpiresIn;
  }

  /**
   * Generate access and refresh tokens for a user
   */
  generateTokens(user: UserInfo): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.is_system_admin,
      userRoleId: user.user_role_id
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshExpiresIn } as jwt.SignOptions
    );

    // Calculate expiry in seconds
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify an access token and return the payload
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid token', 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Verify a refresh token and return the user ID
   */
  verifyRefreshToken(token: string): string {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { userId: string; type: string };
      if (payload.type !== 'refresh') {
        throw new AuthError('Invalid refresh token', 'INVALID_TOKEN');
      }
      return payload.userId;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid refresh token', 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Get user by ID from database
   */
  async getUserById(userId: string): Promise<UserInfo | null> {
    const user = await db('people')
      .select('id', 'name', 'email', 'is_system_admin', 'user_role_id')
      .where('id', userId)
      .first();

    return user || null;
  }

  /**
   * Get user by email from database
   */
  async getUserByEmail(email: string): Promise<UserInfo | null> {
    const user = await db('people')
      .select('id', 'name', 'email', 'is_system_admin', 'user_role_id')
      .where('email', email)
      .first();

    return user || null;
  }

  /**
   * Login by selecting a person (simple auth for capacity planning tool)
   * In a production system, this would verify credentials
   */
  async loginByPersonId(personId: string): Promise<AuthTokens> {
    const user = await this.getUserById(personId);

    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    return this.generateTokens(user);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const userId = this.verifyRefreshToken(refreshToken);
    const user = await this.getUserById(userId);

    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    return this.generateTokens(user);
  }
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

// Singleton instance
export const authService = new AuthService();
