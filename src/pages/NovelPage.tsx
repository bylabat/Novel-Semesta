import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, SlidersHorizontal } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { Novel } from '@/types';

import { NovelCard } from '@/components/NovelCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

const statusFilters = ['Semua', 'Ongoing', 'Completed', 'Hiatus'] as const;

type StatusFilter = (typeof statusFilters)[number];

interface SupabaseNovel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  views: number | null;
  created_at: string;
}

export default function NovelPage() {
  const [searchParams] = useSearchParams();

  const query = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(query);
  const [status, setStatus] = useState<StatusFilter>('Semua');

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function loadNovels() {
      setLoading(true);
      setError('');

      try {
        const { data, error: novelsError } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            status,
            views,
            created_at
          `)
          .order('created_at', {
            ascending: false,
          });

        if (cancelled) return;

        if (novelsError) {
          console.error(
            'Gagal mengambil daftar novel:',
            novelsError
          );

          setError(novelsError.message);
          setNovels([]);
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as SupabaseNovel[];

        const mappedNovels: Novel[] = rows.map((novel) => {
          const normalizedStatus =
            novel.status?.toLowerCase() === 'completed'
              ? 'Completed'
              : novel.status?.toLowerCase() === 'hiatus'
                ? 'Hiatus'
                : 'Ongoing';

          return {
            id: novel.id,
            title: novel.title,
            author: 'Author',
            cover: novel.cover || '/placeholder.svg',
            genres: [],
            rating: 0,
            ratingCount: 0,
            views: Number(novel.views ?? 0).toLocaleString('id-ID'),
            status: normalizedStatus,
            chapterCount: 0,
            latestChapter: '',
            description:
              novel.description || 'Belum ada deskripsi.',
            isNew: false,
            isHot: false,
          };
        });

        setNovels(mappedNovels);
        setLoading(false);
      } catch (err) {
        console.error(
          'Kesalahan saat mengambil daftar novel:',
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat novel.'
          );

          setNovels([]);
          setLoading(false);
        }
      }
    }

    loadNovels();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = novels.filter((novel) => {
    const matchSearch =
      !search ||
      novel.title
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      novel.author
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchStatus =
      status === 'Semua' ||
      novel.status === status;

    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Memuat daftar novel...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="font-medium text-destructive">
            Gagal memuat daftar novel
          </p>

          <p className="mt-2 break-words text-sm text-destructive/80">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Jelajahi Novel
          </h1>
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
            <SlidersHorizontal
              size={16}
              className="shrink-0 text-muted-foreground"
            />

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
              <NovelCard
                key={novel.id}
                novel={novel}
              />
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