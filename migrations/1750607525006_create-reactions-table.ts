import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create the reactions table
  pgm.createTable('reactions', {
    id: {
      type: 'integer',
      primaryKey: true,
      sequenceGenerated: {
        precedence: 'BY DEFAULT'
      },
      comment: 'Primary key for the reaction'
    },
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
      comment: 'User who created the reaction'
    },
    post_id: {
      type: 'integer',
      references: 'posts(id)',
      onDelete: 'CASCADE',
      comment: 'Post being reacted to (nullable for comment/lock reactions)'
    },
    comment_id: {
      type: 'integer',
      references: 'comments(id)',
      onDelete: 'CASCADE',
      comment: 'Comment being reacted to (nullable for post/lock reactions)'
    },
    lock_id: {
      type: 'integer',
      references: 'locks(id)',
      onDelete: 'CASCADE',
      comment: 'Lock being reacted to (nullable for post/comment reactions)'
    },
    emoji: {
      type: 'varchar(10)',
      notNull: true,
      comment: 'Unicode emoji character (👍, ❤️, 😂, etc.)'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When the reaction was created'
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When the reaction was last updated'
    }
  }, {
    comment: 'Stores emoji reactions for posts, comments, and locks'
  });

  // Add check constraint to ensure exactly ONE of post_id, comment_id, or lock_id is set
  pgm.addConstraint('reactions', 'reactions_content_check', {
    check: '(post_id IS NOT NULL AND comment_id IS NULL AND lock_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL AND lock_id IS NULL) OR (post_id IS NULL AND comment_id IS NULL AND lock_id IS NOT NULL)'
  });

  // Create unique indexes to prevent duplicate reactions (one emoji per user per content)
  pgm.createIndex('reactions', ['user_id', 'post_id', 'emoji'], {
    name: 'reactions_user_post_emoji_key',
    unique: true,
    where: 'post_id IS NOT NULL'
  });

  pgm.createIndex('reactions', ['user_id', 'comment_id', 'emoji'], {
    name: 'reactions_user_comment_emoji_key',
    unique: true,
    where: 'comment_id IS NOT NULL'
  });

  pgm.createIndex('reactions', ['user_id', 'lock_id', 'emoji'], {
    name: 'reactions_user_lock_emoji_key',
    unique: true,
    where: 'lock_id IS NOT NULL'
  });

  // Create performance indexes
  pgm.createIndex('reactions', 'post_id', {
    name: 'reactions_post_id_index'
  });

  pgm.createIndex('reactions', 'comment_id', {
    name: 'reactions_comment_id_index'
  });

  pgm.createIndex('reactions', 'lock_id', {
    name: 'reactions_lock_id_index'
  });

  pgm.createIndex('reactions', 'emoji', {
    name: 'reactions_emoji_index'
  });

  pgm.createIndex('reactions', 'created_at', {
    name: 'reactions_created_at_index'
  });

  // Add updated_at trigger (following pattern from other tables)
  pgm.sql(`
    CREATE TRIGGER "set_timestamp_reactions" 
    BEFORE UPDATE ON "public"."reactions" 
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the trigger first
  pgm.sql('DROP TRIGGER IF EXISTS "set_timestamp_reactions" ON "public"."reactions"');
  
  // Drop indexes (they'll be dropped automatically with the table, but being explicit)
  pgm.dropIndex('reactions', ['user_id', 'post_id', 'emoji'], { 
    name: 'reactions_user_post_emoji_key',
    ifExists: true 
  });
  pgm.dropIndex('reactions', ['user_id', 'comment_id', 'emoji'], { 
    name: 'reactions_user_comment_emoji_key',
    ifExists: true 
  });
  pgm.dropIndex('reactions', ['user_id', 'lock_id', 'emoji'], { 
    name: 'reactions_user_lock_emoji_key',
    ifExists: true 
  });
  pgm.dropIndex('reactions', 'post_id', { 
    name: 'reactions_post_id_index',
    ifExists: true 
  });
  pgm.dropIndex('reactions', 'comment_id', { 
    name: 'reactions_comment_id_index',
    ifExists: true 
  });
  pgm.dropIndex('reactions', 'lock_id', { 
    name: 'reactions_lock_id_index',
    ifExists: true 
  });
  pgm.dropIndex('reactions', 'emoji', { 
    name: 'reactions_emoji_index',
    ifExists: true 
  });
  pgm.dropIndex('reactions', 'created_at', { 
    name: 'reactions_created_at_index',
    ifExists: true 
  });

  // Drop the table (this also drops foreign keys and constraints)
  pgm.dropTable('reactions');
}
