/**
 * Semantic URL Service
 * 
 * Handles generation, resolution, and management of semantic URLs using
 * the database-backed links table. Provides clean, human-readable URLs
 * for forum posts while maintaining all necessary context for Common Ground
 * routing and analytics.
 */

import { query } from './db';

/**
 * Represents a semantic URL record from the database
 */
export interface SemanticUrlData {
  id: number;
  slug: string;
  communityShortId: string;
  boardSlug: string;
  postId: number;
  boardId: number;
  pluginId: string;
  shareToken: string;
  postTitle: string;
  boardName: string;
  sharedByUserId?: string;
  shareSource?: string;
  accessCount: number;
  createdAt: Date;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  communityShortIdHistory: string[]; // 🆕 Historical community short IDs for migration
}

/**
 * Parameters for creating a new semantic URL
 */
export interface CreateSemanticUrlParams {
  postId: number;
  postTitle: string;
  boardId: number;
  boardName: string;
  communityShortId: string;
  pluginId: string;
  sharedByUserId?: string;
  shareSource?: string;
  expiresIn?: string; // '7d', '30d', 'never'
  customSlug?: string;
}

/**
 * Database row structure for links table
 */
interface LinkDbRow {
  id: number;
  slug: string;
  community_short_id: string;
  board_slug: string;
  post_id: number;
  board_id: number;
  plugin_id: string;
  share_token: string;
  post_title: string;
  board_name: string;
  shared_by_user_id?: string;
  share_source?: string;
  access_count: number;
  created_at: Date;
  last_accessed_at?: Date;
  expires_at?: Date;
  community_shortid_history: string[]; // 🆕 Historical community short IDs array
}

/**
 * Service for managing semantic URLs with database persistence
 */
export class SemanticUrlService {
  /**
   * Create or retrieve semantic URL with automatic community ID migration
   * 
   * This method checks if a semantic URL already exists for the given post.
   * If it exists but has a different community short ID, it automatically
   * migrates ALL records for that community to use the new community short ID
   * while preserving the old one in the history for backward compatibility.
   * 
   * @param params - Configuration for the semantic URL
   * @returns Promise resolving to semantic URL data (created or migrated)
   * 
   * @example
   * ```typescript
   * // Post already has URL with old community ID "alpha"
   * // User context now has community ID "alpha-dao" 
   * const semanticUrl = await SemanticUrlService.createOrUpdate({
   *   postId: 34,
   *   communityShortId: 'alpha-dao', // New community short ID
   *   // ... other params
   * });
   * // Result: ALL URLs for "alpha" community migrated to "alpha-dao"
   * // Old "alpha" preserved in history for backward compatibility
   * ```
   */
  static async createOrUpdate(params: CreateSemanticUrlParams): Promise<SemanticUrlData> {
    const { postId, communityShortId } = params;
    
    try {
      // Check if URL already exists for this post
      const existingUrl = await this.findByPostId(postId);
      
      if (existingUrl) {
        // Check if community short ID has changed
        if (existingUrl.communityShortId !== communityShortId) {
          console.log(`[SemanticUrlService] Community short ID changed: ${existingUrl.communityShortId} → ${communityShortId}`);
          
          // 🆕 Migrate ALL records for this community (bulk operation)
          const migrationResult = await this.migrateCommunityBulk(
            existingUrl.communityShortId,
            communityShortId
          );
          
          console.log(`[SemanticUrlService] Bulk migration completed: ${migrationResult.migratedCount} records updated`);
          
          // Return the specific record that was requested (now migrated)
          const updatedUrl = await this.findByPostId(postId);
          if (!updatedUrl) {
            throw new Error(`Post ${postId} not found after migration`);
          }
          
          return updatedUrl;
        }
        
        // No change needed, return existing
        console.log(`[SemanticUrlService] Using existing semantic URL for post ${postId}`);
        return existingUrl;
      }
      
      // Create new URL (original flow)
      return await this.create(params);
      
    } catch (error) {
      console.error('[SemanticUrlService] Error in createOrUpdate:', error);
      throw new Error(`Failed to create or update semantic URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Migrate community short ID and update history
   * 
   * Updates an existing semantic URL record to use a new community short ID
   * while preserving the old short ID in the history array for backward compatibility.
   * 
   * @param linkId - Database ID of the link record to update
   * @param newCommunityShortId - New community short ID to use
   * @param oldCommunityShortId - Old community short ID to preserve in history
   * @returns Promise resolving to updated semantic URL data
   */
  static async migrateCommunityShortId(
    linkId: number,
    newCommunityShortId: string,
    oldCommunityShortId: string
  ): Promise<SemanticUrlData> {
    // Validate input parameters
    if (!linkId || !newCommunityShortId || !oldCommunityShortId) {
      throw new Error('Invalid parameters for community short ID migration');
    }
    
    if (newCommunityShortId === oldCommunityShortId) {
      throw new Error('New and old community short IDs are identical - no migration needed');
    }
    
    try {
      // Use atomic update to prevent race conditions
      const result = await query(`
        UPDATE links
        SET 
          community_short_id = $2,
          community_shortid_history = 
            CASE 
              WHEN $3::text = ANY(community_shortid_history) THEN community_shortid_history
              ELSE community_shortid_history || $3::text
            END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [linkId, newCommunityShortId, oldCommunityShortId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to migrate community short ID for link ${linkId} - record not found`);
      }
      
      const migratedUrl = this.mapDbResult(result.rows[0]);
      
      console.log(`[SemanticUrlService] Successfully migrated link ${linkId}: ${oldCommunityShortId} → ${newCommunityShortId}`);
      console.log(`[SemanticUrlService] History now contains: [${migratedUrl.communityShortIdHistory.join(', ')}]`);
      
      return migratedUrl;
      
    } catch (error) {
      console.error(`[SemanticUrlService] Failed to migrate community short ID for link ${linkId}:`, error);
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Bulk migrate ALL records for a community to new short ID
   * 
   * When a community changes its short ID, this method efficiently updates
   * ALL semantic URL records for that community in a single database operation.
   * This prevents the need to migrate records one-by-one as they're accessed.
   * 
   * @param oldCommunityShortId - Old community short ID to migrate from
   * @param newCommunityShortId - New community short ID to migrate to
   * @returns Promise resolving to migration statistics
   * 
   * @example
   * ```typescript
   * // Migrate all "alpha" community records to "alpha-dao"
   * const result = await SemanticUrlService.migrateCommunityBulk('alpha', 'alpha-dao');
   * // { migratedCount: 42, oldShortId: 'alpha', newShortId: 'alpha-dao' }
   * ```
   */
  static async migrateCommunityBulk(
    oldCommunityShortId: string,
    newCommunityShortId: string
  ): Promise<{ migratedCount: number; oldShortId: string; newShortId: string }> {
    // Validate input parameters
    if (!oldCommunityShortId || !newCommunityShortId) {
      throw new Error('Invalid parameters for bulk community migration');
    }
    
    if (oldCommunityShortId === newCommunityShortId) {
      console.log(`[SemanticUrlService] No migration needed: community short ID unchanged (${oldCommunityShortId})`);
      return { migratedCount: 0, oldShortId: oldCommunityShortId, newShortId: newCommunityShortId };
    }
    
    try {
      console.log(`[SemanticUrlService] Starting bulk migration: ${oldCommunityShortId} → ${newCommunityShortId}`);
      
      // Use atomic bulk update to migrate all records for this community
      const result = await query(`
        UPDATE links
        SET 
          community_short_id = $1,
          community_shortid_history = 
            CASE 
              WHEN $2::text = ANY(community_shortid_history) THEN community_shortid_history
              ELSE community_shortid_history || $2::text
            END,
          updated_at = NOW()
        WHERE community_short_id = $2
          AND (expires_at IS NULL OR expires_at > NOW())
      `, [newCommunityShortId, oldCommunityShortId]);
      
      const migratedCount = result.rowCount || 0;
      
      if (migratedCount > 0) {
        console.log(`[SemanticUrlService] Bulk migration successful: ${migratedCount} records migrated from ${oldCommunityShortId} to ${newCommunityShortId}`);
      } else {
        console.log(`[SemanticUrlService] No records found to migrate for community: ${oldCommunityShortId}`);
      }
      
      return {
        migratedCount,
        oldShortId: oldCommunityShortId,
        newShortId: newCommunityShortId
      };
      
    } catch (error) {
      console.error(`[SemanticUrlService] Bulk migration failed for community ${oldCommunityShortId}:`, error);
      throw new Error(`Bulk migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a new semantic URL and store in database
   * 
   * @param params - Configuration for the semantic URL
   * @returns Promise resolving to the created semantic URL data
   * 
   * @example
   * ```typescript
   * const semanticUrl = await SemanticUrlService.create({
   *   postId: 34,
   *   postTitle: 'Introducing New Governance Proposal',
   *   boardId: 389,
   *   boardName: 'General Discussion',
   *   communityShortId: 'commonground',
   *   pluginId: '6434de36-4e59-40ba-971b-d4ac5f6050bf',
   *   shareSource: 'direct_share'
   * });
   * // Results in URL: /c/commonground/general-discussion/introducing-new-governance-proposal
   * ```
   */
  static async create(params: CreateSemanticUrlParams): Promise<SemanticUrlData> {
    const {
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId,
      pluginId,
      sharedByUserId,
      shareSource = 'direct_share',
      expiresIn,
      customSlug
    } = params;
    
    // Validate required parameters
    if (!postId || !postTitle || !boardId || !boardName || !communityShortId || !pluginId) {
      throw new Error('Missing required parameters for semantic URL creation');
    }
    
    try {
      // Generate URL-safe slugs
      const boardSlug = this.createSlug(boardName);
      const baseSlug = customSlug || this.createSlug(postTitle);
      
      // Handle slug collisions by appending numbers if needed
      const slug = await this.ensureUniqueSlug(communityShortId, boardSlug, baseSlug);
      
      // Calculate expiration date if specified
      const expiresAt = this.calculateExpiration(expiresIn);
      
      // Generate unique share token
      const shareToken = this.generateShareToken();
      
      // Insert into database with initial community short ID in history
      const result = await query(`
        INSERT INTO links (
          slug, community_short_id, board_slug, post_id, board_id,
          plugin_id, share_token, post_title, board_name,
          shared_by_user_id, share_source, expires_at, community_shortid_history
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ARRAY[$13::text])
        RETURNING *
      `, [
        slug, communityShortId, boardSlug, postId, boardId,
        pluginId, shareToken, postTitle, boardName,
        sharedByUserId || null, shareSource, expiresAt ? expiresAt.toISOString() : null,
        communityShortId // $13 - for the initial history array
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create semantic URL - no rows returned');
      }
      
      const createdUrl = this.mapDbResult(result.rows[0]);
      
      console.log(`[SemanticUrlService] Created semantic URL: /c/${communityShortId}/${boardSlug}/${slug} → post ${postId}`);
      
      return createdUrl;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error creating semantic URL:', error);
      throw new Error(`Failed to create semantic URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Resolve a semantic URL path to full context data with historical short ID support
   * 
   * This method first attempts to resolve using the current community short ID.
   * If not found, it searches through historical community short IDs for backward
   * compatibility with old links.
   * 
   * @param path - The semantic URL path (e.g., "/c/community/board/slug")
   * @returns Promise resolving to semantic URL data or null if not found
   * 
   * @example
   * ```typescript
   * // Works with current short ID
   * const result = await SemanticUrlService.resolve('/c/alpha-dao/general/my-post');
   * 
   * // Also works with historical short ID (automatically migrated)
   * const oldResult = await SemanticUrlService.resolve('/c/alpha/general/my-post');
   * // Both return the same record with communityShortId = 'alpha-dao'
   * ```
   */
  static async resolve(path: string): Promise<SemanticUrlData | null> {
    try {
      // Parse semantic URL path: "/c/community/board/slug"
      const pathMatch = path.match(/^\/c\/([^\/]+)\/([^\/]+)\/(.+)$/);
      if (!pathMatch) {
        console.warn(`[SemanticUrlService] Invalid semantic URL format: ${path}`);
        return null;
      }
      
      const [, communityShortId, boardSlug, slug] = pathMatch;
      
      // First try current community short ID
      let result = await this.findByPath(communityShortId, boardSlug, slug);
      
      if (!result) {
        // Try to find by historical community short IDs
        result = await this.findByHistoricalPath(communityShortId, boardSlug, slug);
        
        if (result) {
          console.log(`[SemanticUrlService] Found link via historical short ID: ${communityShortId} → ${result.communityShortId}`);
          // Note: The redirect will happen at the resolution layer (in the page handler)
        }
      }
      
      if (result) {
        console.log(`[SemanticUrlService] Resolved ${path} → post ${result.postId}, board ${result.boardId}`);
      } else {
        console.warn(`[SemanticUrlService] Semantic URL not found: ${path}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error resolving semantic URL:', error);
      return null;
    }
  }
  
  /**
   * Find semantic URL by current community short ID, board slug, and slug
   * 
   * @param communityShortId - Current community short ID
   * @param boardSlug - Board slug
   * @param slug - Post slug
   * @returns Promise resolving to semantic URL data or null if not found
   */
  private static async findByPath(
    communityShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<SemanticUrlData | null> {
    try {
      const result = await query(`
        SELECT * FROM links
        WHERE community_short_id = $1 
          AND board_slug = $2 
          AND slug = $3
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `, [communityShortId, boardSlug, slug]);
      
      return result.rows.length > 0 ? this.mapDbResult(result.rows[0]) : null;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error finding by path:', error);
      return null;
    }
  }
  
  /**
   * Find semantic URL by historical community short ID
   * 
   * Searches through the community_shortid_history array to find URLs
   * that were created with an old community short ID but are still valid.
   * 
   * @param historicalShortId - Historical community short ID to search for
   * @param boardSlug - Board slug
   * @param slug - Post slug
   * @returns Promise resolving to semantic URL data or null if not found
   */
  private static async findByHistoricalPath(
    historicalShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<SemanticUrlData | null> {
    // Validate input parameters
    if (!historicalShortId || !boardSlug || !slug) {
      console.warn('[SemanticUrlService] Invalid parameters for historical path lookup');
      return null;
    }
    
    try {
      const result = await query(`
        SELECT * FROM links
        WHERE $1::text = ANY(community_shortid_history)
          AND board_slug = $2
          AND slug = $3
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `, [historicalShortId, boardSlug, slug]);
      
      return result.rows.length > 0 ? this.mapDbResult(result.rows[0]) : null;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error finding by historical path:', error);
      return null;
    }
  }
  
  /**
   * Record an access to a semantic URL for analytics tracking
   * 
   * @param id - The ID of the semantic URL record
   * @returns Promise that resolves when access is recorded
   */
  static async recordAccess(id: number): Promise<void> {
    try {
      await query(`
        UPDATE links 
        SET access_count = access_count + 1, 
            last_accessed_at = NOW()
        WHERE id = $1
      `, [id]);
      
      console.log(`[SemanticUrlService] Recorded access for semantic URL ID: ${id}`);
      
    } catch (error) {
      console.error('[SemanticUrlService] Error recording access:', error);
      // Don't throw here - analytics failures shouldn't break URL resolution
    }
  }
  
  /**
   * Get analytics data for a semantic URL
   * 
   * @param id - The ID of the semantic URL record
   * @returns Promise resolving to basic analytics data
   */
  static async getAnalytics(id: number): Promise<Pick<SemanticUrlData, 'accessCount' | 'createdAt' | 'lastAccessedAt' | 'shareSource'> | null> {
    try {
      const result = await query(`
        SELECT access_count, created_at, last_accessed_at, share_source
        FROM links
        WHERE id = $1
      `, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        accessCount: row.access_count,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
        shareSource: row.share_source
      };
      
    } catch (error) {
      console.error('[SemanticUrlService] Error getting analytics:', error);
      return null;
    }
  }
  
  /**
   * Find existing semantic URL for a post
   * 
   * @param postId - The post ID to search for
   * @returns Promise resolving to existing semantic URL data or null
   */
  static async findByPostId(postId: number): Promise<SemanticUrlData | null> {
    try {
      const result = await query(`
        SELECT * FROM links
        WHERE post_id = $1 
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `, [postId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapDbResult(result.rows[0]);
      
    } catch (error) {
      console.error('[SemanticUrlService] Error finding semantic URL by post ID:', error);
      return null;
    }
  }
  
  /**
   * Create a URL-safe slug from text
   * 
   * @param text - Input text to convert to slug
   * @returns URL-safe slug string
   * 
   * @example
   * ```typescript
   * SemanticUrlService.createSlug('General Discussion & Feedback');
   * // Returns: "general-discussion-feedback"
   * ```
   */
  private static createSlug(text: string): string {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided for slug creation');
    }
    
    return text
      .toLowerCase()
      .trim()
      // Replace multiple whitespace with single space
      .replace(/\s+/g, ' ')
      // Remove special characters except alphanumeric, spaces, and hyphens
      .replace(/[^\w\s-]/g, '')
      // Replace spaces with hyphens
      .replace(/\s+/g, '-')
      // Collapse multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length to prevent overly long URLs
      .substring(0, 100)
      || 'untitled'; // Fallback if slug becomes empty
  }
  
  /**
   * Ensure slug is unique within community/board context by appending numbers
   * 
   * @param communityShortId - Community identifier
   * @param boardSlug - Board slug
   * @param baseSlug - Base slug to make unique
   * @returns Promise resolving to unique slug
   */
  private static async ensureUniqueSlug(
    communityShortId: string,
    boardSlug: string,
    baseSlug: string
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    
    // Keep trying with incrementing numbers until we find a unique slug
    while (await this.slugExists(communityShortId, boardSlug, slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Safety valve to prevent infinite loops
      if (counter > 1000) {
        throw new Error('Unable to generate unique slug after 1000 attempts');
      }
    }
    
    return slug;
  }
  
  /**
   * Check if a slug already exists globally (due to unique constraint on slug field)
   * 
   * @param communityShortId - Community identifier (unused, kept for API compatibility)
   * @param boardSlug - Board slug (unused, kept for API compatibility)
   * @param slug - Slug to check
   * @returns Promise resolving to true if slug exists
   */
  private static async slugExists(
    communityShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<boolean> {
    try {
      // Check for global slug uniqueness due to database constraint
      const result = await query(`
        SELECT 1 FROM links
        WHERE slug = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `, [slug]);
      
      return result.rows.length > 0;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error checking slug existence:', error);
      // If we can't check, assume it doesn't exist to avoid blocking creation
      return false;
    }
  }
  
  /**
   * Generate a unique share token for a semantic URL
   * 
   * @returns Unique share token string
   */
  private static generateShareToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `semantic_${timestamp}_${random}`;
  }
  
  /**
   * Calculate expiration date from string specification
   * 
   * @param expiresIn - Expiration specification ('7d', '30d', 'never', etc.)
   * @returns Date object or null for no expiration
   */
  private static calculateExpiration(expiresIn?: string): Date | null {
    if (!expiresIn || expiresIn === 'never') {
      return null;
    }
    
    const now = new Date();
    
    switch (expiresIn) {
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '1h':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        console.warn(`[SemanticUrlService] Unknown expiration format: ${expiresIn}`);
        return null;
    }
  }
  
  /**
   * Map database result row to TypeScript interface
   * 
   * @param row - Database row result
   * @returns Typed SemanticUrlData object
   */
  private static mapDbResult(row: LinkDbRow): SemanticUrlData {
    return {
      id: row.id,
      slug: row.slug,
      communityShortId: row.community_short_id,
      boardSlug: row.board_slug,
      postId: row.post_id,
      boardId: row.board_id,
      pluginId: row.plugin_id,
      shareToken: row.share_token,
      postTitle: row.post_title,
      boardName: row.board_name,
      sharedByUserId: row.shared_by_user_id,
      shareSource: row.share_source,
      accessCount: row.access_count,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      expiresAt: row.expires_at,
      communityShortIdHistory: row.community_shortid_history || [] // 🆕 Map historical short IDs
    };
  }
  
  /**
   * Build full semantic URL from database record
   * 
   * @param semanticUrlData - Semantic URL data from database
   * @param baseUrl - Base URL for the application (optional)
   * @returns Complete semantic URL string
   */
  static buildFullUrl(semanticUrlData: SemanticUrlData, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_PLUGIN_BASE_URL || '';
    const path = `/c/${semanticUrlData.communityShortId}/${semanticUrlData.boardSlug}/${semanticUrlData.slug}`;
    
    return base ? `${base.replace(/\/$/, '')}${path}` : path;
  }
} 