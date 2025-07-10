import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Adding community ownership and membership system...');

  // Extend communities table with ownership and access control
  pgm.addColumn('communities', {
    owner_user_id: {
      type: 'text',
      notNull: false, // Nullable for existing communities during migration
      references: 'users(user_id)',
      onDelete: 'SET NULL',
      comment: 'User who owns/created this community'
    },
    is_public: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Whether the community is publicly discoverable'
    },
    requires_approval: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether joining requires owner approval'
    }
  });

  // Create community_memberships table for tracking user-community relationships
  pgm.createTable('community_memberships', {
    id: 'id', // Auto-incrementing primary key
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
      comment: 'User who is a member of the community'
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
      comment: 'Community the user belongs to'
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      default: "'member'",
      comment: 'User role in the community (member, moderator, admin)'
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'active'",
      comment: 'Membership status (active, pending, banned, left)'
    },
    joined_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When the user joined the community'
    },
    invited_by_user_id: {
      type: 'text',
      notNull: false,
      references: 'users(user_id)',
      onDelete: 'SET NULL',
      comment: 'User who invited this member (if applicable)'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Add unique constraint to prevent duplicate memberships
  pgm.addConstraint('community_memberships', 'community_memberships_unique_user_community', {
    unique: ['user_id', 'community_id']
  });

  // Add constraints to validate role and status values
  pgm.addConstraint('community_memberships', 'check_membership_role', {
    check: "role IN ('member', 'moderator', 'admin', 'owner')"
  });

  pgm.addConstraint('community_memberships', 'check_membership_status', {
    check: "status IN ('active', 'pending', 'banned', 'left')"
  });

  // Add indexes for performance
  pgm.createIndex('communities', 'owner_user_id', {
    name: 'idx_communities_owner'
  });

  pgm.createIndex('communities', 'is_public', {
    name: 'idx_communities_public',
    where: 'is_public = true'
  });

  pgm.createIndex('community_memberships', 'user_id', {
    name: 'idx_community_memberships_user'
  });

  pgm.createIndex('community_memberships', 'community_id', {
    name: 'idx_community_memberships_community'
  });

  pgm.createIndex('community_memberships', ['community_id', 'status'], {
    name: 'idx_community_memberships_community_status'
  });

  pgm.createIndex('community_memberships', ['user_id', 'status'], {
    name: 'idx_community_memberships_user_status'
  });

  pgm.createIndex('community_memberships', 'role', {
    name: 'idx_community_memberships_role'
  });

  // Add updated_at trigger for community_memberships
  pgm.sql(`
    CREATE TRIGGER set_timestamp_community_memberships
    BEFORE UPDATE ON community_memberships
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);

  console.log('[Migration] ✅ Added community ownership and membership system');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Removing community ownership and membership system...');

  // Drop the community_memberships table
  pgm.dropTable('community_memberships');

  // Remove columns from communities table
  pgm.dropColumn('communities', 'owner_user_id');
  pgm.dropColumn('communities', 'is_public');
  pgm.dropColumn('communities', 'requires_approval');

  console.log('[Migration] ✅ Removed community ownership and membership system');
}
