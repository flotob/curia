import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { SemanticSearchService } from '@/services/SemanticSearchService';
import { getAccessibleBoards, getAccessibleBoardIds } from '@/lib/boardPermissions';

/**
 * Related Posts API Endpoint
 * 
 * Finds semantically similar posts for display on post detail pages.
 * Uses vector similarity to suggest relevant content.
 */

const GET = withAuthAndErrorHandling(async (request: EnhancedAuthRequest, context: any) => {
  try {
    const params = await context.params;
    const { postId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const threshold = parseFloat(searchParams.get('threshold') || '0.25');
    
    // Input validation
    if (!postId || isNaN(parseInt(postId))) {
      return NextResponse.json({ 
        error: 'Valid post ID is required',
        relatedPosts: []
      }, { status: 400 });
    }

    if (limit > 20) {
      return NextResponse.json({ 
        error: 'Maximum limit is 20',
        relatedPosts: []
      }, { status: 400 });
    }

    // Get user context
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
        relatedPosts: [],
        postId: parseInt(postId),
        totalResults: 0
      });
    }

    // Get related posts using semantic similarity
    const startTime = Date.now();
    
    const relatedPosts = await SemanticSearchService.getRelatedPosts(
      parseInt(postId),
      accessibleBoardIds,
      {
        limit,
        threshold
      }
    );

    const processingTime = Date.now() - startTime;

    // Return related posts
    return NextResponse.json({
      message: relatedPosts.length > 0 ? 'Related posts found' : 'No related posts found',
      relatedPosts: relatedPosts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content.length > 200 ? 
          post.content.substring(0, 200) + '...' : 
          post.content,
        author_name: post.author_name,
        author_profile_picture_url: post.author_profile_picture_url,
        board_name: post.board_name,
        board_id: post.board_id,
        upvote_count: post.upvote_count,
        comment_count: post.comment_count,
        created_at: post.created_at,
        similarity_score: Math.round(post.similarity_score * 100) / 100
      })),
      postId: parseInt(postId),
      totalResults: relatedPosts.length,
      semanticStats: {
        similarity_threshold: threshold,
        processing_time_ms: processingTime
      }
    });

  } catch (error) {
    console.error('[Related Posts API] Error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Post') && error.message.includes('not found')) {
        return NextResponse.json({
          error: 'Post not found or has no embedding',
          details: 'The post may not exist or may not have been processed for semantic search yet',
          relatedPosts: []
        }, { status: 404 });
      }
      
      if (error.message.includes('embedding')) {
        return NextResponse.json({
          error: 'Post embedding not available',
          details: 'This post has not been processed for semantic search yet',
          relatedPosts: []
        }, { status: 422 });
      }
    }
    
    return NextResponse.json({
      error: 'Failed to find related posts',
      details: 'An error occurred while searching for related content',
      relatedPosts: []
    }, { status: 500 });
  }
});

// Export the method
export { GET }; 