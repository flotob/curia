import { useAuthenticatedQuery, useCommunityAuthenticatedQuery } from './useAuthenticatedQuery';
import { useAuth } from '@/contexts/AuthContext';

// Types based on existing API responses
export interface ApiCommunity {
  id: string;
  name: string;
  description?: string;
  settings?: {
    logoUrl?: string;
    permissions?: {
      allowedRoles?: string[];
    };
  };
  roles?: Array<{
    id: string;
    title: string;
    type?: string;
    permissions?: string[];
  }>;
}

export interface ApiBoard {
  id: number;
  name: string;
  description?: string;
  settings?: {
    permissions?: {
      allowedRoles?: string[];
    };
    lockGating?: {
      lockIds?: number[];
      fulfillment?: 'any' | 'all';
      verificationDuration?: number;
    };
  };
  community_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch current user's community data
 * 
 * Centralized community data fetching that replaces duplicate API calls
 * across multiple components.
 */
export function useCommunityData() {
  const { user } = useAuth();
  
  return useAuthenticatedQuery<ApiCommunity>(
    ['community', user?.cid],
    `/api/communities/${user?.cid}`,
    {
      enabled: !!user?.cid,
      staleTime: 5 * 60 * 1000, // 5 minutes - community data doesn't change often
    }
  );
}

/**
 * Hook to fetch boards for current user's community
 * 
 * Centralized boards fetching with proper caching.
 */
export function useCommunityBoards() {
  return useCommunityAuthenticatedQuery<ApiBoard[]>(
    ['boards'],
    (communityId) => `/api/communities/${communityId}/boards`,
    {
      staleTime: 3 * 60 * 1000, // 3 minutes
    }
  );
}

/**
 * Hook to fetch a specific community by ID
 * 
 * Useful for accessing partner communities or other community data.
 */
export function useCommunityById(communityId: string | null) {
  return useAuthenticatedQuery<ApiCommunity>(
    ['community', communityId],
    `/api/communities/${communityId}`,
    {
      enabled: !!communityId,
      staleTime: 5 * 60 * 1000,
    }
  );
}

/**
 * Hook to fetch boards for a specific community
 * 
 * Useful when working with partner communities or shared boards.
 */
export function useBoardsByCommunity(communityId: string | null) {
  return useAuthenticatedQuery<ApiBoard[]>(
    ['boards', communityId],
    `/api/communities/${communityId}/boards`,
    {
      enabled: !!communityId,
      staleTime: 3 * 60 * 1000,
    }
  );
}

/**
 * Hook to fetch specific board data
 * 
 * Handles both owned and shared boards through the single board API.
 */
export function useBoard(communityId: string | null, boardId: string | null) {
  return useAuthenticatedQuery<ApiBoard>(
    ['board', communityId, boardId],
    `/api/communities/${communityId}/boards/${boardId}`,
    {
      enabled: !!communityId && !!boardId,
      staleTime: 2 * 60 * 1000, // 2 minutes - board settings might change more frequently
    }
  );
}