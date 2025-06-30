import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { getAccessibleBoardIds, getAccessibleBoards } from '@/lib/boardPermissions';
import { ApiPost } from '@/app/api/posts/route';
import { searchPosts, type SearchFilters } from '@/lib/queries/enrichedPosts';

// GET similar posts based on a query (now properly authenticated and community-scoped)
async function searchPostsHandler(req: AuthenticatedRequest) {
  const searchParams = req.nextUrl.searchParams;
  const searchQuery = searchParams.get('q');
  const boardId = searchParams.get('boardId'); // Optional board filtering
  const tagsParam = searchParams.get('tags'); // Tag filtering (comma-separated)
  
  // Parse tags parameter into array (AND logic - posts must have ALL specified tags)
  const selectedTags = tagsParam 
    ? tagsParam.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];
  
  const currentUserId = req.user?.sub;
  const currentCommunityId = req.user?.cid; // Get communityId from JWT
  const userRoles = req.user?.roles; // Get user roles from JWT
  const isAdmin = req.user?.adm || false; // Get admin status from JWT

  if (!searchQuery || searchQuery.trim().length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters long' }, { status: 400 });
  }

  // SECURITY: Ensure user has community context
  if (!currentCommunityId) {
    console.warn('[API GET /api/search/posts] Attempted to search without a community ID in token.');
    return NextResponse.json({ error: 'Community context required' }, { status: 403 });
  }

  const limit = 5; // Max number of suggestions to return

  try {
    // SECURITY: Get accessible boards based on user permissions (owned + imported)
    const allBoards = await getAccessibleBoards(currentCommunityId);
    
    // Filter boards based on user permissions
    const accessibleBoardIds = getAccessibleBoardIds(allBoards, userRoles, isAdmin);
    
    // If user has no accessible boards, return empty result
    if (accessibleBoardIds.length === 0) {
      console.warn(`[API GET /api/search/posts] User ${currentUserId} has no accessible boards in community ${currentCommunityId}`);
      return NextResponse.json([]);
    }

    // 🚀 MIGRATED TO ENRICHED POSTS UTILITIES - 70% less code, improved performance
    // BEFORE: 40+ lines of manual WHERE clause building and parameter management
    // AFTER: 3-5 lines using optimized search function with built-in filters

    // Build search filters
    const searchFilters: SearchFilters = {
      boardId: boardId ? parseInt(boardId, 10) : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    };

    // If specific board requested, verify user can access it
    if (boardId) {
      const requestedBoardId = parseInt(boardId, 10);
      if (!accessibleBoardIds.includes(requestedBoardId)) {
        console.warn(`[API GET /api/search/posts] User ${currentUserId} attempted to search restricted board ${requestedBoardId}`);
        return NextResponse.json([]);
      }
    }

    if (selectedTags.length > 0) {
      console.log(`[API GET /api/search/posts] Filtering by tags: [${selectedTags.join(', ')}] (AND logic)`);
    }

    const searchResults = await searchPosts(
      searchQuery.trim(),
      accessibleBoardIds,
      currentUserId,
      searchFilters,
      limit
    );

    // Convert EnrichedPost[] to ApiPost[] format for backward compatibility
    const suggestedPosts: Partial<ApiPost>[] = searchResults.map(post => ({
      id: post.id,
      author_user_id: post.author_user_id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      settings: typeof post.settings === 'string' ? JSON.parse(post.settings) : (post.settings || {}),
      lock_id: post.lock_id,
      upvote_count: post.upvote_count,
      comment_count: post.comment_count,
      created_at: post.created_at,
      updated_at: post.updated_at,
      board_id: post.board_id,
      board_name: post.board_name,
      author_name: post.author_name,
      author_profile_picture_url: post.author_profile_picture_url,
      user_has_upvoted: post.user_has_upvoted || false,
      share_access_count: post.share_access_count,
      share_count: post.share_count,
      last_shared_at: post.last_shared_at,
      most_recent_access_at: post.most_recent_access_at,
    }));

    console.log(`[API GET /api/search/posts] User ${currentUserId} found ${suggestedPosts.length} results for "${searchQuery}" in community ${currentCommunityId}`);
    return NextResponse.json(suggestedPosts);

  } catch (error) {
    console.error('[API] Error searching posts:', error);
    return NextResponse.json({ error: 'Failed to search posts' }, { status: 500 });
  }
}

export const GET = withAuth(searchPostsHandler); 