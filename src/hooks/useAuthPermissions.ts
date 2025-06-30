import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionService } from '@/lib/permissions/PermissionService';
import { BoardSettings } from '@/types/settings';

/**
 * Frontend Permission Hook
 * 
 * Provides reusable permission checking methods for React components.
 * This hook consolidates permission logic that was previously duplicated
 * across multiple components and ensures consistent authorization checks.
 */
export const useAuthPermissions = () => {
  const { user, token, isAuthenticated } = useAuth();

  // Memoize admin status to prevent unnecessary re-calculations
  const isAdmin = useMemo(() => {
    if (!user) return false;
    
    // Convert AuthUser to JwtPayload-like object for PermissionService
    const jwtUser = {
      sub: user.userId,
      adm: user.isAdmin,
      cid: user.cid,
      roles: user.roles
    };
    
    return PermissionService.isUserAdmin(jwtUser);
  }, [user]);

  // Check if user can access a specific community
  const canAccessCommunity = useCallback((targetCommunityId: string): boolean => {
    return PermissionService.canAccessCommunity(
      user?.cid, 
      targetCommunityId, 
      isAdmin
    );
  }, [user?.cid, isAdmin]);

  // Check if user can access a specific board
  const canAccessBoard = useCallback(async (boardSettings: BoardSettings): Promise<boolean> => {
    return await PermissionService.canAccessBoard(
      user?.roles, 
      boardSettings, 
      isAdmin
    );
  }, [user?.roles, isAdmin]);

  // Get user context with validation
  const getUserContext = useCallback(() => {
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

    // Convert AuthUser to JwtPayload-like object
    const jwtUser = {
      sub: user.userId,
      cid: user.cid,
      roles: user.roles,
      adm: user.isAdmin
    };

    return PermissionService.extractUserContext(jwtUser);
  }, [user]);

  // Check if user has authentication token
  const hasValidToken = useMemo(() => {
    return !!token && isAuthenticated;
  }, [token, isAuthenticated]);

  // Get current community ID
  const currentCommunityId = useMemo(() => {
    return user?.cid || null;
  }, [user?.cid]);

  // Get current user roles
  const userRoles = useMemo(() => {
    return user?.roles || [];
  }, [user?.roles]);

  return {
    // User status
    isAuthenticated,
    isAdmin,
    hasValidToken,
    currentCommunityId,
    userRoles,
    user,

    // Permission methods
    canAccessCommunity,
    canAccessBoard,
    getUserContext,

    // Validation helpers
    validateCommunityAccess: useCallback((targetCommunityId: string) => {
      return PermissionService.validateCommunityOwnership(
        user?.cid,
        targetCommunityId,
        isAdmin
      );
    }, [user?.cid, isAdmin]),

    validateBoardAccess: useCallback(async (boardSettings: BoardSettings) => {
      return await PermissionService.validateBoardAccess(
        user?.roles,
        boardSettings,
        isAdmin
      );
    }, [user?.roles, isAdmin])
  };
};