import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// ===========================================================
// TYPES
// ===========================================================

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

// ===========================================================
// CONSTANTS
// ===========================================================

const RESTORE_PROGRESS_PREFIX = "restore_reading_progress_";
const LAST_READ_PREFIX = "last_read_chapter_";
const VIEW_PREFIX = "novel_view_";

// ===========================================================
// COMPONENT
// ===========================================================

export default function ReadChapterPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();

  // =========================================================
  // CHAPTER / NOVEL
  // =========================================================

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);

  const [previousChapter, setPreviousChapter] =
    useState<Chapter | null>(null);

  const [nextChapter, setNextChapter] =
    useState<Chapter | null>(null);

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [readingProgress, setReadingProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // COMMENTS
  // =========================================================

  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [commentTree, setCommentTree] = useState<CommentNode[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");

  const [commentProfiles, setCommentProfiles] = useState<
    Record<string, CommentProfile>
  >({});

  const [commentText, setCommentText] = useState("");

  const [replyingTo, setReplyingTo] =
    useState<ChapterComment | null>(null);

  const [deletingCommentId, setDeletingCommentId] =
    useState<string | null>(null);

  // =========================================================
  // REFS
  // =========================================================

  const saveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestProgressRef = useRef(0);

  const currentChapterRef =
    useRef<Chapter | null>(null);

  const currentNovelRef =
    useRef<Novel | null>(null);

  /**
   * Menandakan bahwa chapter saat ini memang harus
   * mengembalikan posisi bacaan yang tersimpan.
   */
  const restoreProgressRef = useRef(false);

  /**
   * Digunakan untuk mencegah hasil request lama
   * memengaruhi chapter yang sudah berubah.
   */
  const requestIdRef = useRef(0);

  // =========================================================
  // COMMENT TREE
  // =========================================================

  function buildCommentTree(
    commentList: ChapterComment[],
  ): CommentNode[] {
    const commentMap = new Map<string, CommentNode>();

    for (const comment of commentList) {
      commentMap.set(comment.id, {
        ...comment,
        children: [],
      });
    }

    const roots: CommentNode[] = [];

    for (const comment of commentList) {
      const node = commentMap.get(comment.id);

      if (!node) continue;

      if (!comment.parent_id) {
        roots.push(node);
      }
    }

    /**
     * Semua balasan dimasukkan ke parent langsungnya.
     *
     * Karena submitComment() menggunakan parent_id
     * dari komentar induk ketika membalas komentar tingkat 2,
     * struktur maksimum hanya 2 tingkat.
     */
    for (const comment of commentList) {
      if (!comment.parent_id) continue;

      const child = commentMap.get(comment.id);
      const parent = commentMap.get(comment.parent_id);

      if (!child || !parent) continue;

      parent.children.push(child);
    }

    roots.sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime(),
    );

    for (const root of roots) {
      root.children.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );
    }

    return roots;
  }

  useEffect(() => {
    setCommentTree(buildCommentTree(comments));
  }, [comments]);

  // =========================================================
  // DETERMINE RESTORE MODE
  // =========================================================

  useEffect(() => {
    if (!chapterId) return;

    const restoreKey =
      `${RESTORE_PROGRESS_PREFIX}${chapterId}`;

    const shouldRestore =
      sessionStorage.getItem(restoreKey) === "true";

    restoreProgressRef.current = shouldRestore;

    if (shouldRestore) {
      sessionStorage.removeItem(restoreKey);
    }
  }, [chapterId]);

  // =========================================================
  // SAVE READING PROGRESS
  // =========================================================

  async function saveReadingProgress(
    progressValue: number,
    chapterOverride?: Chapter | null,
    novelOverride?: Novel | null,
  ) {
    const currentChapter =
      chapterOverride ?? currentChapterRef.current;

    const currentNovel =
      novelOverride ?? currentNovelRef.current;

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
        Math.min(100, Math.round(progressValue)),
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
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,chapter_id",
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

  // =========================================================
  // LOAD COMMENTS
  // =========================================================

  async function loadComments(
    targetChapterId: string,
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
          [
            "id",
            "user_id",
            "novel_id",
            "chapter_id",
            "content",
            "created_at",
            "updated_at",
            "parent_id",
          ].join(", "),
        )
        .eq("chapter_id", targetChapterId)
        .eq("is_blocked", false)
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

      setComments(loadedComments);

      const userIds = [
        ...new Set(
          loadedComments
            .map((comment) => comment.user_id)
            .filter(Boolean),
        ),
      ];

      if (userIds.length === 0) {
        setCommentProfiles({});
        return;
      }

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

        return;
      }

      const profileMap: Record<
        string,
        CommentProfile
      > = {};

      for (const profile of profileData ?? []) {
        profileMap[profile.id] =
          profile as CommentProfile;
      }

      setCommentProfiles(profileMap);
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

  // =========================================================
  // COMMENT PARENT
  // =========================================================

  function getCommentParentId(
    target: ChapterComment | null,
  ): string | null {
    if (!target) {
      return null;
    }

    /**
     * Jika membalas komentar induk:
     * parent_id = id komentar induk.
     *
     * Jika membalas komentar tingkat 2:
     * parent_id = parent_id miliknya.
     *
     * Dengan demikian tidak ada tingkat 3.
     */
    if (!target.parent_id) {
      return target.id;
    }

    return target.parent_id;
  }

  // =========================================================
  // SUBMIT COMMENT
  // =========================================================

  async function submitComment() {
    const content = commentText.trim();

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

      const parentId =
        getCommentParentId(replyingTo);

      const { error: insertError } =
        await supabase
          .from("comments")
          .insert({
            user_id: user.id,
            novel_id: novel.id,
            chapter_id: chapter.id,
            content,
            parent_id: parentId,
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

      setCommentText("");
      setReplyingTo(null);
      setCommentsError("");

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

  // =========================================================
  // DELETE COMMENT
  // =========================================================

  async function deleteComment(
    comment: ChapterComment,
  ) {
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
          "Silakan login terlebih dahulu.",
        );
        return;
      }

      if (comment.user_id !== user.id) {
        setCommentsError(
          "Kamu hanya dapat menghapus komentar milikmu sendiri.",
        );
        return;
      }

      const confirmed = window.confirm(
        "Hapus komentar ini?",
      );

      if (!confirmed) {
        return;
      }

      setDeletingCommentId(comment.id);
      setCommentsError("");

      const { error: deleteError } =
        await supabase
          .from("comments")
          .delete()
          .eq("id", comment.id)
          .eq("user_id", user.id);

      if (deleteError) {
        console.error(
          "Gagal menghapus komentar:",
          deleteError,
        );

        setCommentsError(
          deleteError.message,
        );

        return;
      }

      if (replyingTo?.id === comment.id) {
        setReplyingTo(null);
        setCommentText("");
      }

      if (chapter?.id) {
        await loadComments(chapter.id);
      }
    } catch (err) {
      console.error(
        "Kesalahan saat menghapus komentar:",
        err,
      );

      setCommentsError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus komentar.",
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

  // =========================================================
  // SCROLL HELPERS
  // =========================================================

  function resetScrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });

    setReadingProgress(0);
    latestProgressRef.current = 0;
  }

  function getScrollProgress(): number {
    const documentHeight =
      document.documentElement.scrollHeight;

    const windowHeight = window.innerHeight;

    const scrollableHeight =
      documentHeight - windowHeight;

    if (scrollableHeight <= 0) {
      return 100;
    }

    const scrollTop =
      window.scrollY ||
      document.documentElement.scrollTop;

    const progress =
      (scrollTop / scrollableHeight) * 100;

    return Math.max(
      0,
      Math.min(100, Math.round(progress)),
    );
  }

  // =========================================================
  // CHAPTER CHANGE
  // =========================================================

  useEffect(() => {
    if (!chapterId) return;

    const currentRequestId =
      ++requestIdRef.current;

    let cancelled = false;

    async function fetchChapter() {
      setLoading(true);
      setError("");

      setChapter(null);
      setNovel(null);

      setPreviousChapter(null);
      setNextChapter(null);

      setComments([]);
      setCommentTree([]);
      setCommentProfiles({});
      setReplyingTo(null);
      setCommentText("");
      setCommentsError("");

      /**
       * Reset posisi hanya jika chapter baru
       * tidak membutuhkan restore progress.
       */
      if (!restoreProgressRef.current) {
        resetScrollToTop();
      }

      try {
        // =====================================================
        // 1. FETCH CHAPTER
        // =====================================================

        const {
          data: chapterData,
          error: chapterError,
        } = await supabase
          .from("chapters")
          .select(
            [
              "id",
              "novel_id",
              "title",
              "chapter_number",
              "content",
              "published",
              "word_count",
            ].join(", "),
          )
          .eq("id", chapterId)
          .eq("published", true)
          .maybeSingle();

        if (
          cancelled ||
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }

        if (chapterError) {
          console.error(
            "Gagal mengambil chapter:",
            chapterError,
          );

          setError(chapterError.message);
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
        // 2. FETCH NOVEL + USER
        // =====================================================

        const novelPromise = supabase
          .from("novels")
          .select("id, title, cover")
          .eq("id", currentChapter.novel_id)
          .eq("visibility", "public")
          .maybeSingle();

        const userPromise =
          supabase.auth.getUser();

        const [
          novelResult,
          userResult,
        ] = await Promise.all([
          novelPromise,
          userPromise,
        ]);

        if (
          cancelled ||
          currentRequestId !== requestIdRef.current
        ) {
          return;
        }

        const {
          data: novelData,
          error: novelError,
        } = novelResult;

        if (novelError) {
          console.error(
            "Gagal mengambil novel:",
            novelError,
          );

          setError(novelError.message);
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
        // 3. SET CURRENT DATA
        // =====================================================

        setChapter(currentChapter);
        setNovel(currentNovel);

        currentChapterRef.current =
          currentChapter;

        currentNovelRef.current =
          currentNovel;

        localStorage.setItem(
          `${LAST_READ_PREFIX}${currentChapter.novel_id}`,
          currentChapter.id,
        );

        setLoading(false);

        // =====================================================
        // 4. RESET SCROLL FOR NEW CHAPTER
        // =====================================================

        if (!restoreProgressRef.current) {
          requestAnimationFrame(() => {
            if (
              cancelled ||
              currentRequestId !==
                requestIdRef.current
            ) {
              return;
            }

            window.scrollTo({
              top: 0,
              behavior: "auto",
            });
          });
        }

        // =====================================================
        // 5. LOAD COMMENTS
        // =====================================================

        void loadComments(currentChapter.id);

        // =====================================================
        // 6. RESTORE READING PROGRESS
        // =====================================================

        const user =
          userResult.data.user;

        if (
          user &&
          restoreProgressRef.current
        ) {
          const {
            data: progressData,
            error: progressError,
          } = await supabase
            .from("reading_progress")
            .select(
              "user_id, novel_id, chapter_id, progress, updated_at",
            )
            .eq("user_id", user.id)
            .eq(
              "novel_id",
              currentNovel.id,
            )
            .eq(
              "chapter_id",
              currentChapter.id,
            )
            .maybeSingle();

          if (
            cancelled ||
            currentRequestId !==
              requestIdRef.current
          ) {
            return;
          }

          if (progressError) {
            console.error(
              "Gagal mengambil progress:",
              progressError,
            );
          } else if (progressData) {
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

            /**
             * Tunggu browser menyelesaikan render
             * isi chapter sebelum menghitung tinggi dokumen.
             */
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (
                  cancelled ||
                  currentRequestId !==
                    requestIdRef.current
                ) {
                  return;
                }

                const documentHeight =
                  document.documentElement
                    .scrollHeight;

                const windowHeight =
                  window.innerHeight;

                const scrollableHeight =
                  documentHeight -
                  windowHeight;

                if (
                  scrollableHeight <= 0
                ) {
                  window.scrollTo({
                    top: 0,
                    behavior: "auto",
                  });

                  return;
                }

                const targetPosition =
                  (savedProgress / 100) *
                  scrollableHeight;

                window.scrollTo({
                  top: targetPosition,
                  behavior: "auto",
                });
              });
            });
          }
        }

        // =====================================================
        // 7. NAVIGATION
        // =====================================================

        void (async () => {
          const {
            data: publishedChapters,
            error: navigationError,
          } = await supabase
            .from("chapters")
            .select(
              [
                "id",
                "novel_id",
                "title",
                "chapter_number",
                "content",
                "published",
                "word_count",
              ].join(", "),
            )
            .eq(
              "novel_id",
              currentChapter.novel_id,
            )
            .eq("published", true)
            .order("chapter_number", {
              ascending: true,
            });

          if (
            cancelled ||
            currentRequestId !==
              requestIdRef.current
          ) {
            return;
          }

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

          if (currentIndex === -1) {
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
              allPublishedChapters.length - 1
              ? allPublishedChapters[
                  currentIndex + 1
                ]
              : null,
          );
        })();

        // =====================================================
        // 8. NOVEL VIEWS
        // =====================================================

        void (async () => {
          const viewKey =
            `${VIEW_PREFIX}${currentChapter.id}`;

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
            .eq("id", currentNovel.id)
            .maybeSingle();

          if (
            cancelled ||
            currentRequestId !==
              requestIdRef.current
          ) {
            return;
          }

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
              currentNovelStats.views ?? 0,
            );

          const {
            error: viewsUpdateError,
          } = await supabase
            .from("novels")
            .update({
              views: currentViews + 1,
            })
            .eq("id", currentNovel.id);

          if (
            viewsUpdateError
          ) {
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

        if (
          !cancelled &&
          currentRequestId ===
            requestIdRef.current
        ) {
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

  // =========================================================
  // SCROLL / PROGRESS
  // =========================================================

  useEffect(() => {
    if (!chapter || !novel) {
      return;
    }

    currentChapterRef.current =
      chapter;

    currentNovelRef.current =
      novel;

    function handleScroll() {
      const progress =
        getScrollProgress();

      latestProgressRef.current =
        progress;

      setReadingProgress(progress);

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current,
        );
      }

      saveTimerRef.current =
        setTimeout(() => {
          void saveReadingProgress(
            progress,
            chapter,
            novel,
          );
        }, 800);
    }

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    /**
     * Saat chapter baru dimuat tanpa restore,
     * progress harus tetap 0.
     */
    if (!restoreProgressRef.current) {
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

      /**
       * Simpan progress terakhir sebelum
       * chapter/page ditinggalkan.
       */
      void saveReadingProgress(
        latestProgressRef.current,
        chapter,
        novel,
      );
    };
  }, [chapter, novel]);

  // =========================================================
  // PROFILE HELPERS
  // =========================================================

  function getDisplayName(
    userId: string,
  ): string {
    const profile =
      commentProfiles[userId];

    return (
      profile?.display_name ||
      profile?.username ||
      "Pengguna"
    );
  }

  // =========================================================
  // AVATAR
  // =========================================================

  function renderAvatar(
    profile: CommentProfile | undefined,
    displayName: string,
    size: "small" | "normal" = "normal",
  ) {
    const className =
      size === "small"
        ? "h-8 w-8"
        : "h-9 w-9";

    if (profile?.avatar) {
      return (
        <img
          src={profile.avatar}
          alt={displayName}
          className={`${className} shrink-0 rounded-full object-cover`}
        />
      );
    }

    return (
      <div
        className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-primary/10 ${
          size === "small"
            ? "text-xs"
            : "text-sm"
        } font-semibold text-primary`}
      >
        {displayName
          .charAt(0)
          .toUpperCase()}
      </div>
    );
  }

  // =========================================================
  // COMMENT REPLY FORM
  // =========================================================

  function renderReplyForm(
    target: ChapterComment,
    targetName: string,
  ) {
    if (replyingTo?.id !== target.id) {
      return null;
    }

    return (
      <div className="mt-4 border-t border-border pt-4">
        <textarea
          value={commentText}
          onChange={(event) =>
            setCommentText(
              event.target.value,
            )
          }
          placeholder={`Balas ${targetName}...`}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setReplyingTo(null);
              setCommentText("");
            }}
          >
            Batal
          </Button>

          <Button
            type="button"
            disabled={!commentText.trim()}
            onClick={() =>
              void submitComment()
            }
          >
            Kirim Balasan
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER COMMENT
  // =========================================================

  function renderComment(
    comment: CommentNode,
  ): JSX.Element {
    const profile =
      commentProfiles[
        comment.user_id
      ];

    const displayName =
      getDisplayName(
        comment.user_id,
      );

    return (
      <div
        key={comment.id}
        className="space-y-3"
      >
        {/* ===================================================
            COMMENT PARENT
        ==================================================== */}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {renderAvatar(
                profile,
                displayName,
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(
                    comment.created_at,
                  ).toLocaleString(
                    "id-ID",
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={
                deletingCommentId ===
                comment.id
              }
              onClick={() =>
                void deleteComment(
                  comment,
                )
              }
              className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              {deletingCommentId ===
              comment.id
                ? "Menghapus..."
                : "Hapus"}
            </button>
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground">
            {comment.content}
          </p>

          <div className="mt-3">
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              onClick={() => {
                setReplyingTo(
                  comment,
                );
                setCommentText("");
              }}
            >
              Balas
            </button>
          </div>

          {renderReplyForm(
            comment,
            displayName,
          )}
        </div>

        {/* ===================================================
            COMMENT CHILDREN
        ==================================================== */}

        {comment.children.length > 0 && (
          <div className="ml-6 space-y-3 border-l-2 border-border pl-4 sm:ml-10">
            {comment.children.map(
              (child) => {
                const childProfile =
                  commentProfiles[
                    child.user_id
                  ];

                const childName =
                  getDisplayName(
                    child.user_id,
                  );

                const parentName =
                  getDisplayName(
                    comment.user_id,
                  );

                return (
                  <div
                    key={child.id}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {renderAvatar(
                          childProfile,
                          childName,
                          "small",
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {childName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              child.created_at,
                            ).toLocaleString(
                              "id-ID",
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={
                          deletingCommentId ===
                          child.id
                        }
                        onClick={() =>
                          void deleteComment(
                            child,
                          )
                        }
                        className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        {deletingCommentId ===
                        child.id
                          ? "Menghapus..."
                          : "Hapus"}
                      </button>
                    </div>

                    {/* LABEL REPLY */}

                    {replyingTo?.id ===
                      child.id && (
                      <div className="mt-3 rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Membalas{" "}
                          <span className="font-semibold text-foreground">
                            @{parentName}
                          </span>
                        </p>
                      </div>
                    )}

                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground">
                      {child.content}
                    </p>

                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                        onClick={() => {
                          setReplyingTo(
                            child,
                          );
                          setCommentText("");
                        }}
                      >
                        Balas
                      </button>
                    </div>

                    {renderReplyForm(
                      child,
                      childName,
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // ERROR
  // =========================================================

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

  // =========================================================
  // NAVIGATION HANDLERS
  // =========================================================

  function goToChapter(
    targetChapter: Chapter,
  ) {
    /**
     * Chapter berikutnya/sebelumnya harus selalu
     * dimulai dari posisi paling atas.
     */
    restoreProgressRef.current =
      false;

    resetScrollToTop();

    navigate(
      `/read/${targetChapter.id}`,
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

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
            <ArrowLeft size={17} />

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
            HEADING
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
                chapter.word_count ?? 0,
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
            CHAPTER CONTENT
        ==================================================== */}

        <article className="font-serif text-base leading-8 text-foreground sm:text-lg sm:leading-9">
          {chapter.content
            .split(/\n\s*\n/)
            .map(
              (paragraph, index) => (
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
            CHAPTER NAVIGATION
        ==================================================== */}

        <div className="mt-12 border-t border-border pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
            {/* PREVIOUS */}

            <div className="flex justify-start">
              {previousChapter && (
                <Button
                  variant="outline"
                  onClick={() =>
                    goToChapter(
                      previousChapter,
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

            {/* CHAPTER LIST */}

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

            {/* NEXT */}

            <div className="flex justify-end">
              {nextChapter && (
                <Button
                  className="glow-primary-sm"
                  onClick={() =>
                    goToChapter(
                      nextChapter,
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
            COMMENTS
        ==================================================== */}

        <section className="mt-14 border-t border-border pt-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">
              Komentar
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Bagikan pendapatmu
              tentang chapter ini.
            </p>
          </div>

          {/* COMMENT FORM */}

          <div className="rounded-2xl border border-border bg-card p-4">
            {replyingTo && (
              <div className="mb-3 flex items-center justify-between rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Membalas{" "}
                  <span className="font-semibold text-foreground">
                    @
                    {getDisplayName(
                      replyingTo.user_id,
                    )}
                  </span>
                </p>

                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setReplyingTo(null);
                    setCommentText("");
                  }}
                >
                  Batal
                </button>
              </div>
            )}

            <textarea
              value={commentText}
              onChange={(event) =>
                setCommentText(
                  event.target.value,
                )
              }
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
                onClick={() =>
                  void submitComment()
                }
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

          {/* COMMENT ERROR */}

          {commentsError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {commentsError}
            </div>
          )}

          {/* COMMENT LIST */}

          <div className="mt-6">
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2
                  size={18}
                  className="mr-2 animate-spin"
                />

                Memuat komentar...
              </div>
            ) : commentTree.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Belum ada komentar.
              </div>
            ) : (
              <div className="space-y-4">
                {commentTree.map(
                  (comment) =>
                    renderComment(
                      comment,
                    ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================
            LAST CHAPTER
        ==================================================== */}

        {!nextChapter && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <BookOpen
              size={28}
              className="mx-auto text-primary"
            />

            <p className="mt-3 font-medium text-foreground">
              Kamu sudah sampai
              di chapter terbaru.
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