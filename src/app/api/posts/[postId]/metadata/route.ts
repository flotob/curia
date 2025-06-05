import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { CommunitySettings, BoardSettings, PostSettings, SettingsUtils } from '@/types/settings';
import { ethers } from 'ethers';

export interface PostMetadata {
  id: number;
  title: string;
  content: string;
  author_name: string;
  board_name: string;
  created_at: string;
  upvote_count: number;
  comment_count: number;
  tags: string[];
}

// Enhanced interface with gating context
export interface EnhancedPostMetadata extends PostMetadata {
  gatingContext: {
    communityGated: boolean;
    boardGated: boolean;
    postGated: boolean;
    communityRoles?: string[]; // Role names, not IDs
    boardRoles?: string[]; // Role names, not IDs
    postRequirements?: {
      lyxRequired?: string; // Formatted amount (e.g., "100 LYX")
      tokensRequired?: Array<{
        name: string;
        symbol: string;
        amount: string;
        type: 'LSP7' | 'LSP8';
      }>;
      followersRequired?: Array<{
        type: 'minimum_followers' | 'followed_by' | 'following';
        displayValue: string; // Human-readable requirement
      }>;
    };
  };
}

interface RouteContext {
  params: Promise<Record<string, string>>;
}

/**
 * Resolves role IDs to human-readable role names
 */
async function resolveRoleNames(roleIds: string[], communityId: string): Promise<string[]> {
  if (!roleIds || roleIds.length === 0) return [];
  
  try {
    // In a real implementation, you'd fetch role names from Common Ground API
    // For now, return formatted role IDs as fallback
    // TODO: Implement Common Ground API integration for role name resolution
    
    // Validate communityId exists (prevent unused parameter warning)
    if (!communityId) {
      console.warn('No communityId provided for role resolution');
    }
    
    return roleIds.map(roleId => {
      // Extract last part of UUID for display
      const shortId = roleId.split('-').pop()?.substring(0, 8) || roleId.substring(0, 8);
      return `Role-${shortId}`;
    });
  } catch (error) {
    console.error('Error resolving role names:', error);
    return roleIds.map(roleId => `Role-${roleId.substring(0, 8)}`);
  }
}

// Type interfaces for UP requirements parsing
interface RawTokenRequirement {
  name?: string;
  symbol?: string;
  minAmount?: string;
  tokenType?: 'LSP7' | 'LSP8';
  tokenId?: string;
}

interface RawFollowerRequirement {
  type: 'minimum_followers' | 'followed_by' | 'following';
  value: string;
  description?: string;
}

interface RawUPRequirements {
  minLyxBalance?: string;
  requiredTokens?: RawTokenRequirement[];
  followerRequirements?: RawFollowerRequirement[];
}

/**
 * Formats UP requirements for display
 */
function formatUPRequirements(requirements: RawUPRequirements | null | undefined): EnhancedPostMetadata['gatingContext']['postRequirements'] {
  if (!requirements) return undefined;
  
  const formatted: NonNullable<EnhancedPostMetadata['gatingContext']['postRequirements']> = {};
  
  // Format LYX requirement
  if (requirements.minLyxBalance) {
    try {
      const lyxAmount = ethers.utils.formatEther(requirements.minLyxBalance);
      formatted.lyxRequired = `${parseFloat(lyxAmount).toLocaleString()} LYX`;
    } catch (error) {
      console.error('Error formatting LYX amount:', error);
      formatted.lyxRequired = 'LYX Required';
    }
  }
  
  // Format token requirements
  if (requirements.requiredTokens && Array.isArray(requirements.requiredTokens)) {
    formatted.tokensRequired = requirements.requiredTokens.map((token: RawTokenRequirement) => ({
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'TOKEN',
      amount: token.minAmount || '1',
      type: (token.tokenType || 'LSP7') as 'LSP7' | 'LSP8',
    }));
  }
  
  // Format follower requirements
  if (requirements.followerRequirements && Array.isArray(requirements.followerRequirements)) {
    formatted.followersRequired = requirements.followerRequirements.map((follower: RawFollowerRequirement) => ({
      type: follower.type,
      displayValue: follower.type === 'minimum_followers' 
        ? `${follower.value} followers`
        : `${follower.value.substring(0, 6)}...${follower.value.substring(-4)}`,
    }));
  }
  
  return Object.keys(formatted).length > 0 ? formatted : undefined;
}

// Public endpoint for fetching post metadata (for social sharing crawlers)
export async function GET(req: NextRequest, context: RouteContext) {
  const params = await context.params;
  const postId = parseInt(params.postId, 10);

  if (isNaN(postId)) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  try {
    console.log(`[API] GET /api/posts/${postId}/metadata - Enhanced metadata request`);

    // Get post metadata WITH gating context
    const result = await query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        p.tags,
        p.settings as post_settings,
        b.name as board_name,
        b.settings as board_settings,
        b.community_id,
        c.settings as community_settings,
        u.name as author_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN communities c ON b.community_id = c.id
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.id = $1
    `, [postId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = result.rows[0];
    
    // Parse settings
    const communitySettings: CommunitySettings = typeof postData.community_settings === 'string' 
      ? JSON.parse(postData.community_settings) 
      : (postData.community_settings || {});
      
    const boardSettings: BoardSettings = typeof postData.board_settings === 'string' 
      ? JSON.parse(postData.board_settings) 
      : (postData.board_settings || {});
      
    const postSettings: PostSettings = typeof postData.post_settings === 'string' 
      ? JSON.parse(postData.post_settings) 
      : (postData.post_settings || {});

    // Detect gating
    const communityGated = SettingsUtils.hasPermissionRestrictions(communitySettings);
    const boardGated = SettingsUtils.hasPermissionRestrictions(boardSettings);
    const postGated = SettingsUtils.hasUPGating(postSettings);

    // Resolve role names if needed
    const communityRoles = communityGated && communitySettings.permissions?.allowedRoles
      ? await resolveRoleNames(communitySettings.permissions.allowedRoles, postData.community_id)
      : undefined;
      
    const boardRoles = boardGated && boardSettings.permissions?.allowedRoles
      ? await resolveRoleNames(boardSettings.permissions.allowedRoles, postData.community_id)
      : undefined;

    // Format UP requirements if needed
    const postRequirements = postGated 
      ? formatUPRequirements(SettingsUtils.getUPGatingRequirements(postSettings))
      : undefined;
    
    // Format the enhanced response
    const metadata: EnhancedPostMetadata = {
      id: postData.id,
      title: postData.title,
      content: postData.content,
      author_name: postData.author_name || 'Anonymous',
      board_name: postData.board_name,
      created_at: postData.created_at,
      upvote_count: postData.upvote_count,
      comment_count: postData.comment_count,
      tags: postData.tags || [],
      gatingContext: {
        communityGated,
        boardGated,
        postGated,
        communityRoles,
        boardRoles,
        postRequirements,
      }
    };

    console.log(`[API] Successfully retrieved enhanced metadata for post ${postId} - Community: ${communityGated}, Board: ${boardGated}, Post: ${postGated}`);
    return NextResponse.json(metadata);

  } catch (error) {
    console.error(`[API] Error fetching post metadata ${postId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch post metadata' }, { status: 500 });
  }
} 