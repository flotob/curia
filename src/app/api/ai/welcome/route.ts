import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';

const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  try {
    console.log('Welcome API - Starting request processing');
    
    // Get user and community context
    const userId = request.userContext.userId;
    const communityId = request.userContext.communityId;
    const isAdmin = request.userContext.isAdmin;
    const userName = request.user?.name || 'Unknown';
    
    console.log('Welcome API - User context:', { 
      userId, 
      communityId, 
      isAdmin,
      userName,
      hasUserContext: !!request.userContext
    });

    // Get request body for context
    const body = await request.json().catch(() => ({}));
    const { timeOfDay, boardId, isFirstVisit } = body;

    console.log('Welcome API - Request context:', { timeOfDay, boardId, isFirstVisit });

    // Build context for the AI
    let contextInfo = '';
    
    // Get user stats and community info
    try {
      // User name comes from JWT, add it to context
      contextInfo += `User name: ${userName}. `;
      
      const userStatsResult = await query(
        `SELECT 
          (SELECT COUNT(*) FROM posts WHERE author_user_id = $1) as post_count,
          (SELECT COUNT(*) FROM comments WHERE author_user_id = $1) as comment_count,
          (SELECT first_visited_at FROM user_communities WHERE user_id = $1 AND community_id = $2) as user_since
         FROM users WHERE user_id = $1 LIMIT 1`,
        [userId, communityId]
      );

      const communityResult = await query(
        `SELECT name, description FROM communities WHERE id = $1`,
        [communityId]
      );

      if (userStatsResult.rows.length > 0) {
        const stats = userStatsResult.rows[0];
        contextInfo += `User has ${stats.post_count} posts and ${stats.comment_count} comments. `;
        
        if (stats.user_since) {
          const joinDate = new Date(stats.user_since);
          const daysSince = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          contextInfo += `Member for ${daysSince} days. `;
        }
      }

      if (communityResult.rows.length > 0) {
        const community = communityResult.rows[0];
        contextInfo += `Community: ${community.name}. `;
      }

      if (boardId) {
        const boardResult = await query(
          `SELECT name FROM boards WHERE id = $1`,
          [boardId]
        );
        if (boardResult.rows.length > 0) {
          contextInfo += `Current board: ${boardResult.rows[0].name}. `;
        }
      }
    } catch (dbError) {
      console.error('Welcome API - Database error:', dbError);
      contextInfo = 'Limited context available. ';
    }

    console.log('Welcome API - Built context:', contextInfo);

    // Create system prompt
    const systemPrompt = `You are a helpful community assistant. Generate a brief, personalized welcome message (2-3 sentences max) for a community member.

Context: ${contextInfo}
Time: ${timeOfDay || 'unknown'}
User role: ${isAdmin ? 'Admin' : 'Member'}
First visit: ${isFirstVisit ? 'Yes' : 'No'}

Make the message warm, contextual, and helpful. For admins, acknowledge their role. For active users, reference their contributions. Keep it concise and engaging. IMPORTANT: Always use the user's actual name (${userName}) in your response.`;

    const userPrompt = `Generate a personalized welcome message for ${userName}.`;

    console.log('Welcome API - Calling OpenAI with generateText');

    // Use generateText for simple, non-streaming response
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 100,
    });

    console.log('Welcome API - AI response completed:', { 
      textLength: result.text?.length,
      finishReason: result.finishReason,
      usage: result.usage 
    });

    // Log the successful request
    try {
      // Create conversation for tracking
      const conversationResult = await query(
        `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [userId, communityId, 'admin_assistant', 'completed', JSON.stringify({ 
          type: 'welcome_message',
          timeOfDay,
          boardId,
          isFirstVisit
        })]
      );
      const conversationId = conversationResult.rows[0].id;

      // Save user request
      await query(
        `INSERT INTO ai_messages (conversation_id, role, content, message_index) 
         VALUES ($1, $2, $3, $4)`,
        [conversationId, 'user', userPrompt, 0]
      );

      // Save the AI response
      const messageResult = await query(
        `INSERT INTO ai_messages (conversation_id, role, content, message_index) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [conversationId, 'assistant', result.text, 1]
      );
      const messageId = messageResult.rows[0].id;

      // Log usage
      if (result.usage) {
        const estimatedCost = (result.usage.promptTokens * 0.00015 + result.usage.completionTokens * 0.0006) / 1000;
        
        await query(
          `INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, success) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [conversationId, messageId, userId, communityId, 'gpt-4o-mini', result.usage.promptTokens, result.usage.completionTokens, result.usage.totalTokens, estimatedCost, result.finishReason === 'stop']
        );
      }
    } catch (logError) {
      console.error('Welcome API - Database logging error:', logError);
      // Don't fail the request if logging fails
    }

    console.log('Welcome API - Final response:', { 
      textLength: result.text?.length,
      text: result.text?.substring(0, 100) + '...' 
    });

    // Return the text as JSON
    return NextResponse.json({
      message: result.text,
      tone: isAdmin ? 'admin-focused' : 'helpful',
      duration: 0, // No auto-hide
      hasActions: true
    });

  } catch (error) {
    console.error('Welcome API - Error:', error);
    
    // Log failed request if we have context
    try {
      const userId = request.userContext?.userId;
      const communityId = request.userContext?.communityId;
      
      if (userId && communityId) {
        const errorConversationResult = await query(
          `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [userId, communityId, 'admin_assistant', 'completed', JSON.stringify({ 
            type: 'welcome_message_error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          })]
        );
        const errorConversationId = errorConversationResult.rows[0].id;

        const errorMessageResult = await query(
          `INSERT INTO ai_messages (conversation_id, role, content, message_index) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [errorConversationId, 'system', 'Error occurred during welcome message generation', 0]
        );
        const errorMessageId = errorMessageResult.rows[0].id;

        await query(
          `INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, model, success, error_message) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [errorConversationId, errorMessageId, userId, communityId, 'gpt-4o-mini', false, error instanceof Error ? error.message : 'Unknown error']
        );
      }
    } catch (logError) {
      console.error('Welcome API - Failed to log error:', logError);
    }

    // Return fallback message
    const isAdmin = request.userContext?.isAdmin;
    const fallbackMessage = isAdmin 
      ? "Welcome back, admin! Ready to manage your community today?"
      : "Hi there! I'm your community assistant. Click me if you need help navigating!";
    
    console.log('Welcome API - Using fallback message:', fallbackMessage);
    
    return NextResponse.json({
      message: fallbackMessage,
      tone: isAdmin ? 'admin-focused' : 'helpful',
      duration: 0,
      hasActions: true
    });
  }
});

export { POST }; 