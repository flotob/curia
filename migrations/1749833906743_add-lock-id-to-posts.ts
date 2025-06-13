import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Adding lock_id column to posts table...');

  // Add lock_id column as nullable foreign key
  pgm.addColumn('posts', {
    lock_id: {
      type: 'integer',
      references: 'locks(id)',
      onDelete: 'SET NULL', // If lock is deleted, just remove reference but keep post
      notNull: false,
      comment: 'Reference to the lock applied to this post for gating'
    }
  });

  // Add index for performance
  pgm.createIndex('posts', 'lock_id', {
    name: 'posts_lock_id_index',
    where: 'lock_id IS NOT NULL' // Partial index for non-null values only
  });

  console.log('[Migration] Successfully added lock_id column and index to posts table');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Removing lock_id column from posts table...');

  // Drop index first
  pgm.dropIndex('posts', 'lock_id', {
    name: 'posts_lock_id_index'
  });

  // Drop column (foreign key constraint will be dropped automatically)
  pgm.dropColumn('posts', 'lock_id');

  console.log('[Migration] Successfully removed lock_id column from posts table');
}
