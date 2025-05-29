import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add JSON settings column to boards table with default empty object
  pgm.addColumn('boards', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    }
  });

  // Add GIN index for efficient JSON queries
  pgm.createIndex('boards', 'settings', { method: 'gin' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the index first
  pgm.dropIndex('boards', 'settings');
  // Drop the settings column
  pgm.dropColumn('boards', 'settings');
}
