import { useState, useCallback, useRef, useEffect } from 'react';

// ===== TYPES =====

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isIdle: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface AsyncActions<T> {
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export interface UseAsyncStateOptions {
  initialData?: any;
  resetOnExecute?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

// ===== HOOK =====

export const useAsyncState = <T = any>(
  options: UseAsyncStateOptions = {}
): AsyncState<T> & AsyncActions<T> => {
  const {
    initialData = null,
    resetOnExecute = true,
    onSuccess,
    onError
  } = options;

  // ===== STATE =====

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== REFS =====

  const executeCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ===== COMPUTED STATE =====

  const isIdle = !isLoading && !error && data === initialData;
  const isSuccess = !isLoading && !error && data !== null;
  const isError = !isLoading && error !== null;

  // ===== ACTIONS =====

  const setData_ = useCallback((newData: T | null) => {
    setData(newData);
    if (newData !== null && onSuccess) {
      onSuccess(newData);
    }
  }, [onSuccess]);

  const setError_ = useCallback((newError: string | null) => {
    setError(newError);
    if (newError && onError) {
      onError(newError);
    }
  }, [onError]);

  const setLoading_ = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setError(null);
    executeCountRef.current = 0;
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [initialData]);

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Increment execute count for race condition handling
    const currentExecuteCount = ++executeCountRef.current;

    try {
      // Reset state if configured to do so
      if (resetOnExecute) {
        setError(null);
        setData(initialData);
      }

      setIsLoading(true);

      // Execute the async function
      const result = await asyncFn();

      // Only update state if this is still the latest execution
      if (currentExecuteCount === executeCountRef.current && !abortController.signal.aborted) {
        setData_(result);
        setIsLoading(false);
        return result;
      }

      return null;
    } catch (err) {
      // Only update state if this is still the latest execution
      if (currentExecuteCount === executeCountRef.current && !abortController.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError_(errorMessage);
        setIsLoading(false);
      }
      return null;
    } finally {
      // Clean up abort controller if it's still the current one
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [resetOnExecute, initialData, setData_, setError_]);

  // ===== CLEANUP =====

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ===== RETURN =====

  return {
    // State
    data,
    isLoading,
    error,
    isIdle,
    isSuccess,
    isError,
    // Actions
    execute,
    setData: setData_,
    setError: setError_,
    setLoading: setLoading_,
    reset
  };
};

// ===== CONVENIENCE HOOKS =====

// Hook specifically for API calls
export const useApiCall = <T = any>(options?: UseAsyncStateOptions) => {
  return useAsyncState<T>({
    resetOnExecute: true,
    ...options
  });
};

// Hook for operations that shouldn't reset data on execute
export const useAsyncAction = <T = any>(options?: UseAsyncStateOptions) => {
  return useAsyncState<T>({
    resetOnExecute: false,
    ...options
  });
};

// Hook with automatic retry capability
export const useAsyncWithRetry = <T = any>(
  maxRetries: number = 3,
  retryDelay: number = 1000,
  options?: UseAsyncStateOptions
) => {
  const asyncState = useAsyncState<T>(options);

  const executeWithRetry = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncState.execute(asyncFn);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // If all retries failed, set the error
    if (lastError) {
      asyncState.setError(`Failed after ${maxRetries + 1} attempts: ${lastError.message}`);
    }

    return null;
  }, [asyncState, maxRetries, retryDelay]);

  return {
    ...asyncState,
    executeWithRetry
  };
};

// ===== UTILITY FUNCTIONS =====

// Helper to create a promise that rejects after a timeout
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Helper to create debounced async execution
export const useDebouncedAsync = <T = any>(
  delay: number = 300,
  options?: UseAsyncStateOptions
) => {
  const asyncState = useAsyncState<T>(options);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedExecute = useCallback((asyncFn: () => Promise<T>) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      asyncState.execute(asyncFn);
    }, delay);
  }, [asyncState, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...asyncState,
    debouncedExecute
  };
};