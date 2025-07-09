/**
 * Semantic Search Service
 * 
 * Centralizes all semantic search functionality including embedding generation,
 * vector similarity search, and related posts discovery.
 */

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { ValidationError } from '@/lib/errors';
import { query } from '@/lib/db';
import { EnrichedPost } from '@/lib/queries/enrichedPosts';

// Core interfaces
export interface SemanticSearchOptions {
  limit?: number;
  threshold?: number; // Minimum similarity score (0-1)
  includeUserVoting?: boolean;
  userId?: string;
}

export interface SemanticSearchResult extends EnrichedPost {
  similarity_score: number;
  rank_score: number; // Combined semantic + traditional ranking
}

export interface RelatedPost {
  id: number;
  title: string;
  content: string;
  author_name: string;
  board_name: string;
  board_id: number;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  similarity_score: number;
}

export interface CachedEmbedding {
  embedding: number[];
  timestamp: number;
  hits: number;
  query: string;
}

export interface EmbeddingStats {
  totalQueries: number;
  cacheHits: number;
  cacheHitRate: number;
  averageLatency: number;
  totalCost: number;
}

/**
 * Semantic Search Service
 * 
 * Provides centralized semantic search functionality with caching and analytics.
 */
export class SemanticSearchService {
  // In-memory cache for query embeddings (1 hour TTL)
  private static queryCache = new Map<string, CachedEmbedding>();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_CACHE_SIZE = 500; // Prevent memory issues
  
  // Stats tracking
  private static stats = {
    totalQueries: 0,
    cacheHits: 0,
    totalLatency: 0,
    totalCost: 0
  };

  /**
   * Generate embedding for a search query with caching
   */
  static async embedQuery(query: string): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      // Input validation
      if (!query?.trim()) {
        throw new ValidationError('Query text is required');
      }

      if (query.length > 8000) {
        throw new ValidationError('Query too long (max 8000 characters)');
      }

      const normalizedQuery = query.trim().toLowerCase();
      
      // Check cache first
      const cached = SemanticSearchService.queryCache.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < SemanticSearchService.CACHE_TTL_MS) {
        cached.hits++;
        SemanticSearchService.stats.cacheHits++;
        return cached.embedding;
      }

      // Generate new embedding
      SemanticSearchService.stats.totalQueries++;
      
      const result = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: query,
      });

      const embedding = result.embedding;
      
      // Cache the result
      SemanticSearchService.addToCache(normalizedQuery, embedding);
      
      // Track performance
      const latency = Date.now() - startTime;
      SemanticSearchService.stats.totalLatency += latency;
      
      // Estimate cost (text-embedding-3-small: $0.00002 per 1K tokens)
      const estimatedTokens = Math.ceil(query.length / 4);
      const estimatedCost = (estimatedTokens / 1000) * 0.00002;
      SemanticSearchService.stats.totalCost += estimatedCost;

      return embedding;

    } catch (error) {
      console.error('[SemanticSearchService] Embedding generation failed:', error);
      throw new ValidationError(
        'Failed to generate query embedding',
        { originalError: error, query: query.substring(0, 100) }
      );
    }
  }

  /**
   * Perform semantic search with hybrid ranking
   */
  static async semanticSearch(
    searchQuery: string,
    accessibleBoardIds: number[],
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult[]> {
    try {
      const {
        limit = 10,
        threshold = 0.2,
        includeUserVoting = false,
        userId
      } = options;

      // Validate inputs
      if (!searchQuery?.trim()) {
        throw new ValidationError('Search query is required');
      }

      if (!accessibleBoardIds?.length) {
        return []; // No accessible boards = no results
      }

      // Generate query embedding
      const queryEmbedding = await SemanticSearchService.embedQuery(searchQuery);

      // Build the semantic search SQL
      const userVotingJoin = includeUserVoting && userId ? 
        'LEFT JOIN votes v ON p.id = v.post_id AND v.user_id = $1' : '';
      
      const userVotingField = includeUserVoting && userId ?
        'CASE WHEN v.user_id IS NOT NULL THEN TRUE ELSE FALSE END AS user_has_upvoted,' : 
        'FALSE AS user_has_upvoted,';

      const boardIdsPlaceholders = accessibleBoardIds.map((_, i) => 
        `$${includeUserVoting && userId ? i + 2 : i + 1}`
      ).join(', ');

             const params: (string | number | boolean | null)[] = [];
       if (includeUserVoting && userId) {
         params.push(userId);
       }
       params.push(...accessibleBoardIds, `[${queryEmbedding.join(',')}]`, threshold, limit);

      const sql = `
        WITH semantic_results AS (
          SELECT 
            p.*,
            u.name as author_name,
            u.profile_picture_url as author_profile_picture_url,
            b.name as board_name,
            b.id as board_id,
            c.community_short_id,
            c.plugin_id,
            c.name as community_name,
            c.logo_url as community_logo_url,
            -- Semantic similarity score (0-1, higher is better)
            (1 - (p.embedding <=> $${params.length - 2}::vector)) as similarity_score,
            -- Traditional ranking signals
            (
              -- Upvote boost (logarithmic to prevent dominance)
              GREATEST(0, LN(1 + p.upvote_count)) * 0.1 +
              -- Recency boost (favor recent posts slightly)
              GREATEST(0, EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -86400) * 0.05 +
              -- Comment activity boost
              GREATEST(0, LN(1 + p.comment_count)) * 0.05
            ) as boost_score,
            ${userVotingField}
            -- Share statistics
            COALESCE(share_stats.total_access_count, 0) as share_access_count,
            COALESCE(share_stats.share_count, 0) as share_count,
            share_stats.last_shared_at,
            share_stats.most_recent_access_at
          FROM posts p 
          JOIN users u ON p.author_user_id = u.user_id
          JOIN boards b ON p.board_id = b.id
          JOIN communities c ON b.community_id = c.id
          ${userVotingJoin}
          LEFT JOIN (
            SELECT 
              post_id,
              SUM(access_count) as total_access_count,
              COUNT(*) as share_count,
              MAX(created_at) as last_shared_at,
              MAX(last_accessed_at) as most_recent_access_at
            FROM links 
            WHERE expires_at IS NULL OR expires_at > NOW()
            GROUP BY post_id
          ) share_stats ON p.id = share_stats.post_id
          WHERE 
            p.board_id IN (${boardIdsPlaceholders})
            AND p.embedding IS NOT NULL
            AND (1 - (p.embedding <=> $${params.length - 2}::vector)) > $${params.length - 1}
        )
        SELECT *, 
               (similarity_score * 0.7 + boost_score * 0.3) as rank_score
        FROM semantic_results
        ORDER BY similarity_score DESC
        LIMIT $${params.length}
      `;

      const result = await query(sql, params);

      return result.rows.map((row: Record<string, unknown>) => ({
        ...row,
        settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {}),
        board_settings: typeof row.board_settings === 'string' ? JSON.parse(row.board_settings) : row.board_settings,
        community_settings: typeof row.community_settings === 'string' ? JSON.parse(row.community_settings) : row.community_settings,
        user_has_upvoted: row.user_has_upvoted || false,
        share_access_count: Number(row.share_access_count) || 0,
        share_count: Number(row.share_count) || 0,
        similarity_score: Number(row.similarity_score),
        rank_score: Number(row.rank_score)
      })) as SemanticSearchResult[];

    } catch (error) {
      console.error('[SemanticSearchService] Semantic search failed:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        'Semantic search failed',
        { originalError: error, searchQuery: searchQuery.substring(0, 100) }
      );
    }
  }

  /**
   * Get related posts for a specific post
   */
  static async getRelatedPosts(
    postId: number,
    accessibleBoardIds: number[],
    options: { limit?: number; threshold?: number } = {}
  ): Promise<RelatedPost[]> {
    try {
      const { limit = 5, threshold = 0.25 } = options;

      if (!accessibleBoardIds?.length) {
        return [];
      }

      // Get the post's embedding
      const postResult = await query(
        'SELECT embedding FROM posts WHERE id = $1 AND embedding IS NOT NULL',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return []; // Post doesn't exist or has no embedding
      }

      const postEmbedding = postResult.rows[0].embedding;
      
      // Parse the embedding from PostgreSQL vector format to JavaScript array
      let embeddingArray: number[];
      if (Array.isArray(postEmbedding)) {
        embeddingArray = postEmbedding;
      } else if (typeof postEmbedding === 'string') {
        // PostgreSQL vector type returns as string like "[1.0,2.0,3.0,...]"
        const cleanString = postEmbedding.replace(/^\[|\]$/g, '');
        embeddingArray = cleanString.split(',').map(n => parseFloat(n.trim()));
      } else {
        throw new Error(`Unexpected embedding format: ${typeof postEmbedding}`);
      }

      const boardIdsPlaceholders = accessibleBoardIds.map((_, i) => `$${i + 2}`).join(', ');

      const sql = `
        SELECT 
          p.id,
          p.title,
          p.content,
          p.upvote_count,
          p.comment_count,
          p.created_at,
          u.name as author_name,
          b.name as board_name,
          b.id as board_id,
          (1 - (p.embedding <=> $1::vector)) as similarity_score
        FROM posts p
        JOIN users u ON p.author_user_id = u.user_id
        JOIN boards b ON p.board_id = b.id
        WHERE 
          p.id != $${accessibleBoardIds.length + 2}
          AND p.board_id IN (${boardIdsPlaceholders})
          AND p.embedding IS NOT NULL
          AND (1 - (p.embedding <=> $1::vector)) > $${accessibleBoardIds.length + 3}
        ORDER BY similarity_score DESC
        LIMIT $${accessibleBoardIds.length + 4}
      `;

      const params = [`[${embeddingArray.join(',')}]`, ...accessibleBoardIds, postId, threshold, limit];
      const result = await query(sql, params);

      return result.rows.map((row: Record<string, unknown>) => ({
        id: Number(row.id),
        title: String(row.title),
        content: String(row.content),
        author_name: String(row.author_name),
        board_name: String(row.board_name),
        board_id: Number(row.board_id),
        upvote_count: Number(row.upvote_count),
        comment_count: Number(row.comment_count),
        created_at: String(row.created_at),
        similarity_score: Number(row.similarity_score)
      }));

    } catch (error) {
      console.error('[SemanticSearchService] Related posts failed:', error);
      throw new ValidationError(
        'Failed to get related posts',
        { originalError: error, postId }
      );
    }
  }

  /**
   * Add embedding to cache with LRU eviction
   */
  private static addToCache(query: string, embedding: number[]): void {
    // Implement LRU eviction if cache is full
    if (SemanticSearchService.queryCache.size >= SemanticSearchService.MAX_CACHE_SIZE) {
      // Find oldest entry by timestamp
      let oldestKey = '';
      let oldestTime = Date.now();
      
      for (const [key, cached] of SemanticSearchService.queryCache.entries()) {
        if (cached.timestamp < oldestTime) {
          oldestTime = cached.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        SemanticSearchService.queryCache.delete(oldestKey);
      }
    }

    SemanticSearchService.queryCache.set(query, {
      embedding,
      timestamp: Date.now(),
      hits: 1,
      query
    });
  }

  /**
   * Clear expired cache entries
   */
  static clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of SemanticSearchService.queryCache.entries()) {
      if (now - cached.timestamp > SemanticSearchService.CACHE_TTL_MS) {
        SemanticSearchService.queryCache.delete(key);
      }
    }
  }

  /**
   * Get cache and performance statistics
   */
  static getStats(): EmbeddingStats {
    const cacheHitRate = SemanticSearchService.stats.totalQueries > 0 ? 
      SemanticSearchService.stats.cacheHits / SemanticSearchService.stats.totalQueries : 0;
    
    const averageLatency = SemanticSearchService.stats.totalQueries > 0 ?
      SemanticSearchService.stats.totalLatency / SemanticSearchService.stats.totalQueries : 0;

    return {
      totalQueries: SemanticSearchService.stats.totalQueries,
      cacheHits: SemanticSearchService.stats.cacheHits,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageLatency: Math.round(averageLatency),
      totalCost: Math.round(SemanticSearchService.stats.totalCost * 100000) / 100000 // 5 decimal places
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  static resetStats(): void {
    SemanticSearchService.stats = {
      totalQueries: 0,
      cacheHits: 0,
      totalLatency: 0,
      totalCost: 0
    };
  }

  /**
   * Clear all cached embeddings
   */
  static clearCache(): void {
    SemanticSearchService.queryCache.clear();
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query: string): void {
    if (!query?.trim()) {
      throw new ValidationError('Search query cannot be empty');
    }

    if (query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    if (query.length > 1000) {
      throw new ValidationError('Search query too long (max 1000 characters)');
    }
  }
}

// Set up periodic cache cleanup (every 30 minutes)
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    SemanticSearchService.clearExpiredCache();
  }, 30 * 60 * 1000);
} 