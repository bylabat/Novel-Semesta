import { popularNovels } from '@/data/novels';
import { NovelCard } from '@/components/NovelCard';
import { SectionHeader } from '@/components/SectionHeader';

export function PopularNovels() {
  return (
    <section className="space-y-5">
      <SectionHeader title="Novel Populer" subtitle="Novel yang paling banyak dibaca minggu ini" link="/populer" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8">
        {popularNovels.map((novel, i) => (
          <NovelCard key={novel.id} novel={novel} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}
