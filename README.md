<p align="center">
  <img src="public/logo.png" alt="TCodeAI Logo" width="120" height="120" />
</p>

<h1 align="center">TCodeAI</h1>

<p align="center">
  <strong>SAP Transaction Code Intelligence Engine</strong><br />
  Stop Googling T-codes. Describe what you want in plain English.
</p>

<p align="center">
  <a href="https://github.com/aiadiguru2025/tcodeai/actions/workflows/ci.yml"><img src="https://github.com/aiadiguru2025/tcodeai/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/aiadiguru2025/tcodeai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aiadiguru2025/tcodeai" alt="License" /></a>
  <a href="https://github.com/aiadiguru2025/tcodeai/releases"><img src="https://img.shields.io/github/v/release/aiadiguru2025/tcodeai?include_prereleases" alt="Release" /></a>
  <a href="https://github.com/aiadiguru2025/tcodeai/stargazers"><img src="https://img.shields.io/github/stars/aiadiguru2025/tcodeai" alt="Stars" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#api-reference">API Reference</a> &middot;
  <a href="#contributing">Contributing</a> &middot;
  <a href="#license">License</a>
</p>

---

## What is TCodeAI?

TCodeAI is a natural language search engine for **134,000+ SAP transaction codes**. It combines traditional text search with AI-powered semantic search to help SAP consultants, developers, and administrators find the right T-code instantly.

**Example:** Search `"create a purchase order"` and get `ME21N` with a 95% confidence score.

### Why TCodeAI?

| Problem | TCodeAI Solution |
|---------|-----------------|
| Googling SAP T-codes returns SEO-spam results | Purpose-built search engine with 134K+ verified T-codes |
| Can't remember if it's ME21 or ME21N | Shows variants, alternatives, and relationships |
| New to a module? No idea where to start | Browse by module (MM, SD, FI, CO, PP, HR, etc.) |
| T-code lists are static spreadsheets | AI-powered semantic search understands intent |

## Features

- **Natural Language Search** -- Query `"post goods receipt"` instead of memorizing `MIGO`
- **Hybrid Search Engine** -- Exact match + fuzzy + full-text + semantic (AI) search
- **134K+ Transaction Codes** -- Comprehensive coverage across all SAP modules
- **SAP Fiori Integration** -- Maps T-codes to their Fiori app equivalents
- **Related Codes** -- Discover variants and alternatives (ME21 -> ME21N, VA01/VA02/VA03)
- **Module Browser** -- Browse T-codes by SAP module with descriptions
- **Bookmarks** -- Save frequently used T-codes (stored locally)
- **Dark Mode** -- Toggle between light and dark themes
- **Keyboard Navigation** -- Press `/` to focus search, arrow keys to navigate
- **Sub-second Search** -- Optimized with HNSW vector indexes and PostgreSQL full-text search

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) with [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector), [pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **AI/Embeddings** | [OpenAI text-embedding-3-small](https://platform.openai.com/docs/guides/embeddings) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| **Caching** | [Upstash Redis](https://upstash.com/) (optional, falls back to in-memory LRU) |
| **Testing** | [Playwright](https://playwright.dev/) E2E |
| **Hosting** | [Vercel](https://vercel.com/) |
| **Database Hosting** | [Supabase](https://supabase.com/) |

## Quick Start

### Prerequisites

- **Node.js** >= 18.17
- **PostgreSQL** with `pgvector` and `pg_trgm` extensions (recommended: [Supabase](https://supabase.com/))
- **OpenAI API key** (for semantic search; the app works without it using text-only search)

### Installation

```bash
# Clone the repository
git clone https://github.com/aiadiguru2025/tcodeai.git
cd tcodeai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
OPENAI_API_KEY="sk-..."
```

### Database Setup

```bash
# Push schema to database
npm run db:push

# Seed T-codes from CSV (~134K records)
npm run db:seed

# Detect relationships between T-codes
npx tsx scripts/detect-relationships.ts

# Generate AI embeddings (optional, requires OPENAI_API_KEY)
npx tsx scripts/generate-embeddings.ts

# Import Fiori app mappings (optional)
npm run db:import-fiori
```

### Run

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying files |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Import T-codes from CSV |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:import-fiori` | Import SAP Fiori app mappings |
| `npm test` | Run Playwright E2E tests |
| `npm run test:ui` | Run Playwright with interactive UI |

## API Reference

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/search/query` | Hybrid search (exact + fuzzy + semantic) |
| `GET` | `/api/v1/search/query?q=` | Hybrid search via query parameter |
| `POST` | `/api/v1/search/ai` | AI-powered search with explanations |
| `GET` | `/api/v1/search/autocomplete?q=` | Autocomplete suggestions |

### Fiori Apps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/fiori/search` | Search Fiori apps |
| `GET` | `/api/v1/fiori/apps` | List Fiori apps (paginated) |
| `GET` | `/api/v1/fiori/apps/:appId` | Get Fiori app details |
| `GET` | `/api/v1/fiori/by-tcode/:tcode` | Get Fiori apps for a T-code |

### Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/feedback` | Submit upvote/downvote on a T-code result |

### Example

```bash
curl -X POST https://your-domain.com/api/v1/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "create purchase order", "limit": 5}'
```

```json
{
  "results": [
    {
      "tcode": "ME21N",
      "description": "Create Purchase Order",
      "module": "MM",
      "relevanceScore": 0.95,
      "matchType": "semantic"
    }
  ],
  "metadata": {
    "totalResults": 5,
    "searchMode": "hybrid",
    "processingTimeMs": 234
  }
}
```

## Project Structure

```
tcodeai/
├── .github/                    # GitHub config (CI, templates, CODEOWNERS)
│   ├── workflows/ci.yml        # CI pipeline (lint, type-check, build, test)
│   ├── ISSUE_TEMPLATE/          # Bug report & feature request templates
│   └── PULL_REQUEST_TEMPLATE.md
├── e2e/                         # Playwright E2E tests
├── prisma/
│   ├── schema.prisma            # Database schema (8 models, pgvector)
│   └── migrations/              # SQL migrations
├── public/                      # Static assets
├── scripts/                     # Data processing & seeding scripts
│   ├── seed-tcodes.ts           # Import T-codes from CSV
│   ├── generate-embeddings.ts   # Generate OpenAI embeddings
│   ├── detect-relationships.ts  # Detect T-code relationships
│   └── import-fiori-apps.ts     # Import Fiori app mappings
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/v1/              # REST API routes
│   │   ├── search/              # Search results page
│   │   ├── tcode/[code]/        # T-code detail page
│   │   ├── modules/             # Module browser
│   │   ├── fiori/               # Fiori app pages
│   │   └── bookmarks/           # Bookmarks page
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── search/              # Search-specific components
│   │   └── layout/              # Layout components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Core logic
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── cache.ts             # Redis + in-memory LRU cache
│   │   └── search/              # Search engine (hybrid, semantic, AI)
│   └── types/                   # TypeScript type definitions
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE                      # MIT License
├── SECURITY.md
└── package.json
```

## Database Schema

```
transaction_codes          134K+ SAP T-codes with embeddings & metadata
tcode_relationships        Links between T-codes (variants, alternatives)
sap_modules                SAP module reference (MM, SD, FI, CO, PP, HR...)
fiori_apps                 15K+ Fiori app definitions with embeddings
fiori_tcode_mappings       Maps Fiori apps to T-codes
search_logs                Search analytics
feedback                   User upvotes/downvotes
molga                      Country/org unit reference data
```

## Performance

Search is optimized with multiple database index strategies:

- **HNSW vector indexes** for approximate nearest neighbor search on embeddings
- **GIN trigram indexes** for fast `LIKE '%word%'` pattern matching
- **tsvector full-text search** with weighted ranking (tcode > description > enriched)
- **Composite indexes** for common filter patterns (module + deprecated status)
- **In-memory LRU + Redis caching** with configurable TTL

Typical response times: **2-5s** (first query), **< 500ms** (cached).

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Set environment variables in Vercel dashboard
4. Deploy

The project includes a `vercel.json` with optimized settings (60s API timeout, cache headers, IAD1 region).

### Self-Hosted

```bash
npm run build
npm start
```

Requires `DATABASE_URL` and optionally `OPENAI_API_KEY` as environment variables.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

**Quick overview:**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Run `npm run lint && npm run build`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Community

- [GitHub Issues](https://github.com/aiadiguru2025/tcodeai/issues) -- Bug reports & feature requests
- [GitHub Discussions](https://github.com/aiadiguru2025/tcodeai/discussions) -- Questions & ideas

## Security

Found a security vulnerability? Please report it responsibly. See [SECURITY.md](SECURITY.md) for details.

## License

This project is licensed under the **MIT License** -- see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- SAP T-code data sourced from the TSTC table
- Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Prisma](https://www.prisma.io/)
- AI-powered by [OpenAI](https://openai.com/)
- Database hosted on [Supabase](https://supabase.com/) with [pgvector](https://github.com/pgvector/pgvector)
- Deployed on [Vercel](https://vercel.com/)

---

<p align="center">
  Made with care for the SAP community
</p>
