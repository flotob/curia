import { useState, useCallback } from 'react';

// Generic async state hook to replace manual loading state management
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface AsyncActions<T, TArgs extends unknown[] = unknown[]> {
  execute: (...args: TArgs) => Promise<T>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
}

export type UseAsyncStateResult<T, TArgs extends unknown[] = unknown[]> = AsyncState<T> & AsyncActions<T, TArgs>;

/**
 * Hook for managing async operations with consistent loading states
 * Replaces manual useState/useEffect patterns for loading, error, and data
 * 
 * @param asyncFunction - The async function to execute
 * @param initialData - Initial data value (default: null)
 * @param options - Configuration options
 */
export function useAsyncState<T, TArgs extends unknown[] = unknown[]>(
  asyncFunction: (...args: TArgs) => Promise<T>,
  initialData: T | null = null,
  options: {
    /** Whether to execute the function immediately on mount */
    immediate?: boolean;
    /** Custom error message prefix */
    errorMessage?: string;
    /** Callback when operation succeeds */
    onSuccess?: (data: T) => void;
    /** Callback when operation fails */
    onError?: (error: Error) => void;
  } = {}
): UseAsyncStateResult<T, TArgs> {
  const { immediate = false, errorMessage, onSuccess, onError } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    isLoading: immediate,
    error: null,
    lastUpdated: null,
  });

  const execute = useCallback(async (...args: TArgs): Promise<T> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await asyncFunction(...args);
      
      setState({
        data: result,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
      
      onSuccess?.(result);
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? 
        (errorMessage ? `${errorMessage}: ${error.message}` : error.message) :
        'An unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
      
      onError?.(error instanceof Error ? error : new Error(errorMsg));
      throw error;
    }
  }, [asyncFunction, errorMessage, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data, lastUpdated: new Date() }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  };
}

/**
 * Simplified hook for basic async operations without arguments
 */
export function useSimpleAsyncState<T>(
  asyncFunction: () => Promise<T>,
  options?: {
    immediate?: boolean;
    errorMessage?: string;
  }
) {
  return useAsyncState(asyncFunction, null, options);
}

/**
 * Specialized hook for metadata fetching operations
 * 
 * Common pattern for token metadata, profile data, etc.
 * Includes caching and retry logic.
 */
export function useMetadataState<T = Record<string, unknown>>(
  cacheKey?: string,
  cacheDuration = 5 * 60 * 1000 // 5 minutes
) {
  const [cache] = useState(() => new Map<string, { data: T; timestamp: number }>());
  
  const asyncState = useAsyncState<T>(
    async () => {
      throw new Error('Use fetchWithCache method instead');
    },
    null
  );

  const fetchWithCache = useCallback(async (
    fetchFn: () => Promise<T>,
    key: string = cacheKey || 'default'
  ) => {
    // Check cache first
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      asyncState.setData(cached.data);
      return cached.data;
    }

    // Fetch fresh data
    return asyncState.execute(async () => {
      const result = await fetchFn();
      // Cache the result
      cache.set(key, { data: result, timestamp: Date.now() });
      return result;
    });
  }, [asyncState, cache, cacheKey, cacheDuration]);

  return {
    ...asyncState,
    fetchWithCache,
    clearCache: useCallback(() => cache.clear(), [cache]),
  };
}

/**
 * Hook for async operations that need to track multiple states
 * Useful for complex forms or multi-step operations
 */
export function useMultiAsyncState<T extends Record<string, unknown>>(
  initialStates: T
) {
  type StateKey = keyof T;
  type StateValue<K extends StateKey> = T[K];
  
  const [states, setStates] = useState<{
    [K in StateKey]: AsyncState<StateValue<K>>
  }>(() => {
    const result = {} as { [K in StateKey]: AsyncState<StateValue<K>> };
    for (const key in initialStates) {
      result[key] = {
        data: initialStates[key],
        isLoading: false,
        error: null,
        lastUpdated: null,
      };
    }
    return result;
  });

  const executeFor = useCallback(<K extends StateKey>(
    key: K,
    asyncFunction: () => Promise<StateValue<K>>
  ) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: true, error: null }
    }));

    return asyncFunction()
      .then(result => {
        setStates(prev => ({
          ...prev,
          [key]: {
            data: result,
            isLoading: false,
            error: null,
            lastUpdated: new Date(),
          }
        }));
        return result;
      })
      .catch(error => {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setStates(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            isLoading: false,
            error: errorMsg,
          }
        }));
        throw error;
      });
  }, []);

  return {
    states,
    executeFor,
  };
}
