import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Step 1: Clear all existing verification data (context-specific data is no longer valid)
  pgm.sql('DELETE FROM pre_verifications;');

  // Step 2: Drop all existing unique indexes related to old schema (conditional)
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_unique_user_post_category');
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_unique_user_board_category');

  // Step 3: Add lock_id column (required for all verifications now)
  pgm.addColumn('pre_verifications', {
    lock_id: {
      type: 'integer',
      notNull: true, // Required since verifications are now lock-specific
    },
  });

  // Step 4: Add foreign key constraint to locks table
  pgm.addConstraint('pre_verifications', 'pre_verifications_lock_id_fkey', {
    foreignKeys: {
      columns: 'lock_id',
      references: 'locks(id)',
      onDelete: 'CASCADE',
    },
  });

  // Step 5: Remove context-specific columns (no longer needed)
  pgm.dropColumn('pre_verifications', 'resource_type');
  pgm.dropColumn('pre_verifications', 'board_id');  
  pgm.dropColumn('pre_verifications', 'post_id');

  // Step 6: Add new unique constraint - one verification per user/lock/category
  pgm.addIndex('pre_verifications', ['user_id', 'lock_id', 'category_type'], {
    name: 'pre_verifications_unique_user_lock_category',
    unique: true,
  });

  // Step 7: Add performance indexes for the simplified schema
  pgm.addIndex('pre_verifications', ['lock_id', 'verification_status', 'expires_at'], {
    name: 'idx_pre_verifications_lock_status_expiry',
  });

  pgm.addIndex('pre_verifications', ['user_id', 'expires_at'], {
    name: 'idx_pre_verifications_user_expiry',
  });

  // Step 8: Drop old indexes that referenced removed columns (conditional)
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_post_id_index');
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_board_id_index');
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_resource_type_index');
  pgm.sql('DROP INDEX IF EXISTS pre_verifications_board_user_status_index');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Step 1: Clear all lock-based verification data (reverting to context-based)
  pgm.sql('DELETE FROM pre_verifications;');

  // Step 2: Drop new indexes
  pgm.dropIndex('pre_verifications', ['user_id', 'expires_at'], {
    name: 'idx_pre_verifications_user_expiry',
  });

  pgm.dropIndex('pre_verifications', ['lock_id', 'verification_status', 'expires_at'], {
    name: 'idx_pre_verifications_lock_status_expiry',
  });

  // Step 3: Drop new unique constraint
  pgm.dropIndex('pre_verifications', ['user_id', 'lock_id', 'category_type'], {
    name: 'pre_verifications_unique_user_lock_category',
  });

  // Step 4: Add back context-specific columns
  pgm.addColumn('pre_verifications', {
    resource_type: {
      type: 'varchar(20)',
      notNull: true,
      default: "'post'",
    },
  });

  pgm.addColumn('pre_verifications', {
    board_id: {
      type: 'integer',
      notNull: false,
    },
  });

  pgm.addColumn('pre_verifications', {
    post_id: {
      type: 'integer', 
      notNull: false,
    },
  });

  // Step 5: Drop foreign key constraint and lock_id column
  pgm.dropConstraint('pre_verifications', 'pre_verifications_lock_id_fkey');
  pgm.dropColumn('pre_verifications', 'lock_id');

  // Step 6: Recreate original unique indexes  
  pgm.addIndex('pre_verifications', ['user_id', 'post_id', 'category_type'], {
    name: 'pre_verifications_unique_user_post_category',
    unique: true,
    where: "resource_type = 'post' AND post_id IS NOT NULL",
  });

  pgm.addIndex('pre_verifications', ['user_id', 'board_id', 'category_type'], {
    name: 'pre_verifications_unique_user_board_category',
    unique: true,
    where: "resource_type = 'board' AND board_id IS NOT NULL",
  });

  // Step 7: Recreate original indexes
  pgm.addIndex('pre_verifications', ['post_id'], {
    name: 'pre_verifications_post_id_index',
  });

  pgm.addIndex('pre_verifications', ['board_id'], {
    name: 'pre_verifications_board_id_index',
    where: 'board_id IS NOT NULL',
  });

  pgm.addIndex('pre_verifications', ['resource_type'], {
    name: 'pre_verifications_resource_type_index',
  });

  pgm.addIndex('pre_verifications', ['board_id', 'user_id', 'verification_status', 'expires_at'], {
    name: 'pre_verifications_board_user_status_index',
    where: "resource_type = 'board'",
  });

  // Step 8: Add back foreign key constraints
  pgm.addConstraint('pre_verifications', 'pre_verifications_board_id_fkey', {
    foreignKeys: {
      columns: 'board_id',
      references: 'boards(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('pre_verifications', 'pre_verifications_post_id_fkey', {
    foreignKeys: {
      columns: 'post_id', 
      references: 'posts(id)',
      onDelete: 'CASCADE',
    },
  });
}
