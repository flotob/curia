import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { SearchResultsData } from '../types/FunctionResult';
import { SemanticSearchService } from '@/services/SemanticSearchService';
import { getAccessibleBoards, getAccessibleBoardIds } from '@/lib/boardPermissions';

export const searchCommunityKnowledge: AIFunctionCall = {
  name: 'searchCommunityKnowledge',
  description: 'Search through community posts using semantic similarity to find conceptually relevant discussions and information',
  parameters: z.object({
    query: z.string().describe('Search query to find semantically relevant community content'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
    threshold: z.number().optional().describe('Minimum similarity threshold 0-1 (default: 0.2)')
  }),
  execute: async (params: { query: string; limit?: number; threshold?: number }, context: FunctionContext): Promise<SearchResultsData> => {
    try {
      // Get user's accessible boards for permission filtering
      const allBoards = await getAccessibleBoards(context.communityId);
      const accessibleBoardIds = getAccessibleBoardIds(
        allBoards,
        [], // We don't have user roles in AI context, so use empty array for basic access
        false // Not admin in AI context
      );

      if (accessibleBoardIds.length === 0) {
        return {
          type: 'search_results',
          success: true,
          messageForAI: `No accessible boards found in this community for search.`,
          searchResults: []
        };
      }

      // Perform semantic search using the existing service
      const searchResults = await SemanticSearchService.semanticSearch(
        params.query,
        accessibleBoardIds,
        {
          limit: params.limit || 5,
          threshold: params.threshold || 0.2,
          includeUserVoting: false, // AI context doesn't need user voting
          userId: undefined
        }
      );
      
      // Convert SemanticSearchResult[] to our AI function format
      const results = searchResults.map(row => ({
        id: row.id,
        title: row.title,
        author: row.author_name || 'Unknown Author',
        authorAvatar: row.author_profile_picture_url || undefined,
        upvotes: row.upvote_count,
        snippet: row.content.substring(0, 200) + '...',
        boardName: row.board_name,
        created_at: row.created_at,
        // Engagement metrics
        comment_count: row.comment_count,
        // Semantic search metadata
        similarity_score: Math.round(row.similarity_score * 100), // Convert to percentage
        // Navigation metadata
        boardId: row.board_id,
        postId: row.id,
        communityShortId: (row as any).community_short_id || '',
        pluginId: (row as any).plugin_id || '',
        navigationType: 'internal' as const
      }));

      // Enhanced AI message with similarity context
      const avgSimilarity = searchResults.length > 0 
        ? Math.round(searchResults.reduce((sum, r) => sum + r.similarity_score, 0) / searchResults.length * 100)
        : 0;

      const aiMessage = results.length > 0 
        ? `Found ${results.length} semantically relevant posts about "${params.query}" (average ${avgSimilarity}% similarity). Results ranked by relevance and community engagement.`
        : `No semantically similar posts found for "${params.query}". Consider broader search terms or check if this topic has been discussed yet.`;
      
      return {
        type: 'search_results',
        success: true,
        messageForAI: aiMessage,
        searchResults: results
      };
    } catch (error) {
      console.error('[AI searchCommunityKnowledge] Semantic search failed:', error);
      
      // Fallback to basic keyword search if semantic search fails
      try {
        console.log('[AI searchCommunityKnowledge] Falling back to keyword search...');
        
        const fallbackResults = await query(
          `SELECT p.id, p.title, p.content, p.board_id, p.upvote_count, p.comment_count, p.created_at,
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
        
        const fallbackFormatted = fallbackResults.rows.map(row => ({
          id: row.id,
          title: row.title,
          author: row.author_name || 'Unknown Author',
          authorAvatar: row.profile_picture_url || undefined,
          upvotes: row.upvote_count,
          snippet: row.content.substring(0, 200) + '...',
          boardName: row.board_name,
          created_at: row.created_at,
          // Engagement metrics
          comment_count: row.comment_count,
          // No similarity score for keyword search
          boardId: row.board_id,
          postId: row.id,
          communityShortId: row.community_short_id || '',
          pluginId: row.plugin_id || '',
          navigationType: 'internal' as const
        }));
        
        return {
          type: 'search_results',
          success: true,
          messageForAI: `Found ${fallbackFormatted.length} posts using keyword search for "${params.query}" (semantic search unavailable).`,
          searchResults: fallbackFormatted
        };
      } catch (fallbackError) {
        return {
          type: 'search_results',
          success: false,
          errorForAI: `Both semantic and keyword search failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
        };
      }
    }
  }
}; 