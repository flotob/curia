import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/withAuth';
import { SemanticUrlService } from '@/lib/semantic-urls';

/**
 * GET /api/links/analytics/[id] - Get analytics data for a semantic URL
 * 
 * Returns usage statistics for a specific semantic URL.
 * Requires authentication to prevent analytics data leakage.
 */
async function getSemanticUrlAnalytics(
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const linkId = parseInt(id, 10);

    if (isNaN(linkId)) {
      return NextResponse.json(
        { error: 'Invalid link ID' },
        { status: 400 }
      );
    }

    const user = req.user;
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    console.log(`[API] Getting analytics for semantic URL ID: ${linkId}`);

    // Get analytics data
    const analytics = await SemanticUrlService.getAnalytics(linkId);

    if (!analytics) {
      return NextResponse.json(
        { error: 'Semantic URL not found' },
        { status: 404 }
      );
    }

    // Return analytics data
    return NextResponse.json({
      id: linkId,
      totalAccess: analytics.accessCount,
      shareSource: analytics.shareSource,
      createdAt: analytics.createdAt,
      lastAccessed: analytics.lastAccessedAt,
      // Future enhancement: could add daily access breakdown here
      dailyAccess: [] // Placeholder for future implementation
    });

  } catch (error) {
    console.error('[API] Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/links/analytics/[id] - Record an access to a semantic URL
 * 
 * Updates the access count and last accessed timestamp.
 * This is called by the route handler when someone visits a semantic URL.
 */
async function recordSemanticUrlAccess(
  req: AuthenticatedRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const linkId = parseInt(id, 10);

    if (isNaN(linkId)) {
      return NextResponse.json(
        { error: 'Invalid link ID' },
        { status: 400 }
      );
    }

    console.log(`[API] Recording access for semantic URL ID: ${linkId}`);

    // Record the access
    await SemanticUrlService.recordAccess(linkId);

    return NextResponse.json({
      success: true,
      message: 'Access recorded'
    });

  } catch (error) {
    console.error('[API] Error recording access:', error);
    return NextResponse.json(
      { error: 'Failed to record access' },
      { status: 500 }
    );
  }
}

// Export authenticated route handlers
export const GET = withAuth(getSemanticUrlAnalytics, false);  // Regular users can view analytics
export const POST = withAuth(recordSemanticUrlAccess, false); // Used internally by route handler 