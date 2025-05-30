import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add composite index for cursor-based pagination performance
  // This index supports: ORDER BY upvote_count DESC, created_at DESC, id DESC
  // and cursor WHERE conditions like: WHERE (upvote_count, created_at, id) < (val1, val2, val3)
  pgm.createIndex('posts', ['upvote_count DESC', 'created_at DESC', 'id DESC'], {
    name: 'posts_cursor_pagination_idx',
    unique: false
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the cursor pagination index
  pgm.dropIndex('posts', ['upvote_count', 'created_at', 'id'], {
    name: 'posts_cursor_pagination_idx'
  });
}
