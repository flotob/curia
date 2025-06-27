import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/utils/authFetch';
import { TippingEligibilityResponse, TippingEligibilityError, UseTippingEligibilityResult } from '@/types/tipping';

/**
 * React hook for checking user tipping eligibility
 * Fetches data from /api/users/[userId]/tipping-eligibility
 * 
 * @param userId - The user ID to check tipping eligibility for
 * @param enabled - Whether to automatically fetch data (default: true)
 */
export function useTippingEligibility(
  userId: string | null | undefined, 
  enabled: boolean = true
): UseTippingEligibilityResult {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TippingEligibilityResponse | null>(null);
  const [error, setError] = useState<TippingEligibilityError | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (!userId || !token) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useTippingEligibility] Fetching eligibility for user: ${userId}`);
      
      const response = await authFetch(`/api/users/${userId}/tipping-eligibility`, {
        method: 'GET',
        token: token,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const eligibilityData = await response.json();
      console.log(`[useTippingEligibility] Received eligibility data:`, eligibilityData);
      
      setData(eligibilityData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[useTippingEligibility] Error fetching eligibility for user ${userId}:`, err);
      
      setError({
        error: errorMessage,
        details: err
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (enabled && userId && token) {
      fetchEligibility();
    }
  }, [enabled, fetchEligibility, userId, token]);

  const refetch = useCallback(async () => {
    await fetchEligibility();
  }, [fetchEligibility]);

  return {
    isLoading,
    data,
    error,
    refetch
  };
} 