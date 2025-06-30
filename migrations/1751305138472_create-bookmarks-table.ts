import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create bookmarks table for user post bookmarking feature
  pgm.createTable('bookmarks', {
    id: 'id', // Auto-incrementing primary key
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
    post_id: {
      type: 'integer', 
      notNull: true,
      references: 'posts(id)',
      onDelete: 'CASCADE',
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

  // Ensure each user can only bookmark a post once
  pgm.addConstraint('bookmarks', 'bookmarks_user_post_unique', {
    unique: ['user_id', 'post_id'],
  });

  // Indexes for performance
  pgm.createIndex('bookmarks', ['user_id'], { name: 'bookmarks_user_id_index' });
  pgm.createIndex('bookmarks', ['post_id'], { name: 'bookmarks_post_id_index' });
  pgm.createIndex('bookmarks', ['created_at'], { name: 'bookmarks_created_at_index' });

  // Add updated_at trigger
  pgm.sql(`
    CREATE TRIGGER set_timestamp_bookmarks 
    BEFORE UPDATE ON bookmarks 
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the table and all associated constraints/indexes automatically
  pgm.dropTable('bookmarks');
}
