import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  chapter_number: number;
  content: string;
  published: boolean;
  word_count: number | null;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
}

interface ReadingProgress {
  user_id: string;
  novel_id: string;
  chapter_id: string;
  progress: number;
  updated_at: string;
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

  const [readingProgress, setReadingProgress] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const saveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestProgressRef = useRef(0);

  // ===========================================================
  // SIMPAN PROGRESS KE SUPABASE
  // ===========================================================

  async function saveReadingProgress(progressValue: number) {
    if (!chapter || !novel) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Gagal mendapatkan user untuk progress:",
          userError,
        );
        return;
      }

      if (!user) return;

      const progress = Math.max(
        0,
        Math.min(100, Math.round(progressValue)),
      );

      const { error: progressError } = await supabase
        .from("reading_progress")
        .upsert(
          {
            user_id: user.id,
            novel_id: novel.id,
            chapter_id: chapter.id,
            progress,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,chapter_id",
          },
        );

      if (progressError) {
        console.error(
          "Gagal menyimpan progress membaca:",
          progressError,
        );
      }
    } catch (err) {
      console.error(
        "Kesalahan saat menyimpan progress membaca:",
        err,
      );
    }
  }

  // ===========================================================
  // RESET SCROLL SAAT PINDAH CHAPTER
  // ===========================================================

  useEffect(() => {
    if (!chapterId) return;

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    setReadingProgress(0);
    latestProgressRef.current = 0;
  }, [chapterId]);

  // ===========================================================
  // HITUNG & SIMPAN PROGRESS SCROLL
  // ===========================================================

  useEffect(() => {
    if (!chapter || !novel) return;

    function handleScroll() {
      const documentHeight =
        document.documentElement.scrollHeight;

      const windowHeight =
        window.innerHeight;

      const scrollableHeight =
        documentHeight - windowHeight;

      // Jika isi chapter tidak cukup panjang
      // untuk di-scroll, anggap sudah 100%.
      if (scrollableHeight <= 0) {
        latestProgressRef.current = 100;
        setReadingProgress(100);

        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current =
          setTimeout(() => {
            void saveReadingProgress(100);
          }, 800);

        return;
      }

      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop;

      const progress =
        (scrollTop / scrollableHeight) * 100;

      const roundedProgress =
        Math.max(
          0,
          Math.min(
            100,
            Math.round(progress),
          ),
        );

      latestProgressRef.current =
        roundedProgress;

      setReadingProgress(
        roundedProgress,
      );

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current,
        );
      }

      saveTimerRef.current =
        setTimeout(() => {
          void saveReadingProgress(
            roundedProgress,
          );
        }, 800);
    }

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    // Hitung posisi awal.
    handleScroll();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current,
        );

        saveTimerRef.current = null;
      }

      // Simpan progress terakhir
      // ketika user meninggalkan chapter.
      void saveReadingProgress(
        latestProgressRef.current,
      );
    };
  }, [chapter, novel]);

  // ===========================================================
  // LOAD CHAPTER
  // ===========================================================

  useEffect(() => {
    if (!chapterId) {
      setError(
        "ID chapter tidak ditemukan.",
      );

      setLoading(false);

      return;
    }

    let cancelled = false;

    async function fetchChapter() {
      setLoading(true);
      setError("");

      try {
        // =====================================================
        // 1. AMBIL CHAPTER
        // =====================================================

        const {
          data: chapterData,
          error: chapterError,
        } = await supabase
          .from("chapters")
          .select(
            "id, novel_id, title, chapter_number, content, published, word_count",
          )
          .eq("id", chapterId)
          .eq("published", true)
          .maybeSingle();

        if (cancelled) return;

        if (chapterError) {
          console.error(
            "Gagal mengambil chapter:",
            chapterError,
          );

          setError(
            chapterError.message,
          );

          setLoading(false);

          return;
        }

        if (!chapterData) {
          setError(
            "Chapter tidak ditemukan atau belum diterbitkan.",
          );

          setLoading(false);

          return;
        }

        const currentChapter =
          chapterData as Chapter;

        setChapter(
          currentChapter,
        );

        // Simpan chapter terakhir yang dibuka.
        localStorage.setItem(
          `last_read_chapter_${currentChapter.novel_id}`,
          currentChapter.id,
        );

        // =====================================================
        // 2. AMBIL NOVEL
        // =====================================================

        const {
          data: novelData,
          error: novelError,
        } = await supabase
          .from("novels")
          .select(
            "id, title, cover",
          )
          .eq(
            "id",
            currentChapter.novel_id,
          )
          .eq(
            "visibility",
            "public",
          )
          .maybeSingle();

        if (cancelled) return;

        if (novelError) {
          console.error(
            "Gagal mengambil novel:",
            novelError,
          );

          setError(
            novelError.message,
          );

          setLoading(false);

          return;
        }

        if (!novelData) {
          setError(
            "Novel tidak ditemukan atau tidak tersedia.",
          );

          setLoading(false);

          return;
        }

        const currentNovel =
          novelData as Novel;

        setNovel(currentNovel);

        

        // =====================================================
        // 3. AMBIL USER + PROGRESS
        // =====================================================

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          const {
            data: progressData,
            error: progressError,
          } = await supabase
            .from(
              "reading_progress",
            )
            .select(
              "user_id, novel_id, chapter_id, progress, updated_at",
            )
            .eq(
              "user_id",
              user.id,
            )
            .eq(
              "novel_id",
              currentNovel.id,
            )
            .eq(
              "chapter_id",
              currentChapter.id,
            )
            .maybeSingle();

          if (cancelled) return;

          if (progressError) {
            console.error(
              "Gagal mengambil progress membaca:",
              progressError,
            );
          } else if (
            progressData
          ) {
            const savedProgress =
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    (
                      progressData as ReadingProgress
                    ).progress ?? 0,
                  ),
                ),
              );

            setReadingProgress(
              savedProgress,
            );

            latestProgressRef.current =
              savedProgress;

            // Tunggu browser selesai
            // merender isi chapter.
            setTimeout(() => {
              if (cancelled) return;

              const documentHeight =
                document.documentElement
                  .scrollHeight;

              const windowHeight =
                window.innerHeight;

              const scrollableHeight =
                documentHeight -
                windowHeight;

              if (
                scrollableHeight > 0
              ) {
                window.scrollTo({
                  top:
                    (savedProgress /
                      100) *
                    scrollableHeight,
                  behavior:
                    "auto",
                });
              } else if (
                savedProgress >=
                100
              ) {
                window.scrollTo({
                  top: 0,
                  behavior:
                    "auto",
                });
              }
            }, 300);
          }
        }

        // =====================================================
        // 4. TAMBAH VIEWS
        // =====================================================

        const viewKey =
          `novel_view_${currentChapter.id}`;

        const alreadyViewed =
          sessionStorage.getItem(
            viewKey,
          );

        if (!alreadyViewed) {
          const {
            data: currentNovelStats,
            error: viewsReadError,
          } = await supabase
            .from("novels")
            .select("views")
            .eq(
              "id",
              currentNovel.id,
            )
            .maybeSingle();

          if (cancelled) return;

          if (viewsReadError) {
            console.error(
              "Gagal membaca views novel:",
              viewsReadError,
            );
          } else if (
            currentNovelStats
          ) {
            const currentViews =
              Number(
                currentNovelStats.views ??
                  0,
              );

            const {
              error:
                viewsUpdateError,
            } = await supabase
              .from("novels")
              .update({
                views:
                  currentViews + 1,
              })
              .eq(
                "id",
                currentNovel.id,
              );

            if (viewsUpdateError) {
              console.error(
                "Gagal menambahkan views:",
                viewsUpdateError,
              );
            } else {
              sessionStorage.setItem(
                viewKey,
                "true",
              );
            }
          }
        }

        // =====================================================
        // 5. AMBIL CHAPTER UNTUK NAVIGASI
        // =====================================================

        const {
          data:
            publishedChapters,
          error:
            navigationError,
        } = await supabase
          .from("chapters")
          .select(
            "id, novel_id, title, chapter_number, content, published, word_count",
          )
          .eq(
            "novel_id",
            currentChapter.novel_id,
          )
          .eq(
            "published",
            true,
          )
          .order(
            "chapter_number",
            {
              ascending: true,
            },
          );

        if (cancelled) return;

        if (navigationError) {
          console.error(
            "Gagal mengambil navigasi chapter:",
            navigationError,
          );

          setPreviousChapter(
            null,
          );

          setNextChapter(null);
        } else {
          const allPublishedChapters =
            (publishedChapters ??
              []) as Chapter[];

          const currentIndex =
            allPublishedChapters.findIndex(
              (item) =>
                item.id ===
                currentChapter.id,
            );

          if (
            currentIndex === -1
          ) {
            setPreviousChapter(
              null,
            );

            setNextChapter(
              null,
            );
          } else {
            setPreviousChapter(
              currentIndex > 0
                ? allPublishedChapters[
                    currentIndex -
                      1
                  ]
                : null,
            );

            setNextChapter(
              currentIndex <
                allPublishedChapters.length -
                  1
                ? allPublishedChapters[
                    currentIndex +
                      1
                  ]
                : null,
            );
          }
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "Kesalahan saat membuka chapter:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat membuka chapter.",
          );

          setLoading(false);
        }
      }
    }

    void fetchChapter();

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

  if (
    error ||
    !chapter ||
    !novel
  ) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error ||
            "Chapter tidak ditemukan."}
        </div>

        <Button
          variant="outline"
          className="mt-5"
          onClick={() =>
            navigate(-1)
          }
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

  // ===========================================================
  // RENDER
  // ===========================================================

  return (
    <div className="min-h-screen pb-16">
      {/* =====================================================
          PROGRESS BAR
      ====================================================== */}

      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-border">
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{
            width: `${readingProgress}%`,
          }}
        />
      </div>

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to={`/novel/${novel.id}`}
            className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft
              size={17}
            />

            <span className="truncate">
              {novel.title}
            </span>
          </Link>

          <span className="shrink-0 text-xs text-muted-foreground">
            Chapter{" "}
            {chapter.chapter_number}
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
            Chapter{" "}
            {chapter.chapter_number}
          </p>

          <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {chapter.title}
          </h1>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>
              {Number(
                chapter.word_count ??
                  0,
              ).toLocaleString(
                "id-ID",
              )}{" "}
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
            .map(
              (
                paragraph,
                index,
              ) => (
                <p
                  key={index}
                  className="mb-6 whitespace-pre-line"
                >
                  {paragraph}
                </p>
              ),
            )}
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
                      `/read/${previousChapter.id}`,
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
                      `/read/${nextChapter.id}`,
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
              Kamu sudah sampai di
              chapter terbaru.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Terima kasih sudah
              membaca{" "}
              {novel.title}.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}