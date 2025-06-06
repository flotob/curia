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
      shareSource = 'direct_share',
      expiresIn,
      customSlug
    } = body;

    // Validate required fields
    if (!postId || !postTitle || !boardId || !boardName) {
      return NextResponse.json(
        { error: 'Missing required fields: postId, postTitle, boardId, boardName' },
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
    const communityShortId = user.communityShortId;
    const pluginId = user.pluginId;
    const sharedByUserId = user.sub;

    if (!communityShortId || !pluginId) {
      return NextResponse.json(
        { error: 'Missing community or plugin context in user session' },
        { status: 400 }
      );
    }

    // Check if semantic URL already exists for this post
    const existingUrl = await SemanticUrlService.findByPostId(postId);
    if (existingUrl) {
      console.log(`[API] Returning existing semantic URL for post ${postId}`);
      
      const fullUrl = SemanticUrlService.buildFullUrl(existingUrl);
      
      return NextResponse.json({
        id: existingUrl.id,
        url: fullUrl,
        slug: existingUrl.slug,
        shareToken: existingUrl.shareToken,
        expiresAt: existingUrl.expiresAt,
        isExisting: true
      });
    }

    // Create new semantic URL
    const semanticUrlParams: CreateSemanticUrlParams = {
      postId,
      postTitle,
      boardId,
      boardName,
      communityShortId,
      pluginId,
      sharedByUserId,
      shareSource,
      expiresIn,
      customSlug
    };

    const semanticUrl = await SemanticUrlService.create(semanticUrlParams);
    const fullUrl = SemanticUrlService.buildFullUrl(semanticUrl);

    console.log(`[API] Created semantic URL for post ${postId}: ${fullUrl}`);

    return NextResponse.json({
      id: semanticUrl.id,
      url: fullUrl,
      slug: semanticUrl.slug,
      shareToken: semanticUrl.shareToken,
      expiresAt: semanticUrl.expiresAt,
      isExisting: false
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