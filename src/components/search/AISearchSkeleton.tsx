import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function AISearchSkeleton() {
  return (
    <div className="space-y-4">
      {/* AI thinking indicator */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-[scale-in_0.3s_ease-out]" />
              <Sparkles className="relative h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Searching with AI</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Analyzing your query</span>
                <span className="flex gap-0.5 ml-0.5">
                  <span className="h-1 w-1 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0s' }} />
                  <span className="h-1 w-1 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="h-1 w-1 rounded-full bg-primary animate-thinking-dot" style={{ animationDelay: '0.4s' }} />
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shimmer result cards */}
      <Card className="border-primary/10">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <div className="ml-auto">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border p-4 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.15 + i * 0.1}s` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-5 w-10 rounded-full" />
                      {i === 0 && <Skeleton className="h-5 w-20 rounded-full" />}
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <div className="rounded-md bg-muted/30 p-2">
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-4 flex-shrink-0 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-4 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
