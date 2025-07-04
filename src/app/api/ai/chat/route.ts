import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { streamText, UIMessage, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';
import { z } from 'zod';

// Tool definitions for AI assistant (AI SDK 5.0 format)
const tools = {
  analyze_content: {
    description: 'Analyze content for clarity, tone, structure, and engagement',
    parameters: z.object({
      content: z.string().describe('The content to analyze'),
      analysis_type: z.enum(['clarity', 'tone', 'structure', 'engagement', 'comprehensive']).describe('Type of analysis to perform')
    }),
    execute: async ({ content, analysis_type }: { content: string; analysis_type: string }) => {
      // This is handled by the model - return a formatted response
      return {
        analysis_type,
        content_length: content.length,
        analysis: `Analyzing ${analysis_type} for: "${content.substring(0, 100)}..."`
      };
    }
  },
  generate_improvements: {
    description: 'Generate specific improvement suggestions for content',
    parameters: z.object({
      content: z.string().describe('The content to improve'),
      improvement_type: z.enum(['clarity', 'tone', 'structure', 'engagement', 'grammar']).describe('Type of improvement to generate'),
      target_tone: z.string().optional().describe('Target tone for the content (e.g., professional, casual, friendly)')
    }),
    execute: async ({ content, improvement_type, target_tone }: { content: string; improvement_type: string; target_tone?: string }) => {
      return {
        improvement_type,
        target_tone,
        content_length: content.length,
        suggestions: `Generated ${improvement_type} improvements for content (${target_tone ? `targeting ${target_tone} tone` : 'default tone'})`
      };
    }
  },
  search_community_knowledge: {
    description: 'Search for relevant information from community posts and discussions',
    parameters: z.object({
      query: z.string().describe('The search query'),
      community_id: z.string().describe('Community ID to search within')
    }),
    execute: async ({ query, community_id }: { query: string; community_id: string }) => {
      // TODO: Implement actual community search later
      return {
        query,
        community_id,
        results: [],
        message: 'Community search feature coming soon'
      };
    }
  },
  suggest_content_structure: {
    description: 'Suggest better structure and organization for content',
    parameters: z.object({
      content: z.string().describe('The content to restructure'),
      content_type: z.enum(['post', 'comment', 'announcement', 'discussion']).describe('Type of content')
    }),
    execute: async ({ content, content_type }: { content: string; content_type: string }) => {
      return {
        content_type,
        content_length: content.length,
        suggestions: `Structure suggestions for ${content_type}: Consider organizing content with clear sections`
      };
    }
  }
};

// Request/Response interfaces
interface ChatRequest {
  messages: CoreMessage[];
  conversationId?: string;
  context?: {
    type: 'post' | 'comment' | 'general' | 'onboarding';
    boardId?: number;
    postId?: number;
  };
}

// Helper function to extract text content from UIMessage
function getMessageContent(message: UIMessage): string {
  // Handle both old and new UIMessage formats
  if ((message as any).content && typeof (message as any).content === 'string') {
    return (message as any).content;
  }
  
  // Handle new UIMessage format with parts
  if ((message as any).content && Array.isArray((message as any).content)) {
    return (message as any).content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  }
  
  return '';
}

// Database functions
async function createConversation(userId: string, communityId: string, title?: string, conversationType: string = 'admin_assistant', metadata: any = {}) {
  const result = await query(`
    INSERT INTO ai_conversations (user_id, community_id, title, conversation_type, status, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
    RETURNING id
  `, [userId, communityId, title || 'New Conversation', conversationType, JSON.stringify(metadata)]);
  
  return result.rows[0].id;
}

async function addMessage(conversationId: string, role: string, content: string, metadata: any = {}) {
  const messageIndexResult = await query(`
    SELECT COALESCE(MAX(message_index), -1) + 1 as next_index 
    FROM ai_messages 
    WHERE conversation_id = $1
  `, [conversationId]);
  
  const messageIndex = messageIndexResult.rows[0].next_index;

  const result = await query(`
    INSERT INTO ai_messages (conversation_id, role, content, tool_calls, tool_results, metadata, message_index, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id
  `, [
    conversationId,
    role,
    content,
    metadata.tool_calls ? JSON.stringify(metadata.tool_calls) : null,
    metadata.tool_results ? JSON.stringify(metadata.tool_results) : null,
    JSON.stringify({ 
      ...metadata,
      processing_time_ms: metadata.processing_time_ms,
      model: metadata.model 
    }),
    messageIndex
  ]);

  return result.rows[0].id;
}

async function logUsage(conversationId: string, messageId: string, userId: string, communityId: string, model: string, usage: any, success: boolean = true, errorMessage?: string) {
  await query(`
    INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, api_provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, processing_time_ms, tool_calls_count, success, error_message, created_at)
    VALUES ($1, $2, $3, $4, 'openai', $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
  `, [
    conversationId,
    messageId,
    userId,
    communityId,
    model,
    usage.promptTokens || 0,
    usage.completionTokens || 0,
    usage.totalTokens || 0,
    calculateCost(model, usage),
    usage.processing_time_ms || 0,
    usage.tool_calls_count || 0,
    success,
    errorMessage
  ]);
}

function calculateCost(model: string, usage: any): number {
  // OpenAI pricing (approximate, update as needed)
  const pricing: { [key: string]: { input: number, output: number } } = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4': { input: 0.03, output: 0.06 }
  };

  const modelPricing = pricing[model] || pricing['gpt-4o'];
  const inputCost = (usage.promptTokens || 0) * modelPricing.input / 1000;
  const outputCost = (usage.completionTokens || 0) * modelPricing.output / 1000;
  
  return inputCost + outputCost;
}

// Tool execution functions (implementations handled by OpenAI function calling)

async function handleChatRequest(req: EnhancedAuthRequest): Promise<Response> {
  const startTime = Date.now();
  const { userId, communityId } = req.userContext;

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body: ChatRequest = await req.json();
  const { messages, conversationId, context: chatContext } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let currentConversationId = conversationId;
  if (!currentConversationId) {
    // Create new conversation
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const lastUserContent = lastUserMessage ? getMessageContent(lastUserMessage) : '';
    const title = lastUserContent.substring(0, 50) + '...' || 'New Conversation';
    // Map chat context to valid database conversation types
    const validConversationType = 'admin_assistant'; // Our general AI assistant
    const contextMetadata = {
      chatContextType: chatContext?.type || 'general',
      postId: chatContext?.postId,
      boardId: chatContext?.boardId
    };
    
    currentConversationId = await createConversation(
      userId,
      communityId,
      title,
      validConversationType,
      contextMetadata
    );
  }

  // Ensure we have a conversation ID
  if (!currentConversationId) {
    return new Response(JSON.stringify({ error: 'Failed to create conversation' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // System prompt based on context
  const systemPrompt = `You are an AI writing assistant for Curia, a community forum platform. You help users write better posts, comments, and content.

Current context:
- User: ${req.userContext.userId}
- Community: ${communityId}
- Context: ${chatContext?.type || 'general'}

Your capabilities:
1. **Content Analysis**: Analyze text for clarity, tone, structure, and engagement
2. **Content Improvement**: Generate specific suggestions to improve writing
3. **Community Knowledge**: Search relevant community discussions and posts
4. **Structure Suggestions**: Recommend better organization for different content types

Guidelines:
- Be helpful, constructive, and encouraging
- Provide specific, actionable suggestions
- Maintain the user's voice while improving clarity
- Consider the community context and audience
- Use tools when appropriate to provide detailed analysis

How can I help you improve your content today?`;

  try {
    console.log('[AI Chat] Calling streamText with messages:', messages);
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages, // AI SDK 5.0 can handle simple {role, content} messages directly
      // tools, // Temporarily removing tools to fix schema issues
      system: systemPrompt,
      async onFinish({ text, usage, toolCalls, toolResults }) {
        const processingTime = Date.now() - startTime;
        
        try {
          // Save user message
          const userMessage = messages[messages.length - 1];
          const userContent = getMessageContent(userMessage);
          await addMessage(currentConversationId!, 'user', userContent);

          // Save assistant message
          const assistantMessageId = await addMessage(currentConversationId!, 'assistant', text, {
            tool_calls: toolCalls,
            tool_results: toolResults,
            processing_time_ms: processingTime,
            model: 'gpt-4o-mini'
          });

          // Log usage
          await logUsage(
            currentConversationId!,
            assistantMessageId,
            userId,
            communityId,
            'gpt-4o-mini',
            { ...usage, processing_time_ms: processingTime, tool_calls_count: toolCalls?.length || 0 },
            true
          );
        } catch (error) {
          console.error('[AI Chat] Error saving conversation:', error);
        }
      }
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: () => ({
        conversationId: currentConversationId,
        context: chatContext
      })
    });

  } catch (error) {
    console.error('[AI Chat] Error:', error);
    
    // Skip usage logging for failed requests (no valid message_id available)
    console.log('[AI Chat] Skipping usage logging for failed request - no message created');

    return new Response(JSON.stringify({ error: 'Failed to generate response' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Wrapper to handle the middleware conversion
export const POST = withAuthAndErrorHandling(async (req: EnhancedAuthRequest) => {
  const result = await handleChatRequest(req);
  // Convert Response to NextResponse to satisfy middleware types
  return new NextResponse(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers
  });
}, { requireCommunity: true });

// GET endpoint for conversation history
export const GET = withAuthAndErrorHandling(async (req: EnhancedAuthRequest) => {
  const { userId, communityId } = req.userContext;
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');

  if (conversationId) {
    // Get specific conversation with messages
    const conversationResult = await query(`
      SELECT * FROM ai_conversations 
      WHERE id = $1 AND user_id = $2 AND community_id = $3
    `, [conversationId, userId, communityId]);

    if (conversationResult.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messagesResult = await query(`
      SELECT * FROM ai_messages 
      WHERE conversation_id = $1 
      ORDER BY message_index ASC
    `, [conversationId]);

    const conversation = conversationResult.rows[0];
    const messages = messagesResult.rows.map(row => ({
      id: row.id,
      role: row.role,
      content: row.content,
      tool_calls: row.tool_calls,
      tool_results: row.tool_results,
      metadata: row.metadata,
      created_at: row.created_at
    }));

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        conversation_type: conversation.conversation_type,
        status: conversation.status,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        messages
      }
    });
  } else {
    // Get user's conversations list
    const conversations = await query(`
      SELECT c.*, 
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM ai_conversations c
      LEFT JOIN ai_messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1 AND c.community_id = $2
      GROUP BY c.id
      ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
      LIMIT 50
    `, [userId, communityId]);

    return NextResponse.json({
      conversations: conversations.rows.map(row => ({
        id: row.id,
        title: row.title,
        conversation_type: row.conversation_type,
        status: row.status,
        message_count: parseInt(row.message_count),
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
    });
  }
}, { requireCommunity: true });