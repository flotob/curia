import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create the community_partnerships table
  pgm.createTable('community_partnerships', {
    id: 'id',
    
    // Partnership parties
    source_community_id: {
      type: 'text',
      notNull: true,
      references: '"communities"',
      onDelete: 'CASCADE'
    },
    target_community_id: {
      type: 'text', 
      notNull: true,
      references: '"communities"',
      onDelete: 'CASCADE'
    },
    
    // Partnership state machine
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: "'pending'",
      check: "status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired', 'suspended')"
    },
    
    // Relationship details
    relationship_type: {
      type: 'varchar(50)',
      default: "'partner'",
      check: "relationship_type IN ('partner', 'ecosystem')"
    },
    
    // Partnership permissions (both directions) 
    source_to_target_permissions: {
      type: 'jsonb',
      default: '{}'
    },
    target_to_source_permissions: {
      type: 'jsonb', 
      default: '{}'
    },
    
    // Invite flow tracking
    invited_by_user_id: {
      type: 'text',
      notNull: true,
      references: '"users"',
      referencesConstraintName: 'community_partnerships_invited_by_fkey'
    },
    invited_at: {
      type: 'timestamptz',
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    
    responded_by_user_id: {
      type: 'text',
      references: '"users"',
      referencesConstraintName: 'community_partnerships_responded_by_fkey'
    },
    responded_at: 'timestamptz',
    
    // Partnership lifecycle
    partnership_started_at: 'timestamptz',
    partnership_ended_at: 'timestamptz',
    
    // Optional messages
    invite_message: 'text',
    response_message: 'text',
    
    // Metadata
    created_at: {
      type: 'timestamptz',
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz', 
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });
  
  // Add constraints
  pgm.addConstraint('community_partnerships', 'unique_community_partnership', {
    unique: ['source_community_id', 'target_community_id']
  });
  
  pgm.addConstraint('community_partnerships', 'no_self_partnership', {
    check: 'source_community_id != target_community_id'
  });
  
  // Create indexes for performance
  pgm.createIndex('community_partnerships', 'source_community_id', {
    name: 'idx_community_partnerships_source'
  });
  
  pgm.createIndex('community_partnerships', 'target_community_id', {
    name: 'idx_community_partnerships_target'
  });
  
  pgm.createIndex('community_partnerships', 'status', {
    name: 'idx_community_partnerships_status'
  });
  
  pgm.createIndex('community_partnerships', 'invited_at', {
    name: 'idx_community_partnerships_invited_at'
  });
  
  pgm.createIndex('community_partnerships', ['source_community_id', 'target_community_id', 'status'], {
    name: 'idx_community_partnerships_lookup'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the table (indexes and constraints will be dropped automatically)
  pgm.dropTable('community_partnerships');
}
