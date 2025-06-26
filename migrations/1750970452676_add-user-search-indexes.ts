import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add GIN indexes for full-text search on user names
  // These indexes will significantly improve performance for user mentions autocomplete
  
  // Index for users table name search
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_users_name_search 
    ON users 
    USING gin(to_tsvector('english', name)) 
    WHERE name IS NOT NULL;
  `);
  
  // Index for user_friends table friend_name search
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_user_friends_name_search 
    ON user_friends 
    USING gin(to_tsvector('english', friend_name)) 
    WHERE friendship_status = 'active';
  `);
  
  // Additional btree indexes for prefix matching (for fast autocomplete)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_users_name_prefix 
    ON users 
    USING btree(name text_pattern_ops) 
    WHERE name IS NOT NULL;
  `);
  
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_user_friends_name_prefix 
    ON user_friends 
    USING btree(friend_name text_pattern_ops) 
    WHERE friendship_status = 'active';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the search indexes in reverse order
  pgm.sql('DROP INDEX IF EXISTS idx_user_friends_name_prefix;');
  pgm.sql('DROP INDEX IF EXISTS idx_users_name_prefix;');
  pgm.sql('DROP INDEX IF EXISTS idx_user_friends_name_search;');
  pgm.sql('DROP INDEX IF EXISTS idx_users_name_search;');
}
