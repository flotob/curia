import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Creating lock_stats view...');

  // Create view for lock statistics
  pgm.createView('lock_stats', {}, `
    SELECT 
      l.id,
      l.name,
      l.community_id,
      COUNT(p.id) as posts_using_lock,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as posts_last_30_days,
      COUNT(CASE WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_last_7_days,
      CASE 
        WHEN COUNT(p.id) = 0 THEN 0
        ELSE ROUND(COUNT(p.id)::numeric / NULLIF(l.usage_count, 0), 2)
      END as utilization_rate,
      MAX(p.created_at) as last_used_at,
      l.created_at as lock_created_at,
      l.updated_at as lock_updated_at
    FROM locks l
    LEFT JOIN posts p ON l.id = p.lock_id
    GROUP BY l.id, l.name, l.community_id, l.usage_count, l.created_at, l.updated_at
  `);

  console.log('[Migration] Successfully created lock_stats view');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  console.log('[Migration] Dropping lock_stats view...');

  pgm.dropView('lock_stats');

  console.log('[Migration] Successfully dropped lock_stats view');
}
