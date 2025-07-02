/**
 * TypeScript types for the tipping system
 */

export interface TippingEligibilityResponse {
  userId: string;
  eligible: boolean;
  upAddress?: string;
  verifiedAt?: string;
  source?: 'common_ground_profile' | 'lock_verification' | 'up_name_resolution';
  reason?: string;
  timestamp: string;
}

export interface TippingEligibilityError {
  error: string;
  details?: unknown;
}

/**
 * Hook return type for tipping eligibility
 */
export interface UseTippingEligibilityResult {
  isLoading: boolean;
  data: TippingEligibilityResponse | null;
  error: TippingEligibilityError | null;
  refetch: () => Promise<void>;
}

/**
 * Tipping flow states
 */
export type TippingMode = 'button' | 'interface';

export interface TippingState {
  mode: TippingMode;
  recipientUserId: string;
  recipientUpAddress: string | null;
  isEligible: boolean;
} 