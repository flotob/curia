-- Index Usage Analysis Queries
-- Run these queries to identify unused indexes that can be safely removed

-- Query 1: Find indexes with zero scans (never used)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;

-- Query 2: Find indexes with very low usage relative to table scans
WITH table_scans AS (
    SELECT 
        schemaname,
        tablename,
        seq_scan + idx_scan as total_scans,
        seq_scan,
        idx_scan
    FROM pg_stat_user_tables
),
index_usage AS (
    SELECT 
        psi.schemaname,
        psi.tablename,
        psi.indexname,
        psi.idx_scan,
        ts.total_scans,
        CASE 
            WHEN ts.total_scans > 0 THEN 
                ROUND((psi.idx_scan::numeric / ts.total_scans::numeric) * 100, 2)
            ELSE 0 
        END as usage_percentage
    FROM pg_stat_user_indexes psi
    JOIN table_scans ts ON psi.schemaname = ts.schemaname AND psi.tablename = ts.tablename
)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    total_scans,
    usage_percentage
FROM index_usage
WHERE total_scans > 100  -- Only consider tables with significant activity
    AND usage_percentage < 5  -- Less than 5% usage
ORDER BY usage_percentage ASC, total_scans DESC;

-- Query 3: Index size analysis to identify large unused indexes
SELECT 
    psi.schemaname,
    psi.tablename,
    psi.indexname,
    psi.idx_scan,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as index_size,
    pg_relation_size(psi.indexrelid) as index_size_bytes
FROM pg_stat_user_indexes psi
WHERE psi.idx_scan < 10  -- Very low usage
ORDER BY pg_relation_size(psi.indexrelid) DESC;

-- Query 4: Duplicate indexes analysis
SELECT 
    t.relname as table_name,
    array_agg(i.relname) as index_names,
    pg_get_indexdef(idx1.indexrelid) as index_definition,
    count(*) as duplicate_count
FROM pg_index idx1
JOIN pg_class i ON i.oid = idx1.indexrelid
JOIN pg_class t ON t.oid = idx1.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
    AND idx1.indisprimary = false  -- Exclude primary keys
    AND idx1.indisunique = false   -- Exclude unique constraints
GROUP BY t.relname, pg_get_indexdef(idx1.indexrelid)
HAVING count(*) > 1
ORDER BY duplicate_count DESC;

-- Query 5: Specific analysis for potentially unused indexes in our schema
-- Based on the database schema analysis
SELECT 
    'Check if posts_board_id_idx is being used for board-specific queries' as recommendation,
    psi.idx_scan,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as size
FROM pg_stat_user_indexes psi 
WHERE psi.indexname = 'posts_board_id_idx'

UNION ALL

SELECT 
    'Check if comments_post_id_idx usage vs posts_id access patterns' as recommendation,
    psi.idx_scan,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as size
FROM pg_stat_user_indexes psi 
WHERE psi.indexname = 'comments_post_id_idx'

UNION ALL

SELECT 
    'Check if votes table indexes are used (votes_post_id_idx, votes_user_id_idx)' as recommendation,
    psi.idx_scan,
    pg_size_pretty(pg_relation_size(psi.indexrelid)) as size
FROM pg_stat_user_indexes psi 
WHERE psi.indexname LIKE 'votes_%_idx';

-- Query 6: Reset statistics (run this to start fresh monitoring)
-- SELECT pg_stat_reset();