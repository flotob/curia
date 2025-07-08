 AI Chat Integration Implementation Instructions

  Phase 1: Core Infrastructure Setup

  You are tasked with implementing the foundational AI chat infrastructure for curia2. This will enable AI-powered drafting and proofreading capabilities integrated
   into the existing post and comment creation workflow.

  1. Install Required Dependencies

  Add these packages to curia2/package.json:

  cd curia2
  npm install openai ai @ai-sdk/openai jotai zustand react-markdown react-syntax-highlighter
  npm install --save-dev @types/react-syntax-highlighter

  2. Environment Variables Setup

  Add these to your .env.local file:

  OPENAI_API_KEY=your_openai_api_key_here
  AI_MODEL=gpt-4o
  AI_MAX_TOKENS=2000
  AI_TEMPERATURE=0.7

  3. Database Migration - AI Usage Tracking

  Create a new migration file: migrations/[timestamp]_add_ai_features.ts

  import { MigrationBuilder, PgType } from 'node-pg-migrate';

  export const shorthands: undefined = undefined;

  export async function up(pgm: MigrationBuilder): Promise<void> {
    // AI conversations table for chat history
    pgm.createTable('ai_conversations', {
      id: 'id',
      user_id: { type: 'varchar(255)', notNull: true },
      community_id: { type: 'integer', notNull: true },
      title: { type: 'varchar(255)', notNull: false },
      context_type: { type: 'varchar(50)', notNull: true }, // 'post', 'comment', 'general'
      context_id: { type: 'integer', notNull: false }, // post_id or comment_id
      created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
      updated_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    });

    // AI messages table for individual chat messages
    pgm.createTable('ai_messages', {
      id: 'id',
      conversation_id: { type: 'integer', notNull: true, references: 'ai_conversations' },
      role: { type: 'varchar(20)', notNull: true }, // 'user', 'assistant', 'system'
      content: { type: 'text', notNull: true },
      function_call: { type: 'jsonb', notNull: false }, // Store function call data
      tokens_used: { type: 'integer', notNull: false },
      created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    });

    // AI usage tracking for rate limiting
    pgm.createTable('ai_usage', {
      id: 'id',
      user_id: { type: 'varchar(255)', notNull: true },
      community_id: { type: 'integer', notNull: true },
      feature_type: { type: 'varchar(50)', notNull: true }, // 'chat', 'draft', 'proofread'
      tokens_used: { type: 'integer', notNull: true },
      created_at: {
        type: 'timestamp',
        notNull: true,
        default: pgm.func('current_timestamp'),
      },
    });

    // Indexes for performance
    pgm.createIndex('ai_conversations', ['user_id', 'community_id']);
    pgm.createIndex('ai_conversations', ['created_at']);
    pgm.createIndex('ai_messages', ['conversation_id']);
    pgm.createIndex('ai_usage', ['user_id', 'created_at']);
    pgm.createIndex('ai_usage', ['community_id', 'created_at']);

    // Foreign key constraints
    pgm.addConstraint('ai_conversations', 'fk_ai_conversations_community',
      'FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE');
    pgm.addConstraint('ai_messages', 'fk_ai_messages_conversation',
      'FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE');
    pgm.addConstraint('ai_usage', 'fk_ai_usage_community',
      'FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE');
  }

  export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable('ai_usage');
    pgm.dropTable('ai_messages');
    pgm.dropTable('ai_conversations');
  }

  4. Core AI Service Layer

  Create src/lib/services/aiService.ts:

  import OpenAI from 'openai';
  import { openai } from 'ai/openai';
  import { generateText, streamText, ToolCallPart, ToolResultPart } from 'ai';
  import { AuthUser } from '@/types/auth';

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  export interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    functionCall?: any;
    toolCalls?: ToolCallPart[];
    toolResults?: ToolResultPart[];
    createdAt: Date;
  }

  export interface AIConversation {
    id: string;
    userId: string;
    communityId: number;
    title?: string;
    contextType: 'post' | 'comment' | 'general';
    contextId?: number;
    messages: AIMessage[];
    createdAt: Date;
    updatedAt: Date;
  }

  export interface AIServiceContext {
    user: AuthUser;
    communityId: number;
    boardName?: string;
    contextType: 'post' | 'comment' | 'general';
    contextId?: number;
  }

  export class AIService {
    private static readonly DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o';
    private static readonly MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '2000');
    private static readonly TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE || '0.7');

    static async createSystemPrompt(context: AIServiceContext): Promise<string> {
      const { user, communityId, boardName, contextType } = context;

      return `You are an AI writing assistant for a forum community. Your role is to help users draft, improve, and proofread their posts and comments.

  Context:
  - User: ${user.name || 'Anonymous'}
  - Community ID: ${communityId}
  - Board: ${boardName || 'General'}
  - Content Type: ${contextType}

  Guidelines:
  1. Help users write clear, engaging, and constructive content
  2. Maintain a helpful and encouraging tone
  3. Respect community guidelines and foster positive discussion
  4. Provide specific, actionable suggestions
  5. When proofreading, explain your suggestions
  6. For drafting, ask clarifying questions if needed

  Available functions:
  - draftContent: Generate new content based on user requirements
  - proofreadContent: Review and suggest improvements to existing content
  - improveClarity: Enhance readability and structure
  - adjustTone: Modify content tone while preserving meaning

  How can I help you with your ${contextType} today?`;
    }

    static async generateResponse(
      messages: AIMessage[],
      context: AIServiceContext,
      stream: boolean = false
    ) {
      const systemPrompt = await this.createSystemPrompt(context);

      const messagesWithSystem = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls && { toolCalls: m.toolCalls }),
          ...(m.toolResults && { toolResults: m.toolResults })
        }))
      ];

      const tools = {
        draftContent: {
          description: 'Generate new content based on user requirements',
          parameters: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'The main topic or subject' },
              tone: { type: 'string', description: 'Desired tone (professional, casual, friendly, etc.)' },
              length: { type: 'string', description: 'Desired length (short, medium, long)' },
              context: { type: 'string', description: 'Additional context or requirements' }
            },
            required: ['topic']
          }
        },
        proofreadContent: {
          description: 'Review and suggest improvements to existing content',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'The content to proofread' },
              focusAreas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Areas to focus on: grammar, clarity, tone, structure'
              }
            },
            required: ['content']
          }
        },
        improveClarity: {
          description: 'Enhance readability and structure of content',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'The content to improve' },
              targetAudience: { type: 'string', description: 'Target audience level' }
            },
            required: ['content']
          }
        },
        adjustTone: {
          description: 'Modify content tone while preserving meaning',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'The content to adjust' },
              targetTone: { type: 'string', description: 'Desired tone to achieve' },
              preserveFormatting: { type: 'boolean', description: 'Whether to preserve markdown formatting' }
            },
            required: ['content', 'targetTone']
          }
        }
      };

      if (stream) {
        return streamText({
          model: openai(this.DEFAULT_MODEL),
          messages: messagesWithSystem,
          tools,
          maxTokens: this.MAX_TOKENS,
          temperature: this.TEMPERATURE,
        });
      } else {
        return generateText({
          model: openai(this.DEFAULT_MODEL),
          messages: messagesWithSystem,
          tools,
          maxTokens: this.MAX_TOKENS,
          temperature: this.TEMPERATURE,
        });
      }
    }

    static async executeFunction(functionName: string, args: any): Promise<string> {
      switch (functionName) {
        case 'draftContent':
          return this.handleDraftContent(args);
        case 'proofreadContent':
          return this.handleProofreadContent(args);
        case 'improveClarity':
          return this.handleImproveClarity(args);
        case 'adjustTone':
          return this.handleAdjustTone(args);
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }

    private static async handleDraftContent(args: any): Promise<string> {
      const { topic, tone = 'friendly', length = 'medium', context = '' } = args;

      const prompt = `Draft a ${length} ${tone} forum ${context.contextType || 'post'} about: ${topic}

  Additional context: ${context}

  Please create engaging, well-structured content that encourages discussion and follows forum best practices.`;

      const result = await generateText({
        model: openai(this.DEFAULT_MODEL),
        prompt,
        maxTokens: this.MAX_TOKENS,
        temperature: this.TEMPERATURE,
      });

      return `I've drafted content about "${topic}" with a ${tone} tone:\n\n${result.text}`;
    }

    private static async handleProofreadContent(args: any): Promise<string> {
      const { content, focusAreas = ['grammar', 'clarity'] } = args;

      const prompt = `Please proofread the following content and suggest improvements focusing on: ${focusAreas.join(', ')}

  Content to proofread:
  ${content}

  Provide specific suggestions with explanations.`;

      const result = await generateText({
        model: openai(this.DEFAULT_MODEL),
        prompt,
        maxTokens: this.MAX_TOKENS,
        temperature: 0.3, // Lower temperature for proofreading
      });

      return `Proofreading complete. Here are my suggestions:\n\n${result.text}`;
    }

    private static async handleImproveClarity(args: any): Promise<string> {
      const { content, targetAudience = 'general' } = args;

      const prompt = `Please improve the clarity and readability of this content for a ${targetAudience} audience:

  ${content}

  Focus on:
  - Clearer sentence structure
  - Better organization
  - More engaging language
  - Removing jargon if appropriate`;

      const result = await generateText({
        model: openai(this.DEFAULT_MODEL),
        prompt,
        maxTokens: this.MAX_TOKENS,
        temperature: 0.4,
      });

      return `Here's the improved version with better clarity:\n\n${result.text}`;
    }

    private static async handleAdjustTone(args: any): Promise<string> {
      const { content, targetTone, preserveFormatting = true } = args;

      const formatNote = preserveFormatting ? 'Preserve any markdown formatting.' : '';

      const prompt = `Please adjust the tone of this content to be more ${targetTone}: ${formatNote}

  Original content:
  ${content}

  Maintain the original meaning while changing the tone appropriately.`;

      const result = await generateText({
        model: openai(this.DEFAULT_MODEL),
        prompt,
        maxTokens: this.MAX_TOKENS,
        temperature: 0.5,
      });

      return `Here's the content adjusted to a ${targetTone} tone:\n\n${result.text}`;
    }
  }

  export default AIService;

  5. Database Access Layer

  Create src/lib/database/aiDatabase.ts:

  import { pool } from '@/lib/db';
  import { AIConversation, AIMessage } from '@/lib/services/aiService';

  export interface CreateConversationData {
    userId: string;
    communityId: number;
    title?: string;
    contextType: 'post' | 'comment' | 'general';
    contextId?: number;
  }

  export interface CreateMessageData {
    conversationId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    functionCall?: any;
    tokensUsed?: number;
  }

  export interface UsageTrackingData {
    userId: string;
    communityId: number;
    featureType: 'chat' | 'draft' | 'proofread';
    tokensUsed: number;
  }

  export class AIDatabase {
    static async createConversation(data: CreateConversationData): Promise<number> {
      const query = `
        INSERT INTO ai_conversations (user_id, community_id, title, context_type, context_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const values = [
        data.userId,
        data.communityId,
        data.title,
        data.contextType,
        data.contextId
      ];

      const result = await pool.query(query, values);
      return result.rows[0].id;
    }

    static async getConversation(id: number, userId: string): Promise<AIConversation | null> {
      const conversationQuery = `
        SELECT * FROM ai_conversations
        WHERE id = $1 AND user_id = $2
      `;

      const messagesQuery = `
        SELECT * FROM ai_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `;

      const [convResult, msgResult] = await Promise.all([
        pool.query(conversationQuery, [id, userId]),
        pool.query(messagesQuery, [id])
      ]);

      if (convResult.rows.length === 0) return null;

      const conversation = convResult.rows[0];
      const messages = msgResult.rows.map(msg => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.content,
        functionCall: msg.function_call,
        createdAt: msg.created_at
      }));

      return {
        id: conversation.id.toString(),
        userId: conversation.user_id,
        communityId: conversation.community_id,
        title: conversation.title,
        contextType: conversation.context_type,
        contextId: conversation.context_id,
        messages,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      };
    }

    static async getUserConversations(userId: string, communityId: number, limit: number = 50): Promise<AIConversation[]> {
      const query = `
        SELECT c.*,
               COUNT(m.id) as message_count,
               MAX(m.created_at) as last_message_at
        FROM ai_conversations c
        LEFT JOIN ai_messages m ON c.id = m.conversation_id
        WHERE c.user_id = $1 AND c.community_id = $2
        GROUP BY c.id
        ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
        LIMIT $3
      `;

      const result = await pool.query(query, [userId, communityId, limit]);

      return result.rows.map(row => ({
        id: row.id.toString(),
        userId: row.user_id,
        communityId: row.community_id,
        title: row.title || `Conversation ${row.id}`,
        contextType: row.context_type,
        contextId: row.context_id,
        messages: [], // Messages loaded separately when needed
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }

    static async addMessage(data: CreateMessageData): Promise<number> {
      const query = `
        INSERT INTO ai_messages (conversation_id, role, content, function_call, tokens_used)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const values = [
        data.conversationId,
        data.role,
        data.content,
        data.functionCall ? JSON.stringify(data.functionCall) : null,
        data.tokensUsed
      ];

      const result = await pool.query(query, values);
      return result.rows[0].id;
    }

    static async updateConversationTitle(id: number, title: string, userId: string): Promise<void> {
      const query = `
        UPDATE ai_conversations
        SET title = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
      `;

      await pool.query(query, [title, id, userId]);
    }

    static async deleteConversation(id: number, userId: string): Promise<void> {
      // Messages will be deleted by CASCADE
      const query = `
        DELETE FROM ai_conversations
        WHERE id = $1 AND user_id = $2
      `;

      await pool.query(query, [id, userId]);
    }

    static async trackUsage(data: UsageTrackingData): Promise<void> {
      const query = `
        INSERT INTO ai_usage (user_id, community_id, feature_type, tokens_used)
        VALUES ($1, $2, $3, $4)
      `;

      const values = [
        data.userId,
        data.communityId,
        data.featureType,
        data.tokensUsed
      ];

      await pool.query(query, values);
    }

    static async getUserDailyUsage(userId: string, date: Date = new Date()): Promise<number> {
      const query = `
        SELECT COALESCE(SUM(tokens_used), 0) as total_tokens
        FROM ai_usage
        WHERE user_id = $1
        AND DATE(created_at) = DATE($2)
      `;

      const result = await pool.query(query, [userId, date]);
      return parseInt(result.rows[0].total_tokens);
    }
  }

  export default AIDatabase;

  6. API Endpoint - Main Chat Route

  Create src/app/api/ai/chat/route.ts:

  import { NextRequest, NextResponse } from 'next/server';
  import { verifyJWT } from '@/lib/withAuth';
  import { AIService, AIServiceContext } from '@/lib/services/aiService';
  import { AIDatabase } from '@/lib/database/aiDatabase';
  import { streamText } from 'ai';

  // Rate limiting constants
  const DAILY_TOKEN_LIMIT = 10000; // Adjust based on your needs
  const MAX_CONVERSATION_LENGTH = 50; // Maximum messages per conversation

  export async function POST(request: NextRequest) {
    try {
      // Verify authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const user = verifyJWT(token);
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Parse request body
      const body = await request.json();
      const {
        messages,
        conversationId,
        communityId,
        contextType = 'general',
        contextId,
        boardName
      } = body;

      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
      }

      if (!communityId) {
        return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
      }

      // Check daily usage limits
      const dailyUsage = await AIDatabase.getUserDailyUsage(user.userId);
      if (dailyUsage >= DAILY_TOKEN_LIMIT) {
        return NextResponse.json({
          error: 'Daily AI usage limit exceeded. Please try again tomorrow.'
        }, { status: 429 });
      }

      // Create or get conversation
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        currentConversationId = await AIDatabase.createConversation({
          userId: user.userId,
          communityId: parseInt(communityId),
          contextType,
          contextId: contextId ? parseInt(contextId) : undefined,
          title: messages[0]?.content?.substring(0, 50) + '...' || 'New Conversation'
        });
      }

      // Prepare AI context
      const context: AIServiceContext = {
        user,
        communityId: parseInt(communityId),
        boardName,
        contextType,
        contextId: contextId ? parseInt(contextId) : undefined
      };

      // Generate AI response with streaming
      const result = await AIService.generateResponse(messages, context, true);

      // Save user message to database
      await AIDatabase.addMessage({
        conversationId: currentConversationId,
        role: 'user',
        content: messages[messages.length - 1].content,
        tokensUsed: Math.ceil(messages[messages.length - 1].content.length / 4) // Rough token estimate
      });

      // Return streaming response
      return result.toDataStreamResponse({
        async onFinish({ text, toolCalls, toolResults, usage }) {
          try {
            // Save AI response to database
            await AIDatabase.addMessage({
              conversationId: currentConversationId,
              role: 'assistant',
              content: text,
              functionCall: toolCalls?.[0] || null,
              tokensUsed: usage?.totalTokens || Math.ceil(text.length / 4)
            });

            // Track usage for rate limiting
            await AIDatabase.trackUsage({
              userId: user.userId,
              communityId: parseInt(communityId),
              featureType: 'chat',
              tokensUsed: usage?.totalTokens || Math.ceil(text.length / 4)
            });

            // Update conversation title if it's a new conversation
            if (!conversationId && text.length > 10) {
              const title = text.substring(0, 50).replace(/\n/g, ' ') + (text.length > 50 ? '...' : '');
              await AIDatabase.updateConversationTitle(currentConversationId, title, user.userId);
            }
          } catch (error) {
            console.error('Error saving AI response:', error);
            // Don't throw here as the response has already been sent
          }
        },
        data: {
          conversationId: currentConversationId
        }
      });

    } catch (error) {
      console.error('AI Chat API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  // GET endpoint for retrieving conversation history
  export async function GET(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const user = verifyJWT(token);
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const communityId = searchParams.get('communityId');
      const conversationId = searchParams.get('conversationId');

      if (!communityId) {
        return NextResponse.json({ error: 'Community ID is required' }, { status: 400 });
      }

      if (conversationId) {
        // Get specific conversation
        const conversation = await AIDatabase.getConversation(
          parseInt(conversationId),
          user.userId
        );

        if (!conversation) {
          return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        return NextResponse.json({ conversation });
      } else {
        // Get user's conversations list
        const conversations = await AIDatabase.getUserConversations(
          user.userId,
          parseInt(communityId)
        );

        return NextResponse.json({ conversations });
      }

    } catch (error) {
      console.error('AI Chat GET API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  // DELETE endpoint for deleting conversations
  export async function DELETE(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const user = verifyJWT(token);
      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const conversationId = searchParams.get('conversationId');

      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
      }

      await AIDatabase.deleteConversation(parseInt(conversationId), user.userId);

      return NextResponse.json({ success: true });

    } catch (error) {
      console.error('AI Chat DELETE API Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  Testing and Validation Requirements

  After implementing the above code:

  1. Run the migration: npm run migrate
  2. Test API endpoint: Create a simple test to ensure the /api/ai/chat endpoint responds
  3. Verify database tables: Check that all three new tables were created successfully
  4. Test authentication: Ensure the endpoint properly validates JWT tokens
  5. Test rate limiting: Verify daily usage limits are enforced
  6. Environment setup: Confirm all environment variables are properly configured

  Next Phase Preview

  Once this infrastructure is complete, we'll implement:
  - AI chat modal component integrated with TipTap editor
  - State management with Jotai for chat history
  - UI components for conversation management
  - Integration with NewPostForm and NewCommentForm

  Validation Checklist:
  - Dependencies installed successfully
  - Migration runs without errors
  - Database tables created with proper relationships
  - API endpoint responds to authenticated requests
  - Rate limiting functions properly
  - AI service can generate basic responses
  - Usage tracking records to database

  Report back with the results of implementing this infrastructure, including any errors or issues encountered. I'll then provide the next set of instructions for
  the UI components and integration.