import { Trophy, TrendingUp, Eye, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { popularNovels } from '@/data/novels';
import { Rating } from '@/components/Rating';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const rankColors = ['from-amber-400 to-yellow-600', 'from-slate-300 to-slate-500', 'from-orange-400 to-amber-700'];

export default function RankingPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Trophy className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Ranking Novel</h1>
          <p className="text-sm text-muted-foreground">Peringkat novel berdasarkan popularitas minggu ini</p>
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {popularNovels.slice(0, 3).map((novel, i) => (
          <Link
            key={novel.id}
            to={`/novel/${novel.id}`}
            className={cn(
              'group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10',
              i === 0 && 'sm:order-2 sm:scale-105'
            )}
          >
            <div className={cn('absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-20 blur-xl', rankColors[i])} />
            <div className="flex items-center gap-4">
              <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-lg', rankColors[i])}>
                {i + 1}
              </div>
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
                <img src={novel.cover} alt={novel.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="line-clamp-1 font-display font-semibold text-foreground group-hover:text-primary">{novel.title}</h3>
                <p className="text-xs text-muted-foreground">{novel.author}</p>
                <Rating value={novel.rating} size="sm" showCount={false} className="mt-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Full ranking list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {popularNovels.map((novel, i) => (
          <Link
            key={novel.id}
            to={`/novel/${novel.id}`}
            className={cn(
              'group flex items-center gap-4 border-b border-border p-4 transition-colors last:border-b-0 hover:bg-secondary/30',
            )}
          >
            <span className={cn('w-8 shrink-0 text-center font-display text-lg font-bold', i < 3 ? 'text-primary' : 'text-muted-foreground')}>
              {i + 1}
            </span>
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg">
              <img src={novel.cover} alt={novel.title} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 font-display font-semibold text-foreground group-hover:text-primary">{novel.title}</h3>
              <p className="text-xs text-muted-foreground">{novel.author}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {novel.genres.slice(0, 3).map((g) => (
                  <span key={g} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{g}</span>
                ))}
              </div>
            </div>
            <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5"><Eye size={15} /> {novel.views}</span>
              <span className="flex items-center gap-1.5"><Star size={15} className="fill-amber-400 text-amber-400" /> {novel.rating}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{novel.status}</Badge>
              <TrendingUp size={16} className="text-success" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
