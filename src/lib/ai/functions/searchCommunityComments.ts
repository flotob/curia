import { z } from 'zod';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { CommentSearchResultsData } from '../types/FunctionResult';
import { SemanticSearchService } from '@/services/SemanticSearchService';
import { getAccessibleBoards, getAccessibleBoardIds } from '@/lib/boardPermissions';

export const searchCommunityComments: AIFunctionCall = {
  name: 'searchCommunityComments',
  description: 'Search through community comments to find relevant discussions, insights, and responses within existing posts using semantic similarity',
  parameters: z.object({
    query: z.string().describe('Search query to find semantically relevant comments and discussions'),
    limit: z.number().optional().describe('Maximum number of results to return (default: 5)'),
    threshold: z.number().optional().describe('Minimum similarity threshold 0-1 (default: 0.3)')
  }),
  execute: async (params: { query: string; limit?: number; threshold?: number }, context: FunctionContext): Promise<CommentSearchResultsData> => {
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
          type: 'comment_search_results',
          success: true,
          messageForAI: `No accessible boards found in this community for comment search.`,
          searchResults: []
        };
      }

      // Perform semantic search on comments using the service
      const searchResults = await SemanticSearchService.semanticSearchComments(
        params.query,
        accessibleBoardIds,
        {
          limit: params.limit || 5,
          threshold: params.threshold || 0.3,
        }
      );
      
      // Convert CommentSearchResult[] to our AI function format
      const results = searchResults.map(row => ({
        id: row.id,
        content: row.content,
        author: row.author_name || 'Unknown Author',
        authorAvatar: row.author_profile_picture_url || undefined,
        created_at: row.created_at,
        similarity_score: Math.round(row.similarity_score * 100), // Convert to percentage
        
        // Post context for navigation and relevance
        postContext: {
          id: row.post_context.id,
          title: row.post_context.title,
          boardName: row.post_context.board_name,
          upvotes: row.post_context.upvote_count,
          totalComments: row.post_context.comment_count,
        },
        
        // Thread context if it's a reply
        threadContext: row.thread_context ? {
          parentCommentId: row.thread_context.parent_comment_id,
          depth: row.thread_context.depth,
          isReply: row.thread_context.is_reply,
        } : undefined,
        
        // Navigation metadata
        postId: row.post_context.id,
        boardId: row.post_context.board_id,
        communityShortId: row.post_context.community_short_id || '',
        pluginId: row.post_context.plugin_id || '',
        navigationType: 'internal' as const
      }));

      // Enhanced AI message with similarity context and post context
      const avgSimilarity = searchResults.length > 0 
        ? Math.round(searchResults.reduce((sum, r) => sum + r.similarity_score, 0) / searchResults.length * 100)
        : 0;

      const uniquePosts = new Set(results.map(r => r.postId)).size;
      
      const aiMessage = results.length > 0 
        ? `Found ${results.length} semantically relevant comment${results.length !== 1 ? 's' : ''} about "${params.query}" (average ${avgSimilarity}% similarity) across ${uniquePosts} post${uniquePosts !== 1 ? 's' : ''}. Comments provide community insights and discussions on this topic.`
        : `No semantically similar comments found for "${params.query}". This topic might not have been discussed in comments yet, or try broader search terms.`;
      
      return {
        type: 'comment_search_results',
        success: true,
        messageForAI: aiMessage,
        searchResults: results
      };
    } catch (error) {
      console.error('[AI searchCommunityComments] Semantic comment search failed:', error);
      
      return {
        type: 'comment_search_results',
        success: false,
        errorForAI: `Comment search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        searchResults: []
      };
    }
  }
}; 