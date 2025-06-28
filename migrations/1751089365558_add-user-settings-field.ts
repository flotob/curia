import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add settings JSONB field to users table for storing Common Ground profile data
  pgm.addColumn('users', {
    settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
      comment: 'JSON field for storing additional user data from Common Ground (LUKSO address, social handles, premium status, etc.)'
    }
  });

  // Add GIN index for efficient JSONB querying
  pgm.createIndex('users', 'settings', {
    method: 'gin',
    name: 'idx_users_settings'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the GIN index first
  pgm.dropIndex('users', 'settings', {
    name: 'idx_users_settings'
  });

  // Remove the settings column
  pgm.dropColumn('users', 'settings');
}
