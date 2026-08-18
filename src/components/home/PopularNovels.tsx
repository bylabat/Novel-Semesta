import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { NovelCard } from '@/components/NovelCard';
import { SectionHeader } from '@/components/SectionHeader';

interface Author {
  id: string;
  username: string | null;
  display_name: string | null;
}

interface RatingRow {
  novel_id: string;
  rating: number;
}

interface RatingSummary {
  average: number;
  count: number;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  views: number | null;
  author_id: string;
}

export function PopularNovels() {
  const [novels, setNovels] =
    useState<Novel[]>([]);

  const [authorMap, setAuthorMap] =
    useState<Map<string, Author>>(
      new Map(),
    );

  const [ratingMap, setRatingMap] =
    useState<Map<string, RatingSummary>>(
      new Map(),
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPopularNovels() {
      setLoading(true);

      try {
        // =====================================================
        // 1. AMBIL NOVEL POPULER
        // =====================================================

        const {
          data,
          error,
        } = await supabase
          .from('novels')
          .select(
            `
              id,
              title,
              cover,
              status,
              views,
              author_id
            `,
          )
          .eq(
            'visibility',
            'public',
          )
          .order('views', {
            ascending: false,
            nullsFirst: false,
          })
          .limit(8);

        if (cancelled) return;

        if (error) {
          console.error(
            'Gagal mengambil novel populer:',
            error,
          );

          setNovels([]);
          setLoading(false);
          return;
        }

        const rows =
          (data ?? []) as Novel[];

        if (rows.length === 0) {
          setNovels([]);
          setLoading(false);
          return;
        }

        // =====================================================
        // 2. AMBIL AUTHOR
        // =====================================================

        const authorIds = [
          ...new Set(
            rows
              .map(
                (novel) =>
                  novel.author_id,
              )
              .filter(Boolean),
          ),
        ];

        const newAuthorMap =
          new Map<string, Author>();

        if (
          authorIds.length > 0
        ) {
          const {
            data: authorData,
            error: authorError,
          } = await supabase
            .from('profiles')
            .select(
              `
                id,
                username,
                display_name
              `,
            )
            .in(
              'id',
              authorIds,
            );

          if (cancelled) return;

          if (authorError) {
            console.error(
              'Gagal mengambil author:',
              authorError,
            );
          } else {
            const authors =
              (authorData ??
                []) as Author[];

            authors.forEach(
              (author) => {
                newAuthorMap.set(
                  author.id,
                  author,
                );
              },
            );
          }
        }

        // =====================================================
        // 3. AMBIL RATING
        // =====================================================

        const novelIds =
          rows.map(
            (novel) => novel.id,
          );

        const {
          data: ratingData,
          error: ratingError,
        } = await supabase
          .from('ratings')
          .select(
            `
              novel_id,
              rating
            `,
          )
          .in(
            'novel_id',
            novelIds,
          );

        if (cancelled) return;

        const newRatingMap =
          new Map<
            string,
            RatingSummary
          >();

        if (ratingError) {
          console.error(
            'Gagal mengambil rating:',
            ratingError,
          );
        } else {
          const ratings =
            (ratingData ??
              []) as RatingRow[];

          ratings.forEach(
            (rating) => {
              const current =
                newRatingMap.get(
                  rating.novel_id,
                );

              if (!current) {
                newRatingMap.set(
                  rating.novel_id,
                  {
                    average:
                      Number(
                        rating.rating,
                      ),
                    count: 1,
                  },
                );
              } else {
                const newCount =
                  current.count + 1;

                newRatingMap.set(
                  rating.novel_id,
                  {
                    average:
                      (
                        current.average *
                          current.count +
                        Number(
                          rating.rating,
                        )
                      ) /
                      newCount,
                    count:
                      newCount,
                  },
                );
              }
            },
          );
        }

        if (cancelled) return;

        setNovels(rows);
        setAuthorMap(
          newAuthorMap,
        );
        setRatingMap(
          newRatingMap,
        );
      } catch (error) {
        console.error(
          'Gagal memuat novel populer:',
          error,
        );

        if (!cancelled) {
          setNovels([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
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
          {novels.map(
            (novel, index) => {
              const author =
                authorMap.get(
                  novel.author_id,
                );

              const rating =
                ratingMap.get(
                  novel.id,
                );

              return (
                <NovelCard
                  key={novel.id}
                  rank={index + 1}
                  novel={{
                    id: novel.id,

                    title:
                      novel.title,

                    author:
                      author?.display_name ||
                      author?.username ||
                      'Author',

                    cover:
                      novel.cover ||
                      '/placeholder.svg',

                    genres: [],

                    rating:
                      rating?.average ??
                      0,

                    ratingCount:
                      rating?.count ??
                      0,

                    views: String(
                      novel.views ??
                        0,
                    ),

                    status:
                      novel.status ===
                      'completed'
                        ? 'Completed'
                        : novel.status ===
                            'hiatus'
                          ? 'Hiatus'
                          : 'Ongoing',

                    chapterCount: 0,

                    latestChapter:
                      '',

                    description:
                      '',
                  }}
                />
              );
            },
          )}
        </div>
      )}
    </section>
  );
}