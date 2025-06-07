import crypto from 'crypto';
import { query } from '../db';

/**
 * Generate a unique connect code for a community using group count as nonce
 * Each registration increments the count, invalidating previous codes
 */
export async function generateConnectCode(communityId: string): Promise<string> {
  const secret = process.env.TELEGRAM_CONNECT_SECRET;
  if (!secret) {
    throw new Error('TELEGRAM_CONNECT_SECRET environment variable is required');
  }

  // Get current group count as nonce (0-indexed)
  const result = await query(
    'SELECT COUNT(*) FROM telegram_groups WHERE community_id = $1 AND is_active = true',
    [communityId]
  );
  const nonce = parseInt(result.rows[0].count);
  
  console.log(`[ConnectCode] Generating code for community ${communityId} with nonce ${nonce}`);
  
  const payload = `${communityId}:${nonce}`;
  
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
export async function validateConnectCode(code: string, communityId: string): Promise<boolean> {
  try {
    const expectedCode = await generateConnectCode(communityId);
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
      if (await validateConnectCode(code, community.id)) {
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