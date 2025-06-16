import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // 1. EXTEND PRE_VERIFICATIONS TABLE FOR BOARD SUPPORT
  // ============================================================================

  // Add resource_type column to distinguish post vs board verifications
  pgm.addColumn('pre_verifications', {
    resource_type: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: "'post'"
    }
  });

  // Add board_id column for board verifications
  pgm.addColumn('pre_verifications', {
    board_id: {
      type: 'INTEGER',
      notNull: false,
      references: 'boards(id)',
      onDelete: 'CASCADE'
    }
  });

  // Make post_id nullable since board verifications won't have post_id
  pgm.alterColumn('pre_verifications', 'post_id', {
    notNull: false
  });

  // ============================================================================
  // 2. UPDATE UNIQUE CONSTRAINTS FOR DUAL RESOURCE SUPPORT  
  // ============================================================================

  // Drop existing unique constraint
  pgm.dropConstraint('pre_verifications', 'pre_verifications_unique_user_post_category');

  // Create separate unique constraints for each resource type
  pgm.addIndex('pre_verifications', 
    ['user_id', 'post_id', 'category_type'], 
    {
      name: 'pre_verifications_unique_user_post_category',
      unique: true,
      where: "resource_type = 'post' AND post_id IS NOT NULL"
    }
  );

  pgm.addIndex('pre_verifications', 
    ['user_id', 'board_id', 'category_type'], 
    {
      name: 'pre_verifications_unique_user_board_category',
      unique: true,
      where: "resource_type = 'board' AND board_id IS NOT NULL"
    }
  );

  // ============================================================================
  // 3. DATA CLEANUP BEFORE ADDING CONSTRAINTS
  // ============================================================================

  // Clean up any existing records that might violate the constraint
  // (This shouldn't happen but safety first)
  pgm.sql(`
    -- Ensure all existing 'post' type records have proper post_id
    DELETE FROM pre_verifications 
    WHERE resource_type = 'post' AND post_id IS NULL;
    
    -- Ensure board_id is NULL for all post-type records
    UPDATE pre_verifications 
    SET board_id = NULL 
    WHERE resource_type = 'post';
  `);

  // ============================================================================
  // 4. NOTE: CHECK CONSTRAINTS SKIPPED
  // ============================================================================
  // We skip adding the check constraint here to avoid issues with existing data.
  // Application logic will enforce that either post_id OR board_id is set, not both.

  // ============================================================================
  // 5. CREATE OPTIMIZED INDEXES
  // ============================================================================

  // Index for board verification queries
  pgm.addIndex('pre_verifications', ['board_id'], {
    name: 'pre_verifications_board_id_index',
    where: 'board_id IS NOT NULL'
  });

  // Index for resource type filtering
  pgm.addIndex('pre_verifications', ['resource_type'], {
    name: 'pre_verifications_resource_type_index'
  });

  // Composite index for efficient board verification status checks
  pgm.addIndex('pre_verifications', 
    ['board_id', 'user_id', 'verification_status', 'expires_at'], 
    {
      name: 'pre_verifications_board_user_status_index',
      where: "resource_type = 'board'"
    }
  );

  // ============================================================================
  // 6. UPDATE LOCK STATS VIEW WITH BOARD USAGE TRACKING
  // ============================================================================

  // Drop existing view
  pgm.dropView('lock_stats');

  // Create enhanced view that tracks both post and board usage
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
      COUNT(DISTINCT p.id) AS posts_using_lock,
      COUNT(DISTINCT b.id) AS boards_using_lock,
      (COUNT(DISTINCT p.id) + COUNT(DISTINCT b.id)) AS total_usage,
      l.created_at,
      l.updated_at
    FROM locks l
    LEFT JOIN posts p ON (p.lock_id = l.id)
    LEFT JOIN boards b ON (
      b.settings->'permissions'->'locks'->>'lockIds' IS NOT NULL 
      AND jsonb_typeof(b.settings->'permissions'->'locks'->'lockIds') = 'array'
      AND b.settings->'permissions'->'locks'->'lockIds' @> to_jsonb(l.id)
    )
    GROUP BY l.id
  `);

  // ============================================================================
  // 7. CREATE HELPER FUNCTIONS FOR BOARD LOCK QUERIES
  // ============================================================================

  // Function to check if a board has lock gating enabled
  pgm.createFunction(
    'board_has_lock_gating',
    [{ name: 'board_id', type: 'INTEGER' }],
    {
      returns: 'BOOLEAN',
      language: 'plpgsql',
      replace: true
    },
    `
    DECLARE
      lock_config JSONB;
    BEGIN
      SELECT settings->'permissions'->'locks' INTO lock_config
      FROM boards 
      WHERE id = board_id;
      
      RETURN (
        lock_config IS NOT NULL 
        AND lock_config->>'lockIds' IS NOT NULL
        AND jsonb_array_length(lock_config->'lockIds') > 0
      );
    END;
    `
  );

  // Function to get lock IDs for a board
  pgm.createFunction(
    'get_board_lock_ids',
    [{ name: 'board_id', type: 'INTEGER' }],
    {
      returns: 'INTEGER[]',
      language: 'plpgsql',
      replace: true
    },
    `
    DECLARE
      lock_config JSONB;
      lock_ids INTEGER[];
    BEGIN
      SELECT settings->'permissions'->'locks' INTO lock_config
      FROM boards 
      WHERE id = board_id;
      
      IF lock_config IS NULL OR lock_config->'lockIds' IS NULL THEN
        RETURN ARRAY[]::INTEGER[];
      END IF;
      
      SELECT ARRAY(
        SELECT jsonb_array_elements_text(lock_config->'lockIds')::INTEGER
      ) INTO lock_ids;
      
      RETURN COALESCE(lock_ids, ARRAY[]::INTEGER[]);
    END;
    `
  );

  // ============================================================================
  // 8. UPDATE DOCUMENTATION
  // ============================================================================

  // Update table and column comments
  pgm.sql(`
    COMMENT ON TABLE pre_verifications IS 'Stores pre-verification states for both post and board gating systems';
    COMMENT ON COLUMN pre_verifications.resource_type IS 'Type of resource being verified: post or board';
    COMMENT ON COLUMN pre_verifications.board_id IS 'Board ID for board-level verifications (NULL for post verifications)';
    COMMENT ON COLUMN pre_verifications.post_id IS 'Post ID for post-level verifications (NULL for board verifications)';
    COMMENT ON COLUMN pre_verifications.expires_at IS 'Verification expires after creation - 30 minutes for posts, configurable for boards';
    COMMENT ON VIEW lock_stats IS 'Statistics for lock usage across both posts and boards with real-time usage tracking';
  `);

  // ============================================================================
  // 9. FINAL DATA VALIDATION
  // ============================================================================

  // Update any existing NULL expires_at records (shouldn't exist but safety check)
  pgm.sql(`
    UPDATE pre_verifications 
    SET expires_at = created_at + INTERVAL '30 minutes'
    WHERE expires_at IS NULL;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // ============================================================================
  // ROLLBACK SCRIPT - Reverse all changes in opposite order
  // ============================================================================

  // Drop helper functions
  pgm.dropFunction('board_has_lock_gating', [{ name: 'board_id', type: 'INTEGER' }]);
  pgm.dropFunction('get_board_lock_ids', [{ name: 'board_id', type: 'INTEGER' }]);

  // Restore original lock_stats view
  pgm.dropView('lock_stats');
  pgm.createView('lock_stats', {}, `
    SELECT l.id,
      l.name,
      l.community_id,
      l.creator_user_id,
      l.is_template,
      l.is_public,
      l.usage_count,
      l.success_rate,
      l.avg_verification_time,
      count(p.id) AS posts_using_lock,
      l.created_at,
      l.updated_at
    FROM (locks l
      LEFT JOIN posts p ON ((p.lock_id = l.id)))
    GROUP BY l.id
  `);

  // Remove board-specific indexes
  pgm.dropIndex('pre_verifications', 'pre_verifications_board_id_index');
  pgm.dropIndex('pre_verifications', 'pre_verifications_resource_type_index');
  pgm.dropIndex('pre_verifications', 'pre_verifications_board_user_status_index');
  pgm.dropIndex('pre_verifications', 'pre_verifications_unique_user_board_category');

  // Note: No check constraints to remove since we didn't create any

  // Recreate original unique constraint
  pgm.addConstraint('pre_verifications', 'pre_verifications_unique_user_post_category', {
    unique: ['user_id', 'post_id', 'category_type']
  });

  // Make post_id NOT NULL again (after ensuring no board records exist)
  pgm.sql(`DELETE FROM pre_verifications WHERE resource_type = 'board';`);
  pgm.alterColumn('pre_verifications', 'post_id', {
    notNull: true
  });

  // Remove new columns
  pgm.dropColumn('pre_verifications', 'board_id');
  pgm.dropColumn('pre_verifications', 'resource_type');
}
