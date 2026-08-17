import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function NovelCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', className)}>
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function NovelGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <NovelCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GenreGridSkeleton({ count = 12, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
