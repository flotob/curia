import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Creating locks table and related infrastructure...');

  // Create locks table
  pgm.createTable('locks', {
    id: {
      type: 'integer',
      primaryKey: true,
      sequenceGenerated: {
        precedence: 'BY DEFAULT'
      }
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    description: {
      type: 'text',
      notNull: false
    },
    icon: {
      type: 'varchar(50)',
      notNull: false,
      comment: 'Emoji or icon identifier for visual display'
    },
    color: {
      type: 'varchar(20)',
      notNull: false,
      comment: 'Brand color hex code for UI theming'
    },
    gating_config: {
      type: 'jsonb',
      notNull: true,
      comment: 'Complete gating configuration in same format as posts.settings.responsePermissions'
    },
    creator_user_id: {
      type: 'text',
      notNull: true,
      references: 'users(user_id)',
      onDelete: 'CASCADE'
    },
    community_id: {
      type: 'text',
      notNull: true,
      references: 'communities(id)',
      onDelete: 'CASCADE',
      comment: 'Scope locks to specific communities'
    },
    is_template: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True for curated community templates'
    },
    is_public: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True if shareable within community'
    },
    tags: {
      type: 'text[]',
      notNull: true,
      default: '{}',
      comment: 'Tags for categorization and search'
    },
    usage_count: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Number of times this lock has been applied to posts'
    },
    success_rate: {
      type: 'real',
      notNull: true,
      default: 0,
      comment: 'Percentage of users who successfully pass verification (0-1)'
    },
    avg_verification_time: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Average time in seconds for users to complete verification'
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

  // Add indexes for performance
  pgm.createIndex('locks', 'community_id', {
    name: 'idx_locks_community'
  });

  pgm.createIndex('locks', 'creator_user_id', {
    name: 'idx_locks_creator'
  });

  pgm.createIndex('locks', 'is_public', {
    name: 'idx_locks_public',
    where: 'is_public = true'
  });

  pgm.createIndex('locks', 'is_template', {
    name: 'idx_locks_templates',
    where: 'is_template = true'
  });

  pgm.createIndex('locks', 'tags', {
    name: 'idx_locks_tags',
    method: 'gin'
  });

  pgm.createIndex('locks', 'gating_config', {
    name: 'idx_locks_gating_config',
    method: 'gin'
  });

  pgm.createIndex('locks', ['community_id', 'name'], {
    name: 'idx_locks_community_name',
    unique: true
  });

  pgm.createIndex('locks', ['usage_count', 'created_at'], {
    name: 'idx_locks_popular'
  });

  // Add lock_id column to posts table (nullable for backward compatibility)
  pgm.addColumn('posts', {
    lock_id: {
      type: 'integer',
      notNull: false,
      references: 'locks(id)',
      onDelete: 'SET NULL',
      comment: 'Optional reference to the lock used for this post gating'
    }
  });

  pgm.createIndex('posts', 'lock_id', {
    name: 'idx_posts_lock_id'
  });

  // Add updated_at trigger for locks table
  pgm.sql(`
    CREATE TRIGGER "set_timestamp_locks" 
    BEFORE UPDATE ON "public"."locks" 
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
  `);

  // Create useful views for lock analytics
  pgm.createView('lock_stats', {}, `
    SELECT 
      l.id,
      l.name,
      l.community_id,
      l.creator_user_id,
      l.is_template,
      l.is_public,
      l.usage_count,
      l.success_rate,
      l.avg_verification_time,
      COUNT(p.id) as posts_using_lock,
      l.created_at,
      l.updated_at
    FROM locks l
    LEFT JOIN posts p ON p.lock_id = l.id
    GROUP BY l.id
  `);

  console.log('[Migration] Locks table infrastructure created successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Rolling back locks table infrastructure...');

  // Drop views
  pgm.dropView('lock_stats');

  // Drop triggers
  pgm.sql('DROP TRIGGER IF EXISTS "set_timestamp_locks" ON "public"."locks";');

  // Remove lock_id column from posts table
  pgm.dropIndex('posts', 'lock_id', { ifExists: true });
  pgm.dropColumn('posts', 'lock_id', { ifExists: true });

  // Drop all indexes (in reverse order)
  pgm.dropIndex('locks', ['usage_count', 'created_at'], { 
    name: 'idx_locks_popular',
    ifExists: true 
  });

  pgm.dropIndex('locks', ['community_id', 'name'], { 
    name: 'idx_locks_community_name',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'gating_config', { 
    name: 'idx_locks_gating_config',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'tags', { 
    name: 'idx_locks_tags',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'is_template', { 
    name: 'idx_locks_templates',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'is_public', { 
    name: 'idx_locks_public',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'creator_user_id', { 
    name: 'idx_locks_creator',
    ifExists: true 
  });

  pgm.dropIndex('locks', 'community_id', { 
    name: 'idx_locks_community',
    ifExists: true 
  });

  // Drop the locks table
  pgm.dropTable('locks', { ifExists: true });

  console.log('[Migration] Locks table infrastructure rolled back successfully');
}
