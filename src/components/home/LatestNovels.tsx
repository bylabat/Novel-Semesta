import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { popularNovels } from '@/data/novels';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function LatestNovels() {
  return (
    <section className="space-y-5">
      <SectionHeader title="Novel Terbaru" subtitle="Chapter baru yang baru saja diperbarui" link="/terbaru" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {popularNovels.slice(0, 6).map((novel, i) => (
          <Link
            key={novel.id}
            to={`/novel/${novel.id}`}
            className={cn(
              'group flex gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
              i === 0 && 'sm:col-span-2 lg:col-span-1'
            )}
          >
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
              <img
                src={novel.cover}
                alt={novel.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-display text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {novel.title}
                </h3>
                <Badge className="shrink-0 bg-success text-white">Baru</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{novel.author}</p>
              <div className="flex flex-wrap gap-1">
                {novel.genres.slice(0, 3).map((genre) => (
                  <span
                    key={genre}
                    className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={12} />
                <span className="line-clamp-1">{novel.latestChapter}</span>
                <ChevronRight size={14} className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
