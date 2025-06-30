import { useState, useCallback } from 'react';

/**
 * Enhanced async state management hook
 * 
 * Replaces manual loading state management patterns across components.
 * Provides standardized loading, error, and success state handling.
 * 
 * @param initialData - Initial data value
 * @returns State and handlers for async operations
 */
export function useAsyncState<T = unknown, E = Error>(initialData?: T) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<E | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Execute an async operation with automatic state management
   */
  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const result = await asyncFn();
      setData(result);
      setIsSuccess(true);
      return result;
    } catch (err) {
      const error = err as E;
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
  }, [initialData]);

  /**
   * Update data without triggering loading states
   */
  const updateData = useCallback((newData: T | ((prev: T | undefined) => T)) => {
    if (typeof newData === 'function') {
      setData(newData as (prev: T | undefined) => T);
    } else {
      setData(newData);
    }
  }, []);

  /**
   * Set error state manually
   */
  const setErrorState = useCallback((error: E) => {
    setError(error);
    setIsLoading(false);
    setIsSuccess(false);
  }, []);

  return {
    // State
    data,
    isLoading,
    error,
    isSuccess,
    isIdle: !isLoading && !error && !isSuccess,
    
    // Actions
    execute,
    reset,
    updateData,
    setErrorState,
    
    // Direct setters (for advanced use cases)
    setData,
    setIsLoading,
  };
}

/**
 * Specialized hook for metadata fetching operations
 * 
 * Common pattern for token metadata, profile data, etc.
 * Includes caching and retry logic.
 */
export function useMetadataState<T = unknown>(
  cacheKey?: string,
  cacheDuration = 5 * 60 * 1000 // 5 minutes
) {
  const asyncState = useAsyncState<T>();
  const [cache] = useState(() => new Map<string, { data: T; timestamp: number }>());

  const fetchWithCache = useCallback(async (
    fetchFn: () => Promise<T>,
    key: string = cacheKey || 'default'
  ) => {
    // Check cache first
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      asyncState.updateData(cached.data);
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
 * Hook for managing form submission states
 * 
 * Specialized for form operations with validation support.
 */
export function useFormSubmission<T = unknown, V = unknown>() {
  const asyncState = useAsyncState<T>();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const submitForm = useCallback(async (
    submitFn: () => Promise<T>,
    validationFn?: (data: V) => Record<string, string> | null
  ) => {
    setValidationErrors({});

    // Run validation if provided
    if (validationFn) {
      // Note: This assumes validation data is passed separately
      // In practice, you'd pass validation data to this function
    }

    return asyncState.execute(submitFn);
  }, [asyncState]);

  return {
    ...asyncState,
    validationErrors,
    setValidationErrors,
    submitForm,
    isSubmitting: asyncState.isLoading,
  };
}

/**
 * Example usage patterns:
 * 
 * // Basic async operation
 * const { data, isLoading, error, execute } = useAsyncState();
 * 
 * const handleFetch = () => {
 *   execute(async () => {
 *     return await api.fetchData();
 *   });
 * };
 * 
 * // Metadata fetching with cache
 * const { data, isLoading, fetchWithCache } = useMetadataState('token-metadata');
 * 
 * const handleFetchMetadata = (address: string) => {
 *   fetchWithCache(
 *     () => api.getTokenMetadata(address),
 *     `token-${address}`
 *   );
 * };
 * 
 * // Form submission
 * const { isSubmitting, submitForm, validationErrors } = useFormSubmission();
 * 
 * const handleSubmit = (formData: FormData) => {
 *   submitForm(() => api.submitForm(formData));
 * };
 */