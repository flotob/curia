import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add circles_safe_address column to users table
  pgm.addColumn('users', {
    circles_safe_address: {
      type: 'TEXT',
      notNull: false, // Nullable - not all users will have Circles linked
      unique: true,   // Each Circles Safe address should only be linked to one user
    },
  });

  // Add index for better performance on lookups
  pgm.createIndex('users', 'circles_safe_address');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the index first
  pgm.dropIndex('users', 'circles_safe_address');
  
  // Remove the column
  pgm.dropColumn('users', 'circles_safe_address');
}
