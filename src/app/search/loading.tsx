import { Header } from '@/components/layout/Header';
import { SearchResultsSkeleton } from '@/components/search/SearchResultsSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <Skeleton className="h-14 w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <SearchResultsSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
}
