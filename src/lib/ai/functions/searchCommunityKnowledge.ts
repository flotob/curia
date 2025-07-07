import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { SearchResultsData } from '../types/FunctionResult';

export const searchCommunityKnowledge: AIFunctionCall = {
  name: 'searchCommunityKnowledge',
  description: 'Search through community posts and discussions for relevant information',
  parameters: z.object({
    query: z.string().describe('Search query to find relevant community content'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)')
  }),
  execute: async (params: { query: string; limit?: number }, context: FunctionContext): Promise<SearchResultsData> => {
    try {
      // Search posts by title and content with navigation metadata
      const searchResults = await query(
        `SELECT p.id, p.title, p.content, p.board_id, p.upvote_count, p.created_at,
                u.name as author_name, u.profile_picture_url,
                b.name as board_name,
                c.community_short_id, c.plugin_id, c.name as community_name
         FROM posts p 
         JOIN users u ON p.author_user_id = u.user_id
         JOIN boards b ON p.board_id = b.id
         JOIN communities c ON b.community_id = c.id
         WHERE b.community_id = $1 
         AND (p.title ILIKE $2 OR p.content ILIKE $2)
         ORDER BY p.upvote_count DESC, p.created_at DESC
         LIMIT $3`,
        [context.communityId, `%${params.query}%`, params.limit || 5]
      );
      
      const results = searchResults.rows.map(row => ({
        id: row.id,
        title: row.title,
        author: row.author_name,
        authorAvatar: row.profile_picture_url,
        upvotes: row.upvote_count,
        snippet: row.content.substring(0, 200) + '...',
        boardName: row.board_name,
        created_at: row.created_at,
        // Navigation metadata
        boardId: row.board_id,
        postId: row.id,
        communityShortId: row.community_short_id,
        pluginId: row.plugin_id,
        navigationType: 'internal' as const // Same community navigation
      }));
      
      return {
        type: 'search_results',
        success: true,
        messageForAI: `Found ${results.length} relevant community posts about "${params.query}".`,
        searchResults: results
      };
    } catch (error) {
      return {
        type: 'search_results',
        success: false,
        errorForAI: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}; 