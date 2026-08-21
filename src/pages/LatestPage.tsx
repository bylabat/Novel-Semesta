import { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { NovelCard } from '@/components/NovelCard';

interface Profile {
  username: string | null;
  display_name: string | null;
}

interface GenreRelation {
  novel_id: string;
  genres:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  views: number | null;
  author_id: string;
  profiles: Profile | Profile[] | null;
  genres: string[];
}

export default function LatestPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLatestNovels() {
      setLoading(true);
      setError('');

      try {
        // ==========================================
        // 1. AMBIL NOVEL TERBARU
        // ==========================================

        const {
          data: novelData,
          error: novelError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            cover,
            status,
            views,
            author_id,
            profiles:author_id (
              username,
              display_name
            )
          `)
          .eq('visibility', 'public')
          .order('created_at', {
            ascending: false,
          })
          .limit(24);

        if (cancelled) return;

        if (novelError) {
          console.error(
            'Gagal mengambil novel terbaru:',
            novelError,
          );

          setError(novelError.message);
          setNovels([]);
          setLoading(false);
          return;
        }

        const rawNovels = novelData ?? [];

        if (rawNovels.length === 0) {
          setNovels([]);
          setLoading(false);
          return;
        }

        // ==========================================
        // 2. AMBIL GENRE NOVEL
        // ==========================================

        const novelIds = rawNovels.map(
          (novel) => novel.id,
        );

        const {
          data: genreRelations,
          error: genreError,
        } = await supabase
          .from('novel_genres')
          .select(`
            novel_id,
            genres (
              name
            )
          `)
          .in('novel_id', novelIds);

        if (cancelled) return;

        if (genreError) {
          console.error(
            'Gagal mengambil genre novel terbaru:',
            genreError,
          );
        }

        // ==========================================
        // 3. KELOMPOKKAN GENRE
        // ==========================================

        const genreMap: Record<string, string[]> = {};

        (
          (genreRelations ?? []) as GenreRelation[]
        ).forEach((relation) => {
          if (!genreMap[relation.novel_id]) {
            genreMap[relation.novel_id] = [];
          }

          if (Array.isArray(relation.genres)) {
            relation.genres.forEach((genre) => {
              if (genre?.name) {
                genreMap[relation.novel_id].push(
                  genre.name,
                );
              }
            });
          } else if (relation.genres?.name) {
            genreMap[relation.novel_id].push(
              relation.genres.name,
            );
          }
        });

        // ==========================================
        // 4. GABUNGKAN NOVEL + GENRE
        // ==========================================

        const combinedNovels: Novel[] =
          rawNovels.map((novel) => ({
            ...novel,
            genres:
              genreMap[novel.id] ?? [],
          })) as Novel[];

        setNovels(combinedNovels);
      } catch (err) {
        console.error(
          'Kesalahan memuat novel terbaru:',
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat novel.',
          );

          setNovels([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLatestNovels();

    return () => {
      cancelled = true;
    };
  }, []);

  function getAuthorName(novel: Novel) {
    if (!novel.profiles) {
      return 'Author';
    }

    const profile = Array.isArray(novel.profiles)
      ? novel.profiles[0]
      : novel.profiles;

    return (
      profile?.display_name ||
      profile?.username ||
      'Author'
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="mb-6 flex items-center gap-3 sm:mb-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-11 sm:w-11">
          <Clock
            className="text-primary"
            size={22}
          />
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
            Novel Terbaru
          </h1>

          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Novel yang baru saja diterbitkan
          </p>
        </div>
      </div>

      {/* ==========================================
          LOADING
      ========================================== */}

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              size={22}
              className="animate-spin text-primary"
            />

            Memuat novel terbaru...
          </div>
        </div>
      )}

      {/* ==========================================
          ERROR
      ========================================== */}

      {!loading && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 sm:p-6">
          <p className="font-medium text-destructive">
            Gagal memuat novel terbaru
          </p>

          <p className="mt-2 break-words text-sm leading-6 text-destructive/80">
            {error}
          </p>
        </div>
      )}

      {/* ==========================================
          EMPTY
      ========================================== */}

      {!loading &&
        !error &&
        novels.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
            <Clock
              size={36}
              className="mx-auto text-muted-foreground"
            />

            <p className="mt-3 font-medium text-foreground">
              Belum ada novel terbaru
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Belum ada novel publik yang tersedia.
            </p>
          </div>
        )}

      {/* ==========================================
          NOVEL GRID
      ========================================== */}

      {!loading &&
        !error &&
        novels.length > 0 && (
          <div
            className="
              grid
              grid-cols-2
              gap-x-3
              gap-y-6
              sm:grid-cols-3
              sm:gap-x-4
              sm:gap-y-8
              md:grid-cols-4
              lg:grid-cols-5
              xl:grid-cols-6
            "
          >
            {novels.map((novel) => (
              <div
                key={novel.id}
                className="min-w-0"
              >
                <NovelCard
                  novel={{
                    id: novel.id,
                    title: novel.title,
                    author: getAuthorName(novel),
                    cover:
                      novel.cover ||
                      '/placeholder.svg',
                    genres: novel.genres,
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
              </div>
            ))}
          </div>
        )}
    </div>
  );
}