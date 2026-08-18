import { useEffect, useState } from 'react';
import { Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { SectionHeader } from '@/components/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  updated_at: string;
}

export function LatestNovels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestNovels() {
      setLoading(true);

      const { data, error } = await supabase
        .from('novels')
        .select(
          `
            id,
            title,
            cover,
            status,
            updated_at
          `,
        )
        .eq('visibility', 'public')
        .order('updated_at', {
          ascending: false,
        })
        .limit(6);

      if (cancelled) return;

      if (error) {
        console.error(
          'Gagal mengambil novel terbaru:',
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

    loadLatestNovels();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Novel Terbaru"
        subtitle="Novel yang baru saja diperbarui"
        link="/terbaru"
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {novels.map((novel, index) => (
            <Link
              key={novel.id}
              to={`/novel/${novel.id}`}
              className={cn(
                'group flex gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
                index === 0 &&
                  'sm:col-span-2 lg:col-span-1',
              )}
            >
              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                <img
                  src={
                    novel.cover ||
                    '/placeholder.svg'
                  }
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

                  <Badge className="shrink-0 bg-success text-white">
                    Baru
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Novel Semesta
                </p>

                <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />

                  <span>
                    Diperbarui
                  </span>

                  <ChevronRight
                    size={14}
                    className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}