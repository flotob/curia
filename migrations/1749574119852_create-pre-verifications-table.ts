import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Creating pre_verifications table for slot-based verification system...');
  
  // Create the pre_verifications table
  pgm.createTable('pre_verifications', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    user_id: {
      type: 'text',
      notNull: true,
    },
    post_id: {
      type: 'integer',
      notNull: true,
    },
    category_type: {
      type: 'text',
      notNull: true,
      comment: 'Type of gating category: ethereum_profile, universal_profile, etc.',
    },
    verification_data: {
      type: 'jsonb',
      notNull: true,
      comment: 'JSON containing signature, challenge, and verified requirement details',
    },
    verification_status: {
      type: 'text',
      notNull: true,
      default: 'pending',
      comment: 'Status: pending (submitted), verified (backend confirmed), expired (timed out)',
    },
    verified_at: {
      type: 'timestamptz',
      notNull: false,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
      comment: 'Verification expires 30 minutes after creation for security',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  }, {
    comment: 'Stores pre-verification states for slot-based gating system',
  });

  // Add unique constraint for user_id + post_id + category_type
  pgm.addConstraint('pre_verifications', 'pre_verifications_unique_user_post_category', {
    unique: ['user_id', 'post_id', 'category_type'],
  });

  // Add foreign key constraints
  pgm.addConstraint('pre_verifications', 'pre_verifications_post_id_fkey', {
    foreignKeys: {
      columns: 'post_id',
      references: 'posts(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('pre_verifications', 'pre_verifications_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(user_id)',
      onDelete: 'CASCADE',
    },
  });

  // Add indexes for performance
  pgm.createIndex('pre_verifications', 'user_id', {
    name: 'pre_verifications_user_id_index',
  });

  pgm.createIndex('pre_verifications', 'post_id', {
    name: 'pre_verifications_post_id_index',
  });

  pgm.createIndex('pre_verifications', 'verification_status', {
    name: 'pre_verifications_status_index',
  });

  pgm.createIndex('pre_verifications', 'expires_at', {
    name: 'pre_verifications_expires_at_index',
  });

  // Add trigger for updated_at (assumes trigger_set_timestamp function exists)
  pgm.sql(`
    CREATE TRIGGER "set_timestamp_pre_verifications" 
      BEFORE UPDATE ON "pre_verifications" 
      FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  `);

  console.log('[Migration] pre_verifications table created successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Dropping pre_verifications table...');
  
  // Drop the table (cascades will handle constraints and indexes)
  pgm.dropTable('pre_verifications');
  
  console.log('[Migration] pre_verifications table dropped successfully');
}
