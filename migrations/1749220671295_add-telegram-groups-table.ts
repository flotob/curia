import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create telegram_groups table for group registrations
  pgm.createTable('telegram_groups', {
    id: 'id',
    chat_id: {
      type: 'bigint',
      notNull: true,
      unique: true,
    },
    chat_title: {
      type: 'text',
      notNull: true,
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
    },
    registered_by_user_id: {
      type: 'text',
      notNull: true,
    },
    notification_settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    bot_permissions: {
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
  });

  // Create telegram_notifications table for delivery tracking
  pgm.createTable('telegram_notifications', {
    id: 'id',
    telegram_group_id: {
      type: 'integer',
      notNull: true,
      references: 'telegram_groups(id)',
      onDelete: 'CASCADE',
    },
    notification_type: {
      type: 'text',
      notNull: true,
    },
    source_post_id: {
      type: 'integer',
      references: 'posts(id)',
      onDelete: 'SET NULL',
    },
    source_comment_id: {
      type: 'integer',
      references: 'comments(id)',
      onDelete: 'SET NULL',
    },
    message_text: {
      type: 'text',
      notNull: true,
    },
    telegram_message_id: {
      type: 'integer',
    },
    delivery_status: {
      type: 'text',
      notNull: true,
      default: "'pending'",
    },
    sent_at: {
      type: 'timestamptz',
    },
    error_message: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // Add indexes for performance
  pgm.createIndex('telegram_groups', 'community_id');
  pgm.createIndex('telegram_groups', 'is_active', { where: 'is_active = true' });
  pgm.createIndex('telegram_notifications', 'delivery_status');
  pgm.createIndex('telegram_notifications', 'created_at');
  pgm.createIndex('telegram_notifications', 'telegram_group_id');

  // Add trigger for updated_at on telegram_groups
  pgm.sql(`
    CREATE TRIGGER set_timestamp_telegram_groups
    BEFORE UPDATE ON telegram_groups
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop trigger
  pgm.sql('DROP TRIGGER IF EXISTS set_timestamp_telegram_groups ON telegram_groups;');
  
  // Drop tables (order matters due to foreign keys)
  pgm.dropTable('telegram_notifications');
  pgm.dropTable('telegram_groups');
}
