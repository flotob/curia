import { useQuery, useMutation, UseQueryOptions, UseMutationOptions, QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { authFetchJson } from '@/utils/authFetch';

// Configuration constants for consistent React Query behavior
export const QUERY_DEFAULTS = {
  STALE_TIMES: {
    STATIC: 5 * 60 * 1000,      // 5min - rarely changing data (locks, communities)
    DYNAMIC: 1 * 60 * 1000,     // 1min - frequently changing (verification status)
    REAL_TIME: 30 * 1000,       // 30s - real-time data (live updates)
  },
  REFETCH_INTERVALS: {
    SLOW: 5 * 60 * 1000,        // 5min - background updates
    MEDIUM: 30 * 1000,          // 30s - moderate updates  
    FAST: 10 * 1000,            // 10s - frequent updates
  },
  GC_TIME: 5 * 60 * 1000,       // 5min - standard garbage collection
} as const;

export type DataFreshness = 'static' | 'dynamic' | 'realtime';
export type UpdateFrequency = 'slow' | 'medium' | 'fast' | 'none';

// Extended options for our authenticated queries
interface AuthenticatedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  /** Data freshness level - determines stale time */
  freshness?: DataFreshness;
  /** Update frequency - determines refetch interval */
  updateFrequency?: UpdateFrequency;
  /** Whether to refetch in background when tab is inactive */
  backgroundRefetch?: boolean;
  /** Custom error message for better UX */
  errorMessage?: string;
}

/**
 * Standardized authenticated query hook that eliminates boilerplate
 * and provides consistent React Query patterns across the app.
 * 
 * Features:
 * - Automatic authentication via authFetchJson
 * - Standardized stale times and refetch intervals
 * - Consistent error handling
 * - Auto-disable when user not authenticated
 * 
 * @param queryKey - React Query key array
 * @param url - API endpoint URL
 * @param options - Extended query options with our presets
 */
export function useAuthenticatedQuery<T = unknown>(
  queryKey: QueryKey,
  url: string,
  options: AuthenticatedQueryOptions<T> = {}
) {
  const { token } = useAuth();
  
  const {
    freshness = 'dynamic',
    updateFrequency = 'medium',
    backgroundRefetch = false,
    errorMessage,
    enabled = true,
    ...reactQueryOptions
  } = options;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        const result = await authFetchJson<T>(url);
        return result;
      } catch (error) {
        if (errorMessage && error instanceof Error) {
          throw new Error(`${errorMessage}: ${error.message}`);
        }
        throw error;
      }
    },
    staleTime: QUERY_DEFAULTS.STALE_TIMES[
      freshness === 'static' ? 'STATIC' : 
      freshness === 'realtime' ? 'REAL_TIME' : 'DYNAMIC'
    ],
    refetchInterval: updateFrequency === 'none' ? false : 
      QUERY_DEFAULTS.REFETCH_INTERVALS[
        updateFrequency === 'slow' ? 'SLOW' :
        updateFrequency === 'fast' ? 'FAST' : 'MEDIUM'
      ],
    refetchIntervalInBackground: backgroundRefetch,
    gcTime: QUERY_DEFAULTS.GC_TIME,
    enabled: !!token && enabled,
    ...reactQueryOptions,
  });
}

/**
 * Standardized authenticated mutation hook with consistent error handling
 * 
 * @param options - Mutation options with our enhancements
 */
export function useAuthenticatedMutation<TData = unknown, TVariables = void>(
  options: UseMutationOptions<TData, Error, TVariables> & {
    /** Custom error message prefix */
    errorMessage?: string;
  } = {}
) {
  const { errorMessage, ...mutationOptions } = options;
  
  return useMutation({
    ...mutationOptions,
    onError: (error, variables, context) => {
      // Enhanced error logging
      console.error('[useAuthenticatedMutation] Error:', {
        error: error.message,
        variables,
        context,
        customMessage: errorMessage
      });
      
      // Call original onError if provided
      mutationOptions.onError?.(error, variables, context);
    },
  });
}

/**
 * Hook for paginated authenticated queries with consistent patterns
 * TODO: Implement when we have paginated endpoints
 */
export function useAuthenticatedInfiniteQuery() {
  // Placeholder for future implementation
  throw new Error('useAuthenticatedInfiniteQuery not yet implemented');
}

// Type for standardized API responses (for APIs that use success/data pattern)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

/**
 * Specialized hook for APIs that return { success, data, error } format
 * Automatically unwraps the data field
 */
export function useAuthenticatedQueryWithUnwrap<TData = unknown>(
  queryKey: QueryKey,
  url: string,
  options: AuthenticatedQueryOptions<TData> = {}
) {
  return useAuthenticatedQuery<TData>(
    queryKey,
    url,
    {
      ...options,
      // Override the default queryFn to handle unwrapping
      select: (response: unknown) => {
        const apiResponse = response as ApiResponse<TData>;
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'Request failed');
        }
        return apiResponse.data;
      }
    }
  );
}

// Utility function for creating standardized query keys
export function createQueryKey(resource: string, ...identifiers: (string | number | object | undefined)[]): QueryKey {
  // Filter out undefined values and normalize objects to JSON strings for stable keys
  const normalizedIdentifiers = identifiers
    .filter(id => id !== undefined)
    .map(id => typeof id === 'object' ? JSON.stringify(id) : id);
    
  return [resource, ...normalizedIdentifiers];
}

// Helper for conditional enabling based on required parameters
export function enabledWhen(...conditions: unknown[]): boolean {
  return conditions.every(condition => {
    if (typeof condition === 'string') return condition.trim().length > 0;
    if (typeof condition === 'number') return condition > 0;
    return !!condition;
  });
}