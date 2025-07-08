import { query } from '@/lib/db';
import { UrlRecord, CreateUrlParams } from './types';

/**
 * DatabaseService handles direct database operations for semantic URLs
 * without HTTP API dependencies
 */
export class DatabaseService {

  /**
   * Create a new semantic URL record in the database
   */
  async createUrlRecord(params: CreateUrlParams): Promise<UrlRecord> {
    try {
      const result = await query(
        `INSERT INTO links (
          slug, community_short_id, board_slug, post_id, board_id, 
          plugin_id, share_token, post_title, board_name, 
          created_at, updated_at, access_count, share_source
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 0, $10
        ) RETURNING *`,
        [
          params.slug,
          params.community_short_id,
          params.board_slug,
          params.post_id,
          params.board_id,
          params.plugin_id,
          params.share_token,
          params.post_title,
          params.board_name,
          params.share_source
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to create URL record');
      }

      return this.mapRowToUrlRecord(result.rows[0]);
    } catch (error) {
      console.error('[DatabaseService] Error creating URL record:', error);
      throw new Error(`Failed to create URL record: ${error}`);
    }
  }

  /**
   * Find existing URL by post ID
   */
  async findUrlByPostId(postId: number): Promise<UrlRecord | null> {
    try {
      const result = await query(
        `SELECT * FROM links WHERE post_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [postId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUrlRecord(result.rows[0]);
    } catch (error) {
      console.error('[DatabaseService] Error finding URL by post ID:', error);
      return null;
    }
  }

  /**
   * Find multiple URLs by post IDs (for bulk operations)
   */
  async findUrlsByPostIds(postIds: number[]): Promise<Map<number, UrlRecord>> {
    if (postIds.length === 0) {
      return new Map();
    }

    try {
      const placeholders = postIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await query(
        `SELECT * FROM links WHERE post_id IN (${placeholders}) ORDER BY post_id, created_at DESC`,
        postIds
      );

      const urlMap = new Map<number, UrlRecord>();
      
      // Keep only the most recent URL for each post (in case of duplicates)
      for (const row of result.rows) {
        const postId = row.post_id;
        if (!urlMap.has(postId)) {
          urlMap.set(postId, this.mapRowToUrlRecord(row));
        }
      }

      return urlMap;
    } catch (error) {
      console.error('[DatabaseService] Error finding URLs by post IDs:', error);
      return new Map();
    }
  }

  /**
   * Update access count for a URL
   */
  async incrementAccessCount(linkId: number): Promise<void> {
    try {
      await query(
        `UPDATE links SET 
          access_count = access_count + 1, 
          last_accessed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1`,
        [linkId]
      );
    } catch (error) {
      console.error('[DatabaseService] Error incrementing access count:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Generate a unique share token for tracking
   */
  generateShareToken(postId: number, boardId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const data = `${postId}-${boardId}-${timestamp}`;
    
    // Simple encoding (matching existing logic)
    return btoa(data).replace(/[+/=]/g, '') + random;
  }

  /**
   * Check if a share token already exists (to ensure uniqueness)
   */
  async isShareTokenUnique(token: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT 1 FROM links WHERE share_token = $1 LIMIT 1`,
        [token]
      );
      return result.rows.length === 0;
    } catch (error) {
      console.error('[DatabaseService] Error checking share token uniqueness:', error);
      // If we can't check, assume it's not unique to be safe
      return false;
    }
  }

  /**
   * Generate a guaranteed unique share token
   */
  async generateUniqueShareToken(postId: number, boardId: number): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const token = this.generateShareToken(postId, boardId);
      const isUnique = await this.isShareTokenUnique(token);
      
      if (isUnique) {
        return token;
      }
      
      attempts++;
      // Add small delay to change timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Fallback: add a more specific random component
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extraRandom = Math.random().toString(36).substring(2);
    const data = `${postId}-${boardId}-${timestamp}-${extraRandom}`;
    
    return btoa(data).replace(/[+/=]/g, '') + random;
  }

  /**
   * Get URL statistics for analytics
   */
  async getUrlStats(linkId: number): Promise<{
    accessCount: number;
    createdAt: string;
    lastAccessedAt: string | null;
  } | null> {
    try {
      const result = await query(
        `SELECT access_count, created_at, last_accessed_at 
         FROM links WHERE id = $1`,
        [linkId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accessCount: row.access_count || 0,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at || null
      };
    } catch (error) {
      console.error('[DatabaseService] Error getting URL stats:', error);
      return null;
    }
  }

  /**
   * Clean up old or expired URLs (maintenance function)
   */
  async cleanupExpiredUrls(): Promise<number> {
    try {
      const result = await query(
        `DELETE FROM links 
         WHERE expires_at IS NOT NULL AND expires_at < NOW()`
      );

      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        console.log(`[DatabaseService] Cleaned up ${deletedCount} expired URLs`);
      }

      return deletedCount;
    } catch (error) {
      console.error('[DatabaseService] Error cleaning up expired URLs:', error);
      return 0;
    }
  }

  /**
   * Map database row to UrlRecord interface
   */
  private mapRowToUrlRecord(row: any): UrlRecord {
    return {
      id: row.id,
      slug: row.slug,
      community_short_id: row.community_short_id,
      board_slug: row.board_slug,
      post_id: row.post_id,
      board_id: row.board_id,
      plugin_id: row.plugin_id,
      share_token: row.share_token,
      post_title: row.post_title,
      board_name: row.board_name,
      created_at: row.created_at,
      access_count: row.access_count || 0,
      expires_at: row.expires_at || undefined
    };
  }
} 