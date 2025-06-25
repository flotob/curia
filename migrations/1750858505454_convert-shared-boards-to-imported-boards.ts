import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create the new imported_boards table with the import-based structure
  pgm.createTable('imported_boards', {
    id: 'id',
    
    // Board being imported
    source_board_id: {
      type: 'integer',
      notNull: true,
      references: '\"boards\"',
      onDelete: 'CASCADE',
      comment: 'Board being imported from the source community'
    },
    
    // Source community (where the board comes from)
    source_community_id: {
      type: 'text',
      notNull: true,
      references: '\"communities\"',
      onDelete: 'CASCADE',
      comment: 'Community that owns the original board'
    },
    
    // Importing community (where the board is being imported to)
    importing_community_id: {
      type: 'text',
      notNull: true,
      references: '\"communities\"',
      onDelete: 'CASCADE',
      comment: 'Community that is importing the board'
    },
    
    // User who imported the board
    imported_by_user_id: {
      type: 'text',
      notNull: true,
      references: '\"users\"',
      onDelete: 'CASCADE',
      comment: 'User who performed the import'
    },
    
    // Import timestamp
    imported_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When the board was imported'
    },
    
    // Active status (allows soft deletion of imports)
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Whether the import is currently active'
    },
    
    // Standard timestamps
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

  // Add constraints and indexes
  pgm.addConstraint('imported_boards', 'imported_boards_unique_import', {
    unique: ['importing_community_id', 'source_board_id'],
    comment: 'Each board can only be imported once per community'
  });

  // Add indexes for optimal query performance
  pgm.createIndex('imported_boards', 'importing_community_id', {
    name: 'idx_imported_boards_importing_community'
  });

  pgm.createIndex('imported_boards', 'source_community_id', {
    name: 'idx_imported_boards_source_community'
  });

  pgm.createIndex('imported_boards', 'source_board_id', {
    name: 'idx_imported_boards_source_board'
  });

  pgm.createIndex('imported_boards', ['importing_community_id', 'is_active'], {
    name: 'idx_imported_boards_active_by_community',
    where: 'is_active = true'
  });

  pgm.createIndex('imported_boards', 'imported_at', {
    name: 'idx_imported_boards_imported_at'
  });

  // Add the updated_at trigger
  pgm.sql(`
    CREATE TRIGGER set_timestamp_imported_boards
    BEFORE UPDATE ON imported_boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);

  // Migrate existing data from shared_boards to imported_boards
  pgm.sql(`
    INSERT INTO imported_boards (
      source_board_id,
      source_community_id, 
      importing_community_id,
      imported_by_user_id,
      imported_at,
      is_active,
      created_at,
      updated_at
    )
    SELECT 
      sb.board_id,
      sb.source_community_id,
      sb.target_community_id,
      sb.shared_by_user_id,
      sb.shared_at,
      true, -- All existing shares become active imports
      sb.created_at,
      sb.updated_at
    FROM shared_boards sb
    WHERE sb.board_id IS NOT NULL 
      AND sb.source_community_id IS NOT NULL 
      AND sb.target_community_id IS NOT NULL
      AND sb.shared_by_user_id IS NOT NULL
  `);

  // Add comment to the table
  pgm.sql(`
    COMMENT ON TABLE imported_boards IS 
    'Tracks boards imported from partner communities via permission-based sharing'
  `);

  // Create a backup of the old shared_boards table before dropping it
  pgm.sql(`
    CREATE TABLE shared_boards_backup AS SELECT * FROM shared_boards;
  `);

  pgm.sql(`
    COMMENT ON TABLE shared_boards_backup IS 
    'Backup of original shared_boards table before migration to imported_boards model'
  `);

  // Drop the old shared_boards table
  pgm.dropTable('shared_boards');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Recreate the original shared_boards table structure
  pgm.createTable('shared_boards', {
    id: 'id',
    board_id: {
      type: 'integer',
      notNull: true,
      references: '\"boards\"',
      onDelete: 'CASCADE'
    },
    source_community_id: {
      type: 'text',
      notNull: true,
      references: '\"communities\"',
      onDelete: 'CASCADE'
    },
    target_community_id: {
      type: 'text',
      notNull: true,
      references: '\"communities\"',
      onDelete: 'CASCADE'
    },
    partnership_id: {
      type: 'integer',
      notNull: true,
      references: '\"community_partnerships\"',
      onDelete: 'CASCADE'
    },
    shared_by_user_id: {
      type: 'text',
      notNull: true,
      references: '\"users\"',
      onDelete: 'CASCADE'
    },
    shared_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    sharing_settings: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
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

  // Restore data from backup if it exists
  pgm.sql(`
    INSERT INTO shared_boards 
    SELECT * FROM shared_boards_backup 
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_boards_backup')
  `);

  // Recreate original indexes and constraints
  pgm.createIndex('shared_boards', ['source_community_id', 'target_community_id'], {
    name: 'idx_shared_boards_communities'
  });

  pgm.addConstraint('shared_boards', 'shared_boards_unique_sharing', {
    unique: ['board_id', 'target_community_id']
  });

  // Add the updated_at trigger back
  pgm.sql(`
    CREATE TRIGGER set_timestamp_shared_boards
    BEFORE UPDATE ON shared_boards
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);

  // Drop the new imported_boards table
  pgm.dropTable('imported_boards');

  // Drop the backup table
  pgm.sql(`
    DROP TABLE IF EXISTS shared_boards_backup;
  `);
}
