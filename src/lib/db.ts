import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Serverless-optimized connection pool settings:
// - Supabase free tier allows 60 connections; PgBouncer pools them
// - Vercel spins up many serverless instances, each with its own pool
// - Keep pool small (5) to avoid exhausting Supabase connections
// - Short idle timeout (10s) to release connections quickly between requests
const DATABASE_URL = process.env.DATABASE_URL
  ? appendPoolParams(process.env.DATABASE_URL)
  : undefined;

function appendPoolParams(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  // connection_limit: max connections per Prisma instance (keep low for serverless)
  // pool_timeout: how long to wait for a connection from the pool (seconds)
  if (url.includes('connection_limit') || url.includes('pool_timeout')) {
    return url; // Already configured, don't override
  }
  return `${url}${separator}connection_limit=5&pool_timeout=10`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: DATABASE_URL,
  });

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
