import { NextRequest, NextResponse } from 'next/server';
import { SemanticUrlService } from '@/lib/semantic-urls';

/**
 * GET /api/links/resolve?path=/c/community/board/slug
 * 
 * Resolves a semantic URL path to full context data.
 * This endpoint is public (no authentication required) as it's used by the route handler.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Validate path format
    if (!path.startsWith('/c/')) {
      return NextResponse.json(
        { error: 'Invalid path format. Must start with /c/' },
        { status: 400 }
      );
    }

    console.log(`[API] Resolving semantic URL: ${path}`);

    // Resolve the semantic URL
    const semanticUrl = await SemanticUrlService.resolve(path);

    if (!semanticUrl) {
      return NextResponse.json(
        { error: 'Semantic URL not found' },
        { status: 404 }
      );
    }

    // Return full context data needed for Common Ground redirect
    return NextResponse.json({
      postId: semanticUrl.postId,
      boardId: semanticUrl.boardId,
      pluginId: semanticUrl.pluginId,
      communityShortId: semanticUrl.communityShortId,
      shareToken: semanticUrl.shareToken,
      postTitle: semanticUrl.postTitle,
      boardName: semanticUrl.boardName,
      accessCount: semanticUrl.accessCount,
      createdAt: semanticUrl.createdAt,
      shareSource: semanticUrl.shareSource
    });

  } catch (error) {
    console.error('[API] Error resolving semantic URL:', error);
    return NextResponse.json(
      { error: 'Failed to resolve semantic URL' },
      { status: 500 }
    );
  }
} 