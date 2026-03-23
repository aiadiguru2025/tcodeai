-- Performance indexes for search optimization
-- Run in Supabase SQL Editor (compatible - no CONCURRENTLY)

-- 1. HNSW vector indexes for fast semantic search (biggest performance win)
-- These replace full table scans with approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_transaction_codes_embedding_hnsw
  ON transaction_codes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_fiori_apps_embedding_hnsw
  ON fiori_apps
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 2. GIN trigram indexes for fast LIKE '%word%' queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tc_description_trgm
  ON transaction_codes USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tc_description_enriched_trgm
  ON transaction_codes USING gin (description_enriched gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tc_package_desc_trgm
  ON transaction_codes USING gin (package_desc gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tc_sub_module_trgm
  ON transaction_codes USING gin (sub_module gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fiori_app_name_trgm
  ON fiori_apps USING gin (app_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fiori_app_component_desc_trgm
  ON fiori_apps USING gin (app_component_desc gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fiori_app_launcher_title_trgm
  ON fiori_apps USING gin (app_launcher_title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fiori_business_catalog_trgm
  ON fiori_apps USING gin (business_catalog_title gin_trgm_ops);

-- 3. GIN full-text search index for transaction_codes
-- Pre-computed tsvector column for faster full-text search
ALTER TABLE transaction_codes
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE transaction_codes SET search_vector =
  setweight(to_tsvector('english', coalesce(tcode, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description_enriched, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(sub_module, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(package_desc, '')), 'D');

CREATE INDEX IF NOT EXISTS idx_tc_search_vector
  ON transaction_codes USING gin (search_vector);

-- 4. Create trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_tc_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.tcode, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description_enriched, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.sub_module, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.package_desc, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tc_search_vector ON transaction_codes;
CREATE TRIGGER trg_tc_search_vector
  BEFORE INSERT OR UPDATE OF tcode, description, description_enriched, sub_module, package_desc
  ON transaction_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_tc_search_vector();

-- 5. Composite index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_tc_module_deprecated
  ON transaction_codes (module, is_deprecated);

-- 6. Partial index for non-deprecated codes (most queries filter these)
CREATE INDEX IF NOT EXISTS idx_tc_tcode_not_deprecated
  ON transaction_codes (tcode) WHERE is_deprecated = false;

-- 7. Index on fiori_apps for tech filtering
CREATE INDEX IF NOT EXISTS idx_fiori_ui_tech
  ON fiori_apps (ui_technology);

-- 8. Analyze tables to update query planner statistics
ANALYZE transaction_codes;
ANALYZE fiori_apps;
ANALYZE fiori_tcode_mappings;
