import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  chapter_number: number;
  content: string;
  published: boolean;
  word_count: number;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
}

export default function ReadChapterPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [previousChapter, setPreviousChapter] =
    useState<Chapter | null>(null);
  const [nextChapter, setNextChapter] =
    useState<Chapter | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chapterId) return;

    let cancelled = false;

    async function fetchChapter() {
      setLoading(true);
      setError('');

      // =====================================================
      // 1. AMBIL CHAPTER YANG SEDANG DIBACA
      // =====================================================

      const { data: chapterData, error: chapterError } =
        await supabase
          .from('chapters')
          .select(
            'id, novel_id, title, chapter_number, content, published, word_count'
          )
          .eq('id', chapterId)
          .eq('published', true)
          .maybeSingle();

      if (cancelled) return;

      if (chapterError) {
        console.error(
          'Gagal mengambil chapter:',
          chapterError
        );

        setError(chapterError.message);
        setLoading(false);
        return;
      }

      if (!chapterData) {
        setError(
          'Chapter tidak ditemukan atau belum diterbitkan.'
        );

        setLoading(false);
        return;
      }

      const currentChapter =
        chapterData as Chapter;

      setChapter(currentChapter);
      localStorage.setItem(
  `last_read_chapter_${currentChapter.novel_id}`,
  currentChapter.id
);

      // =====================================================
      // 2. AMBIL DATA NOVEL
      // =====================================================

      const { data: novelData, error: novelError } =
        await supabase
          .from('novels')
          .select('id, title, cover')
          .eq('id', currentChapter.novel_id)
          .eq('visibility', 'public')
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
        setError(
          'Novel tidak ditemukan atau tidak tersedia.'
        );

        setLoading(false);
        return;
      }

      const currentNovel =
        novelData as Novel;

      setNovel(currentNovel);

      // =====================================================
// 3. TAMBAH VIEWS NOVEL
//
// Satu chapter hanya dihitung satu kali dalam satu sesi
// browser.
// =====================================================

const viewKey = `novel_view_${currentChapter.id}`;

const alreadyViewed =
  sessionStorage.getItem(viewKey);

if (!alreadyViewed) {
  const { data: currentNovelStats, error: viewsReadError } =
    await supabase
      .from('novels')
      .select('views')
      .eq('id', currentNovel.id)
      .maybeSingle();

  if (cancelled) return;

  if (viewsReadError) {
    console.error(
      'Gagal membaca views novel:',
      viewsReadError
    );
  } else if (currentNovelStats) {
    const currentViews =
      Number(currentNovelStats.views ?? 0);

    const { error: viewsUpdateError } =
      await supabase
        .from('novels')
        .update({
          views: currentViews + 1,
        })
        .eq('id', currentNovel.id);

    if (viewsUpdateError) {
      console.error(
        'Gagal menambahkan views:',
        viewsUpdateError
      );
    } else {
      sessionStorage.setItem(
        viewKey,
        'true'
      );
    }
  }
}

      // =====================================================
      // 4. AMBIL SEMUA CHAPTER YANG SUDAH DITERBITKAN
      // =====================================================

      const {
        data: publishedChapters,
        error: navigationError,
      } = await supabase
        .from('chapters')
        .select(
          'id, novel_id, title, chapter_number, content, published, word_count'
        )
        .eq('novel_id', currentChapter.novel_id)
        .eq('published', true)
        .order('chapter_number', {
          ascending: true,
        });

      if (cancelled) return;

      if (navigationError) {
        console.error(
          'Gagal mengambil navigasi chapter:',
          navigationError
        );

        setPreviousChapter(null);
        setNextChapter(null);
      } else {
        const allPublishedChapters =
          (publishedChapters ?? []) as Chapter[];

        const currentIndex =
          allPublishedChapters.findIndex(
            (item) =>
              item.id === currentChapter.id
          );

        if (currentIndex === -1) {
          setPreviousChapter(null);
          setNextChapter(null);
        } else {
          // Chapter sebelumnya
          if (currentIndex > 0) {
            setPreviousChapter(
              allPublishedChapters[
                currentIndex - 1
              ]
            );
          } else {
            setPreviousChapter(null);
          }

          // Chapter berikutnya
          if (
            currentIndex <
            allPublishedChapters.length - 1
          ) {
            setNextChapter(
              allPublishedChapters[
                currentIndex + 1
              ]
            );
          } else {
            setNextChapter(null);
          }
        }
      }

      setLoading(false);
    }

    fetchChapter();

    return () => {
      cancelled = true;
    };
  }, [chapterId]);

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
          Membuka chapter...
        </div>
      </div>
    );
  }

  // ===========================================================
  // ERROR
  // ===========================================================

  if (error || !chapter || !novel) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error || 'Chapter tidak ditemukan.'}
        </div>

        <Button
          variant="outline"
          className="mt-5"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft
            size={16}
            className="mr-2"
          />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">

          <Link
            to={`/novel/${novel.id}`}
            className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft size={17} />

            <span className="truncate">
              {novel.title}
            </span>
          </Link>

          <span className="shrink-0 text-xs text-muted-foreground">
            Chapter {chapter.chapter_number}
          </span>
        </div>
      </div>

      {/* =====================================================
          READING AREA
      ====================================================== */}

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">

        {/* ===================================================
            CHAPTER HEADING
        ==================================================== */}

        <header className="mb-10 text-center">

          <p className="text-sm font-medium text-primary">
            Chapter {chapter.chapter_number}
          </p>

          <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {chapter.title}
          </h1>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">

            <span>
              {Number(
                chapter.word_count ?? 0
              ).toLocaleString('id-ID')}{' '}
              kata
            </span>

            <span>•</span>

            <span>
              {novel.title}
            </span>

          </div>
        </header>

        {/* ===================================================
            ISI CHAPTER
        ==================================================== */}

        <article className="font-serif text-base leading-8 text-foreground sm:text-lg sm:leading-9">
          {chapter.content
            .split(/\n\s*\n/)
            .map((paragraph, index) => (
              <p
                key={index}
                className="mb-6 whitespace-pre-line"
              >
                {paragraph}
              </p>
            ))}
        </article>

        {/* ===================================================
            NAVIGASI CHAPTER
        ==================================================== */}

        <div className="mt-12 border-t border-border pt-6">

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">

            {/* SEBELUMNYA */}

            <div className="flex justify-start">
              {previousChapter && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      `/read/${previousChapter.id}`
                    )
                  }
                >
                  <ChevronLeft
                    size={17}
                    className="mr-2"
                  />

                  Sebelumnya
                </Button>
              )}
            </div>

            {/* DAFTAR CHAPTER */}

            <div className="flex justify-center">
              <Button
                variant="outline"
                asChild
              >
                <Link
                  to={`/novel/${novel.id}`}
                >
                  <BookOpen
                    size={17}
                    className="mr-2"
                  />

                  Daftar Chapter
                </Link>
              </Button>
            </div>

            {/* BERIKUTNYA */}

            <div className="flex justify-end">
              {nextChapter && (
                <Button
                  className="glow-primary-sm"
                  onClick={() =>
                    navigate(
                      `/read/${nextChapter.id}`
                    )
                  }
                >
                  Berikutnya

                  <ChevronRight
                    size={17}
                    className="ml-2"
                  />
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* ===================================================
            CHAPTER TERAKHIR
        ==================================================== */}

        {!nextChapter && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">

            <BookOpen
              size={28}
              className="mx-auto text-primary"
            />

            <p className="mt-3 font-medium text-foreground">
              Kamu sudah sampai di chapter terbaru.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Terima kasih sudah membaca{' '}
              {novel.title}.
            </p>

          </div>
        )}

      </main>
    </div>
  );
}