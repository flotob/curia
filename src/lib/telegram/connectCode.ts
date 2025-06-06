import crypto from 'crypto';
import { query } from '../db';

/**
 * Generate a unique connect code for a community
 * Format: 12-character hex string, rotates daily
 */
export function generateConnectCode(communityId: string): string {
  const secret = process.env.TELEGRAM_CONNECT_SECRET;
  if (!secret) {
    throw new Error('TELEGRAM_CONNECT_SECRET environment variable is required');
  }

  // Use current date for daily rotation
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const payload = `${communityId}:${today}`;
  
  const hash = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 12)
    .toUpperCase();
    
  return hash;
}

/**
 * Validate a connect code for a specific community
 */
export function validateConnectCode(code: string, communityId: string): boolean {
  try {
    const expectedCode = generateConnectCode(communityId);
    return code.toUpperCase() === expectedCode;
  } catch (error) {
    console.error('[ConnectCode] Validation error:', error);
    return false;
  }
}

/**
 * Find which community a connect code belongs to by testing all communities
 * Returns community ID if found, null if invalid
 */
export async function findCommunityByConnectCode(code: string): Promise<string | null> {
  try {
    // Get all community IDs
    const result = await query('SELECT id FROM communities');
    const communities = result.rows;
    
    // Test code against each community
    for (const community of communities) {
      if (validateConnectCode(code, community.id)) {
        return community.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[ConnectCode] Error finding community:', error);
    return null;
  }
}

/**
 * Format connect code for display (adds dashes for readability)
 * Example: ABC123DEF456 → ABC1-23DE-F456
 */
export function formatConnectCodeForDisplay(code: string): string {
  if (code.length !== 12) return code;
  return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
}

/**
 * Clean connect code input (remove dashes, normalize case)
 */
export function cleanConnectCodeInput(input: string): string {
  return input.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Validate connect code format (12 hex characters)
 */
export function isValidConnectCodeFormat(code: string): boolean {
  const cleaned = cleanConnectCodeInput(code);
  return /^[A-F0-9]{12}$/.test(cleaned);
}

/**
 * Get bot name from environment for UI display
 */
export function getBotName(): string {
  return process.env.TELEGRAM_BOT_NAME || 'Common Ground Bot';
} 