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

interface ChapterComment {
  id: string;
  user_id: string;
  novel_id: string;
  chapter_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
}

interface CommentNode extends ChapterComment {
  children: CommentNode[];
}

interface CommentProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
}

export default function ReadChapterPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);

  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentTree, setCommentTree] =
    useState<CommentNode[]>([]);
  const [replyingTo, setReplyingTo] =
    useState<ChapterComment | null>(null);

  const [commentText, setCommentText] =
    useState("");

  const [commentProfiles, setCommentProfiles] =
    useState<Record<string, CommentProfile>>({});

  useEffect(() => {
    setCommentTree(
      buildCommentTree(comments),
    );
  }, [comments]);
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

  const restoreProgressRef = useRef(false);

  // Menyimpan chapter dan novel yang sedang aktif.
  // Berguna ketika melakukan save progress saat halaman ditinggalkan.
  const currentChapterRef =
    useRef<Chapter | null>(null);

  const currentNovelRef =
    useRef<Novel | null>(null);

  // ===========================================================
  // CEK MODE "LANJUT MEMBACA"
  // ===========================================================

  useEffect(() => {
    if (!chapterId) return;

    const restoreKey =
      `restore_reading_progress_${chapterId}`;

    const shouldRestore =
      sessionStorage.getItem(restoreKey) === "true";

    restoreProgressRef.current =
      shouldRestore;

    if (shouldRestore) {
      sessionStorage.removeItem(
        restoreKey,
      );
    }
  }, [chapterId]);

  // ===========================================================
  // SIMPAN PROGRESS KE SUPABASE
  // ===========================================================

  async function saveReadingProgress(
    progressValue: number,
    chapterOverride?: Chapter | null,
    novelOverride?: Novel | null,
  ) {
    const currentChapter =
      chapterOverride ??
      currentChapterRef.current;

    const currentNovel =
      novelOverride ??
      currentNovelRef.current;

    if (!currentChapter || !currentNovel) {
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Gagal mendapatkan user:",
          userError,
        );
        return;
      }

      if (!user) return;

      const progress = Math.max(
        0,
        Math.min(
          100,
          Math.round(progressValue),
        ),
      );

      const { error: progressError } =
        await supabase
          .from("reading_progress")
          .upsert(
            {
              user_id: user.id,
              novel_id: currentNovel.id,
              chapter_id: currentChapter.id,
              progress,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                "user_id,chapter_id",
            },
          );

      if (progressError) {
        console.error(
          "Gagal menyimpan progress:",
          progressError,
        );
      }
    } catch (err) {
      console.error(
        "Kesalahan saat menyimpan progress:",
        err,
      );
    }
  }

  // ===========================================================
  // LOAD COMMENTS CHAPTER
  // ===========================================================

  async function loadComments(
    chapterId: string,
  ) {
    setCommentsLoading(true);
    setCommentsError("");

    try {
      const {
        data,
        error: commentsFetchError,
      } = await supabase
        .from("comments")
        .select(
          "id, user_id, novel_id, chapter_id, content, created_at, updated_at, parent_id",
        )
        .eq("chapter_id", chapterId)
        .order("created_at", {
          ascending: true,
        });

      if (commentsFetchError) {
        console.error(
          "Gagal mengambil komentar:",
          commentsFetchError,
        );

        setCommentsError(
          commentsFetchError.message,
        );

        return;
      }

      const loadedComments =
        (data ?? []) as ChapterComment[];

      const userIds = [
        ...new Set(
          loadedComments
            .map((comment) => comment.user_id)
            .filter(Boolean),
        ),
      ];

      if (userIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar",
          )
          .in("id", userIds);

        if (profileError) {
          console.error(
            "Gagal mengambil profil komentar:",
            profileError,
          );
        } else {
          const profileMap: Record<
            string,
            CommentProfile
          > = {};

          (profileData ?? []).forEach(
            (profile) => {
              profileMap[profile.id] =
                profile as CommentProfile;
            },
          );

          setCommentProfiles(
            profileMap,
          );
        }
      }

      setComments(
        (data ?? []) as ChapterComment[],
      );
    } catch (err) {
      console.error(
        "Kesalahan saat mengambil komentar:",
        err,
      );

      setCommentsError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil komentar.",
      );
    } finally {
      setCommentsLoading(false);
    }
  }

  function buildCommentTree(
    commentList: ChapterComment[],
  ): CommentNode[] {
    const commentMap =
      new Map<string, CommentNode>();

    const roots: CommentNode[] = [];

    for (const comment of commentList) {
      commentMap.set(
        comment.id,
        {
          ...comment,
          children: [],
        },
      );
    }

    for (const comment of commentList) {
      const node =
        commentMap.get(comment.id);

      if (!node) continue;

      if (
        comment.parent_id &&
        commentMap.has(comment.parent_id)
      ) {
        const parent =
          commentMap.get(
            comment.parent_id,
          );

        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  // ===========================================================
  // KIRIM KOMENTAR / BALASAN
  // ===========================================================

  async function submitComment() {
    const content =
      commentText.trim();

    if (!content || !chapter || !novel) {
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Gagal mendapatkan user:",
          userError,
        );

        return;
      }

      if (!user) {
        setCommentsError(
          "Silakan login terlebih dahulu untuk berkomentar.",
        );

        return;
      }

      const { error: insertError } =
        await supabase
          .from("comments")
          .insert({
            user_id: user.id,
            novel_id: novel.id,
            chapter_id: chapter.id,
            content,
            parent_id:
              replyingTo?.id ?? null,
          });

      if (insertError) {
        console.error(
          "Gagal mengirim komentar:",
          insertError,
        );

        setCommentsError(
          insertError.message,
        );

        return;
      }

      // Bersihkan form setelah berhasil.
      setCommentText("");
      setReplyingTo(null);
      setCommentsError("");

      // Ambil ulang komentar agar balasan
      // langsung masuk ke posisi yang benar.
      await loadComments(chapter.id);
    } catch (err) {
      console.error(
        "Kesalahan saat mengirim komentar:",
        err,
      );

      setCommentsError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim komentar.",
      );
    }
  }

  // ===========================================================
  // RESET SCROLL SAAT CHAPTER BERUBAH
  // ===========================================================

  useEffect(() => {
    if (!chapterId) return;

    /*
     * Chapter baru selalu mulai dari atas,
     * kecuali dibuka melalui tombol "Lanjut Membaca".
     */
    if (!restoreProgressRef.current) {
      window.scrollTo({
        top: 0,
        behavior: "auto",
      });

      setReadingProgress(0);
      latestProgressRef.current = 0;
    }
  }, [chapterId]);

  // ===========================================================
  // HITUNG DAN SIMPAN PROGRESS SCROLL
  // ===========================================================

  useEffect(() => {
    if (!chapter || !novel) return;

    currentChapterRef.current =
      chapter;

    currentNovelRef.current =
      novel;

    function handleScroll() {
      const documentHeight =
        document.documentElement.scrollHeight;

      const windowHeight =
        window.innerHeight;

      const scrollableHeight =
        documentHeight - windowHeight;

      if (scrollableHeight <= 0) {
        latestProgressRef.current = 100;

        setReadingProgress(100);

        if (saveTimerRef.current) {
          clearTimeout(
            saveTimerRef.current,
          );
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
        (scrollTop /
          scrollableHeight) *
        100;

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

    // Jangan langsung menyimpan 0%
    // ketika chapter baru saja dibuka.
    if (
      restoreProgressRef.current
    ) {
      handleScroll();
    } else {
      setReadingProgress(0);
      latestProgressRef.current = 0;
    }

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

      /*
       * Simpan posisi terakhir secara asynchronous.
       */
      void saveReadingProgress(
        latestProgressRef.current,
        chapter,
        novel,
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

      /*
       * Reset state lama supaya tidak terlihat
       * sebentar ketika pindah chapter.
       */
      setPreviousChapter(null);
      setNextChapter(null);

      try {
        // =====================================================
        // 1. AMBIL CHAPTER UTAMA
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

        // =====================================================
        // 2. AMBIL DATA NOVEL
        // =====================================================

        const novelPromise =
          supabase
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

        /*
         * Jalankan user request bersamaan
         * dengan request novel.
         */
        const userPromise =
          supabase.auth.getUser();

        const [
          novelResult,
          userResult,
        ] = await Promise.all([
          novelPromise,
          userPromise,
        ]);

        if (cancelled) return;

        const {
          data: novelData,
          error: novelError,
        } = novelResult;

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

        // =====================================================
        // 3. TAMPILKAN CHAPTER SECEPATNYA
        // =====================================================

        setChapter(
          currentChapter,
        );

        setNovel(
          currentNovel,
        );

        void loadComments(
          currentChapter.id,
        );

        currentChapterRef.current =
          currentChapter;

        currentNovelRef.current =
          currentNovel;

        localStorage.setItem(
          `last_read_chapter_${currentChapter.novel_id}`,
          currentChapter.id,
        );

        /*
         * Sangat penting:
         *
         * Kita tidak menunggu reading_progress,
         * views, dan navigasi sebelum menampilkan
         * chapter.
         */
        setLoading(false);

        // =====================================================
        // 4. RESET KE ATAS UNTUK CHAPTER BARU
        // =====================================================

        if (!restoreProgressRef.current) {
          setReadingProgress(0);

          latestProgressRef.current = 0;

          requestAnimationFrame(() => {
            window.scrollTo({
              top: 0,
              behavior: "auto",
            });
          });
        }

        // =====================================================
        // 5. READING PROGRESS
        //    BERJALAN DI BELAKANG
        // =====================================================

        const user =
          userResult.data.user;

        if (
          user &&
          restoreProgressRef.current
        ) {
          void (async () => {
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
                "Gagal mengambil progress:",
                progressError,
              );

              return;
            }

            if (!progressData) {
              return;
            }

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

            /*
             * Tunggu rendering selesai,
             * kemudian pulihkan posisi.
             */
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
              }
            }, 100);
          })();
        }

        // =====================================================
        // 6. NAVIGASI CHAPTER
        //    BERJALAN DI BELAKANG
        // =====================================================

        void (async () => {
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

            return;
          }

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
            return;
          }

          setPreviousChapter(
            currentIndex > 0
              ? allPublishedChapters[
                  currentIndex - 1
                ]
              : null,
          );

          setNextChapter(
            currentIndex <
              allPublishedChapters.length -
                1
              ? allPublishedChapters[
                  currentIndex + 1
                ]
              : null,
          );
        })();

        // =====================================================
        // 7. TAMBAH VIEWS
        //    BERJALAN DI BELAKANG
        // =====================================================

        void (async () => {
          const viewKey =
            `novel_view_${currentChapter.id}`;

          const alreadyViewed =
            sessionStorage.getItem(
              viewKey,
            );

          if (alreadyViewed) {
            return;
          }

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
              "Gagal membaca views:",
              viewsReadError,
            );

            return;
          }

          if (!currentNovelStats) {
            return;
          }

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

            return;
          }

          sessionStorage.setItem(
            viewKey,
            "true",
          );
        })();
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

  function renderComment(
    comment: CommentNode,
    level = 0,
  ): JSX.Element {
    return (
      <div
        key={comment.id}
        className={
          level > 0
            ? "ml-6 border-l border-border pl-4 sm:ml-8"
            : ""
        }
      >
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {(() => {
                const profile =
                  commentProfiles[comment.user_id];

                return (
                  profile?.display_name ||
                  profile?.username ||
                  "Pengguna"
                );
              })()}
            </span>

            <span className="text-xs text-muted-foreground">
              {new Date(
                comment.created_at,
              ).toLocaleString("id-ID")}
            </span>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground">
            {comment.content}
          </p>

          {replyingTo?.id === comment.id && (
            <div className="mt-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Tulis balasan..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-muted-foreground"
                >
                  Batal
                </button>
                <Button
                  type="button"
                  disabled={!commentText.trim()}
                  onClick={() => void submitComment()}
                >
                  Kirim Balasan
                </Button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="mt-3 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              setReplyingTo(comment);
            }}
          >
            Balas
          </button>
        </div>

        {comment.children.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.children.map(
              (child) =>
                renderComment(
                  child,
                  level + 1,
                ),
            )}
          </div>
        )}
      </div>
    );
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
            KOMENTAR CHAPTER
        ==================================================== */}

        <section className="mt-14 border-t border-border pt-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Komentar
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Bagikan pendapatmu tentang chapter ini.
            </p>
          </div>

          {/* FORM KOMENTAR */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <textarea
              value={commentText}
              onChange={(event) => {
                setCommentText(
                  event.target.value,
                );
              }}
              placeholder={
                replyingTo
                  ? "Tulis balasan..."
                  : "Tulis komentar..."
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none transition focus:border-primary"
            />

            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  void submitComment();
                }}
                disabled={
                  !commentText.trim()
                }
              >
                {replyingTo
                  ? "Kirim Balasan"
                  : "Kirim Komentar"}
              </Button>
            </div>
          </div>

          {/* ERROR */}
          {commentsError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {commentsError}
            </div>
          )}

          {/* DAFTAR KOMENTAR */}
          <div className="mt-6">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2
                  size={18}
                  className="mr-2 animate-spin"
                />

                Memuat komentar...
              </div>
            ) : commentTree.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada komentar.
              </div>
            ) : (
              <div className="space-y-4">
                {commentTree.map(
                  (comment) =>
                    renderComment(comment),
                )}
              </div>
            )}
          </div>
        </section>

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
                  onClick={() => {
                    restoreProgressRef.current =
                      false;

                    setReadingProgress(0);

                    latestProgressRef.current =
                      0;

                    window.scrollTo({
                      top: 0,
                      behavior: "auto",
                    });

                    navigate(
                      `/read/${previousChapter.id}`,
                    );
                  }}
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
                  onClick={() => {
                    restoreProgressRef.current =
                      false;

                    setReadingProgress(0);

                    latestProgressRef.current =
                      0;

                    window.scrollTo({
                      top: 0,
                      behavior: "auto",
                    });

                    navigate(
                      `/read/${nextChapter.id}`,
                    );
                  }}
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