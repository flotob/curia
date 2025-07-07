import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';
import { FunctionRegistry, type FunctionContext } from '@/lib/ai';

// Request interface
interface ChatRequest {
  messages: CoreMessage[];
  conversationId?: string;
  context?: {
    boardId?: string;
    postId?: string;
  };
}

// Function result types that have custom UI cards
const UI_CARD_FUNCTION_TYPES = new Set([
  'search_results',
  'lock_search_results', 
  'post_creation_guidance'
]);

// Helper to detect if tool results have custom UI cards
function hasUICardResults(toolResults?: any[]): boolean {
  return toolResults?.some(result => {
    const resultType = result.result?.type;
    return resultType && UI_CARD_FUNCTION_TYPES.has(resultType);
  }) || false;
}

// Helper function to extract text content from CoreMessage
function extractMessageContent(message: CoreMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter(part => part.type === 'text')
      .map(part => (part as any).text || '')
      .join('');
  }
  return '';
}

export const POST = withAuthAndErrorHandling(async (request: EnhancedAuthRequest) => {
  const { userContext } = request;
  const body: ChatRequest = await request.json();
  const { messages, conversationId, context } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
  }

  const userId = userContext.userId;
  const communityId = userContext.communityId;

  // Validate required context
  if (!userId || !communityId) {
    return NextResponse.json({ error: 'User and community context required' }, { status: 400 });
  }

  // Type-safe after validation
  const validatedUserId = userId as string;
  const validatedCommunityId = communityId as string;

  // Create or get conversation
  let currentConversationId = conversationId;
  if (!currentConversationId) {
    const result = await query(
      `INSERT INTO ai_conversations (user_id, community_id, conversation_type, status, metadata) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`,
      [
        validatedUserId,
        validatedCommunityId,
        'admin_assistant',
        'active',
        JSON.stringify({
          title: 'New Conversation',
          context: context || {},
          created_at: new Date().toISOString()
        })
      ]
    );
    currentConversationId = result.rows[0]?.id;
  }

  // Ensure we have a valid conversation ID
  if (!currentConversationId) {
    return NextResponse.json({ error: 'Failed to create or retrieve conversation' }, { status: 500 });
  }

  // Save user message
  const lastMessage = messages[messages.length - 1];
  const userContent = extractMessageContent(lastMessage);
  
  await query(
    `INSERT INTO ai_messages (conversation_id, role, content, tool_calls, tool_results, message_index) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      currentConversationId,
      'user',
      userContent,
      JSON.stringify([]),
      JSON.stringify([]),
      messages.length - 1
    ]
  );

  // Initialize function registry
  const functionRegistry = new FunctionRegistry();
  const functionContext: FunctionContext = {
    userId: validatedUserId,
    communityId: validatedCommunityId
  };

  // Get available tools
  const tools = functionRegistry.getAllForAI(functionContext);

  // System prompt with context
  const systemPrompt = `I'm your community guide - think of me as a friendly, knowledgeable community member who knows all the ins and outs of this platform. My goal is to help you navigate, discover great content, and participate successfully.

## 🎯 My Core Mission
Help users succeed in this community by providing navigation guidance, content discovery, and platform assistance with a warm, helpful approach.

## 🧠 How I Think & Respond

**When users ask about creating posts:**
- MANDATORY: Use showPostCreationGuidance function for ANY mention of creating, posting, sharing, or writing content
- Questions like "how do I create a post", "how to post", "make a post", "write a post" MUST trigger showPostCreationGuidance
- Always call showPostCreationGuidance with explanation and buttonText parameters
- Example: showPostCreationGuidance(explanation: "I'll help you create a post...", buttonText: "Create New Post")

**When users need to find content:**
- Use searchCommunityKnowledge to find relevant discussions
- Summarize findings and highlight most relevant posts
- Suggest related topics they might want to explore

**When users ask about locks, access control, or gating:**
- Use searchLocks to find relevant access control locks
- Search by keywords like "ENS", "token", "NFT", "social", "ethereum", "lukso", etc.
- Users can click lock cards to see detailed requirements and test verification
- Explain lock types and help users understand access requirements

**When users seem lost or confused:**
- Proactively offer step-by-step guidance
- Break down complex tasks into simple steps
- Anticipate common next questions and address them

**When discussing platform features:**
- Mention locks, gating, and verification when relevant
- Explain board permissions and access requirements
- Reference community partnerships and shared content when applicable

## 🎭 My Personality
- **Friendly but not overly casual** - like a helpful community moderator
- **Encouraging** - especially for users who seem new or struggling
- **Knowledgeable** - I understand this platform's unique features
- **Efficient** - I give actionable advice, not long explanations
- **Community-focused** - I help users contribute positively

## 🔍 Search Strategy
- Search community knowledge when users mention specific topics
- Search locks when users ask about access control, requirements, or gating
- Use search results to provide rich, contextual answers
- Always cite relevant posts when available
- Suggest alternative search terms if initial search is empty

## 🔒 Access Control & Locks
- This platform uses "locks" for access control - reusable gating configurations
- Locks can require tokens, NFTs, social following, ENS domains, etc.
- Users can discover locks through searchLocks and preview them instantly
- Different locks have different success rates and verification times
- Templates are community-curated popular configurations

## 📍 Current Context
- Community: ${communityId}
- Available functions: searchCommunityKnowledge, showPostCreationGuidance, searchLocks, getCommunityTrends`;

  // Generate streaming response with selective streaming logic
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    tools,
    maxSteps: 3,
    temperature: 0.7,
    onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
      console.log(`[AI Chat] Step finished. ToolCalls: ${toolCalls?.length || 0}, ToolResults: ${toolResults?.length || 0}, FinishReason: ${finishReason}`);
      
      // Check if this step completed function calls that return UI cards
      if (hasUICardResults(toolResults)) {
        console.log('[AI Chat] Detected UI card results - stopping stream early for better UX');
        // Return a special indicator to stop streaming
        // Note: This is experimental - the AI SDK might not support this directly
        // If not supported, we'll need to handle this on the frontend
      } else if (toolResults?.length > 0) {
        console.log('[AI Chat] Detected raw data results - continuing stream for AI explanation');
      }
    },
    onFinish: async ({ usage, finishReason, text }) => {
      console.log(`[AI Chat] Complete. Usage: ${JSON.stringify(usage)}, FinishReason: ${finishReason}`);
      try {
        // Save the assistant message to get its ID
        let assistantMessageId: string | null = null;
        if (text) {
          const messageResult = await query(
            `INSERT INTO ai_messages (conversation_id, role, content, tool_calls, tool_results, message_index) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
              currentConversationId,
              'assistant',
              text || '',
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
            currentConversationId,
            assistantMessageId || null,
            validatedUserId,
            validatedCommunityId,
            'openai',
            'gpt-4o-mini',
            usage.promptTokens,
            usage.completionTokens,
            usage.totalTokens,
            estimatedCost,
            finishReason === 'stop'
          ]
        );
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

    // Extract title from metadata
    const metadata = conversation.metadata || {};
    const title = metadata.title || 'New Conversation';

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: title,
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
      conversations: conversations.rows.map(row => {
        // Extract title from metadata
        const metadata = row.metadata || {};
        const title = metadata.title || 'New Conversation';
        
        return {
          id: row.id,
          title: title,
          conversation_type: row.conversation_type,
          status: row.status,
          message_count: parseInt(row.message_count),
          last_message_at: row.last_message_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      })
    });
  }
}, { requireCommunity: true });