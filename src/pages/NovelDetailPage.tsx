import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Eye,
  ListOrdered,
  Loader2,
  Play,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

interface Novel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string;
  visibility: string;
  author_id: string;
  views: number | null;
  created_at: string;
  updated_at: string;
}

interface Genre {
  id: string;
  name: string;
  slug: string | null;
}

interface NovelGenreRow {
  genre_id: string;
  genres: Genre | null;
}

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  chapter_number: number;
  content: string;
  published: boolean;
  word_count: number | null;
  created_at: string;
  updated_at: string;
}

export default function NovelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [lastReadChapterId, setLastReadChapterId] =
    useState<string | null>(null);

  const [isInLibrary, setIsInLibrary] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ===========================================================
  // LOAD NOVEL
  // ===========================================================

  useEffect(() => {
    if (!id) {
      setError('ID novel tidak ditemukan.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadNovel() {
      setLoading(true);
      setError('');

      try {
        // =====================================================
        // 1. AMBIL DATA NOVEL
        // =====================================================

        const { data: novelData, error: novelError } =
          await supabase
            .from('novels')
            .select(
              `
                id,
                title,
                description,
                cover,
                status,
                visibility,
                author_id,
                views,
                created_at,
                updated_at
              `
            )
            .eq('id', id)
            .maybeSingle();

        if (cancelled) return;

        if (novelError) {
          console.error(
            'Gagal mengambil novel:',
            novelError
          );

          setError(novelError.message);
          setLoading(false);
          return;
        }

        if (!novelData) {
          setNovel(null);
          setLoading(false);
          return;
        }

        const currentNovel =
          novelData as Novel;

        setNovel(currentNovel);

        // =====================================================
        // 2. CEK USER DAN STATUS RAK
        // =====================================================

        const {
          data: {
            user,
          },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          const {
            data: libraryData,
            error: libraryError,
          } = await supabase
            .from('user_library')
            .select('id')
            .eq('user_id', user.id)
            .eq('novel_id', id)
            .maybeSingle();

          if (cancelled) return;

          if (libraryError) {
            console.error(
              'Gagal mengecek Rak:',
              libraryError
            );

            setIsInLibrary(false);
          } else {
            setIsInLibrary(
              Boolean(libraryData)
            );
          }
        } else {
          setIsInLibrary(false);
        }

        // =====================================================
        // 3. AMBIL GENRE
        // =====================================================

        const {
          data: genreData,
          error: genreError,
        } = await supabase
          .from('novel_genres')
          .select(
            `
              genre_id,
              genres (
                id,
                name,
                slug
              )
            `
          )
          .eq('novel_id', id);

        if (cancelled) return;

        if (genreError) {
          console.error(
            'Gagal mengambil genre:',
            genreError
          );

          setGenres([]);
        } else {
          const rows =
            (genreData ?? []) as unknown as NovelGenreRow[];

          const genreList = rows
            .map((row) => row.genres)
            .filter(
              (genre): genre is Genre =>
                genre !== null
            );

          setGenres(genreList);
        }

        // =====================================================
        // 4. AMBIL CHAPTER YANG SUDAH DITERBITKAN
        // =====================================================

        const {
          data: chapterData,
          error: chapterError,
        } = await supabase
          .from('chapters')
          .select(
            `
              id,
              novel_id,
              title,
              chapter_number,
              content,
              published,
              word_count,
              created_at,
              updated_at
            `
          )
          .eq('novel_id', id)
          .eq('published', true)
          .order('chapter_number', {
            ascending: false,
          });

        if (cancelled) return;

        if (chapterError) {
          console.error(
            'Gagal mengambil chapter:',
            chapterError
          );

          setChapters([]);
        } else {
          const chapterList =
            (chapterData ?? []) as Chapter[];

          setChapters(chapterList);

          // =================================================
          // CEK CHAPTER TERAKHIR YANG DIBACA
          // =================================================

          const savedChapterId =
            localStorage.getItem(
              `last_read_chapter_${id}`
            );

          if (savedChapterId) {
            const chapterExists =
              chapterList.some(
                (chapter) =>
                  chapter.id === savedChapterId
              );

            if (chapterExists) {
              setLastReadChapterId(
                savedChapterId
              );
            } else {
              setLastReadChapterId(null);
            }
          } else {
            setLastReadChapterId(null);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error(
          'Kesalahan:',
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat novel.'
          );

          setLoading(false);
        }
      }
    }

    loadNovel();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ===========================================================
  // TAMBAH / HAPUS RAK
  // ===========================================================

  async function toggleLibrary() {
    if (!novel) return;

    setLibraryLoading(true);

    try {
      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          'Gagal mendapatkan user:',
          userError
        );

        alert(
          'Gagal memeriksa akun. Silakan coba lagi.'
        );

        return;
      }

      if (!user) {
        alert(
          'Silakan login terlebih dahulu untuk menambahkan novel ke Rak.'
        );

        return;
      }

      // =====================================================
      // HAPUS DARI RAK
      // =====================================================

      if (isInLibrary) {
        const {
          error: deleteError,
        } = await supabase
          .from('user_library')
          .delete()
          .eq('user_id', user.id)
          .eq('novel_id', novel.id);

        if (deleteError) {
          console.error(
            'Gagal menghapus dari Rak:',
            deleteError
          );

          alert(
            'Gagal menghapus novel dari Rak.'
          );

          return;
        }

        setIsInLibrary(false);

        return;
      }

      // =====================================================
      // TAMBAH KE RAK
      // =====================================================

      const {
        error: insertError,
      } = await supabase
        .from('user_library')
        .insert({
          user_id: user.id,
          novel_id: novel.id,
        });

      if (insertError) {
        console.error(
          'Gagal menambahkan ke Rak:',
          insertError
        );

        // Jika ternyata sudah ada
        if (
          insertError.code === '23505'
        ) {
          setIsInLibrary(true);
          return;
        }

        alert(
          'Gagal menambahkan novel ke Rak.'
        );

        return;
      }

      setIsInLibrary(true);
    } finally {
      setLibraryLoading(false);
    }
  }

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

          Memuat novel...
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
            Gagal memuat novel
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
          <Link to="/novel">
            <ArrowLeft
              size={16}
              className="mr-2"
            />

            Kembali ke Novel
          </Link>
        </Button>
      </div>
    );
  }

  // ===========================================================
  // NOVEL TIDAK DITEMUKAN
  // ===========================================================

  if (!novel) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Novel tidak ditemukan"
        description="Novel yang kamu cari tidak ditemukan di database."
        action={
          <Button
            variant="outline"
            asChild
          >
            <Link to="/novel">
              Lihat semua novel
            </Link>
          </Button>
        }
      />
    );
  }

  // ===========================================================
  // STATUS
  // ===========================================================

  const statusLabel =
    novel.status === 'ongoing'
      ? 'Ongoing'
      : novel.status === 'completed'
        ? 'Completed'
        : novel.status === 'hiatus'
          ? 'Hiatus'
          : novel.status ||
            'Belum ditentukan';

  // ===========================================================
  // COVER
  // ===========================================================

  const cover =
    novel.cover ||
    '/placeholder.svg';

  // ===========================================================
  // VIEWS
  // ===========================================================

  const views =
    Number(novel.views ?? 0);

  // ===========================================================
  // CHAPTER PERTAMA
  //
  // Array DESC:
  // Chapter 3
  // Chapter 2
  // Chapter 1
  //
  // Jadi chapter pertama = item terakhir.
  // ===========================================================

  const firstChapter =
    chapters.length > 0
      ? chapters[chapters.length - 1]
      : null;

  return (
    <div className="pb-12">

      {/* =====================================================
          HERO BACKDROP
      ====================================================== */}

      <div className="relative h-64 w-full overflow-hidden sm:h-80">
        <img
          src={cover}
          alt={novel.title}
          className="h-full w-full scale-105 object-cover blur-sm"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">

        {/* ===================================================
            KEMBALI
        ==================================================== */}

        <Link
          to="/novel"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft size={16} />

          Kembali
        </Link>

        {/* ===================================================
            DETAIL NOVEL
        ==================================================== */}

        <div className="mt-4 flex flex-col gap-6 sm:flex-row">

          {/* COVER */}

          <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-xl border border-border shadow-xl sm:mx-0 sm:w-48">
            <img
              src={cover}
              alt={novel.title}
              className="aspect-[3/4] w-full object-cover"
            />
          </div>

          {/* INFO */}

          <div className="flex-1 space-y-4">

            {/* STATUS */}

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {statusLabel}
              </Badge>

              {novel.visibility === 'public' && (
                <Badge className="bg-primary text-primary-foreground">
                  Publik
                </Badge>
              )}
            </div>

            {/* JUDUL */}

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
              {novel.title}
            </h1>

            {/* AUTHOR */}

            <p className="text-sm text-muted-foreground">
              Novel karya author
            </p>

            {/* GENRE */}

            {genres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Belum ada genre.
              </p>
            )}

            {/* DESKRIPSI */}

            <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
              {novel.description ||
                'Belum ada deskripsi untuk novel ini.'}
            </p>

            {/* =================================================
                STATISTIK
            ================================================== */}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">

              <span className="flex items-center gap-1.5">
                <Eye size={16} />

                {views.toLocaleString('id-ID')} dibaca
              </span>

              <span className="flex items-center gap-1.5">
                <ListOrdered size={16} />

                {chapters.length} chapter
              </span>

            </div>

            {/* =================================================
                BUTTON
            ================================================== */}

            <div className="flex flex-wrap gap-3 pt-2">

              {/* BACA SEKARANG */}

              {firstChapter ? (
                <Button
                  size="lg"
                  className="glow-primary"
                  asChild
                >
                  <Link
                    to={`/read/${firstChapter.id}`}
                  >
                    <Play
                      size={18}
                      className="mr-1 fill-white"
                    />

                    Baca Sekarang
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  disabled
                >
                  <Play
                    size={18}
                    className="mr-1"
                  />

                  Belum Ada Chapter
                </Button>
              )}

              {/* LANJUTKAN MEMBACA */}

              {lastReadChapterId && (
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                >
                  <Link
                    to={`/read/${lastReadChapterId}`}
                  >
                    <BookOpen
                      size={18}
                      className="mr-2"
                    />

                    Lanjutkan Membaca
                  </Link>
                </Button>
              )}

              {/* =================================================
                  TAMBAH / HAPUS RAK
              ================================================== */}

              <Button
                size="lg"
                variant="outline"
                onClick={toggleLibrary}
                disabled={libraryLoading}
              >
                <Bookmark
                  size={18}
                  className={`mr-2 ${
                    isInLibrary
                      ? 'fill-current'
                      : ''
                  }`}
                />

                {libraryLoading
                  ? 'Memproses...'
                  : isInLibrary
                    ? 'Hapus dari Rak'
                    : 'Tambah ke Rak'}
              </Button>

            </div>
          </div>
        </div>

        {/* ===================================================
            DAFTAR CHAPTER
        ==================================================== */}

        <div className="mt-10 rounded-xl border border-border bg-card p-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Daftar Chapter
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {chapters.length} chapter diterbitkan
              </p>
            </div>

            <BookOpen
              size={20}
              className="text-primary"
            />

          </div>

          {/* BELUM ADA CHAPTER */}

          {chapters.length === 0 ? (
            <div className="py-12 text-center">

              <BookOpen
                size={32}
                className="mx-auto text-muted-foreground"
              />

              <p className="mt-3 font-medium text-foreground">
                Belum ada chapter
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Author belum menerbitkan chapter untuk
                novel ini.
              </p>

            </div>
          ) : (

            /* ADA CHAPTER */

            <div className="mt-5 space-y-2">

              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/read/${chapter.id}`}
                  className="group flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-secondary/50"
                >

                  <div className="min-w-0">

                    <p className="text-sm font-medium text-foreground group-hover:text-primary">
                      Chapter {chapter.chapter_number}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {chapter.title}
                    </p>

                  </div>

                  <div className="ml-4 flex shrink-0 items-center gap-3">

                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {Number(
                        chapter.word_count ?? 0
                      ).toLocaleString('id-ID')}{' '}
                      kata
                    </span>

                    <Play
                      size={15}
                      className="text-muted-foreground transition-colors group-hover:text-primary"
                    />

                  </div>

                </Link>
              ))}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}