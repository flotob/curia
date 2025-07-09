import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { SemanticSearchService } from '@/services/SemanticSearchService';
import { getAccessibleBoards, getAccessibleBoardIds } from '@/lib/boardPermissions';

/**
 * Convert similarity score to human-friendly label
 */
function getSimilarityLabel(score: number): string {
  if (score >= 0.3) return 'Strong match';
  if (score >= 0.2) return 'Good match';
  return 'Relevant';
}

/**
 * Semantic Search API Endpoint
 * 
 * Provides AI-powered semantic search using OpenAI embeddings and pgvector similarity.
 * This endpoint is designed for the "Smart Search" tab in the search UI.
 */

const GET = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.2'); // 20% similarity threshold
    
    // Input validation
    if (!query?.trim()) {
      return NextResponse.json({ 
        error: 'Search query is required',
        results: []
      }, { status: 400 });
    }

    if (query.length < 2) {
      return NextResponse.json({ 
        error: 'Search query must be at least 2 characters',
        results: []
      }, { status: 400 });
    }

    if (limit > 50) {
      return NextResponse.json({ 
        error: 'Maximum limit is 50',
        results: []
      }, { status: 400 });
    }

    // Get user context
    const userId = request.userContext.userId;
    const userCommunityId = request.userContext.communityId;

    // Get accessible boards for this user
    const allBoards = await getAccessibleBoards(userCommunityId);
    const accessibleBoardIds = getAccessibleBoardIds(
      allBoards,
      request.userContext.roles || [],
      request.userContext.isAdmin || false
    );

    if (accessibleBoardIds.length === 0) {
      return NextResponse.json({
        message: 'No accessible boards found',
        results: [],
        searchQuery: query,
        searchType: 'semantic',
        totalResults: 0,
        semanticStats: {
          similarity_threshold: threshold,
          processing_time_ms: 0
        }
      });
    }

    // Perform semantic search
    const startTime = Date.now();
    
    const results = await SemanticSearchService.semanticSearch(
      query,
      accessibleBoardIds,
      {
        limit,
        threshold,
        includeUserVoting: true,
        userId
      }
    );

    const processingTime = Date.now() - startTime;

    // Return results in the same format as regular search
    return NextResponse.json({
      message: results.length > 0 ? 'Search completed' : 'No results found',
      results: results.map(post => ({
        // Core post data
        id: post.id,
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        upvote_count: post.upvote_count,
        comment_count: post.comment_count,
        created_at: post.created_at,
        updated_at: post.updated_at,
        
        // Author information
        author_user_id: post.author_user_id,
        author_name: post.author_name,
        author_profile_picture_url: post.author_profile_picture_url,
        
        // Board and community information
        board_id: post.board_id,
        board_name: post.board_name,
        board_settings: post.board_settings,
        community_id: post.community_id,
        community_settings: post.community_settings,
        
        // Lock and gating information
        lock_id: post.lock_id,
        settings: post.settings,
        
        // User interaction
        user_has_upvoted: post.user_has_upvoted,
        
        // Sharing statistics
        share_access_count: post.share_access_count,
        share_count: post.share_count,
        last_shared_at: post.last_shared_at,
        most_recent_access_at: post.most_recent_access_at,
        
        // Semantic search specific fields
        similarity_score: Math.round(post.similarity_score * 100) / 100,
        similarity_label: getSimilarityLabel(post.similarity_score),
        rank_score: Math.round(post.rank_score * 100) / 100,
        
        // Additional computed fields
        has_tags: (post.tags && post.tags.length > 0) || false,
        has_lock: post.lock_id !== null && post.lock_id !== undefined
      })),
      searchQuery: query,
      searchType: 'semantic',
      totalResults: results.length,
      semanticStats: {
        similarity_threshold: threshold,
        processing_time_ms: processingTime,
        embedding_cache_stats: SemanticSearchService.getStats()
      }
    });

  } catch (error) {
    console.error('[Semantic Search API] Error:', error);
    
    // Handle specific semantic search errors
    if (error instanceof Error) {
      if (error.message.includes('embedding')) {
        return NextResponse.json({
          error: 'Failed to generate search embedding',
          details: 'The AI service may be temporarily unavailable',
          results: []
        }, { status: 503 });
      }
      
      if (error.message.includes('Query too long')) {
        return NextResponse.json({
          error: 'Search query is too long',
          details: 'Please use a shorter search term',
          results: []
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      error: 'Semantic search failed',
      details: 'Please try again or use regular search',
      results: []
    }, { status: 500 });
  }
});

// Export the method
export { GET }; 