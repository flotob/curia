import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';

// Request interface
interface WelcomeRequest {
  context?: {
    boardId?: string;
    isFirstVisit?: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
}

// Response interface
interface WelcomeResponse {
  message: string;
  tone: 'welcoming' | 'helpful' | 'encouraging' | 'admin-focused';
  duration: number; // suggested display time in ms
  hasCallToAction: boolean;
}

// Helper function to determine time of day
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// Helper function to calculate reading time
function calculateDisplayTime(message: string): number {
  const wordsPerMinute = 200;
  const words = message.split(' ').length;
  const readingTime = (words / wordsPerMinute) * 60 * 1000;
  return Math.max(4000, Math.min(readingTime + 2000, 10000)); // 4-10 seconds
}

export const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  try {
    const { context }: WelcomeRequest = await request.json();
    
    // Get user and community context
    const userId = request.userContext.userId;
    const communityId = request.userContext.communityId;
    const isAdmin = request.userContext.isAdmin;
    const userName = request.user?.name || null; // Get name from JWT token

    // Get community information
    const communityResult = await query(
      'SELECT title, description FROM communities WHERE id = $1',
      [communityId]
    );
    const community = communityResult.rows[0];

    // Get user stats
    const userStatsResult = await query(`
      SELECT 
        COUNT(DISTINCT p.id) as post_count,
        COUNT(DISTINCT c.id) as comment_count,
        MIN(p.created_at) as first_post_date
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id AND p.community_id = $2
      LEFT JOIN comments c ON u.id = c.author_id
      WHERE u.id = $1
    `, [userId, communityId]);
    
    const stats = userStatsResult.rows[0];
    const postCount = parseInt(stats.post_count) || 0;
    const commentCount = parseInt(stats.comment_count) || 0;
    const isNewUser = postCount === 0 && commentCount === 0;

    // Get board context if provided
    let boardInfo = null;
    if (context?.boardId) {
      const boardResult = await query(
        'SELECT title FROM boards WHERE id = $1 AND community_id = $2',
        [context.boardId, communityId]
      );
      boardInfo = boardResult.rows[0];
    }

    // Determine context
    const timeOfDay = context?.timeOfDay || getTimeOfDay();
    const isFirstVisit = context?.isFirstVisit ?? true;

    // Create personalized system prompt
    const systemPrompt = `You are Clippy, a friendly and intelligent AI assistant for the "${community?.title || 'community'}" community platform.

Your role is to generate brief, personalized welcome messages that make users feel welcomed and guide them toward their next best action.

## User Context:
- Name: ${userName || 'there'}
- Role: ${isAdmin ? 'ADMINISTRATOR' : 'Community Member'}
- Posts: ${postCount}, Comments: ${commentCount}
- User Type: ${isNewUser ? 'New User' : postCount > 10 ? 'Active User' : 'Occasional User'}
- First Visit: ${isFirstVisit}
- Time: ${timeOfDay}
- Current Board: ${boardInfo?.title || 'Main'}
- Community: ${community?.title || 'Community'}

## Message Guidelines:
- Keep it under 140 characters for mobile compatibility
- Be warm but professional, not overly casual
- Reference their role and activity level appropriately
- For ADMINISTRATORS: Focus on community management, analytics, member engagement
- For MEMBERS: Focus on participation, discovery, getting help
- End with a subtle call to action that fits their role
- Use their name if available, otherwise use "there" or similar

## Tone Examples:
- New Admin: "Welcome to your community dashboard, [Name]! I can help you manage members, review content, and track engagement."
- Active Admin: "Hey [Name]! Ready to check on your community? I can help with moderation, analytics, or member management."
- New User: "Welcome to [Community], [Name]! I can help you explore discussions, create your first post, or find interesting topics."
- Active User: "Welcome back, [Name]! Ready to dive into today's discussions? I can help you find trending topics or navigate boards."

Generate ONE personalized welcome message that feels natural and helpful.`;

    // Generate the welcome message
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: `Generate a personalized welcome message for this user right now.`,
      temperature: 0.7,
      maxTokens: 100, // Keep messages concise
    });

    const message = result.text.trim();
    
    // Determine tone based on user type and content
    let tone: WelcomeResponse['tone'] = 'welcoming';
    if (isAdmin) {
      tone = 'admin-focused';
    } else if (!isNewUser && (postCount > 5 || commentCount > 10)) {
      tone = 'helpful';
    } else if (isNewUser) {
      tone = 'encouraging';
    }

    // Calculate display duration
    const duration = calculateDisplayTime(message);

    // Determine if message has call to action (simple heuristic)
    const hasCallToAction = /[?!]|click|help|explore|try|check|visit/i.test(message);

    // Log the welcome message generation for analytics
    await query(
      `INSERT INTO ai_usage_logs (user_id, community_id, api_provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, success, feature_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        communityId,
        'openai',
        'gpt-4o-mini',
        result.usage?.promptTokens || 0,
        result.usage?.completionTokens || 0,
        result.usage?.totalTokens || 0,
        ((result.usage?.promptTokens || 0) * 0.00015 + (result.usage?.completionTokens || 0) * 0.0006) / 1000,
        true,
        'welcome_message'
      ]
    );

    const response: WelcomeResponse = {
      message,
      tone,
      duration,
      hasCallToAction
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Welcome message generation error:', error);
    
    // Return fallback message on error
    const fallbackMessage = request.userContext.isAdmin 
      ? "Welcome to your community dashboard! I'm here to help with management and analytics."
      : "Hi there! I'm your community assistant. Click me if you need help navigating!";
    
    return NextResponse.json({
      message: fallbackMessage,
      tone: 'welcoming' as const,
      duration: 5000,
      hasCallToAction: true
    });
  }
}, { requireCommunity: true }); 