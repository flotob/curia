import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Fixing high-priority database issues...');

  // 1. STANDARDIZE USER ID FIELD TYPES
  // Change links.shared_by_user_id from VARCHAR(255) to TEXT to match users.user_id
  console.log('[Migration] Standardizing user ID field types...');
  
  pgm.alterColumn('links', 'shared_by_user_id', {
    type: 'text',
    notNull: false // Keep existing nullability
  });

  // 2. ADD MISSING FOREIGN KEY CONSTRAINTS
  console.log('[Migration] Adding missing foreign key constraints...');
  
  // Add foreign key constraint for links.shared_by_user_id -> users.user_id
  // Using ON DELETE SET NULL because shared_by_user_id is nullable
  pgm.addConstraint('links', 'links_shared_by_user_fkey', {
    foreignKeys: {
      columns: 'shared_by_user_id',
      references: 'users(user_id)',
      onDelete: 'SET NULL'
    }
  });

  // Add foreign key constraint for telegram_groups.registered_by_user_id -> users.user_id  
  // Using ON DELETE CASCADE because we want to remove telegram groups if the registering user is deleted
  pgm.addConstraint('telegram_groups', 'telegram_groups_registered_by_fkey', {
    foreignKeys: {
      columns: 'registered_by_user_id',
      references: 'users(user_id)',
      onDelete: 'CASCADE'
    }
  });

  console.log('[Migration] High-priority database issues fixed successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back high-priority database fixes...');

  // Remove foreign key constraints (in reverse order)
  pgm.dropConstraint('telegram_groups', 'telegram_groups_registered_by_fkey', {
    ifExists: true
  });

  pgm.dropConstraint('links', 'links_shared_by_user_fkey', {
    ifExists: true
  });

  // Revert user ID field type changes
  pgm.alterColumn('links', 'shared_by_user_id', {
    type: 'varchar(255)',
    notNull: false
  });

  console.log('[Migration] High-priority database fixes rolled back successfully');
}