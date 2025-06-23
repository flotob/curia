import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Fix the default values for status and relationship_type columns
  // The original migration incorrectly used "'pending'" and "'partner'" (with quotes as part of the value)
  // This fixes them to use proper defaults without the extra quotes
  
  pgm.alterColumn('community_partnerships', 'status', {
    default: 'pending'
  });
  
  pgm.alterColumn('community_partnerships', 'relationship_type', {
    default: 'partner'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revert to the original incorrect defaults if needed
  pgm.alterColumn('community_partnerships', 'status', {
    default: "'pending'"
  });
  
  pgm.alterColumn('community_partnerships', 'relationship_type', {
    default: "'partner'"
  });
}
