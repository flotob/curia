import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create ai_conversations table for conversation sessions
  pgm.createTable('ai_conversations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    conversation_type: {
      type: 'text',
      notNull: true,
      check: "conversation_type IN ('admin_assistant', 'onboarding_quiz')",
    },
    title: {
      type: 'text',
      notNull: false,
    },
    status: {
      type: 'text',
      notNull: true,
      default: "'active'",
      check: "status IN ('active', 'completed', 'archived')",
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    completed_at: {
      type: 'timestamptz',
      notNull: false,
    },
  });

  // Create ai_messages table for individual messages
  pgm.createTable('ai_messages', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    conversation_id: {
      type: 'uuid',
      notNull: true,
      references: 'ai_conversations(id)',
      onDelete: 'CASCADE',
    },
    role: {
      type: 'text',
      notNull: true,
      check: "role IN ('user', 'assistant', 'system')",
    },
    content: {
      type: 'text',
      notNull: true,
    },
    tool_calls: {
      type: 'jsonb',
      notNull: false,
      comment: 'Tool calls made by the assistant',
    },
    tool_results: {
      type: 'jsonb',
      notNull: false,
      comment: 'Results from tool executions',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
      comment: 'Token counts, processing time, etc.',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    message_index: {
      type: 'integer',
      notNull: true,
      comment: 'Order of message in conversation',
    },
  });

  // Create ai_usage_logs table for tracking API usage and costs
  pgm.createTable('ai_usage_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    conversation_id: {
      type: 'uuid',
      notNull: true,
      references: 'ai_conversations(id)',
      onDelete: 'CASCADE',
    },
    message_id: {
      type: 'uuid',
      notNull: true,
      references: 'ai_messages(id)',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    api_provider: {
      type: 'text',
      notNull: true,
      default: "'openai'",
    },
    model: {
      type: 'text',
      notNull: true,
      comment: 'AI model used (e.g., gpt-4o)',
    },
    prompt_tokens: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    completion_tokens: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    total_tokens: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    estimated_cost_usd: {
      type: 'decimal(10,6)',
      notNull: true,
      default: 0,
      comment: 'Estimated cost in USD',
    },
    processing_time_ms: {
      type: 'integer',
      notNull: false,
      comment: 'Time taken to process the request',
    },
    tool_calls_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    success: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    error_message: {
      type: 'text',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Create indexes for performance
  pgm.createIndex('ai_conversations', 'user_id');
  pgm.createIndex('ai_conversations', 'community_id');
  pgm.createIndex('ai_conversations', 'conversation_type');
  pgm.createIndex('ai_conversations', 'status');
  pgm.createIndex('ai_conversations', 'created_at');
  pgm.createIndex('ai_conversations', ['user_id', 'conversation_type', 'status']);

  pgm.createIndex('ai_messages', 'conversation_id');
  pgm.createIndex('ai_messages', 'role');
  pgm.createIndex('ai_messages', 'created_at');
  pgm.createIndex('ai_messages', ['conversation_id', 'message_index']);

  pgm.createIndex('ai_usage_logs', 'conversation_id');
  pgm.createIndex('ai_usage_logs', 'user_id');
  pgm.createIndex('ai_usage_logs', 'community_id');
  pgm.createIndex('ai_usage_logs', 'created_at');
  pgm.createIndex('ai_usage_logs', 'success');
  pgm.createIndex('ai_usage_logs', ['user_id', 'created_at']);
  pgm.createIndex('ai_usage_logs', ['community_id', 'created_at']);

  // Add timestamp trigger for ai_conversations
  pgm.sql(`
    CREATE TRIGGER set_timestamp_ai_conversations
      BEFORE UPDATE ON ai_conversations
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order (respecting foreign key constraints)
  pgm.dropTable('ai_usage_logs', { ifExists: true, cascade: true });
  pgm.dropTable('ai_messages', { ifExists: true, cascade: true });
  pgm.dropTable('ai_conversations', { ifExists: true, cascade: true });
}
