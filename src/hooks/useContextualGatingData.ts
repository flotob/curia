/**
 * Context-aware React Query hooks for gating verification data
 * 
 * Routes to appropriate endpoints based on verification context:
 * - Post context: /api/posts/{postId}/*
 * - Board context: /api/communities/{communityId}/boards/{boardId}/locks/{lockId}/*
 * - Preview context: Uses lock config endpoint only
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import { VerificationContext } from '@/components/verification/LockVerificationPanel';

// Types for contextual gating data
export interface ContextualGatingRequirementsData {
  lockId?: number;
  postId?: number;
  requireAll: boolean;
  categories: ContextualCategoryStatus[];
}

export interface ContextualCategoryStatus {
  type: string;
  enabled: boolean;
  fulfillment?: "any" | "all"; // 🚀 NEW: Fulfillment mode for this category
  requirements: unknown;
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: {
    name: string;
    description: string;
    icon: string;
  };
  verificationData?: {
    walletAddress?: string;
    verifiedProfiles?: {
      displayName?: string;
      username?: string;
      avatar?: string;
      ensName?: string;
      isVerified?: boolean;
    };
    verifiedBalances?: {
      native?: string;
      tokens?: Array<{
        address: string;
        symbol: string;
        name?: string;
        balance: string;
        formattedBalance: string;
      }>;
    };
    verifiedSocial?: {
      followerCount?: number;
      followingAddresses?: string[];
      followedByAddresses?: string[];
    };
    signature?: string;
    challenge?: unknown;
  };
}

interface ContextualVerificationStatusData {
  canComment: boolean;
  requireAll: boolean;
  totalCategories: number;
  verifiedCategories: number;
  categories: ContextualCategoryVerificationStatus[];
  message?: string;
}

interface ContextualCategoryVerificationStatus {
  type: string;
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  metadata?: {
    name: string;
    description: string;
    icon: string;
  };
}

/**
 * Context-aware hook for fetching gating requirements
 * Routes to appropriate endpoint based on verification context
 */
export function useContextualGatingRequirements(
  lockId: number,
  verificationContext: VerificationContext
) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['contextual-gating-requirements', lockId, verificationContext],
    queryFn: async () => {
      // For all contexts, we fetch the lock configuration
      // This gives us the requirements that need to be verified
      const lockData = await authFetchJson<{
        lockId: number;
        requireAll: boolean;
        categories: Array<{
          type: string;
          enabled: boolean;
          fulfillment?: "any" | "all"; // 🚀 NEW: Fulfillment mode for this category
          requirements: unknown;
          verificationStatus: 'not_started';
          metadata?: {
            icon: string;
            name: string;
            brandColor: string;
          };
        }>;
      }>(`/api/locks/${lockId}/gating-requirements`, { token });

      // Convert to expected format with enhanced metadata
      const categories: ContextualCategoryStatus[] = lockData.categories.map(cat => ({
        type: cat.type,
        enabled: cat.enabled,
        fulfillment: cat.fulfillment, // 🚀 NEW: Pass through fulfillment mode
        requirements: cat.requirements,
        verificationStatus: 'not_started' as const,
        metadata: cat.metadata ? {
          name: cat.metadata.name,
          description: `${cat.metadata.name} verification requirements`,
          icon: cat.metadata.icon,
        } : undefined,
      }));

      const result: ContextualGatingRequirementsData = {
        lockId: lockData.lockId,
        requireAll: lockData.requireAll,
        categories,
      };

      // Add postId for post context to maintain compatibility
      if (verificationContext.type === 'post') {
        result.postId = verificationContext.postId;
      }

      return result;
    },
    enabled: !!token && !!lockId && lockId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - requirements don't change often
  });
}

/**
 * Context-aware hook for fetching verification status
 * Routes to appropriate verification status endpoint based on context
 */
export function useContextualVerificationStatus(
  lockId: number,
  verificationContext: VerificationContext
) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['contextual-verification-status', lockId, verificationContext],
    queryFn: async () => {
      if (verificationContext.type === 'preview') {
        // Preview mode: no verification status, just show not started
        return {
          canComment: false,
          requireAll: false,
          totalCategories: 0,
          verifiedCategories: 0,
          categories: [],
          message: 'Preview mode - connect wallets to test requirements',
        };
      }

      let endpoint: string;
      
      if (verificationContext.type === 'post') {
        endpoint = `/api/posts/${verificationContext.postId}/verification-status`;
      } else if (verificationContext.type === 'board') {
        endpoint = `/api/communities/${verificationContext.communityId}/boards/${verificationContext.boardId}/locks/${lockId}/verification-status`;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error(`Unsupported verification context type: ${(verificationContext as any).type}`);
      }

      const response = await authFetchJson<ContextualVerificationStatusData>(endpoint, { token });
      return response;
    },
    enabled: !!token && !!lockId && lockId > 0 && verificationContext.type !== 'preview',
    staleTime: 1 * 60 * 1000, // 1 minute - verification status changes frequently
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

/**
 * Context-aware hook to invalidate verification status
 * Invalidates the appropriate cache keys based on context
 */
export function useContextualInvalidateVerificationStatus() {
  const queryClient = useQueryClient();
  
  return (lockId: number, verificationContext: VerificationContext) => {
    // Invalidate contextual hooks
    queryClient.invalidateQueries({
      queryKey: ['contextual-verification-status', lockId, verificationContext],
    });
    queryClient.invalidateQueries({
      queryKey: ['contextual-gating-requirements', lockId, verificationContext],
    });

    // Also invalidate legacy hooks for backwards compatibility
    if (verificationContext.type === 'post') {
      queryClient.invalidateQueries({
        queryKey: ['gating-requirements', verificationContext.postId],
      });
      queryClient.invalidateQueries({
        queryKey: ['verification-status', verificationContext.postId],
      });
    } else if (verificationContext.type === 'board') {
      // 🚀 ENHANCED: Invalidate ALL variations of board verification status queries
      queryClient.invalidateQueries({
        queryKey: ['boardVerificationStatus', verificationContext.boardId],
      });
      // Also invalidate the 3-parameter version used by post creation
      queryClient.invalidateQueries({
        queryKey: ['boardVerificationStatus', verificationContext.boardId],
        predicate: (query) => {
          // Match any query that starts with ['boardVerificationStatus', boardId]
          const queryKey = query.queryKey as unknown[];
          return queryKey.length >= 2 && 
                 queryKey[0] === 'boardVerificationStatus' && 
                 queryKey[1] === verificationContext.boardId;
        },
      });
      // Catch-all invalidation for partial matches
      queryClient.invalidateQueries({
        queryKey: ['boardVerificationStatus'],
      });
    }
  };
} 