import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { NovelCard } from '@/components/NovelCard';
import { Button } from '@/components/ui/button';

interface Genre {
  id: string;
  name: string;
  slug: string | null;
}

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  views: number | null;
  author_id: string | null;
  author: string;
}

export default function GenreDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [genre, setGenre] =
    useState<Genre | null>(null);

  const [novels, setNovels] =
    useState<Novel[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!id) {
      setError('Genre tidak ditemukan.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadGenre() {
      setLoading(true);
      setError('');

      try {
        // =====================================================
        // 1. CARI GENRE BERDASARKAN SLUG
        // =====================================================

        const {
          data: genreData,
          error: genreError,
        } = await supabase
          .from('genres')
          .select(
            `
              id,
              name,
              slug
            `,
          )
          .eq('slug', id)
          .maybeSingle();

        if (cancelled) return;

        if (genreError) {
          console.error(
            'Gagal mengambil genre:',
            genreError,
          );

          setError(genreError.message);
          setLoading(false);
          return;
        }

        if (!genreData) {
          setGenre(null);
          setNovels([]);
          setLoading(false);
          return;
        }

        const currentGenre =
          genreData as Genre;

        setGenre(currentGenre);

        // =====================================================
        // 2. CARI NOVEL YANG TERHUBUNG DENGAN GENRE
        // =====================================================

        const {
          data: novelGenreData,
          error: novelGenreError,
        } = await supabase
          .from('novel_genres')
          .select('novel_id')
          .eq(
            'genre_id',
            currentGenre.id,
          );

        if (cancelled) return;

        if (novelGenreError) {
          console.error(
            'Gagal mengambil relasi genre:',
            novelGenreError,
          );

          setError(
            novelGenreError.message,
          );

          setLoading(false);
          return;
        }

        const novelIds =
          (novelGenreData ?? []).map(
            (row) => row.novel_id,
          );

        if (novelIds.length === 0) {
          setNovels([]);
          setLoading(false);
          return;
        }

        // =====================================================
        // 3. AMBIL DATA NOVEL
        // =====================================================

        const {
          data: novelData,
          error: novelError,
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
          .in('id', novelIds)
          .eq('visibility', 'public')
          .order('views', {
            ascending: false,
            nullsFirst: false,
          });

        if (cancelled) return;

        if (novelError) {
          console.error(
            'Gagal mengambil novel genre:',
            novelError,
          );

          setError(
            novelError.message,
          );

          setLoading(false);
          return;
        }

        const rawNovels =
          novelData ?? [];

        // =====================================================
        // 4. AMBIL PROFILE AUTHOR
        // =====================================================

        const authorIds = Array.from(
          new Set(
            rawNovels
              .map(
                (novel) =>
                  novel.author_id,
              )
              .filter(
                (
                  authorId,
                ): authorId is string =>
                  Boolean(authorId),
              ),
          ),
        );

        let profiles: Profile[] = [];

        if (authorIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from('profiles')
            .select(
              `
                id,
                username,
                display_name,
                avatar
              `,
            )
            .in(
              'id',
              authorIds,
            );

          if (profileError) {
            console.error(
              'Gagal mengambil profile author:',
              profileError,
            );
          } else {
            profiles =
              (profileData ??
                []) as Profile[];
          }
        }

        // =====================================================
        // 5. GABUNGKAN NOVEL + AUTHOR
        // =====================================================

        const finalNovels: Novel[] =
          rawNovels.map((novel) => {
            const profile =
              profiles.find(
                (item) =>
                  item.id ===
                  novel.author_id,
              );

            const author =
              profile?.username ||
              profile?.display_name ||
              'Author';

            return {
              id: novel.id,
              title: novel.title,
              cover: novel.cover,
              status: novel.status,
              views: novel.views,
              author_id:
                novel.author_id,
              author,
            };
          });

        if (cancelled) return;

        setNovels(finalNovels);
        setLoading(false);
      } catch (err) {
        console.error(
          'Kesalahan:',
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat genre.',
          );

          setLoading(false);
        }
      }
    }

    loadGenre();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ===========================================================
  // LOADING
  // ===========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={24}
            className="animate-spin text-primary"
          />

          Memuat genre...
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
            Gagal memuat genre
          </p>

          <p className="mt-2 break-words text-sm text-destructive/80">
            {error}
          </p>
        </div>

        <Button
          variant="outline"
          className="mt-5"
          asChild
        >
          <Link to="/genre">
            <ArrowLeft
              size={16}
              className="mr-2"
            />

            Kembali ke Genre
          </Link>
        </Button>
      </div>
    );
  }

  // ===========================================================
  // GENRE TIDAK DITEMUKAN
  // ===========================================================

  if (!genre) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <BookOpen
          size={40}
          className="mx-auto text-muted-foreground"
        />

        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Genre tidak ditemukan
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Genre yang kamu cari tidak tersedia.
        </p>

        <Button
          variant="outline"
          className="mt-5"
          asChild
        >
          <Link to="/genre">
            Kembali ke Genre
          </Link>
        </Button>
      </div>
    );
  }

  // ===========================================================
  // RENDER
  // ===========================================================

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* KEMBALI */}

      <Link
        to="/genre"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />

        Kembali ke Genre
      </Link>

      {/* HEADER */}

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {genre.name}
          </h1>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Novel dalam genre {genre.name}.
        </p>
      </div>

      {/* NOVEL */}

      {novels.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <BookOpen
            size={36}
            className="mx-auto text-muted-foreground"
          />

          <p className="mt-3 font-medium text-foreground">
            Belum ada novel
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada novel publik dalam genre ini.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {novels.length.toLocaleString(
                'id-ID',
              )}{' '}
              novel
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8">
            {novels.map((novel) => (
              <NovelCard
                key={novel.id}
                novel={{
                  id: novel.id,
                  title: novel.title,
                  author: novel.author,
                  cover:
                    novel.cover ||
                    '/placeholder.svg',
                  genres: [
                    genre.name,
                  ],
                  rating: 0,
                  ratingCount: 0,
                  views: String(
                    novel.views ?? 0,
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
                  latestChapter: '',
                  description: '',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}