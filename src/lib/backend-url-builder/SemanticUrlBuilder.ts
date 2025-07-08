import { SlugGenerator } from './SlugGenerator';
import { DatabaseService } from './DatabaseService';
import { 
  SemanticUrlParams, 
  BulkUrlParams, 
  BulkUrlResult, 
  BulkUrlContext,
  CreateUrlParams 
} from './types';

/**
 * SemanticUrlBuilder is the main class for generating semantic URLs
 * without HTTP API dependencies. It orchestrates slug generation,
 * collision handling, and database operations.
 */
export class SemanticUrlBuilder {
  private slugGenerator: SlugGenerator;
  private databaseService: DatabaseService;

  constructor() {
    this.slugGenerator = new SlugGenerator();
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate a semantic URL for a single post
   * Equivalent to the frontend buildExternalShareUrl function
   */
  async generateSemanticUrl(params: SemanticUrlParams): Promise<string> {
    const startTime = Date.now();
    
    try {
      console.log(`[SemanticUrlBuilder] Generating semantic URL for post ${params.postId}`);

      // Check if URL already exists
      const existingUrl = await this.databaseService.findUrlByPostId(params.postId);
      if (existingUrl) {
        const url = this.buildFullUrl(
          existingUrl.community_short_id,
          existingUrl.board_slug,
          existingUrl.slug,
          params.baseUrl
        );
        
        console.log(`[SemanticUrlBuilder] Found existing URL for post ${params.postId}: ${url}`);
        return url;
      }

      // Generate new semantic URL
      const url = await this.createNewSemanticUrl(params);
      
      const duration = Date.now() - startTime;
      console.log(`[SemanticUrlBuilder] Generated new semantic URL for post ${params.postId} in ${duration}ms: ${url}`);
      
      return url;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[SemanticUrlBuilder] Error generating semantic URL for post ${params.postId} after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Generate semantic URLs for multiple posts (bulk operation for RSS feeds)
   */
  async generateBulkUrls(
    posts: BulkUrlParams[], 
    context: BulkUrlContext
  ): Promise<BulkUrlResult[]> {
    const startTime = Date.now();
    
    try {
      console.log(`[SemanticUrlBuilder] Starting bulk URL generation for ${posts.length} posts`);

      if (posts.length === 0) {
        return [];
      }

      // Check for existing URLs first
      const postIds = posts.map(post => post.postId);
      const existingUrls = await this.databaseService.findUrlsByPostIds(postIds);

      const results: BulkUrlResult[] = [];
      const postsNeedingUrls: BulkUrlParams[] = [];

      // Process posts with existing URLs
      for (const post of posts) {
        const existingUrl = existingUrls.get(post.postId);
        if (existingUrl) {
          const url = this.buildFullUrl(
            existingUrl.community_short_id,
            existingUrl.board_slug,
            existingUrl.slug,
            context.baseUrl
          );
          results.push({
            postId: post.postId,
            url: url
          });
        } else {
          postsNeedingUrls.push(post);
        }
      }

      console.log(`[SemanticUrlBuilder] Found ${results.length} existing URLs, need to create ${postsNeedingUrls.length} new URLs`);

      // Create new URLs for posts that don't have them
      for (const post of postsNeedingUrls) {
        try {
          const params: SemanticUrlParams = {
            postId: post.postId,
            boardId: post.boardId,
            postTitle: post.postTitle,
            boardName: post.boardName,
            communityShortId: context.communityShortId,
            pluginId: context.pluginId,
            shareSource: post.shareSource || 'bulk_generation',
            baseUrl: context.baseUrl
          };

          const url = await this.createNewSemanticUrl(params);
          results.push({
            postId: post.postId,
            url: url
          });

        } catch (error) {
          console.error(`[SemanticUrlBuilder] Error creating URL for post ${post.postId}:`, error);
          results.push({
            postId: post.postId,
            url: null,
            error: `Failed to create URL: ${error}`
          });
        }
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.url !== null).length;
      console.log(`[SemanticUrlBuilder] Bulk URL generation completed in ${duration}ms: ${successCount}/${posts.length} successful`);

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[SemanticUrlBuilder] Bulk URL generation failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Check if a semantic URL exists for a post without creating one
   */
  async checkUrlExists(postId: number): Promise<string | null> {
    try {
      const existingUrl = await this.databaseService.findUrlByPostId(postId);
      if (!existingUrl) {
        return null;
      }

      return this.buildFullUrl(
        existingUrl.community_short_id,
        existingUrl.board_slug,
        existingUrl.slug
      );
    } catch (error) {
      console.error(`[SemanticUrlBuilder] Error checking URL existence for post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Create a new semantic URL with full collision handling
   */
  private async createNewSemanticUrl(params: SemanticUrlParams): Promise<string> {
    // Generate slugs
    const postSlug = this.slugGenerator.generateSlug(params.postTitle);
    const boardSlug = this.slugGenerator.generateBoardSlug(params.boardName);

    // Validate slugs
    if (!this.slugGenerator.isValidSlug(postSlug)) {
      throw new Error(`Invalid post slug generated: ${postSlug}`);
    }
    if (!this.slugGenerator.isValidSlug(boardSlug)) {
      throw new Error(`Invalid board slug generated: ${boardSlug}`);
    }

    // Resolve unique slug (handle collisions)
    const slugResult = await this.slugGenerator.resolveUniqueSlug(
      postSlug,
      params.communityShortId,
      boardSlug,
      params.postId
    );

    if (!slugResult.isUnique && slugResult.attempts > 5) {
      console.warn(`[SemanticUrlBuilder] Slug collision resolution took ${slugResult.attempts} attempts for post ${params.postId}`);
    }

    // Generate unique share token
    const shareToken = await this.databaseService.generateUniqueShareToken(
      params.postId,
      params.boardId
    );

    // Create database record
    const createParams: CreateUrlParams = {
      slug: slugResult.slug,
      community_short_id: params.communityShortId,
      board_slug: boardSlug,
      post_id: params.postId,
      board_id: params.boardId,
      plugin_id: params.pluginId,
      share_token: shareToken,
      post_title: params.postTitle,
      board_name: params.boardName,
      share_source: params.shareSource
    };

    const urlRecord = await this.databaseService.createUrlRecord(createParams);

    // Build and return full URL
    return this.buildFullUrl(
      urlRecord.community_short_id,
      urlRecord.board_slug,
      urlRecord.slug,
      params.baseUrl
    );
  }

  /**
   * Build the full semantic URL from components
   * Uses the same /c/ prefix pattern as the frontend semantic URL system
   */
  private buildFullUrl(
    communityShortId: string,
    boardSlug: string,
    postSlug: string,
    baseUrl?: string
  ): string {
    const pluginBaseUrl = baseUrl || process.env.NEXT_PUBLIC_PLUGIN_BASE_URL;
    
    if (!pluginBaseUrl) {
      throw new Error('Base URL not configured for semantic URL generation');
    }

    // Remove trailing slash if present
    const cleanBaseUrl = pluginBaseUrl.replace(/\/$/, '');
    
    // Use the same /c/ prefix pattern as the frontend semantic URL system
    return `${cleanBaseUrl}/c/${communityShortId}/${boardSlug}/${postSlug}`;
  }

  /**
   * Get statistics about URL generation performance
   */
  getPerformanceStats(): {
    version: string;
    features: string[];
  } {
    return {
      version: '1.0.0',
      features: [
        'Direct database operations',
        'Slug collision handling',
        'Bulk URL generation',
        'Share token uniqueness',
        'Error recovery'
      ]
    };
  }
} 