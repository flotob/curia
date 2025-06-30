/**
 * React Query hooks for gating verification data
 * 
 * Provides smooth, cached data fetching for gating requirements and verification status
 * following the app's established React Query patterns (like CommentList with 45s intervals)
 */

import { useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedQuery } from './useAuthenticatedQuery';

// Types matching GatingRequirementsPanel
export interface GatingRequirementsData {
  postId: number;
  lockId?: number; // Include lockId when using lock-based gating
  requireAll: boolean;
  categories: CategoryStatus[];
}

export interface CategoryStatus {
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

interface VerificationStatusData {
  canComment: boolean;
  requireAll: boolean;
  totalCategories: number;
  verifiedCategories: number;
  categories: CategoryVerificationStatus[];
  message?: string;
}

interface CategoryVerificationStatus {
  type: string;
  required: boolean;
  verified: boolean;
  expiresAt?: string;
  metadata?: {
    name: string;
    description: string;
  };
}

/**
 * Hook for fetching gating requirements for a post
 * Less dynamic data - refresh every 30 seconds
 */
export function useGatingRequirements(postId: number) {
  return useAuthenticatedQuery<GatingRequirementsData>(
    ['gating-requirements', postId],
    `/api/posts/${postId}/gating-requirements`,
    {
      freshness: 'dynamic', // 1 min stale time
      updateFrequency: 'medium', // 30s background refresh
      backgroundRefetch: false, // Don't refresh when tab inactive
      enabled: !!postId,
      errorMessage: 'Failed to fetch gating requirements',
    }
  );
}

/**
 * Hook for fetching verification status for a post
 * More dynamic data - refresh every 20 seconds (faster than requirements)
 */
export function useVerificationStatus(postId: number) {
  return useAuthenticatedQuery<VerificationStatusData>(
    ['verification-status', postId],
    `/api/posts/${postId}/verification-status`,
    {
      freshness: 'dynamic', // 1 min stale time
      updateFrequency: 'fast', // More frequent updates (10s) - verification changes faster
      backgroundRefetch: false, // Don't refresh when tab inactive
      enabled: !!postId,
      errorMessage: 'Failed to fetch verification status',
    }
  );
}

/**
 * Hook to invalidate verification status after user actions
 * Use this instead of manual refetch calls
 */
export function useInvalidateVerificationStatus() {
  const queryClient = useQueryClient();
  
  return (postId: number) => {
    // Invalidate both verification-status and gating-requirements to ensure
    // rich headers refresh immediately with verifiedAt / expiresAt values.
    queryClient.invalidateQueries({
      queryKey: ['verification-status', postId],
      exact: true,
    });
    queryClient.invalidateQueries({
      queryKey: ['gating-requirements', postId],
      exact: true,
    });
  };
} 