import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { popularNovels, latestNovels } from '@/data/novels';
import { NovelCard } from '@/components/NovelCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

const allNovels = [...popularNovels, ...latestNovels];
const statusFilters = ['Semua', 'Ongoing', 'Completed', 'Hiatus'] as const;

export default function NovelPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(query);
  const [status, setStatus] = useState<(typeof statusFilters)[number]>('Semua');

  const filtered = allNovels.filter((n) => {
    const matchSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.author.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'Semua' || n.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Jelajahi Novel</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar
              placeholder="Cari novel atau author..."
              onSubmit={setSearch}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <SlidersHorizontal size={16} className="shrink-0 text-muted-foreground" />
            {statusFilters.map((s) => (
              <Button
                key={s}
                variant={status === s ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={() => setStatus(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Menampilkan {filtered.length} novel
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Tidak ada novel ditemukan"
          description="Coba kata kunci lain atau ubah filter status."
        />
      )}
    </div>
  );
}
