import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { SemanticUrlService, CreateSemanticUrlParams } from '@/lib/semantic-urls';

/**
 * POST /api/links - Generate a new semantic URL
 * 
 * Creates a semantic URL for a forum post and stores it in the database.
 * Requires authentication and validates that the user can access the specified post.
 */
async function createSemanticUrl(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const {
      postId,
      postTitle,
      boardId,
      boardName,
      commentId,
      shareSource = 'direct_share',
      expiresIn,
      customSlug,
      communityShortId: overrideCommunityShortId,
      pluginId: overridePluginId
    } = body;

    // Validate required fields - postId and postTitle are optional for board-only links
    if (!boardId || !boardName) {
      return NextResponse.json(
        { error: 'Missing required fields: boardId, boardName' },
        { status: 400 }
      );
    }
    
    // For post-specific links, both postId and postTitle are required
    if (postId && !postTitle) {
      return NextResponse.json(
        { error: 'postTitle is required when postId is provided' },
        { status: 400 }
      );
    }
    if (!postId && postTitle) {
      return NextResponse.json(
        { error: 'postId is required when postTitle is provided' },
        { status: 400 }
      );
    }

    // Get user context from authenticated request
    const user = req.user;
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Extract required context from user JWT
    const sharedByUserId = user.sub;

    const communityShortId = overrideCommunityShortId || user.communityShortId;
    const pluginId = overridePluginId || user.pluginId;

    if (!communityShortId || !pluginId) {
      return NextResponse.json(
        { error: 'Missing community or plugin context in user session' },
        { status: 400 }
      );
    }

    // 🆕 Create or update semantic URL with automatic migration
    const semanticUrlParams: CreateSemanticUrlParams = {
      postId,
      postTitle,
      boardId,
      boardName,
      commentId,
      communityShortId, // 🆕 Current community short ID - may trigger bulk migration
      pluginId,
      sharedByUserId,
      shareSource,
      expiresIn,
      customSlug
    };

    const targetType = postId ? (commentId ? 'comment' : 'post') : 'board';
    const targetId = commentId || postId || boardId;
    console.log(`[API] Creating/updating semantic URL for ${targetType} ${targetId} with community ${communityShortId}`);

    const semanticUrl = await SemanticUrlService.createOrUpdate(semanticUrlParams);
    const fullUrl = SemanticUrlService.buildFullUrl(semanticUrl);

    // Check if this was a migration by comparing community short IDs
    const wasMigration = semanticUrl.communityShortIdHistory.length > 1;
    const migrationInfo = wasMigration 
      ? ` (migrated from: ${semanticUrl.communityShortIdHistory.slice(0, -1).join(', ')})`
      : '';

    console.log(`[API] Semantic URL ready for ${targetType} ${targetId}: ${fullUrl}${migrationInfo}`);

    return NextResponse.json({
      id: semanticUrl.id,
      url: fullUrl,
      slug: semanticUrl.slug,
      shareToken: semanticUrl.shareToken,
      expiresAt: semanticUrl.expiresAt,
      wasMigration, // 🆕 Indicates if community migration occurred
      migrationHistory: wasMigration ? semanticUrl.communityShortIdHistory : undefined
    });

  } catch (error) {
    console.error('[API] Error creating semantic URL:', error);
    
    if (error instanceof Error && error.message.includes('Missing required parameters')) {
      return NextResponse.json(
        { error: 'Invalid parameters provided' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create semantic URL' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/links - List semantic URLs for the authenticated user
 * 
 * Returns a paginated list of semantic URLs created by the current user.
 */
async function listSemanticUrls(req: AuthenticatedRequest) {
  try {
    const user = req.user;
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // For now, return empty array - this could be implemented later
    // as it would require additional database queries
    return NextResponse.json({
      urls: [],
      total: 0,
      message: 'List endpoint not yet implemented'
    });

  } catch (error) {
    console.error('[API] Error listing semantic URLs:', error);
    return NextResponse.json(
      { error: 'Failed to list semantic URLs' },
      { status: 500 }
    );
  }
}

// Export authenticated route handlers
export const POST = withAuth(createSemanticUrl, false); // Regular users can create
export const GET = withAuth(listSemanticUrls, false);   // Regular users can list their own 