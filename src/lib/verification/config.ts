/// <reference types="node" />

/**
 * Verification Configuration
 * 
 * Centralized configuration for verification settings including expiration durations,
 * retry policies, and context-specific settings.
 */

export interface VerificationConfig {
  expiration: {
    post: number;    // Hours
    board: number;   // Hours
    default: number; // Hours
  };
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
  limits: {
    maxVerificationsPerUser: number;
    maxVerificationsPerHour: number;
  };
}

// Default configuration - can be overridden by environment variables or database settings
const DEFAULT_CONFIG: VerificationConfig = {
  expiration: {
    post: 0.5,     // 30 minutes default (was hardcoded)
    board: 4,      // 4 hours default (was hardcoded)
    default: 1,    // 1 hour default
  },
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
  limits: {
    maxVerificationsPerUser: 100,
    maxVerificationsPerHour: 50,
  }
};

/**
 * Get verification configuration
 * In the future, this could load from database or external configuration service
 */
export function getVerificationConfig(): VerificationConfig {
  return DEFAULT_CONFIG;
}

/**
 * Override configuration values (for environment variable support)
 */
export function configureVerification(overrides: Partial<VerificationConfig>): void {
  if (overrides.expiration) {
    Object.assign(DEFAULT_CONFIG.expiration, overrides.expiration);
  }
  if (overrides.retry) {
    Object.assign(DEFAULT_CONFIG.retry, overrides.retry);
  }
  if (overrides.limits) {
    Object.assign(DEFAULT_CONFIG.limits, overrides.limits);
  }
}

/**
 * Get expiration duration for a specific context
 */
export function getExpirationHours(context: 'post' | 'board' | 'default'): number {
  const config = getVerificationConfig();
  return config.expiration[context];
}

/**
 * Calculate expiration date for verification
 */
export function calculateExpirationDate(context: 'post' | 'board' | 'default'): Date {
  const hours = getExpirationHours(context);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Get board-specific expiration duration
 * In the future, this could check board settings for custom durations
 */
export async function getBoardExpirationHours(boardId: number): Promise<number> {
  // TODO: Implement board-specific settings lookup
  // const boardSettings = await getBoardSettings(boardId);
  // return boardSettings.verification?.durationHours || getExpirationHours('board');
  
  return getExpirationHours('board');
}

/**
 * Calculate board-specific expiration date
 */
export async function calculateBoardExpirationDate(boardId: number): Promise<Date> {
  const hours = await getBoardExpirationHours(boardId);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Validation helpers
 */
export function isValidExpirationDuration(hours: number): boolean {
  return hours > 0 && hours <= 168; // Max 1 week
}

export function normalizeExpirationDuration(hours: number): number {
  if (hours <= 0) return getExpirationHours('default');
  if (hours > 168) return 168; // Cap at 1 week
  return hours;
}