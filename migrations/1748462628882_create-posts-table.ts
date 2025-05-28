/* eslint-disable @typescript-eslint/naming-convention */
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('posts', {
    id: 'id', // SERIAL PRIMARY KEY by default
    author_user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'varchar(255)', // Example length constraint
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    tags: {
      type: 'text[]', // Array of text
    },
    upvote_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    comment_count: {
      type: 'integer',
      notNull: true,
      default: 0,
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
  pgm.createIndex('posts', 'author_user_id');
  pgm.createIndex('posts', 'upvote_count');
  pgm.createIndex('posts', 'created_at');
  // For array type, a GIN index is often useful for searching within tags
  pgm.createIndex('posts', 'tags', { method: 'gin' }); 

  // Trigger for updated_at (assuming the function trigger_set_timestamp already exists from previous migrations)
  // If not, or to be safe, you can use CREATE OR REPLACE FUNCTION here again.
  pgm.sql(`
    CREATE TRIGGER set_timestamp_posts
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS set_timestamp_posts ON posts;`);
  // The trigger_set_timestamp function is likely shared; avoid dropping it here unless this is the only table using it.
  pgm.dropTable('posts');
}
