import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';
import { z } from 'zod';
import { CommunitySettings, BoardSettings, SettingsUtils } from '@/types/settings';

// Interfaces for the improvement response
export interface ImprovementChange {
  type: 'addition' | 'deletion' | 'modification';
  originalText: string;
  improvedText: string;
  startIndex: number;
  endIndex: number;
  reason: string;
  changeId: string;
}

export interface ImprovementResult {
  improvedContent: string;
  changes: ImprovementChange[];
  summary: string;
  confidence: number;
}

// Removed compliance interfaces - now pure optimizer

const IMPROVEMENT_SYSTEM_PROMPT = `You are an expert content editor for a community forum. Improve the provided content for:

1. **Grammar & Spelling**: Fix typos, grammar errors, punctuation mistakes
2. **Clarity & Readability**: Simplify complex sentences, improve flow and structure  
3. **Engagement**: Make content more engaging while preserving original meaning and tone
4. **Community Fit**: Adapt language and style to match the community's culture and norms
5. **Professional Polish**: Ensure appropriate formatting and professional presentation

IMPORTANT RULES:
- Preserve the original meaning and author's intent
- Don't add new information, claims, or change the core message
- Keep roughly the same content length (±20%)
- Maintain any technical terms or domain-specific language
- Preserve markdown formatting if present
- Keep the same tone (formal/casual/technical)
- Focus on making existing content clearer and more professional
- NEVER add titles or headlines to content that doesn't already have them
- If content already starts with a title/headline, do NOT duplicate it
- Use community context to make content more relevant and engaging

Return your improvements with specific details about what was changed and why.`;

const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  try {
    const { content, type, title, communityId: requestCommunityId, boardId } = await request.json();
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required and must be a string' }, { status: 400 });
    }

    if (!type || !['post', 'comment'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "post" or "comment"' }, { status: 400 });
    }

    // Get user and community context
    const userId = request.userContext.userId;
    const communityId = requestCommunityId || request.userContext.communityId;

    // Fetch community and board settings for auto-moderation
    let communitySettings: CommunitySettings = {};
    let boardSettings: BoardSettings = {};
    let autoModerationConfig: ReturnType<typeof SettingsUtils.getAIAutoModerationConfig> | null = null;

    // Always fetch settings for community context
    try {
      // Fetch community settings
      const communityResult = await query(
        'SELECT settings FROM communities WHERE id = $1',
        [communityId]
      );
      
      if (communityResult.rows.length > 0 && communityResult.rows[0].settings) {
        communitySettings = communityResult.rows[0].settings;
      }

      // Fetch board settings if boardId provided
      if (boardId) {
        const boardResult = await query(
          'SELECT settings FROM boards WHERE id = $1 AND community_id = $2',
          [boardId, communityId]
        );
        
        if (boardResult.rows.length > 0 && boardResult.rows[0].settings) {
          boardSettings = boardResult.rows[0].settings;
        }
      }

      // Get aggregated auto-moderation config
      autoModerationConfig = SettingsUtils.getAIAutoModerationConfig(communitySettings, boardSettings);
      
      console.log('[AI Improve] Auto-moderation config:', autoModerationConfig);
    } catch (settingsError) {
      console.error('[AI Improve] Failed to fetch settings:', settingsError);
      // Continue without auto-moderation if settings fetch fails
    }

    // Create conversation for tracking
    const conversationResult = await query(
      `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [userId, communityId, 'admin_assistant', 'active', JSON.stringify({ 
        type: 'content_improvement', 
        contentType: type,
        originalLength: content.length 
      })]
    );
    const conversationId = conversationResult.rows[0].id;

    // Save user request
    await query(
      `INSERT INTO ai_messages (conversation_id, role, content, message_index) 
       VALUES ($1, $2, $3, $4)`,
      [conversationId, 'user', content, 0]
    );

    // Prepare context-aware improvement prompt
    let systemPrompt = IMPROVEMENT_SYSTEM_PROMPT;
    const userPrompt = type === 'post' && title 
      ? `Improve this ${type} content. The title is "${title}" and is handled separately - do NOT include or repeat the title in your improved content. Only improve the body content:\n\n${content}`
      : `Improve this ${type}:\n\n${content}`;

    // Add community context if available
    if (autoModerationConfig?.enabled && autoModerationConfig.customKnowledge) {
      systemPrompt += `

---COMMUNITY CONTEXT---
This content is for a community with specific culture and norms. Use this context to make your improvements more relevant and engaging:

${autoModerationConfig.customKnowledge}

Consider this community context when improving the content to make it more fitting and engaging for this specific audience.`;
    }

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: {
        generateImprovedContent: {
          description: 'Generate improved version of content with specific tracked changes',
          parameters: z.object({
            improvedContent: z.string().describe('The improved version of the content'),
            changes: z.array(z.object({
              type: z.enum(['addition', 'deletion', 'modification']).describe('Type of change made'),
              originalText: z.string().describe('Original text that was changed'),
              improvedText: z.string().describe('New improved text'),
              startIndex: z.number().describe('Start character position in original text'),
              endIndex: z.number().describe('End character position in original text'), 
              reason: z.string().describe('Why this change improves the content'),
              changeId: z.string().describe('Unique identifier for this change')
            })).describe('List of all changes made with exact positions'),
            summary: z.string().describe('Brief summary of the main improvements made'),
            confidence: z.number().min(0).max(100).describe('Confidence level in improvements (0-100)')
          }),
          execute: async (params) => {
            try {
              console.log('[AI Improve] Generated improvements:', {
                changesCount: params.changes?.length || 0,
                confidence: params.confidence,
                hasCustomKnowledge: !!(autoModerationConfig?.customKnowledge)
              });

              // Save the AI response and get the message ID
              const messageResult = await query(
                `INSERT INTO ai_messages (conversation_id, role, content, tool_results, message_index) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [conversationId, 'assistant', params.summary, JSON.stringify(params), 1]
              );
              const messageId = messageResult.rows[0].id;

              // Log usage for this improvement
              const estimatedPromptTokens = Math.ceil(content.length / 4);
              const estimatedCompletionTokens = Math.ceil(params.improvedContent.length / 4);
              const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;
              
              // Calculate estimated cost (OpenAI GPT-4o-mini pricing)
              const estimatedCost = (estimatedPromptTokens * 0.00015 + estimatedCompletionTokens * 0.0006) / 1000;

              await query(
                `INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, success) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [conversationId, messageId, userId, communityId, 'gpt-4o-mini', estimatedPromptTokens, estimatedCompletionTokens, totalTokens, estimatedCost, true]
              );

              // Return clean optimization response
              return { 
                success: true, 
                data: {
                  ...params,
                  hasSignificantChanges: params.changes?.length > 0,
                  communityContextUsed: !!(autoModerationConfig?.customKnowledge)
                }
              };
            } catch (dbError) {
              console.error('Database error in AI improvement:', dbError);
              // Still return success to not break the AI response
              return { success: true, data: params };
            }
          }
        }
      },
      maxSteps: 2,
      temperature: 0.3 // Lower temperature for more consistent improvements
    });

    // Return streaming response using v4 syntax
    const streamResponse = result.toDataStreamResponse();
    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers: streamResponse.headers,
    });

  } catch (error) {
    console.error('AI improvement error:', error);
    
    // Log failed request if we have context
    try {
      const userId = request.userContext?.userId;
      const communityId = request.userContext?.communityId;
      
      if (userId && communityId) {
        // Create a basic conversation and message for error logging
        const errorConversationResult = await query(
          `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [userId, communityId, 'admin_assistant', 'completed', JSON.stringify({ 
            type: 'content_improvement_error', 
            error: error instanceof Error ? error.message : 'Unknown error'
          })]
        );
        const errorConversationId = errorConversationResult.rows[0].id;

        const errorMessageResult = await query(
          `INSERT INTO ai_messages (conversation_id, role, content, message_index) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [errorConversationId, 'system', 'Error occurred during content improvement', 0]
        );
        const errorMessageId = errorMessageResult.rows[0].id;

        await query(
          `INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, model, success, error_message) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [errorConversationId, errorMessageId, userId, communityId, 'gpt-4o-mini', false, error instanceof Error ? error.message : 'Unknown error']
        );
      }
    } catch (logError) {
      console.error('Failed to log AI improvement error:', logError);
    }
    
    return NextResponse.json({ 
      error: 'Failed to improve content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
});

// Export the method
export { POST }; 