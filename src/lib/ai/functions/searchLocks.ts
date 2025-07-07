import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { LockSearchResultsData } from '../types/FunctionResult';

export const searchLocks: AIFunctionCall = {
  name: 'searchLocks',
  description: 'Search for access control locks in the community by name, description, tags, or requirements',
  parameters: z.object({
    query: z.string().describe('Search query to find relevant locks (can search names, descriptions, tags, or requirement types like "ENS", "token", "NFT")'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)')
  }),
  execute: async (params: { query: string; limit?: number }, context: FunctionContext): Promise<LockSearchResultsData> => {
    try {
      console.log(`[searchLocks] Searching for locks with query: "${params.query}" in community: ${context.communityId}`);
      
      // Search locks with comprehensive metadata and stats
      const searchResults = await query(
        `SELECT 
           l.id, l.name, l.description, l.icon, l.color, l.gating_config,
           l.creator_user_id, l.community_id, l.is_template, l.is_public,
           l.tags, l.usage_count, l.success_rate, l.avg_verification_time,
           l.created_at, l.updated_at,
           u.name as creator_name, u.profile_picture_url as creator_avatar,
           COALESCE(ls.posts_using_lock, 0) as posts_using_lock,
           COALESCE(ls.boards_using_lock, 0) as boards_using_lock,
           COALESCE(ls.total_usage, 0) as total_usage
         FROM locks l
         JOIN users u ON l.creator_user_id = u.user_id
         LEFT JOIN lock_stats ls ON l.id = ls.id
         WHERE l.community_id = $1 
         AND l.is_public = true
         AND (
           l.name ILIKE $2 OR 
           l.description ILIKE $2 OR 
           $3 = ANY(l.tags) OR
           l.gating_config::text ILIKE $2
         )
         ORDER BY 
           l.is_template DESC,  -- Templates first
           l.usage_count DESC,  -- Then by popularity
           l.created_at DESC    -- Then by recency
         LIMIT $4`,
        [
          context.communityId, 
          `%${params.query}%`, 
          params.query, // For exact tag matches
          params.limit || 5
        ]
      );
      
      if (searchResults.rows.length === 0) {
        return {
          type: 'lock_search_results',
          success: true,
          messageForAI: `No locks found matching "${params.query}". The community might not have any locks with those requirements yet.`,
          searchResults: []
        };
      }

      // Transform results with rich metadata
      const locks = searchResults.rows.map(row => {
        // Parse gating config to extract requirement summary
        let gatingConfig;
        try {
          gatingConfig = typeof row.gating_config === 'string' 
            ? JSON.parse(row.gating_config) 
            : row.gating_config;
        } catch {
          gatingConfig = { categories: [] };
        }

        const requirementCount = gatingConfig.categories?.filter((cat: any) => cat.enabled).length || 0;
        const requirementType: 'ALL' | 'ANY' = gatingConfig.requireAll ? 'ALL' : 'ANY';
        
        // Extract requirement types for display
        const requirementTypes = gatingConfig.categories?.map((cat: any) => {
          switch (cat.type) {
            case 'universal_profile': return 'Universal Profile';
            case 'ethereum_profile': return 'Ethereum';
            default: return cat.type;
          }
        }) || [];

        return {
          id: row.id,
          name: row.name,
          description: row.description || 'No description provided',
          icon: row.icon || '🔒',
          color: row.color || '#6366f1',
          creatorName: row.creator_name,
          creatorAvatar: row.creator_avatar,
          isTemplate: row.is_template,
          tags: row.tags || [],
          usageCount: row.usage_count,
          successRate: Math.round(row.success_rate * 100), // Convert to percentage
          avgVerificationTime: Math.round(row.avg_verification_time / 60), // Convert to minutes
          postsUsingLock: row.posts_using_lock,
          boardsUsingLock: row.boards_using_lock,
          totalUsage: row.total_usage,
          requirementCount,
          requirementType,
          requirementTypes,
          createdAt: row.created_at,
          // Include full gating config for modal preview
          gatingConfig
        };
      });
      
      const totalResults = locks.length;
      const templatesCount = locks.filter(lock => lock.isTemplate).length;
      const avgUsage = Math.round(locks.reduce((sum, lock) => sum + lock.usageCount, 0) / totalResults);
      
      return {
        type: 'lock_search_results',
        success: true,
        messageForAI: `Found ${totalResults} lock${totalResults !== 1 ? 's' : ''} matching "${params.query}". ${templatesCount > 0 ? `Includes ${templatesCount} community template${templatesCount !== 1 ? 's' : ''}. ` : ''}Average usage: ${avgUsage} times. Users can click on any lock to see detailed requirements and test the verification flow.`,
        searchResults: locks
      };
    } catch (error) {
      console.error('[searchLocks] Search failed:', error);
      return {
        type: 'lock_search_results',
        success: false,
        errorForAI: `Lock search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        searchResults: []
      };
    }
  }
}; 