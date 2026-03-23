# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.0] - 2026-03-22

### Changed
- Optimized search from 30s+ to 2-5s with HNSW vector indexes and full-text search
- Replaced `LIKE '%word%'` queries with PostgreSQL tsvector/tsquery full-text search
- Parallelized feedback cache lookups (was sequential)
- Shared cached OpenAI embeddings across search modules
- Skipped LLM Judge step for faster response times

### Added
- HNSW vector indexes on `transaction_codes` and `fiori_apps` embedding columns
- GIN trigram indexes on 8 text columns for fast pattern matching
- tsvector search column with auto-update trigger
- Composite and partial indexes for common query patterns

## [1.3.0] - 2026-03-22

### Security
- Fixed SQL injection vulnerability in vector search (embedding validation)
- Added XSS protection with `sanitizeUserText()` on all user inputs
- Added LLM prompt injection hardening with `sanitizeQueryForLLM()`
- Removed `unsafe-eval` from Content Security Policy
- Sanitized error logging to prevent information leakage
- Added strict T-code validation with regex and max length
- Patched critical and high severity npm audit findings

## [1.2.0] - 2026-03-22

### Changed
- Migrated database from Neon PostgreSQL to Supabase PostgreSQL
- Configured Supabase Supavisor connection pooler (port 6543)
- Added `directUrl` to Prisma schema for migration support

### Added
- Health check endpoint for deployment verification

## [1.1.0] - 2026-03-15

### Added
- Unified smart search input with auto-detection (T-code vs natural language)
- Search animations with shimmer, stagger, and AI thinking states
- Help and About pages with navigation links
- Site footer with branding
- Error boundaries and ARIA accessibility improvements
- Skip navigation link for keyboard users
- 44px minimum touch targets on all interactive elements
- Vercel Speed Insights for Core Web Vitals monitoring

### Changed
- Search functions called directly instead of self-fetching via HTTP
- Modernized search UX with smooth animations

## [1.0.0] - 2026-03-01

### Added
- Natural language search for 134K+ SAP transaction codes
- Hybrid search engine (exact match + fuzzy + full-text + semantic)
- AI-powered search with GPT explanations and confidence scores
- SAP Fiori Reference Library integration (15K+ apps)
- Module browser for browsing T-codes by SAP module
- T-code detail pages with related codes and Fiori app mappings
- Autocomplete suggestions with debounced input
- Bookmarks (local storage)
- Dark mode toggle
- Keyboard navigation (`/` to focus, arrows to navigate)
- User feedback system (upvotes/downvotes)
- Feedback-based ranking boost
- MOLGA country detection for country-specific T-code ranking
- Query expansion with SAP-specific synonyms
- Enhanced fallback for low-confidence searches
- Redis caching with in-memory LRU fallback
- Playwright E2E test suite
- Vercel deployment with security headers (CSP, HSTS, X-Frame-Options)

[Unreleased]: https://github.com/aiadiguru2025/tcodeai/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/aiadiguru2025/tcodeai/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/aiadiguru2025/tcodeai/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/aiadiguru2025/tcodeai/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/aiadiguru2025/tcodeai/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/aiadiguru2025/tcodeai/releases/tag/v1.0.0
