import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { NovelCard } from '@/components/NovelCard';
import { SectionHeader } from '@/components/SectionHeader';

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  views: number | null;
}

export function PopularNovels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPopularNovels() {
      setLoading(true);

      const { data, error } = await supabase
        .from('novels')
        .select(
          `
            id,
            title,
            cover,
            status,
            views
          `,
        )
        .eq('visibility', 'public')
        .order('views', {
          ascending: false,
        })
        .limit(8);

      if (cancelled) return;

      if (error) {
        console.error(
          'Gagal mengambil novel populer:',
          error,
        );

        setNovels([]);
      } else {
        setNovels(
          (data ?? []) as Novel[],
        );
      }

      setLoading(false);
    }

    loadPopularNovels();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Novel Populer"
        subtitle="Novel yang paling banyak dibaca"
        link="/populer"
      />

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              size={20}
              className="animate-spin text-primary"
            />
            Memuat novel...
          </div>
        </div>
      ) : novels.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">
            Belum ada novel
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada novel publik yang tersedia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8">
          {novels.map((novel, index) => (
            <NovelCard
              key={novel.id}
              rank={index + 1}
              novel={{
                id: novel.id,
                title: novel.title,
                author: 'Author',
                cover:
                  novel.cover ||
                  '/placeholder.svg',
                genres: [],
                rating: 0,
                ratingCount: 0,
                views: String(
                  novel.views ?? 0,
                ),
                status:
                  novel.status === 'completed'
                    ? 'Completed'
                    : novel.status === 'hiatus'
                      ? 'Hiatus'
                      : 'Ongoing',
                chapterCount: 0,
                latestChapter: '',
                description: '',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}