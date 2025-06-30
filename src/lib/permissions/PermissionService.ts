import { JwtPayload } from '@/lib/withAuth';
import { BoardSettings } from '@/types/settings';

/**
 * Centralized Permission Service
 * 
 * This service consolidates all permission checking logic that was previously
 * duplicated across components and API routes. It provides a single source of
 * truth for authorization decisions.
 */
export class PermissionService {
  /**
   * Check if a user can access a specific community
   * Used extensively across API routes to verify community ownership
   */
  static canAccessCommunity(
    userCommunityId: string | undefined | null, 
    targetCommunityId: string, 
    isAdmin: boolean
  ): boolean {
    if (isAdmin) return true;
    if (!userCommunityId) return false;
    return userCommunityId === targetCommunityId;
  }

  /**
   * Check if a user can access a specific board based on role-based permissions
   * Delegates to existing canUserAccessBoard function while providing consistent interface
   */
  static async canAccessBoard(
    userRoles: string[] | undefined | null, 
    boardSettings: BoardSettings, 
    isAdmin: boolean
  ): Promise<boolean> {
    // Dynamic import to avoid circular dependencies
    const { canUserAccessBoard } = await import('@/lib/boardPermissions');
    return canUserAccessBoard(userRoles || [], boardSettings, isAdmin);
  }

  /**
   * Determine if a user has admin privileges
   * Consolidates multiple admin checking patterns found across the codebase
   */
  static isUserAdmin(user: JwtPayload | undefined | null): boolean {
    if (!user) return false;
    
    // Check explicit admin flag from JWT
    return !!user.adm;
  }

  /**
   * Extract and validate user context from JWT payload
   * Standardizes user data extraction patterns found across API routes
   */
  static extractUserContext(user: JwtPayload | undefined) {
    if (!user) {
      return {
        isValid: false,
        userId: null,
        communityId: null,
        roles: [],
        isAdmin: false,
        error: 'No user data available'
      };
    }

    if (!user.sub) {
      return {
        isValid: false,
        userId: null,
        communityId: null,
        roles: [],
        isAdmin: false,
        error: 'User ID missing from token'
      };
    }

    if (!user.cid) {
      return {
        isValid: false,
        userId: user.sub,
        communityId: null,
        roles: [],
        isAdmin: this.isUserAdmin(user),
        error: 'Community ID missing from token'
      };
    }

    return {
      isValid: true,
      userId: user.sub,
      communityId: user.cid,
      roles: user.roles || [],
      isAdmin: this.isUserAdmin(user),
      error: null
    };
  }

  /**
   * Validate community ownership with standardized error response
   * Used by API routes to ensure users can only access their own community resources
   */
  static validateCommunityOwnership(
    userCommunityId: string | undefined | null,
    targetCommunityId: string,
    isAdmin: boolean
  ): { allowed: boolean; reason?: string } {
    if (this.canAccessCommunity(userCommunityId, targetCommunityId, isAdmin)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: isAdmin 
        ? 'Admin access required for cross-community operations'
        : 'You can only access resources from your own community'
    };
  }

  /**
   * Validate board access with standardized error response
   * Used by API routes to ensure users can only access boards they have permission for
   */
  static async validateBoardAccess(
    userRoles: string[] | undefined | null,
    boardSettings: BoardSettings,
    isAdmin: boolean
  ): Promise<{ allowed: boolean; reason?: string }> {
    const canAccess = await this.canAccessBoard(userRoles, boardSettings, isAdmin);
    if (canAccess) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You do not have permission to access this board'
    };
  }


}

/**
 * Type definitions for permission checking results
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface UserContext {
  isValid: boolean;
  userId: string | null;
  communityId: string | null;
  roles: string[];
  isAdmin: boolean;
  error: string | null;
}