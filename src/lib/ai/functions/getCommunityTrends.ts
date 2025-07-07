import { z } from 'zod';
import { query } from '@/lib/db';
import { AIFunctionCall, FunctionContext } from '../types/FunctionCall';
import { TrendingAnalysisData } from '../types/FunctionResult';

export const getCommunityTrends: AIFunctionCall = {
  name: 'getCommunityTrends',
  description: 'Analyze trending posts and comments from the last 30 days to understand what the community is discussing and caring about',
  parameters: z.object({
    timeframe: z.enum(['7', '14', '30']).optional().describe('Days to look back (default: 30)'),
    includeComments: z.boolean().optional().describe('Whether to include comment analysis (default: true)')
  }),
  execute: async (params, context: FunctionContext): Promise<TrendingAnalysisData> => {
    try {
      const timeframeDays = parseInt(params.timeframe || '30', 10);
      const includeComments = params.includeComments !== false; // Default to true
      
      console.log(`[getCommunityTrends] Analyzing community trends for last ${timeframeDays} days, includeComments: ${includeComments}`);

      // Get trending posts from the last X days using home feed algorithm
      const trendingPostsResult = await query(`
        SELECT 
          p.id, p.title, p.content, p.tags, p.upvote_count, p.comment_count, p.created_at,
          u.name as author_name, u.profile_picture_url as author_avatar,
          b.name as board_name, b.id as board_id,
          -- Calculate engagement score (upvotes + comments with recency boost)
          (p.upvote_count * 2 + p.comment_count) * 
          (1 + EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / (24 * 3600))) as engagement_score
        FROM posts p 
        JOIN users u ON p.author_user_id = u.user_id
        JOIN boards b ON p.board_id = b.id
        JOIN communities c ON b.community_id = c.id
        WHERE c.id = $1 
        AND p.created_at >= NOW() - INTERVAL '1 day' * $2
        ORDER BY engagement_score DESC, p.upvote_count DESC, p.created_at DESC
        LIMIT 10
      `, [context.communityId, timeframeDays]);

      const trendingPosts = trendingPostsResult.rows;
      
      if (trendingPosts.length === 0) {
        return {
          type: 'trending_analysis',
          success: false,
          errorForAI: `No posts found in the last ${timeframeDays} days for analysis.`,
          displayMode: 'text_only'
        };
      }

      // Get rich comment data for each trending post (if requested)
      let commentsData: Record<number, any[]> = {};
      if (includeComments && trendingPosts.length > 0) {
        const postIds = trendingPosts.map(p => p.id);
        const postIdPlaceholders = postIds.map((_, index) => `$${index + 1}`).join(',');
        
        // Get top 7 comments per post for deeper analysis
        const commentsResult = await query(`
          SELECT 
            c.id, c.post_id, c.content, c.created_at,
            u.name as author_name, u.profile_picture_url as author_avatar,
            -- Rank comments by engagement and recency within each post
            ROW_NUMBER() OVER (
              PARTITION BY c.post_id 
              ORDER BY LENGTH(c.content) DESC, c.created_at DESC
            ) as comment_rank
          FROM comments c
          JOIN users u ON c.author_user_id = u.user_id
          WHERE c.post_id IN (${postIdPlaceholders})
          AND c.created_at >= NOW() - INTERVAL '1 day' * $${postIds.length + 1}
        `, [...postIds, timeframeDays]);
        
        // Filter to top 7 comments per post and group by post
        commentsData = commentsResult.rows
          .filter(comment => comment.comment_rank <= 7)
          .reduce((acc, comment) => {
            if (!acc[comment.post_id]) acc[comment.post_id] = [];
            acc[comment.post_id].push({
              id: comment.id,
              content: comment.content,
              author: comment.author_name,
              created_at: comment.created_at
            });
            return acc;
          }, {} as Record<number, any[]>);
      }

      // Aggregate metadata for AI analysis
      const boardDistribution = trendingPosts.reduce((acc, post) => {
        acc[post.board_name] = (acc[post.board_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tagFrequency = trendingPosts
        .flatMap(post => post.tags || [])
        .reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const totalEngagement = trendingPosts.reduce((sum, post) => 
        sum + post.upvote_count + post.comment_count, 0
      );

      const averageEngagement = totalEngagement / trendingPosts.length;

      // Calculate time distribution
      const timeDistribution = trendingPosts.reduce((acc, post) => {
        const daysAgo = Math.floor(
          (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const bucket = daysAgo < 7 ? 'last_week' : daysAgo < 14 ? 'last_2_weeks' : 'older';
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Rich data for AI prompt context
      const analysisData = {
        posts: trendingPosts.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content.substring(0, 500) + (post.content.length > 500 ? '...' : ''),
          author: post.author_name,
          board: post.board_name,
          tags: post.tags || [],
          upvotes: post.upvote_count,
          comments: post.comment_count,
          created_at: post.created_at,
          engagement_score: Math.round(post.engagement_score * 100) / 100,
          // Include comments for this post
          top_comments: commentsData[post.id] || []
        })),
        metadata: {
          timeframe_days: timeframeDays,
          total_posts: trendingPosts.length,
          board_distribution: boardDistribution,
          tag_frequency: tagFrequency,
          time_distribution: timeDistribution,
          average_engagement: Math.round(averageEngagement * 10) / 10,
          total_comments_analyzed: Object.values(commentsData).flat().length,
          most_active_boards: Object.entries(boardDistribution)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([board, count]) => ({ board, posts: count as number })),
          trending_tags: Object.entries(tagFrequency)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([tag, frequency]) => ({ tag, frequency: frequency as number }))
        }
      };

      return {
        type: 'trending_analysis',
        success: true,
        messageForAI: `Analyzed ${trendingPosts.length} trending posts from the last ${timeframeDays} days with ${Object.values(commentsData).flat().length} comments. Average engagement: ${averageEngagement.toFixed(1)} interactions per post. Most active boards: ${Object.keys(boardDistribution).slice(0, 3).join(', ')}. Top trending tags: ${Object.keys(tagFrequency).slice(0, 3).join(', ')}. 

IMPORTANT: Do NOT generate any internal links (like /board/123/post/456) in your response. Only mention post titles and content as plain text. Internal navigation should only happen through specialized function call UI cards, not in normal chat text. You may include external links (https://) if relevant.`,
        analysisData,
        displayMode: 'text_only' // Hide structured UI, let AI interpret
      };

    } catch (error) {
      console.error('[getCommunityTrends] Error analyzing community trends:', error);
      return {
        type: 'trending_analysis',
        success: false,
        errorForAI: `Failed to analyze community trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
        displayMode: 'text_only'
      };
    }
  }
}; 