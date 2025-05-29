import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add JSON settings column to communities table with default empty object
  pgm.addColumn('communities', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    }
  });

  // Add GIN index for efficient JSON queries
  pgm.createIndex('communities', 'settings', { method: 'gin' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the index first
  pgm.dropIndex('communities', 'settings');
  // Drop the settings column
  pgm.dropColumn('communities', 'settings');
}
