import { openai } from '@ai-sdk/openai';
import { streamText, generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedAuth, EnhancedAuthRequest } from '@/lib/middleware/authEnhanced';
import { query } from '@/lib/db';
import { 
  CreateConversationRequest, 
  SendMessageRequest, 
  AIConversation, 
  AIMessage,
  ToolDefinition,
  ToolResult 
} from '@/types/ai-chat';

// Zod schemas for tool validation
const DatabaseQuerySchema = z.object({
  query: z.string().describe('SQL query to execute'),
  params: z.array(z.any()).optional().describe('Query parameters'),
});

const UserAnalyticsSchema = z.object({
  user_id: z.string().optional().describe('Specific user ID to analyze'),
  date_range: z.object({
    start: z.string().describe('Start date (ISO format)'),
    end: z.string().describe('End date (ISO format)'),
  }).optional().describe('Date range for analytics'),
});

const CommunityStatsSchema = z.object({
  community_id: z.string().optional().describe('Specific community ID'),
  include_detailed: z.boolean().optional().describe('Include detailed breakdowns'),
});

const PostAnalyticsSchema = z.object({
  post_id: z.string().optional().describe('Specific post ID to analyze'),
  board_id: z.string().optional().describe('Specific board ID to analyze'),
  date_range: z.object({
    start: z.string().describe('Start date (ISO format)'),
    end: z.string().describe('End date (ISO format)'),
  }).optional().describe('Date range for analytics'),
});

const SystemHealthSchema = z.object({
  include_database: z.boolean().optional().describe('Include database health checks'),
  include_performance: z.boolean().optional().describe('Include performance metrics'),
});

const ErrorLogsSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']).optional().describe('Log severity level'),
  limit: z.number().optional().describe('Number of logs to return'),
  since: z.string().optional().describe('Return logs since this timestamp'),
});

const BackupStatusSchema = z.object({
  include_schedule: z.boolean().optional().describe('Include backup schedule info'),
});

const SecurityAuditSchema = z.object({
  audit_type: z.enum(['permissions', 'authentication', 'data_access']).optional(),
  target_user_id: z.string().optional().describe('Specific user to audit'),
});

const ConfigurationSchema = z.object({
  config_type: z.enum(['environment', 'feature_flags', 'integrations']).optional(),
});

// Tool functions
async function executeDatabaseQuery(params: z.infer<typeof DatabaseQuerySchema>): Promise<ToolResult> {
  try {
    // Security: Only allow SELECT queries for safety
    const trimmedQuery = params.query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return {
        tool_call_id: '',
        success: false,
        error: 'Only SELECT queries are allowed for security reasons',
        result: null,
      };
    }

    const result = await query(params.query, params.params || []);
    return {
      tool_call_id: '',
      success: true,
      result: {
        rows: result.rows,
        row_count: result.rows.length,
        query: params.query,
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Database query failed',
      result: null,
    };
  }
}

async function getUserAnalytics(params: z.infer<typeof UserAnalyticsSchema>): Promise<ToolResult> {
  try {
    const dateFilter = params.date_range 
      ? `AND created_at BETWEEN $2 AND $3`
      : '';
    
    const queryParams = params.user_id 
      ? [params.user_id, ...(params.date_range ? [params.date_range.start, params.date_range.end] : [])]
      : params.date_range ? [params.date_range.start, params.date_range.end] : [];

    const userFilter = params.user_id ? 'WHERE author_user_id = $1' : '';
    
    const userStatsQuery = `
      SELECT 
        u.user_id,
        u.name,
        COUNT(DISTINCT p.id) as post_count,
        COUNT(DISTINCT c.id) as comment_count,
        COUNT(DISTINCT v.post_id) as vote_count,
        MAX(GREATEST(p.created_at, c.created_at)) as last_activity
      FROM users u
      LEFT JOIN posts p ON u.user_id = p.author_user_id ${params.date_range ? 'AND p.created_at BETWEEN $' + (params.user_id ? '2' : '1') + ' AND $' + (params.user_id ? '3' : '2') : ''}
      LEFT JOIN comments c ON u.user_id = c.author_user_id ${params.date_range ? 'AND c.created_at BETWEEN $' + (params.user_id ? '2' : '1') + ' AND $' + (params.user_id ? '3' : '2') : ''}
      LEFT JOIN votes v ON u.user_id = v.user_id
      ${params.user_id ? 'WHERE u.user_id = $1' : ''}
      GROUP BY u.user_id, u.name
      ORDER BY post_count DESC, comment_count DESC
      LIMIT 50
    `;

    const result = await query(userStatsQuery, queryParams);
    
    return {
      tool_call_id: '',
      success: true,
      result: {
        user_analytics: result.rows,
        total_users: result.rows.length,
        date_range: params.date_range,
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'User analytics failed',
      result: null,
    };
  }
}

async function getCommunityStats(params: z.infer<typeof CommunityStatsSchema>): Promise<ToolResult> {
  try {
    const communityFilter = params.community_id ? 'WHERE c.id = $1' : '';
    const queryParams = params.community_id ? [params.community_id] : [];

    const statsQuery = `
      SELECT 
        c.id,
        c.name,
        c.community_short_id,
        COUNT(DISTINCT b.id) as board_count,
        COUNT(DISTINCT p.id) as post_count,
        COUNT(DISTINCT cm.id) as comment_count,
        COUNT(DISTINCT uc.user_id) as member_count,
        c.created_at
      FROM communities c
      LEFT JOIN boards b ON c.id = b.community_id
      LEFT JOIN posts p ON b.id = p.board_id
      LEFT JOIN comments cm ON p.id = cm.post_id
      LEFT JOIN user_communities uc ON c.id = uc.community_id
      ${communityFilter}
      GROUP BY c.id, c.name, c.community_short_id, c.created_at
      ORDER BY member_count DESC, post_count DESC
    `;

    const result = await query(statsQuery, queryParams);

    return {
      tool_call_id: '',
      success: true,
      result: {
        community_stats: result.rows,
        include_detailed: params.include_detailed,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Community stats failed',
      result: null,
    };
  }
}

async function getPostAnalytics(params: z.infer<typeof PostAnalyticsSchema>): Promise<ToolResult> {
  try {
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (params.post_id) {
      whereClause = 'WHERE p.id = $1';
      queryParams.push(parseInt(params.post_id));
    } else if (params.board_id) {
      whereClause = 'WHERE p.board_id = $1';
      queryParams.push(parseInt(params.board_id));
    }

    if (params.date_range) {
      const startParam = queryParams.length + 1;
      const endParam = queryParams.length + 2;
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `p.created_at BETWEEN $${startParam} AND $${endParam}`;
      queryParams.push(params.date_range.start, params.date_range.end);
    }

    const analyticsQuery = `
      SELECT 
        p.id,
        p.title,
        p.author_user_id,
        u.name as author_name,
        p.upvote_count,
        p.comment_count,
        p.created_at,
        b.name as board_name,
        c.name as community_name,
        COUNT(DISTINCT l.id) as share_count
      FROM posts p
      JOIN users u ON p.author_user_id = u.user_id
      JOIN boards b ON p.board_id = b.id
      JOIN communities c ON b.community_id = c.id
      LEFT JOIN links l ON p.id = l.post_id
      ${whereClause}
      GROUP BY p.id, p.title, p.author_user_id, u.name, p.upvote_count, p.comment_count, p.created_at, b.name, c.name
      ORDER BY p.upvote_count DESC, p.comment_count DESC
      LIMIT 100
    `;

    const result = await query(analyticsQuery, queryParams);

    return {
      tool_call_id: '',
      success: true,
      result: {
        post_analytics: result.rows,
        filters: {
          post_id: params.post_id,
          board_id: params.board_id,
          date_range: params.date_range,
        },
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Post analytics failed',
      result: null,
    };
  }
}

async function getSystemHealth(params: z.infer<typeof SystemHealthSchema>): Promise<ToolResult> {
  try {
    const health: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
    };

    if (params.include_database) {
      try {
        const dbCheck = await query('SELECT 1 as health_check');
        health.checks.database = {
          status: 'healthy',
          response_time_ms: Date.now(),
        };
      } catch (error) {
        health.checks.database = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Database check failed',
        };
        health.status = 'degraded';
      }
    }

    if (params.include_performance) {
      // Basic performance metrics
      health.checks.performance = {
        memory_usage: process.memoryUsage(),
        uptime_seconds: process.uptime(),
        node_version: process.version,
      };
    }

    return {
      tool_call_id: '',
      success: true,
      result: health,
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'System health check failed',
      result: null,
    };
  }
}

async function getErrorLogs(params: z.infer<typeof ErrorLogsSchema>): Promise<ToolResult> {
  try {
    // Since we don't have an error logs table, return simulated data
    // In a real implementation, you'd query actual log storage
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        severity: 'info',
        message: 'Error logs tool called - no centralized logging configured',
        source: 'admin-ai-assistant',
      },
    ];

    return {
      tool_call_id: '',
      success: true,
      result: {
        logs: mockLogs,
        filters: params,
        note: 'Centralized logging not configured - would integrate with your logging system',
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Error logs retrieval failed',
      result: null,
    };
  }
}

async function getBackupStatus(params: z.infer<typeof BackupStatusSchema>): Promise<ToolResult> {
  try {
    // Simulated backup status - would integrate with actual backup system
    const status: any = {
      last_backup: '2025-07-02T10:00:00Z',
      status: 'completed',
      size_gb: 2.4,
      type: 'automated',
      retention_days: 30,
    };

    if (params.include_schedule) {
      status.schedule = {
        frequency: 'daily',
        time: '02:00 UTC',
        enabled: true,
      };
    }

    return {
      tool_call_id: '',
      success: true,
      result: {
        backup_status: status,
        note: 'Backup integration not configured - would connect to your backup system',
      },
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Backup status check failed',
      result: null,
    };
  }
}

async function performSecurityAudit(params: z.infer<typeof SecurityAuditSchema>): Promise<ToolResult> {
  try {
    const audit: any = {
      audit_type: params.audit_type || 'general',
      timestamp: new Date().toISOString(),
      findings: [],
    };

    if (params.audit_type === 'permissions' || !params.audit_type) {
      // Check for users with admin privileges
      const adminQuery = `
        SELECT user_id, name, settings
        FROM users 
        WHERE settings->>'roles' IS NOT NULL
        ORDER BY user_id
      `;
      const adminResult = await query(adminQuery);
      
      audit.findings.push({
        category: 'permissions',
        type: 'admin_users',
        count: adminResult.rows.length,
        users: adminResult.rows.map(row => ({
          user_id: row.user_id,
          name: row.name,
          roles: row.settings?.roles || [],
        })),
      });
    }

    if (params.target_user_id) {
      const userAuditQuery = `
        SELECT 
          u.user_id,
          u.name,
          u.settings,
          COUNT(DISTINCT p.id) as post_count,
          COUNT(DISTINCT c.id) as comment_count,
          MAX(GREATEST(p.created_at, c.created_at)) as last_activity
        FROM users u
        LEFT JOIN posts p ON u.user_id = p.author_user_id
        LEFT JOIN comments c ON u.user_id = c.author_user_id
        WHERE u.user_id = $1
        GROUP BY u.user_id, u.name, u.settings
      `;
      
      const userResult = await query(userAuditQuery, [params.target_user_id]);
      audit.target_user_audit = userResult.rows[0] || null;
    }

    return {
      tool_call_id: '',
      success: true,
      result: audit,
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Security audit failed',
      result: null,
    };
  }
}

async function getConfiguration(params: z.infer<typeof ConfigurationSchema>): Promise<ToolResult> {
  try {
    const config: any = {
      config_type: params.config_type || 'environment',
      timestamp: new Date().toISOString(),
    };

    if (params.config_type === 'environment' || !params.config_type) {
      config.environment = {
        node_env: process.env.NODE_ENV,
        has_openai_key: !!process.env.OPENAI_API_KEY,
        has_jwt_secret: !!process.env.JWT_SECRET,
        has_database_url: !!process.env.DATABASE_URL,
        // Don't expose actual values for security
      };
    }

    if (params.config_type === 'feature_flags' || !params.config_type) {
      config.feature_flags = {
        ai_chat_enabled: true,
        admin_tools_enabled: true,
        onboarding_quiz_enabled: true,
        streaming_enabled: true,
      };
    }

    return {
      tool_call_id: '',
      success: true,
      result: config,
    };
  } catch (error) {
    return {
      tool_call_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Configuration retrieval failed',
      result: null,
    };
  }
}

// Tool definitions for AI SDK
const tools = {
  execute_database_query: {
    description: 'Execute a read-only database query to analyze data. Only SELECT queries are allowed.',
    parameters: DatabaseQuerySchema,
    execute: executeDatabaseQuery,
  },
  get_user_analytics: {
    description: 'Get user analytics including post counts, comment counts, and activity metrics.',
    parameters: UserAnalyticsSchema,
    execute: getUserAnalytics,
  },
  get_community_stats: {
    description: 'Get community statistics including member counts, post counts, and engagement metrics.',
    parameters: CommunityStatsSchema,
    execute: getCommunityStats,
  },
  get_post_analytics: {
    description: 'Get post analytics including engagement metrics, shares, and performance data.',
    parameters: PostAnalyticsSchema,
    execute: getPostAnalytics,
  },
  get_system_health: {
    description: 'Check system health including database connectivity and performance metrics.',
    parameters: SystemHealthSchema,
    execute: getSystemHealth,
  },
  get_error_logs: {
    description: 'Retrieve recent error logs and system issues.',
    parameters: ErrorLogsSchema,
    execute: getErrorLogs,
  },
  get_backup_status: {
    description: 'Check backup status and schedule information.',
    parameters: BackupStatusSchema,
    execute: getBackupStatus,
  },
  perform_security_audit: {
    description: 'Perform security audits on user permissions, authentication, and data access.',
    parameters: SecurityAuditSchema,
    execute: performSecurityAudit,
  },
  get_configuration: {
    description: 'Retrieve system configuration and feature flag status.',
    parameters: ConfigurationSchema,
    execute: getConfiguration,
  },
};

// Main handler
async function handler(req: EnhancedAuthRequest) {
  try {
    const { message, conversation_id } = await req.json() as SendMessageRequest;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation: AIConversation;
    let messages: AIMessage[] = [];

    if (conversation_id) {
      // Fetch existing conversation
      const convResult = await query(
        'SELECT * FROM ai_conversations WHERE id = $1 AND user_id = $2',
        [conversation_id, req.userContext.userId]
      );
      
      if (convResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Conversation not found' },
          { status: 404 }
        );
      }
      
      conversation = convResult.rows[0];
      
      // Fetch existing messages
      const messagesResult = await query(
        'SELECT * FROM ai_messages WHERE conversation_id = $1 ORDER BY message_index ASC',
        [conversation_id]
      );
      
      messages = messagesResult.rows;
    } else {
      // Create new conversation
      const newConvResult = await query(`
        INSERT INTO ai_conversations (user_id, community_id, conversation_type, title, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        req.userContext.userId,
        req.userContext.communityId,
        'admin_assistant',
        'Admin Assistant Chat',
        'active',
        '{}'
      ]);
      
      conversation = newConvResult.rows[0];
    }

    // Add user message to conversation
    const userMessageResult = await query(`
      INSERT INTO ai_messages (conversation_id, role, content, metadata, message_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      conversation.id,
      'user',
      message,
      '{}',
      messages.length
    ]);

    const userMessage = userMessageResult.rows[0];
    messages.push(userMessage);

    // Prepare messages for OpenAI API
    const openaiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Add system message for admin context
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant for Common Ground community platform administrators. You have access to various tools to help analyze data, monitor system health, and manage the platform. 

Current context:
- User: ${req.userContext.userId}
- Community: ${req.userContext.communityId}
- Admin privileges: ${req.userContext.isAdmin}

Be helpful, professional, and security-conscious. Always explain what you're doing when using tools.`,
    };

    // Call OpenAI API with streaming
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: [systemMessage, ...openaiMessages],
      tools,
      maxTokens: 4000,
      temperature: 0.1,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('[Admin AI Assistant] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware (admin only)
export const POST = withEnhancedAuth(handler, { 
  adminOnly: true,
  requireCommunity: true 
});