# Contributing to TCodeAI

Thank you for your interest in contributing to TCodeAI! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tcodeai.git
   cd tcodeai
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/aiadiguru2025/tcodeai.git
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feature/my-feature
   ```

## Development Setup

### Prerequisites

- Node.js >= 18.17
- PostgreSQL with `pgvector` and `pg_trgm` extensions
- OpenAI API key (optional, for semantic search features)

### Install & Run

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your database credentials

# Push schema to database
npm run db:push

# Seed test data
npm run db:seed

# Start dev server
npm run dev
```

### Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with hot reload |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Auto-fix linting errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying |
| `npm run build` | Production build (catches type errors) |
| `npm test` | Run E2E tests |
| `npm run db:studio` | Open Prisma Studio |

## Making Changes

### Branch Naming

Use descriptive branch names with a prefix:

- `feature/` -- New features (e.g., `feature/fiori-search-filters`)
- `fix/` -- Bug fixes (e.g., `fix/autocomplete-debounce`)
- `docs/` -- Documentation updates (e.g., `docs/api-reference`)
- `refactor/` -- Code refactoring (e.g., `refactor/search-pipeline`)
- `perf/` -- Performance improvements (e.g., `perf/vector-index`)
- `test/` -- Test additions or fixes (e.g., `test/search-e2e`)

### What to Work On

- Check [open issues](https://github.com/aiadiguru2025/tcodeai/issues) for tasks labeled `good first issue` or `help wanted`
- If you want to work on something not listed, open an issue first to discuss the approach

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, CI, or auxiliary tool changes |

### Examples

```
feat(search): add module filter to hybrid search
fix(api): handle empty query parameter in autocomplete
docs: update API reference with Fiori endpoints
perf(db): add HNSW vector index for semantic search
test(e2e): add search flow tests for mobile viewport
```

## Pull Request Process

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure quality** before submitting:
   ```bash
   npm run lint          # No linting errors
   npm run format:check  # Code is formatted
   npm run build         # Build succeeds (catches type errors)
   npm test              # E2E tests pass
   ```

3. **Submit the PR** with:
   - A clear title following commit message conventions
   - Description of **what** changed and **why**
   - Link to related issues (e.g., `Closes #42`)
   - Screenshots for UI changes

4. **Address review feedback** promptly. Push additional commits; do not force-push during review.

5. **Merge** -- A maintainer will merge your PR once approved.

### PR Checklist

- [ ] Code follows the project's style guide
- [ ] Self-review completed
- [ ] Tests added or updated for new functionality
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Documentation updated if needed

## Code Style

### General

- **TypeScript** for all source files (strict mode)
- **Prettier** for formatting (auto-configured via `.prettierrc`)
- **ESLint** for linting (auto-configured via `.eslintrc.json`)
- **100 character** line width
- **Single quotes**, no semicolons trailing

### File Organization

- Components: `src/components/<category>/<ComponentName>.tsx`
- API routes: `src/app/api/v1/<resource>/route.ts`
- Utilities: `src/lib/<module>.ts`
- Types: `src/types/index.ts`
- Hooks: `src/hooks/use-<name>.ts`

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `SearchBar.tsx` |
| Hooks | camelCase with `use` prefix | `useSearchResults.ts` |
| Utilities | camelCase | `formatDate.ts` |
| API routes | kebab-case directories | `api/v1/by-tcode/` |
| Types/Interfaces | PascalCase | `SearchResult` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUERY_LENGTH` |

### Database

- Use Prisma for all database access (no raw SQL unless needed for pgvector/pg_trgm)
- Table names: snake_case plural (`transaction_codes`)
- Column names: snake_case (`app_launcher_title`)
- Always validate user input with Zod before database queries

## Testing

### E2E Tests (Playwright)

Tests live in `e2e/` and run against a local dev server:

```bash
# Run all tests
npm test

# Run with interactive UI
npm run test:ui

# Run a specific test file
npx playwright test e2e/search.spec.ts
```

### Writing Tests

- Test user-visible behavior, not implementation details
- Cover happy paths and error states
- Test both desktop and mobile viewports
- Use descriptive test names: `"should show autocomplete suggestions when typing"`

## Reporting Bugs

Use the [Bug Report template](https://github.com/aiadiguru2025/tcodeai/issues/new?template=bug_report.yml) and include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/OS information
5. Screenshots if applicable

## Requesting Features

Use the [Feature Request template](https://github.com/aiadiguru2025/tcodeai/issues/new?template=feature_request.yml) and include:

1. Problem statement (what's missing or hard to do)
2. Proposed solution
3. Alternatives considered

---

Thank you for contributing!
