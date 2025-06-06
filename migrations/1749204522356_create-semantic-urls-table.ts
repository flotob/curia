import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create links table
  pgm.createTable('links', {
    id: 'id', // Primary key (serial)
    
    // Semantic URL components (human-readable URL parts)
    slug: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
      comment: 'URL-safe post title slug (e.g., "introducing-new-governance-proposal")'
    },
    community_short_id: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Community identifier (e.g., "commonground")'
    },
    board_slug: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'URL-safe board name slug (e.g., "general-discussion")'
    },
    
    // Target content (what the URL points to)
    post_id: {
      type: 'integer',
      notNull: true,
      references: 'posts(id)',
      onDelete: 'CASCADE',
      comment: 'ID of the target post'
    },
    board_id: {
      type: 'integer',
      notNull: true,
      references: 'boards(id)',
      onDelete: 'CASCADE',
      comment: 'ID of the target board'
    },
    
    // Plugin context (required for Common Ground routing)
    plugin_id: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Full plugin UUID for Common Ground routing'
    },
    
    // Share context (for iframe detection and analytics)
    share_token: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
      comment: 'Unique share token for this URL instance'
    },
    shared_by_user_id: {
      type: 'varchar(255)',
      references: 'users(user_id)',
      comment: 'User who created this share URL'
    },
    share_source: {
      type: 'varchar(100)',
      comment: 'How the URL was shared (direct_share, social_media, email, etc.)'
    },
    
    // Content metadata (for URL generation and SEO)
    post_title: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Original post title for regenerating URLs'
    },
    board_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original board name for regenerating URLs'
    },
    
    // Lifecycle management
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    expires_at: {
      type: 'timestamptz',
      comment: 'Optional expiration date for the URL'
    },
    last_accessed_at: {
      type: 'timestamptz',
      comment: 'When the URL was last accessed'
    },
    access_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times the URL has been accessed'
    }
  });
  
  // Add unique constraint for semantic URL path
  pgm.addConstraint('links', 'links_unique_path', {
    unique: ['community_short_id', 'board_slug', 'slug']
  });
  
  // Create performance indexes
  pgm.createIndex('links', 'post_id', {
    name: 'links_post_id_idx'
  });
  
  pgm.createIndex('links', 'board_id', {
    name: 'links_board_id_idx'
  });
  
  pgm.createIndex('links', 'community_short_id', {
    name: 'links_community_idx'
  });
  
  pgm.createIndex('links', 'created_at', {
    name: 'links_created_at_idx'
  });
  
  pgm.createIndex('links', 'expires_at', {
    name: 'links_expires_at_idx',
    where: 'expires_at IS NOT NULL'
  });
  
  pgm.createIndex('links', 'access_count', {
    name: 'links_access_count_idx'
  });
  
  // Add trigger for updated_at timestamp (uses existing trigger function)
  pgm.createTrigger('links', 'set_timestamp_links', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'trigger_set_timestamp',
    level: 'ROW'
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop trigger first
  pgm.dropTrigger('links', 'set_timestamp_links');
  
  // Drop indexes (will be dropped automatically with table, but explicit for clarity)
  pgm.dropIndex('links', 'access_count', { name: 'links_access_count_idx' });
  pgm.dropIndex('links', 'expires_at', { name: 'links_expires_at_idx' });
  pgm.dropIndex('links', 'created_at', { name: 'links_created_at_idx' });
  pgm.dropIndex('links', 'community_short_id', { name: 'links_community_idx' });
  pgm.dropIndex('links', 'board_id', { name: 'links_board_id_idx' });
  pgm.dropIndex('links', 'post_id', { name: 'links_post_id_idx' });
  
  // Drop constraint (will be dropped automatically with table, but explicit for clarity)
  pgm.dropConstraint('links', 'links_unique_path');
  
  // Drop the table (CASCADE will handle foreign key references)
  pgm.dropTable('links');
}
