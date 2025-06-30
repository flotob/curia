import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';

/**
 * Authenticated Query Hook
 * 
 * A wrapper around useQuery that automatically handles authentication token management.
 * Eliminates the need to manually pass tokens and handle auth state in every query.
 * 
 * @param queryKey - React Query key
 * @param endpoint - API endpoint (relative to base URL)
 * @param options - Additional query options
 * @returns Query result with automatic auth handling
 */
export function useAuthenticatedQuery<TData = unknown>(
  queryKey: readonly unknown[],
  endpoint: string,
  options?: {
    staleTime?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
    retry?: boolean | number;
  }
) {
  const { token } = useAuth();

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return authFetchJson<TData>(endpoint, { token });
    },
    enabled: !!token && (options?.enabled !== false),
    // Default stale time to reduce unnecessary refetches
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchInterval: options?.refetchInterval,
    retry: options?.retry,
  });
}

/**
 * Authenticated Query with Parameters Hook
 * 
 * Similar to useAuthenticatedQuery but supports dynamic endpoint construction
 * and additional fetch options like method, body, etc.
 */
export function useAuthenticatedQueryWithOptions<TData = unknown>(
  queryKey: readonly unknown[],
  endpointOrFn: string | (() => string),
  fetchOptions?: Omit<Parameters<typeof authFetchJson>[1], 'token'>,
  queryOptions?: {
    staleTime?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) {
  const { token } = useAuth();

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const endpoint = typeof endpointOrFn === 'function' ? endpointOrFn() : endpointOrFn;
      return authFetchJson<TData>(endpoint, { 
        ...fetchOptions,
        token 
      });
    },
    enabled: !!token && (queryOptions?.enabled !== false),
    staleTime: queryOptions?.staleTime ?? 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: queryOptions?.refetchOnWindowFocus ?? false,
  });
}

/**
 * Hook for queries that depend on user community ID
 * 
 * Common pattern where queries need the current user's community ID.
 * Automatically handles both auth token and community ID requirements.
 */
export function useCommunityAuthenticatedQuery<TData = unknown>(
  queryKey: readonly unknown[],
  endpointFn: (communityId: string) => string,
  options?: {
    staleTime?: number;
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  }
) {
  const { token, user } = useAuth();

  return useQuery<TData>({
    queryKey,
    queryFn: async () => {
      if (!token || !user?.cid) {
        throw new Error('Authentication and community membership required');
      }
      return authFetchJson<TData>(endpointFn(user.cid), { token });
    },
    enabled: !!token && !!user?.cid && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  });
}