import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Adding community_shortid_history column to links table...');
  
  // Add the history column to track all previous community short IDs
  pgm.addColumn('links', {
    community_shortid_history: {
      type: 'text[]',
      notNull: true,
      default: '{}',
      comment: 'Array of all historical community short IDs for backward compatibility'
    }
  });
  
  console.log('[Migration] Creating GIN index for community_shortid_history...');
  
  // Create GIN index for efficient array searches
  pgm.createIndex('links', 'community_shortid_history', {
    method: 'gin',
    name: 'links_community_shortid_history_idx'
  });
  
  console.log('[Migration] Populating history with current community short IDs...');
  
  // Populate existing records with their current community_short_id in history
  pgm.sql(`
    UPDATE links 
    SET community_shortid_history = ARRAY[community_short_id]
    WHERE community_shortid_history = '{}'
  `);
  
  console.log('[Migration] Community short ID history migration completed successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back community_shortid_history changes...');
  
  // Drop the GIN index first
  pgm.dropIndex('links', 'community_shortid_history', {
    name: 'links_community_shortid_history_idx'
  });
  
  // Drop the history column
  pgm.dropColumn('links', 'community_shortid_history');
  
  console.log('[Migration] Community short ID history rollback completed');
}
