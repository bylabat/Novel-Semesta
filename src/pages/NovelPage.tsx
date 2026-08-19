import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Novel } from '@/types';

import { NovelCard } from '@/components/NovelCard';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

const statusFilters = [
  'Semua',
  'Ongoing',
  'Completed',
  'Hiatus',
] as const;

type StatusFilter = (typeof statusFilters)[number];
type SortOption =
  | 'terbaru'
  | 'views'
  | 'rating'
  | 'az'
  | 'za';

interface SupabaseNovel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  views: number | null;
  created_at: string;
  author_id: string;
}

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

export default function NovelPage() {
  const [searchParams] = useSearchParams();

  const query = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(query);
  const [status, setStatus] = useState<StatusFilter>('Semua');
  
  type SortOption =
    | 'terbaru'
    | 'views'
    | 'rating'
    | 'az'
    | 'za';

  const [sortBy, setSortBy] =
    useState<SortOption>('terbaru');

  const [showSort, setShowSort] =
    useState(false);

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
        // =====================================================
        // 1. AMBIL NOVEL
        // =====================================================

        const {
          data: novelData,
          error: novelsError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            status,
            views,
            created_at,
            author_id
          `)
          .eq('visibility', 'public')
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

        const rows = (novelData ?? []) as SupabaseNovel[];

        // Jika tidak ada novel
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
              .map((novel) => novel.author_id)
              .filter(Boolean)
          ),
        ];

        const authorMap = new Map<string, Author>();

        if (authorIds.length > 0) {
          const {
            data: authorData,
            error: authorError,
          } = await supabase
            .from('profiles')
            .select(`
              id,
              username,
              display_name
            `)
            .in('id', authorIds);

          if (cancelled) return;

          if (authorError) {
            console.error(
              'Gagal mengambil data author:',
              authorError
            );
          } else {
            const authors = (authorData ?? []) as Author[];

            authors.forEach((author) => {
              authorMap.set(author.id, author);
            });
          }
        }

        // =====================================================
        // 3. AMBIL RATING
        // =====================================================

        const novelIds = rows.map((novel) => novel.id);

        const {
          data: ratingData,
          error: ratingError,
        } = await supabase
          .from('ratings')
          .select(`
            novel_id,
            rating
          `)
          .in('novel_id', novelIds);

        if (cancelled) return;

        const ratingMap = new Map<string, RatingSummary>();

        if (ratingError) {
          console.error(
            'Gagal mengambil rating:',
            ratingError
          );
        } else {
          const ratings = (ratingData ?? []) as RatingRow[];

          ratings.forEach((rating) => {
            const current = ratingMap.get(rating.novel_id);

            if (!current) {
              ratingMap.set(rating.novel_id, {
                average: Number(rating.rating),
                count: 1,
              });
            } else {
              const newCount = current.count + 1;

              ratingMap.set(rating.novel_id, {
                average:
                  (
                    current.average * current.count +
                    Number(rating.rating)
                  ) / newCount,
                count: newCount,
              });
            }
          });
        }

        // =====================================================
        // 4. AMBIL JUMLAH CHAPTER
        // =====================================================

        const {
          data: chapterData,
          error: chapterError,
        } = await supabase
          .from('chapters')
          .select(`
            novel_id
          `)
          .in('novel_id', novelIds)
          .eq('published', true);

        if (cancelled) return;

        const chapterCountMap = new Map<string, number>();

        if (chapterError) {
          console.error(
            'Gagal mengambil jumlah chapter:',
            chapterError
          );
        } else {
          const chapters = (chapterData ?? []) as {
            novel_id: string;
          }[];

          chapters.forEach((chapter) => {
            const current =
              chapterCountMap.get(chapter.novel_id) ?? 0;

            chapterCountMap.set(
              chapter.novel_id,
              current + 1
            );
          });
        }

        // =====================================================
        // 5. BUAT DATA UNTUK NOVEL CARD
        // =====================================================

        const mappedNovels: Novel[] = rows.map((novel) => {
          const normalizedStatus =
            novel.status?.toLowerCase() === 'completed'
              ? 'Completed'
              : novel.status?.toLowerCase() === 'hiatus'
                ? 'Hiatus'
                : 'Ongoing';

          const author = authorMap.get(novel.author_id);

          const rating = ratingMap.get(novel.id);

          const chapterCount =
            chapterCountMap.get(novel.id) ?? 0;

          return {
            id: novel.id,
            title: novel.title,

            author:
              author?.display_name ||
              author?.username ||
              'Author',

            cover:
              novel.cover ||
              '/placeholder.svg',

            genres: [],

            rating:
              rating?.average ?? 0,

            ratingCount:
              rating?.count ?? 0,

            views:
              Number(
                novel.views ?? 0
              ).toLocaleString('id-ID'),

            status: normalizedStatus,

            chapterCount,

            latestChapter: '',

            description:
              novel.description ||
              'Belum ada deskripsi.',

            isNew: false,
            isHot: false,
          };
        });

        if (cancelled) return;

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

  // ===========================================================
  // SEARCH + FILTER
  // ===========================================================

  const filtered = novels
  .filter((novel) => {
    const searchText = search.toLowerCase().trim();

    const matchSearch =
      !searchText ||
      novel.title
        .toLowerCase()
        .includes(searchText) ||
      novel.author
        .toLowerCase()
        .includes(searchText);

    const matchStatus =
      status === 'Semua' ||
      novel.status === status;

    return matchSearch && matchStatus;
  })
  .sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return (
          Number(b.views.replace(/\./g, '')) -
          Number(a.views.replace(/\./g, ''))
        );

      case 'rating':
        return b.rating - a.rating;

      case 'az':
        return a.title.localeCompare(
          b.title,
          'id-ID'
        );

      case 'za':
        return b.title.localeCompare(
          a.title,
          'id-ID'
        );

      case 'terbaru':
      default:
        return 0;
    }
  });

  // ===========================================================
  // LOADING
  // ===========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Memuat daftar novel...
        </div>
      </div>
    );
  }

  // ===========================================================
  // ERROR
  // ===========================================================

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

  // ===========================================================
  // HALAMAN
  // ===========================================================

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Jelajahi Novel
          </h1>
        </div>

        {/* ===================================================
            SEARCH + FILTER
        ==================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBar
              placeholder="Cari novel atau author..."
              onSubmit={setSearch}
              className="max-w-md"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setShowSort((value) => !value)}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">
                Urutkan
              </span>
            </Button>

            {statusFilters.map((filter) => (
              <Button
                key={filter}
                variant={
                  status === filter
                    ? 'default'
                    : 'outline'
                }
                size="sm"
                className="shrink-0"
                onClick={() => setStatus(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
          {showSort && (
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Urutkan novel
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  ['terbaru', 'Terbaru'],
                  ['views', 'Paling banyak dilihat'],
                  ['rating', 'Rating tertinggi'],
                  ['az', 'Judul A–Z'],
                  ['za', 'Judul Z–A'],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={
                      sortBy === value
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => {
                      setSortBy(value as SortOption);
                      setShowSort(false);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          HASIL
      ====================================================== */}

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