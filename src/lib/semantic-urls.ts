/**
 * Semantic URL Service
 * 
 * Handles generation, resolution, and management of semantic URLs using
 * the database-backed links table. Provides clean, human-readable URLs
 * for forum posts while maintaining all necessary context for Common Ground
 * routing and analytics.
 */

import { query } from '@/lib/db';

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
}

/**
 * Service for managing semantic URLs with database persistence
 */
export class SemanticUrlService {
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
      
      // Insert into database
      const result = await query(`
        INSERT INTO links (
          slug, community_short_id, board_slug, post_id, board_id,
          plugin_id, share_token, post_title, board_name,
          shared_by_user_id, share_source, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        slug, communityShortId, boardSlug, postId, boardId,
        pluginId, shareToken, postTitle, boardName,
        sharedByUserId || null, shareSource, expiresAt ? expiresAt.toISOString() : null
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
   * Resolve a semantic URL path to full context data
   * 
   * @param path - The semantic URL path (e.g., "/c/community/board/slug")
   * @returns Promise resolving to semantic URL data or null if not found
   * 
   * @example
   * ```typescript
   * const result = await SemanticUrlService.resolve(
   *   '/c/commonground/general-discussion/introducing-new-governance-proposal'
   * );
   * // Returns: { postId: 34, boardId: 389, pluginId: '...', ... }
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
      
      // Query database for matching semantic URL
      const result = await query(`
        SELECT * FROM links
        WHERE community_short_id = $1 
          AND board_slug = $2 
          AND slug = $3
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `, [communityShortId, boardSlug, slug]);
      
      if (result.rows.length === 0) {
        console.warn(`[SemanticUrlService] Semantic URL not found: ${path}`);
        return null;
      }
      
      const semanticUrl = this.mapDbResult(result.rows[0]);
      
      console.log(`[SemanticUrlService] Resolved ${path} → post ${semanticUrl.postId}, board ${semanticUrl.boardId}`);
      
      return semanticUrl;
      
    } catch (error) {
      console.error('[SemanticUrlService] Error resolving semantic URL:', error);
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
   * Check if a slug already exists in the given community/board context
   * 
   * @param communityShortId - Community identifier
   * @param boardSlug - Board slug
   * @param slug - Slug to check
   * @returns Promise resolving to true if slug exists
   */
  private static async slugExists(
    communityShortId: string,
    boardSlug: string,
    slug: string
  ): Promise<boolean> {
    try {
      const result = await query(`
        SELECT 1 FROM links
        WHERE community_short_id = $1 
          AND board_slug = $2 
          AND slug = $3
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `, [communityShortId, boardSlug, slug]);
      
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
      expiresAt: row.expires_at
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