import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create the shared_boards table to track boards shared between partner communities
  pgm.createTable('shared_boards', {
    id: 'id',
    
    // Board being shared
    board_id: {
      type: 'integer',
      notNull: true,
      references: '"boards"',
      onDelete: 'CASCADE',
      comment: 'Board being shared from the source community'
    },
    
    // Community sharing the board (must be the same as board.community_id)
    source_community_id: {
      type: 'text',
      notNull: true,
      references: '"communities"',
      onDelete: 'CASCADE',
      comment: 'Community that owns and shares the board'
    },
    
    // Community receiving access to the shared board
    target_community_id: {
      type: 'text',
      notNull: true,
      references: '"communities"',
      onDelete: 'CASCADE',
      comment: 'Community that gains access to the shared board'
    },
    
    // Partnership relationship this sharing is based on
    partnership_id: {
      type: 'integer',
      notNull: true,
      references: '"community_partnerships"',
      onDelete: 'CASCADE',
      comment: 'Partnership relationship that enables this board sharing'
    },
    
    // Sharing metadata
    shared_by_user_id: {
      type: 'text',
      notNull: true,
      references: '"users"',
      comment: 'User who initiated the board sharing'
    },
    
    shared_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When the board sharing was enabled'
    },
    
    // Optional sharing configuration
    sharing_settings: {
      type: 'jsonb',
      default: '{}',
      comment: 'Additional settings for shared board behavior'
    },
    
    // Standard timestamps
    created_at: {
      type: 'timestamptz',
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });
  
  // Add constraints for data integrity (PostgreSQL-compatible)
  pgm.addConstraint('shared_boards', 'unique_shared_board_per_partnership', {
    unique: ['board_id', 'target_community_id'],
    comment: 'Each board can only be shared once per target community'
  });
  
  pgm.addConstraint('shared_boards', 'no_self_sharing', {
    check: 'source_community_id != target_community_id',
    comment: 'Communities cannot share boards with themselves'
  });
  
  // Note: More complex constraints (board ownership, partnership validity) will be 
  // enforced at the application level since PostgreSQL doesn't support subqueries in CHECK constraints
  
  // Create indexes for performance
  pgm.createIndex('shared_boards', 'board_id', {
    name: 'idx_shared_boards_board_id'
  });
  
  pgm.createIndex('shared_boards', 'source_community_id', {
    name: 'idx_shared_boards_source_community'
  });
  
  pgm.createIndex('shared_boards', 'target_community_id', {
    name: 'idx_shared_boards_target_community'
  });
  
  pgm.createIndex('shared_boards', 'partnership_id', {
    name: 'idx_shared_boards_partnership'
  });
  
  pgm.createIndex('shared_boards', 'shared_by_user_id', {
    name: 'idx_shared_boards_shared_by_user'
  });
  
  pgm.createIndex('shared_boards', 'shared_at', {
    name: 'idx_shared_boards_shared_at'
  });
  
  // Composite index for common lookup patterns
  pgm.createIndex('shared_boards', ['target_community_id', 'shared_at'], {
    name: 'idx_shared_boards_target_community_recent'
  });
  
  pgm.createIndex('shared_boards', ['source_community_id', 'board_id'], {
    name: 'idx_shared_boards_source_board_lookup'
  });
  
  // Add updated_at trigger
  pgm.createTrigger('shared_boards', 'set_timestamp_shared_boards', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'trigger_set_timestamp'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the trigger first
  pgm.dropTrigger('shared_boards', 'set_timestamp_shared_boards');
  
  // Drop the table (indexes and constraints will be dropped automatically)
  pgm.dropTable('shared_boards');
}
