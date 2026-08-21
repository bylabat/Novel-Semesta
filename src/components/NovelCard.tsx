import { Link } from 'react-router-dom';
import { Eye, BookOpen, Flame } from 'lucide-react';

import type { Novel } from '@/types';
import { Rating } from './Rating';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NovelCardProps {
  novel: Novel;
  rank?: number;
  className?: string;
}

export function NovelCard({
  novel,
  rank,
  className,
}: NovelCardProps) {
  return (
    <Link
      to={`/novel/${novel.id}`}
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card',
        'transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
        className,
      )}
    >
      {/* ==========================================
          COVER
      ========================================== */}

      <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-muted">
        <img
          src={novel.cover}
          alt={novel.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* GRADIENT */}

        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {/* RANK */}

        {rank !== undefined && (
          <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/90 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
            {rank}
          </div>
        )}

        {/* BADGES */}

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {novel.isNew && (
            <Badge className="bg-success text-white shadow-md">
              Baru
            </Badge>
          )}

          {novel.isHot && (
            <Badge className="bg-destructive text-white shadow-md">
              <Flame
                size={10}
                className="mr-1"
              />
              Hot
            </Badge>
          )}
        </div>

        {/* VIEWS + CHAPTER */}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {novel.views}
            </span>

            <span className="flex items-center gap-1">
              <BookOpen size={12} />
              {novel.chapterCount}
            </span>
          </div>
        </div>
      </div>

      {/* ==========================================
          CONTENT
      ========================================== */}

      <div className="flex min-h-[150px] flex-1 flex-col p-3 sm:min-h-[156px] lg:min-h-[164px]">
        {/* TITLE */}

        <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
          {novel.title}
        </h3>

        {/* AUTHOR */}

        <p className="mt-1 line-clamp-1 min-h-[1rem] text-xs text-muted-foreground">
          {novel.author}
        </p>

        {/* GENRES */}

        <div className="mt-2 flex min-h-[22px] flex-wrap content-start gap-1 overflow-hidden">
          {novel.genres
            .slice(0, 2)
            .map((genre) => (
              <span
                key={genre}
                className="max-w-full truncate rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {genre}
              </span>
            ))}
        </div>

        {/* RATING */}

        <div className="mt-auto pt-2">
          <Rating
            value={novel.rating}
            count={novel.ratingCount}
            size="sm"
          />
        </div>
      </div>
    </Link>
  );
}