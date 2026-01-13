# TCodeAI - SAP Transaction Code Intelligence

A natural language search engine for SAP transaction codes. Stop Googling T-codes or asking colleagues - just describe what you want to do in plain English.

## Features

- **Natural Language Search**: Query using plain English like "create a purchase order" to find ME21N
- **Hybrid Search**: Combines exact match, fuzzy search, full-text search, and semantic (AI) search
- **134K+ T-Codes**: Comprehensive database covering all SAP modules
- **Related Codes**: Discover variants and alternatives (ME21 -> ME21N, VA01/VA02/VA03)
- **Module Browser**: Browse T-codes by SAP module (MM, SD, FI, CO, PP, HR, etc.)
- **Bookmarks**: Save your frequently used T-codes (stored locally)
- **Dark Mode**: Toggle between light and dark themes
- **Keyboard Navigation**: Press `/` to focus search, arrow keys to navigate suggestions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with pgvector (vector similarity search)
- **AI**: OpenAI text-embedding-3-small for semantic search
- **ORM**: Prisma
- **Testing**: Playwright E2E tests

## Getting Started

### Prerequisites

- Node.js 18.17+
- PostgreSQL database with pgvector extension (recommended: [Neon](https://neon.tech))
- OpenAI API key (for semantic search)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tcodeai.git
cd tcodeai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
OPENAI_API_KEY="sk-..."
```

4. Set up the database:
```bash
# Push schema to database
npm run db:push

# Seed T-codes from CSV
npm run db:seed

# Detect relationships between T-codes
npx tsx scripts/detect-relationships.ts

# Generate embeddings (optional, for semantic search)
npx tsx scripts/generate-embeddings.ts
```

5. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Import T-codes from CSV |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run Playwright E2E tests |

## API Endpoints

### Search
- `POST /api/v1/search/query` - Natural language search
- `GET /api/v1/search/autocomplete?q=` - Autocomplete suggestions

### T-Codes
- `GET /tcode/[code]` - T-code detail page

### Feedback
- `POST /api/v1/feedback` - Submit feedback (upvote/downvote)

## Search Request Example

```bash
curl -X POST http://localhost:3000/api/v1/search/query \
  -H "Content-Type: application/json" \
  -d '{"query": "create purchase order"}'
```

Response:
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
    "totalResults": 15,
    "searchMode": "hybrid",
    "processingTimeMs": 234
  }
}
```

## Project Structure

```
tcodeai/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/v1/         # API routes
│   │   ├── search/         # Search results page
│   │   ├── tcode/[code]/   # T-code detail page
│   │   ├── modules/        # Module browser
│   │   └── bookmarks/      # Bookmarks page
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── search/         # Search components
│   │   ├── layout/         # Layout components
│   │   └── bookmarks/      # Bookmark components
│   ├── lib/                 # Utilities
│   │   ├── db.ts           # Prisma client
│   │   └── search/         # Search logic
│   └── types/              # TypeScript types
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/                 # Data processing scripts
├── e2e/                     # Playwright tests
└── public/                  # Static assets
```

## Database Schema

The main tables:

- `transaction_codes` - 134K+ SAP T-codes with descriptions, modules, embeddings
- `tcode_relationships` - Relationships between T-codes (variants, alternatives)
- `feedback` - User feedback (upvotes/downvotes)
- `sap_modules` - SAP module reference data

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- SAP T-code data from TSTC table
- Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/)
