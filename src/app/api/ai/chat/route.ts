import { NextResponse } from 'next/server';
import { withAuthAndErrorHandling, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { streamText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '@/lib/db';
import { z } from 'zod';

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

    // Generate AI response with tools using v4 syntax
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      tools: {
        analyzeContent: {
          description: 'Analyze content for clarity, tone, structure, and engagement to provide specific feedback',
          parameters: z.object({
            content: z.string().describe('The content to analyze'),
            analysisType: z.enum(['clarity', 'tone', 'structure', 'engagement', 'all']).describe('Type of analysis to perform')
          }),
          execute: async (params: { content: string; analysisType: string }) => {
            // Simulated analysis - in production this could use additional AI calls or analysis libraries
            const analysisResults = {
              type: params.analysisType,
              content: params.content,
              clarity_score: Math.floor(Math.random() * 40) + 60, // 60-100
              suggestions: [
                'Consider breaking long sentences into shorter ones',
                'Add more specific examples to support your points',
                'Use stronger action verbs to increase engagement'
              ],
              tone: 'professional',
              readability: 'good'
            };
            
            return {
              success: true,
              messageForAI: `Content analysis complete. Clarity score: ${analysisResults.clarity_score}/100. Key suggestions: ${analysisResults.suggestions.join(', ')}.`,
              analysisData: analysisResults
            };
          }
        },
        generateImprovements: {
          description: 'Generate specific improvement suggestions for content based on analysis',
          parameters: z.object({
            originalContent: z.string().describe('The original content to improve'),
            improvementType: z.enum(['grammar', 'style', 'engagement', 'structure']).describe('Type of improvements to generate')
          }),
          execute: async (params: { originalContent: string; improvementType: string }) => {
            // Simulated improvement generation
            const improvements = [
              {
                type: params.improvementType,
                original: params.originalContent.substring(0, 50) + '...',
                improved: 'Enhanced version with better ' + params.improvementType,
                reason: `Improved ${params.improvementType} for better readability`
              }
            ];
            
            return {
              success: true,
              messageForAI: `Generated ${improvements.length} improvement suggestions focused on ${params.improvementType}.`,
              improvements
            };
          }
        },
        searchCommunityKnowledge: {
          description: 'Search through community posts and discussions for relevant information',
          parameters: z.object({
            query: z.string().describe('Search query to find relevant community content'),
            limit: z.number().optional().describe('Maximum number of results to return (default: 5)')
          }),
          execute: async (params: { query: string; limit?: number }) => {
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
                [communityId, `%${params.query}%`, params.limit || 5]
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
        },
        suggestContentStructure: {
          description: 'Suggest better organization and structure for content',
          parameters: z.object({
            content: z.string().describe('The content to restructure'),
            contentType: z.enum(['post', 'comment', 'discussion']).describe('Type of content being structured')
          }),
          execute: async (params: { content: string; contentType: string }) => {
            // Simulated structure suggestions
            const suggestions = {
              currentStructure: 'Single paragraph format',
              suggestedStructure: [
                'Introduction with clear thesis',
                'Main points with supporting evidence',
                'Conclusion with call to action'
              ],
              improvements: [
                'Add clear headings to separate sections',
                'Use bullet points for key information',
                'Include a brief summary at the end'
              ]
            };
            
            return {
              success: true,
              messageForAI: `Generated structure suggestions for ${params.contentType}. Recommended organizing into ${suggestions.suggestedStructure.length} main sections.`,
              structureSuggestions: suggestions
            };
          }
        }
      },
      system: `You are a helpful AI assistant for a community forum. You can help users with:

1. **Content Analysis**: Analyze text for clarity, tone, structure, and engagement
2. **Writing Improvement**: Suggest specific improvements to make content better
3. **Content Structure**: Recommend better organization for different types of posts
4. **Community Help**: Search and provide guidance from community discussions

Current context:
- Community ID: ${communityId}
- User ID: ${userId}
${chatContext?.boardId ? `- Board ID: ${chatContext.boardId}` : ''}
${chatContext?.postId ? `- Post ID: ${chatContext.postId}` : ''}

Be helpful, concise, and professional in your responses. Focus on providing actionable advice and constructive feedback.`,
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