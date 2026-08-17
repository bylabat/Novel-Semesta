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

export function NovelCard({ novel, rank, className }: NovelCardProps) {
  return (
    <Link
      to={`/novel/${novel.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1',
        className
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={novel.cover}
          alt={novel.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

        {rank !== undefined && (
          <div className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/90 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
            {rank}
          </div>
        )}

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          {novel.isNew && (
            <Badge className="bg-success text-white shadow-md">Baru</Badge>
          )}
          {novel.isHot && (
            <Badge className="bg-destructive text-white shadow-md">
              <Flame size={10} className="mr-1" />
              Hot
            </Badge>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {novel.title}
        </h3>
        <p className="text-xs text-muted-foreground">{novel.author}</p>
        <div className="flex flex-wrap gap-1">
          {novel.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {genre}
            </span>
          ))}
        </div>
        <Rating value={novel.rating} count={novel.ratingCount} size="sm" className="mt-auto pt-1" />
      </div>
    </Link>
  );
}
