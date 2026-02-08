import { Header } from '@/components/layout/Header';
import { SearchResultsSkeleton } from '@/components/search/SearchResultsSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Search bar skeleton */}
          <div className="space-y-3 opacity-0 animate-fade-in-up">
            <Skeleton className="h-14 w-full rounded-lg" />
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-14 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>

          {/* Results header skeleton */}
          <div
            className="flex items-center gap-2 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Results skeleton */}
          <SearchResultsSkeleton />
        </div>
      </main>
    </div>
  );
}
