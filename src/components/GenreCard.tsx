import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Genre } from '@/types';
import { cn } from '@/lib/utils';

interface GenreCardProps {
  genre: Genre & {
    slug?: string | null;
  };
  className?: string;
}

export function GenreCard({
  genre,
  className,
}: GenreCardProps) {
  const Icon =
    (Icons as unknown as Record<string, LucideIcon>)[
      genre.icon
    ] ?? Icons.BookOpen;

  return (
    <Link
      to={`/genre/${genre.slug || genre.id}`}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-5 text-center transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          genre.color
        )}
      />

      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
        <Icon
          className="text-primary transition-colors"
          size={26}
        />
      </div>

      <div className="relative">
        <h3 className="font-display text-sm font-semibold text-foreground">
          {genre.name}
        </h3>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {genre.count.toLocaleString('id-ID')} novel
        </p>
      </div>
    </Link>
  );
}