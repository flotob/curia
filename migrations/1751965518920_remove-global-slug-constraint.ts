import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the problematic global slug constraint that prevents duplicate slugs across communities/boards
  // This constraint conflicts with the semantic URL design where:
  // - /c/community1/board1/post-title and /c/community2/board2/post-title should both be valid
  // - The proper constraint is 'links_unique_path' which enforces scoped uniqueness
  
  console.log('[Migration] Removing global slug constraint that conflicts with semantic URL design...');
  
  // Drop the global unique constraint on slug
  pgm.dropConstraint('links', 'links_slug_key');
  
  console.log('[Migration] Global slug constraint removed. Scoped constraint (links_unique_path) remains active.');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Recreate the global slug constraint for rollback
  // WARNING: This rollback will fail if there are duplicate slugs in the database
  // In that case, you would need to manually clean up duplicates first
  
  console.log('[Migration] Recreating global slug constraint (rollback)...');
  
  // Recreate the unique index on slug
  pgm.createIndex('links', 'slug', {
    unique: true,
    name: 'links_slug_key'
  });
  
  console.log('[Migration] Global slug constraint recreated.');
}
