import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration UP] Creating enriched_posts view for optimized JOIN patterns');
  
  // Create enriched_posts view to eliminate repeated complex JOINs
  // This view combines the most common JOIN pattern: posts + users + boards + communities
  pgm.sql(`
    CREATE VIEW enriched_posts AS
    SELECT 
      -- Post columns
      p.id, 
      p.author_user_id, 
      p.title, 
      p.content, 
      p.tags, 
      p.settings, 
      p.lock_id,
      p.upvote_count, 
      p.comment_count, 
      p.created_at, 
      p.updated_at,
      
      -- User columns
      u.name AS author_name, 
      u.profile_picture_url AS author_profile_picture_url,
      
      -- Board columns
      b.id AS board_id, 
      b.name AS board_name,
      b.description AS board_description,
      b.settings AS board_settings,
      b.community_id,
      
      -- Community columns
      c.name AS community_name,
      c.community_short_id,
      c.plugin_id,
      c.logo_url AS community_logo_url,
      c.settings AS community_settings,
      
      -- Derived fields for common use cases
      CASE WHEN p.lock_id IS NOT NULL THEN true ELSE false END as has_lock,
      CASE WHEN p.tags IS NOT NULL AND array_length(p.tags, 1) > 0 THEN true ELSE false END as has_tags,
      
      -- Share analytics (pre-joined for performance)
      COALESCE(share_stats.total_access_count, 0) as share_access_count,
      COALESCE(share_stats.share_count, 0) as share_count,
      share_stats.last_shared_at,
      share_stats.most_recent_access_at
      
    FROM posts p
    JOIN users u ON p.author_user_id = u.user_id
    JOIN boards b ON p.board_id = b.id
    JOIN communities c ON b.community_id = c.id
    LEFT JOIN (
      SELECT 
        post_id,
        SUM(access_count) as total_access_count,
        COUNT(*) as share_count,
        MAX(created_at) as last_shared_at,
        MAX(last_accessed_at) as most_recent_access_at
      FROM links 
      WHERE expires_at IS NULL OR expires_at > NOW()
      GROUP BY post_id
    ) share_stats ON p.id = share_stats.post_id;
  `);
  
  // Add indexes on the underlying tables that will benefit the view queries
  pgm.sql(`
    -- Index for post author + board filtering (common in user activity queries)
    CREATE INDEX IF NOT EXISTS idx_posts_author_board_created 
    ON posts (author_user_id, board_id, created_at DESC);
  `);
  
  pgm.sql(`
    -- Index for board + community filtering (common in post lists)
    CREATE INDEX IF NOT EXISTS idx_boards_community_posts 
    ON boards (community_id, id) 
    INCLUDE (name, settings);
  `);
  
  console.log('[Migration UP] ✅ Created enriched_posts view and supporting indexes');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration DOWN] Removing enriched_posts view and indexes');
  
  // Remove the view
  pgm.sql('DROP VIEW IF EXISTS enriched_posts;');
  
  // Remove the supporting indexes
  pgm.sql('DROP INDEX IF EXISTS idx_posts_author_board_created;');
  pgm.sql('DROP INDEX IF EXISTS idx_boards_community_posts;');
  
  console.log('[Migration DOWN] ✅ Removed enriched_posts view and supporting indexes');
}