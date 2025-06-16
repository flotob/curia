import { LockWithStats } from './locks';

/**
 * Individual lock verification status for board access
 */
export interface LockVerificationStatus {
  lockId: number;
  lock: LockWithStats;
  verificationStatus: 'not_started' | 'in_progress' | 'verified' | 'expired' | 'failed';
  verifiedAt?: string;
  expiresAt?: string;
  nextAction?: {
    type: 'connect_wallet' | 'verify_requirements' | 'retry_verification';
    label: string;
  };
}

/**
 * Overall board verification status for a user
 */
export interface BoardVerificationStatus {
  boardId: number;
  hasWriteAccess: boolean;
  fulfillmentMode: 'any' | 'all';
  verificationDuration: number; // hours
  lockStatuses: LockVerificationStatus[];
  verifiedCount: number;
  requiredCount: number;
  expiresAt?: string; // When the overall access expires
  nextExpiryAt?: string; // When the next lock expires
}

/**
 * API response for board verification status
 */
export interface BoardVerificationApiResponse {
  success: boolean;
  data?: BoardVerificationStatus;
  error?: string;
} 