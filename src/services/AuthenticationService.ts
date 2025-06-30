/**
 * Authentication Service
 * 
 * Handles all authentication-related business logic.
 * Extracted from the massive AuthContext to separate concerns.
 */

import { jwtDecode } from 'jwt-decode';
import { AuthenticationError, ValidationError, ErrorCode } from '@/lib/errors';

// Types
export interface LoginCredentials {
  userId: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  roles?: string[];
  communityRoles?: Array<{
    id: string;
    title: string;
    type?: string;
    permissions?: string[];
  }>;
  communityName?: string | null;
  iframeUid?: string | null;
  communityId?: string | null;
  communityShortId?: string | null;
  pluginId?: string | null;
  communityLogoUrl?: string | null;
  // Common Ground profile data
  lukso?: { username: string; address: string };
  ethereum?: { address: string };
  twitter?: { username: string };
  farcaster?: { displayName: string; username: string; fid: number };
  premium?: string;
  email?: string;
}

export interface AuthUser {
  userId: string;
  name?: string | null;
  picture?: string | null;
  isAdmin?: boolean;
  cid?: string | null;
  roles?: string[];
  communityShortId?: string | null;
  pluginId?: string | null;
  previousVisit?: string | null;
  stats?: {
    postCount: number;
    commentCount: number;
    isNewUser: boolean;
  };
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface SessionPayload {
  userId: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  roles?: string[];
  communityRoles?: Array<{
    id: string;
    title: string;
    type?: string;
    permissions?: string[];
  }>;
  iframeUid?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  communityShortId?: string | null;
  pluginId?: string | null;
  communityLogoUrl?: string | null;
  friends?: Array<{ id: string; name: string; image?: string }>;
  // Common Ground profile data
  lukso?: { username: string; address: string };
  ethereum?: { address: string };
  twitter?: { username: string };
  farcaster?: { displayName: string; username: string; fid: number };
  premium?: string;
  email?: string;
}

/**
 * Authentication Service
 * 
 * Handles login, token refresh, and user session management.
 * Separated from React context to enable testing and reuse.
 */
export class AuthenticationService {
  /**
   * Perform login with CG credentials
   */
  static async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      // Validate input
      this.validateLoginCredentials(credentials);

      // Prepare session payload
      const sessionPayload: SessionPayload = {
        userId: credentials.userId,
        name: credentials.name,
        profilePictureUrl: credentials.profilePictureUrl,
        roles: credentials.roles,
        communityRoles: credentials.communityRoles,
        iframeUid: credentials.iframeUid,
        communityId: credentials.communityId,
        communityName: credentials.communityName,
        communityShortId: credentials.communityShortId,
        pluginId: credentials.pluginId,
        communityLogoUrl: credentials.communityLogoUrl,
        // Common Ground profile data
        lukso: credentials.lukso,
        ethereum: credentials.ethereum,
        twitter: credentials.twitter,
        farcaster: credentials.farcaster,
        premium: credentials.premium,
        email: credentials.email,
      };

      // Call session API
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new AuthenticationError(
          ErrorCode.AUTH_UNAUTHORIZED,
          errorData.error || 'Failed to create session'
        );
      }

      const { token } = await response.json();
      if (!token) {
        throw new AuthenticationError(
          ErrorCode.AUTH_UNAUTHORIZED,
          'No token received from session endpoint'
        );
      }

      // Decode and validate token
      const user = this.decodeAndValidateToken(token);

      return { token, user };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        ErrorCode.AUTH_UNAUTHORIZED,
        'Login failed',
        { originalError: error }
      );
    }
  }

  /**
   * Refresh authentication token using CG instance
   */
  static async refreshToken(
    cgInstance: any,
    iframeUid?: string | null
  ): Promise<LoginResult> {
    try {
      if (!cgInstance) {
        throw new AuthenticationError(
          ErrorCode.AUTH_TOKEN_EXPIRED,
          'CG instance not available for token refresh'
        );
      }

      // Fetch fresh data from CG
      const [userInfoResponse, communityInfoResponse] = await Promise.all([
        cgInstance.getUserInfo(),
        cgInstance.getCommunityInfo(),
      ]);

      if (!userInfoResponse?.data?.id || !communityInfoResponse?.data?.id) {
        throw new AuthenticationError(
          ErrorCode.AUTH_TOKEN_EXPIRED,
          'Failed to get fresh data from CG for refresh'
        );
      }

      // Extract plugin context data
      const contextData = cgInstance.getContextData();
      const pluginId = contextData?.pluginId;

      const freshCredentials: LoginCredentials = {
        userId: userInfoResponse.data.id,
        name: userInfoResponse.data.name,
        profilePictureUrl: userInfoResponse.data.imageUrl,
        roles: userInfoResponse.data.roles,
        communityRoles: communityInfoResponse.data.roles,
        communityName: communityInfoResponse.data.title,
        iframeUid: iframeUid || undefined,
        communityId: communityInfoResponse.data.id,
        communityShortId: communityInfoResponse.data.url,
        pluginId: pluginId,
        communityLogoUrl: communityInfoResponse.data.smallLogoUrl,
        // Extract Common Ground profile data
        lukso: userInfoResponse.data.lukso,
        ethereum: userInfoResponse.data.ethereum,
        twitter: userInfoResponse.data.twitter,
        farcaster: userInfoResponse.data.farcaster,
        premium: userInfoResponse.data.premium,
        email: userInfoResponse.data.email,
      };

      // Use regular login flow for refresh
      return await this.login(freshCredentials);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        ErrorCode.AUTH_TOKEN_EXPIRED,
        'Token refresh failed',
        { originalError: error }
      );
    }
  }

  /**
   * Decode JWT token and extract user data
   */
  static decodeAndValidateToken(token: string): AuthUser {
    try {
      const decoded = jwtDecode<{
        sub: string;
        name?: string;
        picture?: string;
        adm?: boolean;
        exp?: number;
        uid?: string;
        cid?: string;
        roles?: string[];
        communityShortId?: string;
        pluginId?: string;
        previousVisit?: string | null;
      }>(token);

      // Validate token expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        throw new AuthenticationError(
          ErrorCode.AUTH_TOKEN_EXPIRED,
          'Token has expired'
        );
      }

      return {
        userId: decoded.sub,
        name: decoded.name,
        picture: decoded.picture,
        isAdmin: decoded.adm || decoded.sub === process.env.NEXT_PUBLIC_SUPERADMIN_ID,
        cid: decoded.cid,
        roles: decoded.roles,
        communityShortId: decoded.communityShortId,
        pluginId: decoded.pluginId,
        previousVisit: decoded.previousVisit,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Invalid token format',
        { originalError: error }
      );
    }
  }

  /**
   * Validate login credentials
   */
  private static validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.userId) {
      throw new ValidationError(
        'userId is required for authentication',
        { field: 'userId' }
      );
    }

    if (!credentials.communityId) {
      throw new ValidationError(
        'communityId is required for authentication',
        { field: 'communityId' }
      );
    }

    if (!credentials.iframeUid) {
      throw new ValidationError(
        'iframeUid is required for authentication',
        { field: 'iframeUid' }
      );
    }
  }

  /**
   * Generate request ID for tracking
   */
  static generateRequestId(): string {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}