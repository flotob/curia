import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('Creating user-community relationships and friends tables...');

  // 1. Create user_communities table for persistent cross-device tracking
  pgm.createTable('user_communities', {
    id: 'id', // Primary key (serial)
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE',
      comment: 'Common Ground user ID'
    },
    community_id: {
      type: 'text', 
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
      comment: 'Community ID from Common Ground'
    },
    first_visited_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When user first accessed this community'
    },
    last_visited_at: {
      type: 'timestamptz',
      notNull: true, 
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'Last time user accessed this community (for cross-device What\'s New)'
    },
    visit_count: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Number of times user has visited this community'
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

  // Add unique constraint to prevent duplicate user-community relationships
  pgm.addConstraint('user_communities', 'user_communities_user_community_unique', {
    unique: ['user_id', 'community_id']
  });

  // 2. Create user_friends table for persistent friends list storage
  pgm.createTable('user_friends', {
    id: 'id', // Primary key (serial)
    user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)', 
      onDelete: 'CASCADE',
      comment: 'User who has this friend'
    },
    friend_user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE', 
      comment: 'The friend\'s Common Ground user ID'
    },
    friend_name: {
      type: 'text',
      notNull: true,
      comment: 'Friend\'s display name from CG lib'
    },
    friend_image_url: {
      type: 'text',
      comment: 'Friend\'s profile picture URL from CG lib'
    },
    friendship_status: {
      type: 'text',
      notNull: true,
      default: "'active'",
      comment: 'Status: active, removed, blocked'
    },
    synced_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'When this friendship data was last synced from CG lib'
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

  // Add unique constraint to prevent duplicate friendships
  pgm.addConstraint('user_friends', 'user_friends_unique_friendship', {
    unique: ['user_id', 'friend_user_id']
  });

  // Add check constraint to prevent self-friendship
  pgm.addConstraint('user_friends', 'user_friends_no_self_friendship', {
    check: 'user_id != friend_user_id'
  });

  // 3. Enhance communities table with CG lib metadata for URL building
  console.log('Enhancing communities table with CG lib metadata...');
  
  pgm.addColumns('communities', {
    community_short_id: {
      type: 'text',
      comment: 'Community short ID/slug from CG lib (e.g., "commonground")'
    },
    plugin_id: {
      type: 'text', 
      comment: 'Plugin ID from CG lib context for URL building'
    },
    community_url: {
      type: 'text',
      comment: 'Community URL field (for future use if needed)'
    }
  });

  // 4. Create performance indexes for user_communities
  console.log('Creating indexes for user_communities...');
  
  pgm.createIndex('user_communities', 'user_id', {
    name: 'idx_user_communities_user_id'
  });
  
  pgm.createIndex('user_communities', 'community_id', {
    name: 'idx_user_communities_community_id'
  });
  
  pgm.createIndex('user_communities', 'last_visited_at', {
    name: 'idx_user_communities_last_visited'
  });
  
  // Composite index for What's New queries
  pgm.createIndex('user_communities', ['user_id', 'last_visited_at'], {
    name: 'idx_user_communities_user_last_visited'
  });

  // 5. Create performance indexes for user_friends
  console.log('Creating indexes for user_friends...');
  
  pgm.createIndex('user_friends', 'user_id', {
    name: 'idx_user_friends_user_id'
  });
  
  pgm.createIndex('user_friends', 'friend_user_id', {
    name: 'idx_user_friends_friend_user_id'
  });
  
  // Partial index for active friendships only
  pgm.createIndex('user_friends', 'friendship_status', {
    name: 'idx_user_friends_status',
    where: "friendship_status = 'active'"
  });
  
  pgm.createIndex('user_friends', 'synced_at', {
    name: 'idx_user_friends_synced'
  });
  
  // Composite index for friend activity queries  
  pgm.createIndex('user_friends', ['user_id', 'friendship_status'], {
    name: 'idx_user_friends_user_status',
    where: "friendship_status = 'active'"
  });

  // 6. Create indexes for enhanced communities table
  console.log('Creating indexes for communities enhancements...');
  
  pgm.createIndex('communities', 'community_short_id', {
    name: 'idx_communities_short_id'
  });
  
  pgm.createIndex('communities', 'plugin_id', {
    name: 'idx_communities_plugin_id'
  });

  // 7. Add updated_at triggers for new tables
  console.log('Adding updated_at triggers...');
  
  // Trigger for user_communities
  pgm.sql(`
    CREATE TRIGGER set_timestamp_user_communities
      BEFORE UPDATE ON user_communities
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
  `);
  
  // Trigger for user_friends  
  pgm.sql(`
    CREATE TRIGGER set_timestamp_user_friends
      BEFORE UPDATE ON user_friends
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_timestamp();
  `);

  console.log('✅ User relationships and friends tables created successfully!');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('Rolling back user-community relationships and friends tables...');

  // Remove triggers first
  pgm.sql('DROP TRIGGER IF EXISTS set_timestamp_user_friends ON user_friends;');
  pgm.sql('DROP TRIGGER IF EXISTS set_timestamp_user_communities ON user_communities;');

  // Drop indexes for communities (drop indexes before removing columns)
  pgm.dropIndex('communities', 'community_short_id', { 
    ifExists: true,
    name: 'idx_communities_short_id'
  });
  pgm.dropIndex('communities', 'plugin_id', {
    ifExists: true, 
    name: 'idx_communities_plugin_id'
  });

  // Remove added columns from communities table
  pgm.dropColumns('communities', ['community_short_id', 'plugin_id', 'community_url']);

  // Drop user_friends table (indexes drop automatically with table)
  pgm.dropTable('user_friends');

  // Drop user_communities table (indexes drop automatically with table)  
  pgm.dropTable('user_communities');

  console.log('✅ User relationships and friends tables rolled back successfully!');
}
