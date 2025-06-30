import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration UP] Adding optimized composite index for pre_verifications table');
  
  // Add the optimized composite index for pre-verification queries
  // This replaces the basic single-column index with a more efficient composite index
  // that covers the most common query pattern: user_id + verification_status + expires_at + lock_id
  pgm.addIndex('pre_verifications', 
    ['user_id', 'verification_status', 'expires_at', 'lock_id'],
    {
      name: 'idx_pre_verifications_user_status_expiry_lock',
      where: 'verification_status = \'verified\''
    }
  );
  
  // Add an additional index for batch queries by lock_id
  pgm.addIndex('pre_verifications',
    ['lock_id', 'verification_status', 'expires_at'],
    {
      name: 'idx_pre_verifications_lock_status_expiry_optimized',
      where: 'verification_status = \'verified\''
    }
  );
  
  console.log('[Migration UP] ✅ Added composite indexes for pre_verifications optimization');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration DOWN] Removing composite indexes for pre_verifications');
  
  // Remove the composite indexes
  pgm.dropIndex('pre_verifications', 'idx_pre_verifications_user_status_expiry_lock');
  pgm.dropIndex('pre_verifications', 'idx_pre_verifications_lock_status_expiry_optimized');
  
  console.log('[Migration DOWN] ✅ Removed composite indexes for pre_verifications');
}