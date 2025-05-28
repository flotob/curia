/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('comments', {
    id: 'id', // SERIAL PRIMARY KEY
    post_id: {
      type: 'integer',
      notNull: true,
      references: 'posts(id)',
      onDelete: 'CASCADE',
    },
    author_user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    parent_comment_id: {
      type: 'integer',
      references: 'comments(id)', // Self-referential for threading
      onDelete: 'CASCADE', // If a parent comment is deleted, its replies are also deleted
    },
    content: {
      type: 'text',
      notNull: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Indexes
  pgm.createIndex('comments', 'post_id');
  pgm.createIndex('comments', 'author_user_id');
  pgm.createIndex('comments', 'parent_comment_id');

  // Trigger for updated_at
  pgm.sql(`
    CREATE TRIGGER set_timestamp_comments
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS set_timestamp_comments ON comments;`);
  // Consider order if other tables reference comments, but here comments references itself.
  pgm.dropTable('comments');
  // The trigger_set_timestamp function is shared; avoid dropping it here.
}
