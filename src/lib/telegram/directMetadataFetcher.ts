import { query } from '../db';
import { CommunitySettings, BoardSettings, PostSettings, SettingsUtils } from '../../types/settings';
import { ethers } from 'ethers';

/**
 * Enhanced Post Metadata with Gating Context
 * Mirrors the structure from /api/posts/[postId]/metadata/route.ts
 */
export interface EnhancedPostMetadata {
  id: number;
  title: string;
  content: string;
  author_name: string;
  board_name: string;
  created_at: string;
  upvote_count: number;
  comment_count: number;
  tags: string[];
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

/**
 * Basic Post Metadata (simplified version)
 * For cases where we don't need full gating context
 */
export interface BasicPostMetadata {
  id: number;
  title: string;
  author_name: string;
  board_name: string;
  upvote_count: number;
  comment_count: number;
  created_at: string;
}

/**
 * Fetch complete post metadata with gating context directly from database
 * 
 * @param postId - The ID of the post to fetch metadata for
 * @returns Promise resolving to enhanced metadata or null if not found
 */
export async function fetchPostMetadataDirect(postId: number): Promise<EnhancedPostMetadata | null> {
  try {
    console.log(`[DirectMetadataFetcher] Fetching enhanced metadata for post ${postId}`);
    
    const result = await query(`
      SELECT 
        p.id, p.title, p.content, p.upvote_count, p.comment_count, 
        p.created_at, p.tags, p.settings as post_settings,
        b.name as board_name, b.settings as board_settings, b.community_id,
        c.settings as community_settings,
        u.name as author_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id  
      JOIN communities c ON b.community_id = c.id
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.id = $1
    `, [postId]);
    
    if (result.rows.length === 0) {
      console.warn(`[DirectMetadataFetcher] Post ${postId} not found`);
      return null;
    }
    
    const postData = result.rows[0];
    
    // Process gating context same as metadata API
    const processedMetadata = await processGatingContext(postData);
    
    console.log(`[DirectMetadataFetcher] Successfully fetched metadata for post ${postId}`);
    return processedMetadata;
    
  } catch (error) {
    console.error(`[DirectMetadataFetcher] Error fetching metadata for post ${postId}:`, error);
    return null;
  }
}

/**
 * Fetch basic post metadata directly from database (faster, lighter)
 * 
 * @param postId - The ID of the post to fetch metadata for
 * @returns Promise resolving to basic metadata or null if not found
 */
export async function fetchBasicPostMetadataDirect(postId: number): Promise<BasicPostMetadata | null> {
  try {
    console.log(`[DirectMetadataFetcher] Fetching basic metadata for post ${postId}`);
    
    const result = await query(`
      SELECT 
        p.id, p.title, p.upvote_count, p.comment_count, p.created_at,
        b.name as board_name,
        u.name as author_name
      FROM posts p
      JOIN boards b ON p.board_id = b.id
      JOIN users u ON p.author_user_id = u.user_id
      WHERE p.id = $1
    `, [postId]);
    
    if (result.rows.length === 0) {
      console.warn(`[DirectMetadataFetcher] Post ${postId} not found`);
      return null;
    }
    
    const postData = result.rows[0];
    
    const basicMetadata: BasicPostMetadata = {
      id: postData.id,
      title: postData.title,
      author_name: postData.author_name || 'Anonymous',
      board_name: postData.board_name,
      upvote_count: postData.upvote_count,
      comment_count: postData.comment_count,
      created_at: postData.created_at
    };
    
    console.log(`[DirectMetadataFetcher] Successfully fetched basic metadata for post ${postId}`);
    return basicMetadata;
    
  } catch (error) {
    console.error(`[DirectMetadataFetcher] Error fetching basic metadata for post ${postId}:`, error);
    return null;
  }
}

/**
 * Raw database row structure
 */
interface PostDataRow {
  id: number;
  title: string;
  content: string;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  tags: string[];
  post_settings: string | object;
  board_name: string;
  board_settings: string | object;
  community_id: string;
  community_settings: string | object;
  author_name: string;
}

/**
 * Process raw database row into EnhancedPostMetadata with gating context
 * Mirrors the logic from /api/posts/[postId]/metadata/route.ts
 */
async function processGatingContext(postData: PostDataRow): Promise<EnhancedPostMetadata> {
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

  return metadata;
}

/**
 * Resolves role IDs to human-readable role names
 * TODO: Implement Common Ground API integration for role name resolution
 */
async function resolveRoleNames(roleIds: string[], communityId: string): Promise<string[]> {
  if (!roleIds || roleIds.length === 0) return [];
  
  try {
    // Validate communityId exists (prevent unused parameter warning)
    if (!communityId) {
      console.warn('[DirectMetadataFetcher] No communityId provided for role resolution');
    }
    
    // For now, return formatted role IDs as fallback
    // TODO: Implement Common Ground API integration for role name resolution
    return roleIds.map(roleId => {
      // Extract last part of UUID for display
      const shortId = roleId.split('-').pop()?.substring(0, 8) || roleId.substring(0, 8);
      return `Role-${shortId}`;
    });
  } catch (error) {
    console.error('[DirectMetadataFetcher] Error resolving role names:', error);
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
 * Mirrors the logic from /api/posts/[postId]/metadata/route.ts
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
      console.error('[DirectMetadataFetcher] Error formatting LYX amount:', error);
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