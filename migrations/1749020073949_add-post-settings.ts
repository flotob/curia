import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add JSON settings column to posts table with default empty object
  pgm.addColumn('posts', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    }
  });

  // Add GIN index for efficient JSON queries
  pgm.createIndex('posts', 'settings', { method: 'gin' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the index first
  pgm.dropIndex('posts', 'settings');
  // Drop the settings column
  pgm.dropColumn('posts', 'settings');
}
