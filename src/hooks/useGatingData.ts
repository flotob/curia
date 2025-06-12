/**
 * React Query hooks for gating verification data
 * 
 * Provides smooth, cached data fetching for gating requirements and verification status
 * following the app's established React Query patterns (like CommentList with 45s intervals)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/utils/authFetch';
import { useAuth } from '@/contexts/AuthContext';

// Types matching GatingRequirementsPanel
export interface GatingRequirementsData {
  postId: number;
  requireAll: boolean;
  categories: CategoryStatus[];
}

export interface CategoryStatus {
  type: string;
  enabled: boolean;
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
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['gating-requirements', postId],
    queryFn: () => authFetchJson<GatingRequirementsData>(`/api/posts/${postId}/gating-requirements`, { token }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Background refresh every 30 seconds
    refetchIntervalInBackground: false, // Don't refresh when tab inactive
    enabled: !!token && !!postId,
  });
}

/**
 * Hook for fetching verification status for a post
 * More dynamic data - refresh every 20 seconds (faster than requirements)
 */
export function useVerificationStatus(postId: number) {
  const { token } = useAuth();
  
  return useQuery({
    queryKey: ['verification-status', postId],
    queryFn: () => authFetchJson<VerificationStatusData>(`/api/posts/${postId}/verification-status`, { token }),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 20 * 1000, // More frequent - verification changes faster
    refetchIntervalInBackground: false, // Don't refresh when tab inactive
    enabled: !!token && !!postId,
  });
}

/**
 * Hook to invalidate verification status after user actions
 * Use this instead of manual refetch calls
 */
export function useInvalidateVerificationStatus() {
  const queryClient = useQueryClient();
  
  return (postId: number) => {
    queryClient.invalidateQueries({ 
      queryKey: ['verification-status', postId],
      exact: true 
    });
  };
} 