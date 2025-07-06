import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { SearchResults } from '../types/FunctionResult';

export const searchCommunityKnowledge: AIFunctionCall = {
  name: 'searchCommunityKnowledge',
  description: 'Search through community posts and discussions for relevant information',
  parameters: z.object({
    query: z.string().describe('Search query to find relevant community content'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)')
  }),
  execute: async (params: { query: string; limit?: number }, context: FunctionContext): Promise<SearchResults> => {
    try {
      // Search posts by title and content
      const searchResults = await query(
        `SELECT p.id, p.title, p.content, p.upvote_count, p.created_at, u.name as author_name
         FROM posts p 
         JOIN users u ON p.author_user_id = u.user_id
         JOIN boards b ON p.board_id = b.id
         WHERE b.community_id = $1 
         AND (p.title ILIKE $2 OR p.content ILIKE $2)
         ORDER BY p.upvote_count DESC, p.created_at DESC
         LIMIT $3`,
        [context.communityId, `%${params.query}%`, params.limit || 5]
      );
      
      const results = searchResults.rows.map(row => ({
        title: row.title,
        author: row.author_name,
        upvotes: row.upvote_count,
        snippet: row.content.substring(0, 200) + '...'
      }));
      
      return {
        success: true,
        messageForAI: `Found ${results.length} relevant community posts about "${params.query}".`,
        searchResults: results
      };
    } catch (error) {
      return {
        success: false,
        errorForAI: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}; 