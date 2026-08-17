import { Flame } from 'lucide-react';
import { popularNovels } from '@/data/novels';
import { NovelCard } from '@/components/NovelCard';

export default function PopularPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Flame className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Novel Populer</h1>
          <p className="text-sm text-muted-foreground">Novel yang paling banyak dibaca minggu ini</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {popularNovels.map((novel, i) => (
          <NovelCard key={novel.id} novel={novel} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
