-- Schema improvements: covering indexes, expression indexes, table tuning
-- Run in Supabase SQL Editor

-- 1. Covering index for module pagination queries
-- Supports: WHERE module = X AND is_deprecated = false ORDER BY tcode
-- Eliminates sort + heap lookup for the most common browse pattern
CREATE INDEX IF NOT EXISTS idx_tc_module_deprecated_tcode
  ON transaction_codes (module, is_deprecated, tcode)
  WHERE is_deprecated = false;

-- 2. Expression index for case-insensitive tcode lookups (autocomplete, exact search)
-- Avoids full table scan when using mode: 'insensitive' in Prisma
CREATE INDEX IF NOT EXISTS idx_tc_tcode_lower
  ON transaction_codes (LOWER(tcode));

-- 3. Composite index on feedback for groupBy queries
-- Supports: groupBy(['tcodeId']) with _sum and _count aggregations
CREATE INDEX IF NOT EXISTS idx_feedback_tcode_vote
  ON feedback (tcode_id, vote);

-- 4. Index for tcode_relationships lookups (source -> targets)
-- Used when fetching related T-codes on detail pages
CREATE INDEX IF NOT EXISTS idx_tcode_rel_source
  ON tcode_relationships (source_tcode_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_tcode_rel_target
  ON tcode_relationships (target_tcode_id, relationship_type);

-- 5. Partial index for fiori_tcode_mappings by tcode_id (non-null only)
-- Most queries filter on tcode_id which is nullable
CREATE INDEX IF NOT EXISTS idx_fiori_mapping_tcode
  ON fiori_tcode_mappings (tcode_id)
  WHERE tcode_id IS NOT NULL;

-- 6. Index for search_logs analytics queries (query + timestamp)
CREATE INDEX IF NOT EXISTS idx_search_logs_query_created
  ON search_logs (created_at DESC, query);

-- 7. Set fillfactor for write-heavy tables (feedback, search_logs)
-- Lower fillfactor leaves room for HOT updates, reducing index bloat
ALTER TABLE feedback SET (fillfactor = 90);
ALTER TABLE search_logs SET (fillfactor = 85);

-- 8. Update statistics for query planner
ANALYZE transaction_codes;
ANALYZE feedback;
ANALYZE tcode_relationships;
ANALYZE fiori_tcode_mappings;
ANALYZE search_logs;
