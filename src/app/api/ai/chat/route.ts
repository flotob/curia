import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';
import { FunctionRegistry, type FunctionContext, ClippyCharacterSystem } from '@/lib/ai';

// Request interface
interface ChatRequest {
  messages: CoreMessage[];
  conversationId?: string;
  context?: {
    boardId?: string;
    postId?: string;
  };
}

// Helper function to extract text content from CoreMessage
function extractMessageContent(message: CoreMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  } else if (Array.isArray(message.content)) {
    return message.content
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join('');
  }
  return '';
}

export const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  try {
    const { messages, conversationId: providedConversationId, context: chatContext }: ChatRequest = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Get user and community context
    const userId = request.userContext.userId;
    const communityId = request.userContext.communityId;

    // Create or use existing conversation
    let conversationId = providedConversationId;
    if (!conversationId) {
      const conversationResult = await query(
        `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [userId, communityId, 'admin_assistant', 'active', JSON.stringify(chatContext || {})]
      );
      conversationId = conversationResult.rows[0].id;
    }

    // Ensure we have a valid conversation ID
    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Save the latest user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const userContent = extractMessageContent(lastMessage);
      await query(
        `INSERT INTO ai_messages (conversation_id, role, content, tool_calls, tool_results, message_index) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          conversationId,
          'user',
          userContent,
          JSON.stringify([]),
          JSON.stringify([]),
          messages.length - 1
        ]
      );
    }

    // Create function context for AI tools
    const functionContext: FunctionContext = {
      userId,
      communityId,
      boardId: chatContext?.boardId,
      postId: chatContext?.postId
    };

    // Get AI tools from function registry
    const registry = new FunctionRegistry();
    const tools = registry.getAllForAI(functionContext);

    // Generate character-driven system prompt
    const systemPrompt = ClippyCharacterSystem.forChatAssistant({
      userId,
      communityId,
      userName: request.user?.name || undefined,
      isAdmin: request.userContext?.isAdmin,
      boardId: chatContext?.boardId,
      postId: chatContext?.postId
    });

    // Generate AI response with tools using v4 syntax
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      tools,
      system: systemPrompt,
      temperature: 0.7,
      maxSteps: 3, // Critical for tool calling
      onFinish: async ({ usage, finishReason, text }) => {
        try {
          // Log usage statistics
          if (usage) {
            // Save the assistant message to get its ID
            let assistantMessageId: string | null = null;
            if (text) {
              const messageResult = await query(
                `INSERT INTO ai_messages (conversation_id, role, content, tool_calls, tool_results, message_index) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id`,
                [
                  conversationId,
                  'assistant',
                  text,
                  JSON.stringify([]),
                  JSON.stringify([]),
                  messages.length
                ]
              );
              assistantMessageId = messageResult.rows[0].id;
            }

            // Calculate estimated cost (approximate OpenAI pricing)
            const estimatedCost = (usage.promptTokens * 0.00015 + usage.completionTokens * 0.0006) / 1000;

            // Log usage
            await query(
              `INSERT INTO ai_usage_logs (conversation_id, message_id, user_id, community_id, api_provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, success) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                conversationId,
                assistantMessageId,
                userId,
                communityId,
                'openai',
                'gpt-4o-mini',
                usage.promptTokens,
                usage.completionTokens,
                usage.totalTokens,
                estimatedCost,
                finishReason === 'stop'
              ]
            );
          }
        } catch (error) {
          console.error('Failed to save AI response:', error);
        }
      }
    });

    // Return streaming response using v4 syntax
    const streamResponse = result.toDataStreamResponse();
    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers: streamResponse.headers,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

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