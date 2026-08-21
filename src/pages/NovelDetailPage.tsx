  import { useEffect, useMemo, useState } from "react";
  import { Link, useParams } from "react-router-dom";
  import {
    ArrowLeft,
    BookOpen,
    Bookmark,
    ChevronLeft,
    ChevronRight,
    Eye,
    Flag,
    ListOrdered,
    Loader2,
    Play,
    Star,
    X,
    Send,
    MessageCircle,
    Trash2,
    Reply,
  } from "lucide-react";

  import { supabase } from "@/lib/supabase";
  import { useAuth } from "@/contexts/AuthContext";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { EmptyState } from "@/components/EmptyState";

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

  interface Author {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar: string | null;
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

  interface RatingSummary {
    average: number;
    count: number;
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

  interface CommentRow {
    id: string;
    user_id: string;
    novel_id: string;
    chapter_id: string | null;
    parent_id: string | null;
    content: string;
    created_at: string | null;
    updated_at: string | null;
    author: Author | null;
  }

  interface Comment extends CommentRow {
    replies: CommentRow[];
  }

  const REPORT_REASONS = [
    {
      value: "inappropriate_content",
      label: "Konten tidak sesuai standar website",
    },
    {
      value: "plagiarism",
      label: "Plagiarisme / menjiplak karya orang lain",
    },
    {
      value: "illegal_content",
      label: "Konten ilegal atau berbahaya",
    },
    {
      value: "hate_or_harassment",
      label: "Kebencian, pelecehan, atau diskriminasi",
    },
    {
      value: "spam",
      label: "Spam atau konten tidak relevan",
    },
    {
      value: "other",
      label: "Lainnya",
    },
  ];

  const CHAPTERS_PER_PAGE = 100;

  type ReplyFormProps = {
    replyingTo: string | null;
    replyRootId: string | null;
    replyingToName: string;
    replyText: string;
    replyLoading: boolean;
    onReplyTextChange: (value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
    onClearError: () => void;
  };

  function ReplyForm({
    replyingTo,
    replyRootId,
    replyingToName,
    replyText,
    replyLoading,
    onReplyTextChange,
    onCancel,
    onSubmit,
    onClearError,
  }: ReplyFormProps) {
    if (!replyingTo || !replyRootId) {
      return null;
    }

    return (
      <div className="mt-3 rounded-xl border border-border bg-background p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Membalas{" "}
            <span className="font-medium text-foreground">
              {replyingToName}
            </span>
          </p>

          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Batal
          </button>
        </div>

        <textarea
          value={replyText}
          onChange={(event) => {
            onReplyTextChange(event.target.value);
            onClearError();
          }}
          rows={3}
          maxLength={2000}
          disabled={replyLoading}
          placeholder={`Balas ${replyingToName}...`}
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {replyText.length}/2000
          </p>

          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={replyLoading || !replyText.trim()}
          >
            {replyLoading ? (
              <>
                <Loader2 size={15} className="mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send size={15} className="mr-2" />
                Kirim Balasan
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  /* ===========================================================
     KOMENTAR UTAMA
     =========================================================== */

  type MainCommentProps = {
    comment: Comment;
    currentUserId: string | null;
    replyingTo: string | null;
    replyRootId: string | null;
    replyingToName: string;
    replyText: string;
    replyLoading: boolean;
    commentDeletingId: string | null;
    onStartReply: (comment: CommentRow, rootId: string) => void;
    onDeleteComment: (commentId: string) => void;
    onReplyTextChange: (value: string) => void;
    onCancelReply: () => void;
    onSubmitReply: () => void;
    onClearError: () => void;
    formatCommentDate: (value: string | null) => string;
  };

  function MainComment({
    comment,
    currentUserId,
    replyingTo,
    replyRootId,
    replyingToName,
    replyText,
    replyLoading,
    commentDeletingId,
    onStartReply,
    onDeleteComment,
    onReplyTextChange,
    onCancelReply,
    onSubmitReply,
    onClearError,
    formatCommentDate,
  }: MainCommentProps) {
    const displayName =
      comment.author?.display_name ||
      comment.author?.username ||
      "Pengguna";

    const avatar = comment.author?.avatar;

    const isMyComment =
      currentUserId === comment.user_id;

    return (
      <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatCommentDate(comment.created_at)}

                  {comment.updated_at &&
                    comment.created_at &&
                    comment.updated_at !== comment.created_at && (
                      <>
                        {" "}
                        • diedit
                      </>
                    )}
                </p>
              </div>

              {isMyComment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteComment(comment.id)}
                  disabled={commentDeletingId === comment.id}
                  className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  {commentDeletingId === comment.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}

                  <span className="sr-only">
                    Hapus komentar
                  </span>
                </Button>
              )}
            </div>

            <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
              {comment.content}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {currentUserId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onStartReply(comment, comment.id)
                  }
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                >
                  <Reply size={14} className="mr-1.5" />

                  {replyingTo === comment.id
                    ? "Batal"
                    : "Balas"}
                </Button>
              )}
            </div>

            {replyingTo === comment.id && (
              <ReplyForm
                replyingTo={replyingTo}
                replyRootId={replyRootId}
                replyingToName={replyingToName}
                replyText={replyText}
                replyLoading={replyLoading}
                onReplyTextChange={onReplyTextChange}
                onClearError={onClearError}
                onCancel={onCancelReply}
                onSubmit={onSubmitReply}
              />
            )}
          </div>
        </div>

        {comment.replies.length > 0 && (
          <div className="mt-4 space-y-3 border-l-2 border-primary/10 pl-4 sm:ml-4 sm:pl-5">
            {comment.replies.map((reply) => (
              <ReplyComment
                key={reply.id}
                reply={reply}
                rootId={comment.id}
                currentUserId={currentUserId}
                replyingTo={replyingTo}
                replyRootId={replyRootId}
                replyingToName={replyingToName}
                replyText={replyText}
                replyLoading={replyLoading}
                commentDeletingId={commentDeletingId}
                onStartReply={onStartReply}
                onDeleteComment={onDeleteComment}
                onReplyTextChange={onReplyTextChange}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                onClearError={onClearError}
                formatCommentDate={formatCommentDate}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ===========================================================
     BALASAN KOMENTAR
     =========================================================== */

  type ReplyCommentProps = {
    reply: CommentRow;
    rootId: string;
    currentUserId: string | null;
    replyingTo: string | null;
    replyRootId: string | null;
    replyingToName: string;
    replyText: string;
    replyLoading: boolean;
    commentDeletingId: string | null;
    onStartReply: (comment: CommentRow, rootId: string) => void;
    onDeleteComment: (commentId: string) => void;
    onReplyTextChange: (value: string) => void;
    onCancelReply: () => void;
    onSubmitReply: () => void;
    onClearError: () => void;
    formatCommentDate: (value: string | null) => string;
  };

  function ReplyComment({
    reply,
    rootId,
    currentUserId,
    replyingTo,
    replyRootId,
    replyingToName,
    replyText,
    replyLoading,
    commentDeletingId,
    onStartReply,
    onDeleteComment,
    onReplyTextChange,
    onCancelReply,
    onSubmitReply,
    onClearError,
    formatCommentDate,
  }: ReplyCommentProps) {
    const displayName =
      reply.author?.display_name ||
      reply.author?.username ||
      "Pengguna";

    const avatar = reply.author?.avatar;

    const isMyComment =
      currentUserId === reply.user_id;

    return (
      <div className="rounded-xl border border-border/60 bg-background/60 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatCommentDate(reply.created_at)}

                  {reply.updated_at &&
                    reply.created_at &&
                    reply.updated_at !== reply.created_at && (
                      <>
                        {" "}
                        • diedit
                      </>
                    )}
                </p>
              </div>

              {isMyComment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteComment(reply.id)}
                  disabled={commentDeletingId === reply.id}
                  className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  {commentDeletingId === reply.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}

                  <span className="sr-only">
                    Hapus balasan
                  </span>
                </Button>
              )}
            </div>

            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
              {reply.content}
            </p>

            <div className="mt-2 flex items-center gap-2">
              {currentUserId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onStartReply(reply, rootId)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-primary"
                >
                  <Reply size={14} className="mr-1.5" />

                  {replyingTo === reply.id
                    ? "Batal"
                    : "Balas"}
                </Button>
              )}
            </div>

            {replyingTo === reply.id && (
              <ReplyForm
                replyingTo={replyingTo}
                replyRootId={replyRootId}
                replyingToName={replyingToName}
                replyText={replyText}
                replyLoading={replyLoading}
                onReplyTextChange={onReplyTextChange}
                onClearError={onClearError}
                onCancel={onCancelReply}
                onSubmit={onSubmitReply}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  export default function NovelDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();

    const [novel, setNovel] = useState<Novel | null>(null);
    const [author, setAuthor] = useState<Author | null>(null);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);

    const [ratingSummary, setRatingSummary] =
      useState<RatingSummary>({
        average: 0,
        count: 0,
      });

    const [userRating, setUserRating] =
      useState<number | null>(null);

    const [ratingLoading, setRatingLoading] =
      useState(false);

    const [hoverRating, setHoverRating] =
      useState<number | null>(null);

    const [lastReadChapterId, setLastReadChapterId] =
      useState<string | null>(null);

    const [isInLibrary, setIsInLibrary] =
      useState(false);

    const [libraryLoading, setLibraryLoading] =
      useState(false);

    const [showReportForm, setShowReportForm] =
      useState(false);

    const [reportReason, setReportReason] =
      useState("");

    const [reportDescription, setReportDescription] =
      useState("");

    const [reportLoading, setReportLoading] =
      useState(false);

    const [reportMessage, setReportMessage] =
      useState("");

    const [reportError, setReportError] =
      useState("");

    const [comments, setComments] =
      useState<Comment[]>([]);

    const [commentContent, setCommentContent] =
      useState("");

    const [commentLoading, setCommentLoading] =
      useState(false);

    const [commentSubmitting, setCommentSubmitting] =
      useState(false);

    const [commentDeletingId, setCommentDeletingId] =
      useState<string | null>(null);

    const [commentError, setCommentError] =
      useState("");

    const [replyingTo, setReplyingTo] =
      useState<string | null>(null);

    const [replyRootId, setReplyRootId] =
      useState<string | null>(null);

    const [replyingToName, setReplyingToName] =
      useState("");

    const [replyText, setReplyText] =
      useState("");

    const [replyLoading, setReplyLoading] =
      useState(false);

    const [loading, setLoading] =
      useState(true);

    const [error, setError] =
      useState("");

    const [chapterPage, setChapterPage] =
      useState(1);

    function buildCommentTree(
      rows: CommentRow[],
    ): Comment[] {
      const commentMap =
        new Map<string, Comment>();

      const roots: Comment[] = [];

      rows.forEach((row) => {
        commentMap.set(row.id, {
          ...row,
          replies: [],
        });
      });

      rows.forEach((row) => {
        const comment =
          commentMap.get(row.id);

        if (!comment) {
          return;
        }

        if (!row.parent_id) {
          roots.push(comment);
          return;
        }

        const parent =
          commentMap.get(row.parent_id);

        if (parent) {
          parent.replies.push(comment);
        } else {
          roots.push(comment);
        }
      });

      roots.sort((a, b) => {
        const aTime = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const bTime = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return bTime - aTime;
      });

      roots.forEach((root) => {
        root.replies.sort((a, b) => {
          const aTime = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const bTime = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return aTime - bTime;
        });
      });

      return roots;
    }

    function countComments(
      items: Comment[],
    ): number {
      return items.reduce(
        (total, comment) =>
          total + 1 + comment.replies.length,
        0,
      );
    }

    async function loadComments(
      novelId: string,
    ) {
      setCommentLoading(true);
      setCommentError("");

      try {
        const {
          data,
          error: commentsError,
        } = await supabase
          .from("comments")
          .select(
            `
              id,
              user_id,
              novel_id,
              chapter_id,
              parent_id,
              content,
              created_at,
              updated_at
            `,
          )
          .eq("novel_id", novelId)
          .is("chapter_id", null)
          .order("created_at", {
            ascending: true,
          });

        if (commentsError) {
          console.error(
            "Gagal mengambil komentar:",
            commentsError,
          );

          setComments([]);

          setCommentError(
            `Gagal memuat komentar: ${commentsError.message}`,
          );

          return;
        }

        const rows =
          (data ?? []) as CommentRow[];

        if (rows.length === 0) {
          setComments([]);
          return;
        }

        const userIds = Array.from(
          new Set(
            rows.map(
              (row) => row.user_id,
            ),
          ),
        );

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              username,
              display_name,
              avatar
            `,
          )
          .in("id", userIds);

        if (profileError) {
          console.error(
            "Gagal mengambil profil komentar:",
            profileError,
          );
        }

        const profiles =
          (profileData ?? []) as Author[];

        const profileMap =
          new Map<string, Author>();

        profiles.forEach((profile) => {
          profileMap.set(
            profile.id,
            profile,
          );
        });

        const rowsWithAuthors =
          rows.map((row) => ({
            ...row,
            author:
              profileMap.get(
                row.user_id,
              ) ?? null,
          }));

        const tree =
          buildCommentTree(
            rowsWithAuthors,
          );

        setComments(tree);
      } catch (err) {
        console.error(
          "Kesalahan saat memuat komentar:",
          err,
        );

        setComments([]);

        setCommentError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat komentar.",
        );
      } finally {
        setCommentLoading(false);
      }
    }

    useEffect(() => {
      if (!id) {
        setError(
          "ID novel tidak ditemukan.",
        );
        setLoading(false);
        return;
      }

      let cancelled = false;

      async function loadNovel() {
        setLoading(true);
        setError("");

        setNovel(null);
        setAuthor(null);
        setGenres([]);
        setChapters([]);
        setComments([]);
        setCommentContent("");
        setCommentError("");
        setLastReadChapterId(null);
        setIsInLibrary(false);
        setUserRating(null);

        setRatingSummary({
          average: 0,
          count: 0,
        });

        setReplyingTo(null);
        setReplyRootId(null);
        setReplyingToName("");
        setReplyText("");

        setChapterPage(1);

        try {
          const {
            data: novelData,
            error: novelError,
          } = await supabase
            .from("novels")
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
              `,
            )
            .eq("id", id)
            .maybeSingle();

          if (cancelled) return;

          if (novelError) {
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

          const {
            data: authorData,
            error: authorError,
          } = await supabase
            .from("profiles")
            .select(
              `
                id,
                username,
                display_name,
                avatar
              `,
            )
            .eq(
              "id",
              currentNovel.author_id,
            )
            .maybeSingle();

          if (cancelled) return;

          if (authorError) {
            setAuthor(null);
          } else {
            setAuthor(
              authorData as Author | null,
            );
          }

          const {
            data: ratingData,
            error: ratingError,
          } = await supabase
            .from("ratings")
            .select("rating")
            .eq(
              "novel_id",
              currentNovel.id,
            );

          if (cancelled) return;

          if (ratingError) {
            setRatingSummary({
              average: 0,
              count: 0,
            });
          } else {
            const ratings =
              (ratingData ?? []) as {
                rating: number;
              }[];

            const count =
              ratings.length;

            const average =
              count > 0
                ? ratings.reduce(
                    (
                      sum,
                      item,
                    ) =>
                      sum +
                      Number(
                        item.rating,
                      ),
                    0,
                  ) / count
                : 0;

            setRatingSummary({
              average,
              count,
            });
          }

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (cancelled) return;

          if (user) {
            const {
              data: userRatingData,
              error: userRatingError,
            } = await supabase
              .from("ratings")
              .select("rating")
              .eq(
                "novel_id",
                currentNovel.id,
              )
              .eq(
                "user_id",
                user.id,
              )
              .maybeSingle();

            if (cancelled) return;

            if (userRatingError) {
              setUserRating(null);
            } else {
              setUserRating(
                userRatingData
                  ? Number(
                      userRatingData.rating,
                    )
                  : null,
              );
            }

            const {
              data: libraryData,
              error: libraryError,
            } = await supabase
              .from("user_library")
              .select("id")
              .eq(
                "user_id",
                user.id,
              )
              .eq(
                "novel_id",
                currentNovel.id,
              )
              .maybeSingle();

            if (cancelled) return;

            if (libraryError) {
              setIsInLibrary(false);
            } else {
              setIsInLibrary(
                Boolean(
                  libraryData,
                ),
              );
            }
          } else {
            setUserRating(null);
            setIsInLibrary(false);
          }

          const {
            data: genreData,
            error: genreError,
          } = await supabase
            .from("novel_genres")
            .select(
              `
                genre_id,
                genres (
                  id,
                  name,
                  slug
                )
              `,
            )
            .eq(
              "novel_id",
              id,
            );

          if (cancelled) return;

          if (genreError) {
            setGenres([]);
          } else {
            const rows =
              (genreData ?? []) as unknown as NovelGenreRow[];

            const genreList =
              rows
                .map(
                  (row) =>
                    row.genres,
                )
                .filter(
                  (
                    genre,
                  ): genre is Genre =>
                    genre !== null,
                );

            setGenres(genreList);
          }

          const {
            data: chapterData,
            error: chapterError,
          } = await supabase
            .from("chapters")
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
              `,
            )
            .eq(
              "novel_id",
              currentNovel.id,
            )
            .eq(
              "published",
              true,
            )
            .order(
              "chapter_number",
              {
                ascending: false,
              },
            );

          if (cancelled) return;

          if (chapterError) {
            setChapters([]);
          } else {
            const chapterList =
              (chapterData ?? []) as Chapter[];

            setChapters(chapterList);

            if (user) {
              const {
                data: progressData,
                error: progressError,
              } = await supabase
                .from("reading_progress")
                .select(
                  "chapter_id, progress, updated_at",
                )
                .eq(
                  "user_id",
                  user.id,
                )
                .eq(
                  "novel_id",
                  currentNovel.id,
                )
                .order(
                  "updated_at",
                  {
                    ascending: false,
                  },
                )
                .limit(1)
                .maybeSingle();

              if (cancelled) return;

              if (progressError) {
                setLastReadChapterId(null);
              } else if (progressData) {
                const chapterExists =
                  chapterList.some(
                    (chapter) =>
                      chapter.id ===
                      progressData.chapter_id,
                  );

                setLastReadChapterId(
                  chapterExists
                    ? progressData.chapter_id
                    : null,
                );
              } else {
                setLastReadChapterId(null);
              }
            } else {
              setLastReadChapterId(null);
            }
          }

          if (!cancelled) {
            await loadComments(
              currentNovel.id,
            );
          }

          if (!cancelled) {
            setLoading(false);
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Terjadi kesalahan saat memuat novel.",
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

    const totalChapterPages =
      Math.max(
        1,
        Math.ceil(
          chapters.length /
            CHAPTERS_PER_PAGE,
        ),
      );

    const paginatedChapters =
      useMemo(() => {
        const start =
          (chapterPage - 1) *
          CHAPTERS_PER_PAGE;

        const end =
          start +
          CHAPTERS_PER_PAGE;

        return chapters.slice(
          start,
          end,
        );
      }, [
        chapters,
        chapterPage,
      ]);

    useEffect(() => {
      if (
        chapterPage >
        totalChapterPages
      ) {
        setChapterPage(
          totalChapterPages,
        );
      }
    }, [
      chapterPage,
      totalChapterPages,
    ]);

    function changeChapterPage(
      page: number,
    ) {
      const safePage =
        Math.min(
          Math.max(page, 1),
          totalChapterPages,
        );

      setChapterPage(safePage);

      window.setTimeout(() => {
        const chapterSection =
          document.getElementById(
            "chapter-list",
          );

        if (chapterSection) {
          chapterSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 50);
    }

    async function submitRating(
      value: number,
    ) {
      if (!novel) return;

      if (
        value < 1 ||
        value > 5
      ) {
        return;
      }

      setRatingLoading(true);

      try {
        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError || !user) {
          alert(
            "Silakan login terlebih dahulu untuk memberikan rating.",
          );
          return;
        }

        const {
          error: ratingError,
        } = await supabase
          .from("ratings")
          .upsert(
            {
              novel_id:
                novel.id,
              user_id:
                user.id,
              rating:
                value,
            },
            {
              onConflict:
                "user_id,novel_id",
            },
          );

        if (ratingError) {
          alert(
            `Gagal menyimpan rating: ${ratingError.message}`,
          );
          return;
        }

        setUserRating(value);

        const {
          data: ratingData,
        } = await supabase
          .from("ratings")
          .select("rating")
          .eq(
            "novel_id",
            novel.id,
          );

        const ratings =
          (ratingData ?? []) as {
            rating: number;
          }[];

        const count =
          ratings.length;

        const average =
          count > 0
            ? ratings.reduce(
                (
                  sum,
                  item,
                ) =>
                  sum +
                  Number(
                    item.rating,
                  ),
                0,
              ) / count
            : 0;

        setRatingSummary({
          average,
          count,
        });
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menyimpan rating.",
        );
      } finally {
        setRatingLoading(false);
      }
    }

    async function toggleLibrary() {
      if (!novel) return;

      setLibraryLoading(true);

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user) {
          alert(
            "Silakan login terlebih dahulu untuk menambahkan novel ke Rak.",
          );
          return;
        }

        if (isInLibrary) {
          const {
            error: deleteError,
          } = await supabase
            .from("user_library")
            .delete()
            .eq(
              "user_id",
              user.id,
            )
            .eq(
              "novel_id",
              novel.id,
            );

          if (deleteError) {
            alert(
              "Gagal menghapus novel dari Rak.",
            );
            return;
          }

          setIsInLibrary(false);
          return;
        }

        const {
          error: insertError,
        } = await supabase
          .from("user_library")
          .insert({
            user_id:
              user.id,
            novel_id:
              novel.id,
          });

        if (insertError) {
          if (
            insertError.code ===
            "23505"
          ) {
            setIsInLibrary(true);
            return;
          }

          alert(
            "Gagal menambahkan novel ke Rak.",
          );
          return;
        }

        setIsInLibrary(true);
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memperbarui Rak.",
        );
      } finally {
        setLibraryLoading(false);
      }
    }

    function openReportForm() {
      if (!currentUser) {
        alert(
          "Silakan login terlebih dahulu untuk melaporkan novel.",
        );
        return;
      }

      if (!novel) return;

      setReportReason("");
      setReportDescription("");
      setReportMessage("");
      setReportError("");
      setShowReportForm(true);
    }

    async function submitReport() {
      if (!novel) return;

      if (!currentUser) {
        setReportError(
          "Silakan login terlebih dahulu untuk melaporkan novel.",
        );
        return;
      }

      if (!reportReason) {
        setReportError(
          "Silakan pilih alasan laporan.",
        );
        return;
      }

      setReportLoading(true);
      setReportError("");
      setReportMessage("");

      try {
        const {
          data: existingReport,
        } = await supabase
          .from("reports")
          .select("id")
          .eq(
            "reporter_id",
            currentUser.id,
          )
          .eq(
            "target_type",
            "novel",
          )
          .eq(
            "target_id",
            novel.id,
          )
          .maybeSingle();

        if (existingReport) {
          setReportError(
            "Kamu sudah pernah melaporkan novel ini. Laporanmu sedang menunggu peninjauan admin.",
          );
          return;
        }

        const {
          error: insertReportError,
        } = await supabase
          .from("reports")
          .insert({
            reporter_id:
              currentUser.id,
            target_type:
              "novel",
            target_id:
              novel.id,
            reason:
              reportReason,
            description:
              reportDescription.trim() ||
              null,
            status:
              "pending",
          });

        if (insertReportError) {
          if (
            insertReportError.code ===
            "23505"
          ) {
            setReportError(
              "Kamu sudah pernah melaporkan novel ini.",
            );
          } else {
            setReportError(
              `Gagal mengirim laporan: ${insertReportError.message}`,
            );
          }

          return;
        }

        setReportMessage(
          "Laporan berhasil dikirim. Tim admin akan meninjau novel ini.",
        );

        setReportReason("");
        setReportDescription("");

        window.setTimeout(() => {
          setShowReportForm(false);
          setReportMessage("");
        }, 1800);
      } catch (err) {
        setReportError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengirim laporan.",
        );
      } finally {
        setReportLoading(false);
      }
    }

    function getCurrentUserAuthor(): Author {
      if (!currentUser) {
        return {
          id: "",
          username: null,
          display_name:
            "Pengguna",
          avatar: null,
        };
      }

      return {
        id: currentUser.id,
        username:
          currentUser.user_metadata
            ?.username ??
          null,
        display_name:
          currentUser.user_metadata
            ?.display_name ??
          currentUser.user_metadata
            ?.full_name ??
          currentUser.email?.split(
            "@",
          )[0] ??
          "User",
        avatar:
          currentUser.user_metadata
            ?.avatar ??
          currentUser.user_metadata
            ?.avatar_url ??
          null,
      };
    }

    async function submitComment() {
      if (!novel) return;

      const content =
        commentContent.trim();

      if (!content) {
        setCommentError(
          "Komentar tidak boleh kosong.",
        );
        return;
      }

      if (content.length > 2000) {
        setCommentError(
          "Komentar maksimal 2000 karakter.",
        );
        return;
      }

      if (!currentUser) {
        setCommentError(
          "Silakan login terlebih dahulu untuk berkomentar.",
        );
        return;
      }

      setCommentSubmitting(true);
      setCommentError("");

      try {
        const {
          data: insertedComment,
          error: insertCommentError,
        } = await supabase
          .from("comments")
          .insert({
            user_id:
              currentUser.id,
            novel_id:
              novel.id,
            chapter_id:
              null,
            parent_id:
              null,
            content,
          })
          .select(
            `
              id,
              user_id,
              novel_id,
              chapter_id,
              parent_id,
              content,
              created_at,
              updated_at
            `,
          )
          .single();

        if (insertCommentError) {
          setCommentError(
            `Gagal mengirim komentar: ${insertCommentError.message}`,
          );
          return;
        }

        const newComment =
          insertedComment as CommentRow;

        const newCommentWithAuthor: Comment =
          {
            ...newComment,
            author:
              getCurrentUserAuthor(),
            replies: [],
          };

        setComments(
          (previous) => [
            newCommentWithAuthor,
            ...previous,
          ],
        );

        setCommentContent("");
      } catch (err) {
        setCommentError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengirim komentar.",
        );
      } finally {
        setCommentSubmitting(false);
      }
    }

    function startReply(
      comment: CommentRow,
      rootId: string,
    ) {
      if (!currentUser) {
        setCommentError(
          "Silakan login terlebih dahulu untuk membalas komentar.",
        );
        return;
      }

      const displayName =
        comment.author?.display_name ||
        comment.author?.username ||
        "Pengguna";

      if (
        replyingTo ===
        comment.id
      ) {
        setReplyingTo(null);
        setReplyRootId(null);
        setReplyingToName("");
        setReplyText("");
        setCommentError("");
        return;
      }

      setReplyingTo(comment.id);
      setReplyRootId(rootId);
      setReplyingToName(displayName);
      setReplyText("");
      setCommentError("");
    }

    async function submitReply() {
      if (!novel) return;

      if (!replyRootId) {
        setCommentError(
          "Komentar utama tidak ditemukan.",
        );
        return;
      }

      const content =
        replyText.trim();

      if (!content) {
        setCommentError(
          "Balasan tidak boleh kosong.",
        );
        return;
      }

      if (content.length > 2000) {
        setCommentError(
          "Balasan maksimal 2000 karakter.",
        );
        return;
      }

      if (!currentUser) {
        setCommentError(
          "Silakan login terlebih dahulu untuk membalas komentar.",
        );
        return;
      }

      setReplyLoading(true);
      setCommentError("");

      try {
        const {
          data: insertedReply,
          error: insertReplyError,
        } = await supabase
          .from("comments")
          .insert({
            user_id:
              currentUser.id,
            novel_id:
              novel.id,
            chapter_id:
              null,
            parent_id:
              replyRootId,
            content,
          })
          .select(
            `
              id,
              user_id,
              novel_id,
              chapter_id,
              parent_id,
              content,
              created_at,
              updated_at
            `,
          )
          .single();

        if (insertReplyError) {
          setCommentError(
            `Gagal mengirim balasan: ${insertReplyError.message}`,
          );
          return;
        }

        const reply =
          insertedReply as CommentRow;

        const newReply: CommentRow =
          {
            ...reply,
            author:
              getCurrentUserAuthor(),
          };

        setComments(
          (previous) =>
            previous.map(
              (root) => {
                if (
                  root.id !==
                  replyRootId
                ) {
                  return root;
                }

                const replies = [
                  ...root.replies,
                ];

                const targetIndex =
                  replies.findIndex(
                    (reply) =>
                      reply.id ===
                      replyingTo,
                  );

                if (
                  targetIndex === -1
                ) {
                  replies.push(
                    newReply,
                  );
                } else {
                  replies.splice(
                    targetIndex + 1,
                    0,
                    newReply,
                  );
                }

                return {
                  ...root,
                  replies,
                };
              },
            ),
        );

        setReplyText("");
        setReplyingTo(null);
        setReplyRootId(null);
        setReplyingToName("");
      } catch (err) {
        setCommentError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengirim balasan.",
        );
      } finally {
        setReplyLoading(false);
      }
    }

    async function deleteComment(
      commentId: string,
    ) {
      if (!currentUser) {
        setCommentError(
          "Silakan login terlebih dahulu.",
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Hapus komentar ini?",
        );

      if (!confirmed) {
        return;
      }

      setCommentDeletingId(commentId);
      setCommentError("");

      try {
        const {
          error: deleteCommentError,
        } = await supabase
          .from("comments")
          .delete()
          .eq(
            "id",
            commentId,
          )
          .eq(
            "user_id",
            currentUser.id,
          );

        if (deleteCommentError) {
          setCommentError(
            `Gagal menghapus komentar: ${deleteCommentError.message}`,
          );
          return;
        }

        setComments(
          (previous) =>
            previous
              .filter(
                (comment) =>
                  comment.id !==
                  commentId,
              )
              .map(
                (comment) => ({
                  ...comment,
                  replies:
                    comment.replies.filter(
                      (reply) =>
                        reply.id !==
                        commentId,
                    ),
                }),
              ),
        );

        if (
          replyingTo ===
          commentId
        ) {
          setReplyingTo(null);
          setReplyRootId(null);
          setReplyingToName("");
          setReplyText("");
        }
      } catch (err) {
        setCommentError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menghapus komentar.",
        );
      } finally {
        setCommentDeletingId(null);
      }
    }

    function formatCommentDate(
      value: string | null,
    ) {
      if (!value) {
        return "";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return "";
      }

      return date.toLocaleString(
        "id-ID",
        {
          dateStyle:
            "medium",
          timeStyle:
            "short",
        },
      );
    }

    function cancelReply() {
      setReplyingTo(null);
      setReplyRootId(null);
      setReplyingToName("");
      setReplyText("");
      setCommentError("");
    }

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

    const statusLabel =
      novel.status === "ongoing"
        ? "Ongoing"
        : novel.status ===
            "completed"
          ? "Completed"
          : novel.status ===
              "hiatus"
            ? "Hiatus"
            : novel.status ||
              "Belum ditentukan";

    const cover =
      novel.cover ||
      "/placeholder.svg";

    const views =
      Number(
        novel.views ?? 0,
      );

    const isOwner =
      currentUser?.id ===
      novel.author_id;

    const firstChapter =
      chapters.length > 0
        ? chapters[
            chapters.length - 1
          ]
        : null;

    const displayedRating =
      hoverRating ??
      userRating ??
      0;

    const startChapterNumber =
      paginatedChapters.length >
      0
        ? paginatedChapters[
            paginatedChapters.length -
              1
          ].chapter_number
        : 0;

    const endChapterNumber =
      paginatedChapters.length >
      0
        ? paginatedChapters[0]
            .chapter_number
        : 0;

    const totalCommentCount =
      countComments(comments);

    const currentUserId =
      currentUser?.id ?? null;

    return (
      <div className="pb-12">
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <img
            src={cover}
            alt={novel.title}
            className="h-full w-full scale-105 object-cover blur-sm"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <Link
            to="/novel"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row">
            <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-xl border border-border shadow-xl sm:mx-0 sm:w-48">
              <img
                src={cover}
                alt={novel.title}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {statusLabel}
                </Badge>

                {novel.visibility ===
                  "public" && (
                  <Badge className="bg-primary text-primary-foreground">
                    Publik
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                {novel.title}
              </h1>

              <p className="text-sm text-muted-foreground">
                Novel karya{" "}
                <span className="font-medium text-foreground">
                  {author?.display_name ||
                    author?.username ||
                    "Author"}
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star
                    size={18}
                    className="fill-amber-400 text-amber-400"
                  />

                  <span className="font-semibold text-foreground">
                    {ratingSummary.average.toFixed(
                      1,
                    )}
                  </span>
                </div>

                <span className="text-sm text-muted-foreground">
                  {ratingSummary.count.toLocaleString(
                    "id-ID",
                  )}{" "}
                  rating
                </span>
              </div>

              {genres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {genres.map(
                    (genre) => (
                      <span
                        key={
                          genre.id
                        }
                        className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {genre.name}
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Belum ada genre.
                </p>
              )}

              <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-base">
                {novel.description ||
                  "Belum ada deskripsi untuk novel ini."}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Eye size={16} />
                  {views.toLocaleString(
                    "id-ID",
                  )}{" "}
                  dibaca
                </span>

                <span className="flex items-center gap-1.5">
                  <ListOrdered size={16} />
                  {chapters.length} chapter
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {userRating
                    ? "Rating kamu"
                    : "Beri rating novel ini"}
                </p>

                <div className="flex items-center gap-1">
                  {Array.from({
                    length: 5,
                  }).map(
                    (_, index) => {
                      const starValue =
                        index + 1;

                      const active =
                        starValue <=
                        displayedRating;

                      return (
                        <button
                          key={
                            starValue
                          }
                          type="button"
                          disabled={
                            ratingLoading
                          }
                          onMouseEnter={() =>
                            setHoverRating(
                              starValue,
                            )
                          }
                          onMouseLeave={() =>
                            setHoverRating(
                              null,
                            )
                          }
                          onClick={() =>
                            submitRating(
                              starValue,
                            )
                          }
                          className="rounded-md p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Beri rating ${starValue} dari 5`}
                        >
                          <Star
                            size={24}
                            className={
                              active
                                ? "fill-amber-400 text-amber-400"
                                : "fill-muted text-muted-foreground/40"
                            }
                          />
                        </button>
                      );
                    },
                  )}

                  {ratingLoading && (
                    <Loader2
                      size={18}
                      className="ml-2 animate-spin text-primary"
                    />
                  )}
                </div>

                {!userRating && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Login diperlukan untuk memberikan rating.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
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

                {isOwner && (
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                  >
                    <Link
                      to={`/author/edit-novel/${novel.id}`}
                    >
                      Edit Novel
                    </Link>
                  </Button>
                )}

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
                        ? "fill-current"
                        : ""
                    }`}
                  />

                  {libraryLoading
                    ? "Memproses..."
                    : isInLibrary
                      ? "Hapus dari Rak"
                      : "Tambah ke Rak"}
                </Button>

                {!isOwner && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={
                      openReportForm
                    }
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Flag
                      size={18}
                      className="mr-2"
                    />
                    Laporkan Novel
                  </Button>
                )}
              </div>

              {showReportForm && (
                <div className="mt-4 rounded-2xl border border-destructive/20 bg-card p-5 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                          <Flag size={18} />
                        </div>

                        <div>
                          <h3 className="font-display text-base font-semibold text-foreground">
                            Laporkan Novel
                          </h3>

                          <p className="text-xs text-muted-foreground">
                            Bantu kami menjaga Novel Semesta tetap aman dan nyaman.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowReportForm(
                          false,
                        )
                      }
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Tutup laporan"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {reportMessage && (
                    <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-500">
                      {reportMessage}
                    </div>
                  )}

                  {reportError && (
                    <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {reportError}
                    </div>
                  )}

                  {!reportMessage && (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label
                          htmlFor="report-reason"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          Alasan laporan
                        </label>

                        <select
                          id="report-reason"
                          value={reportReason}
                          onChange={(
                            event,
                          ) => {
                            setReportReason(
                              event.target
                                .value,
                            );
                            setReportError(
                              "",
                            );
                          }}
                          disabled={
                            reportLoading
                          }
                          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">
                            Pilih alasan laporan
                          </option>

                          {REPORT_REASONS.map(
                            (
                              reason,
                            ) => (
                              <option
                                key={
                                  reason.value
                                }
                                value={
                                  reason.value
                                }
                              >
                                {
                                  reason.label
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="report-description"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          Keterangan tambahan
                          <span className="ml-1 font-normal text-muted-foreground">
                            (opsional)
                          </span>
                        </label>

                        <textarea
                          id="report-description"
                          value={
                            reportDescription
                          }
                          onChange={(
                            event,
                          ) => {
                            setReportDescription(
                              event.target
                                .value,
                            );
                            setReportError(
                              "",
                            );
                          }}
                          disabled={
                            reportLoading
                          }
                          rows={4}
                          maxLength={1000}
                          placeholder="Jelaskan alasan kamu melaporkan novel ini..."
                          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />

                        <p className="mt-1 text-right text-[11px] text-muted-foreground">
                          {
                            reportDescription.length
                          }
                          /1000
                        </p>
                      </div>

                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setShowReportForm(
                              false,
                            )
                          }
                          disabled={
                            reportLoading
                          }
                        >
                          Batal
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          onClick={
                            submitReport
                          }
                          disabled={
                            reportLoading ||
                            !reportReason
                          }
                        >
                          {reportLoading ? (
                            <>
                              <Loader2
                                size={16}
                                className="mr-2 animate-spin"
                              />
                              Mengirim...
                            </>
                          ) : (
                            <>
                              <Send
                                size={16}
                                className="mr-2"
                              />
                              Kirim Laporan
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            id="chapter-list"
            className="mt-10 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Daftar Chapter
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {chapters.length} chapter diterbitkan
                  {chapters.length > 0 &&
                    ` • Menampilkan chapter ${startChapterNumber}–${endChapterNumber}`}
                </p>
              </div>

              <BookOpen
                size={20}
                className="hidden text-primary sm:block"
              />
            </div>

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
                  Author belum menerbitkan chapter untuk novel ini.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-2">
                  {paginatedChapters.map(
                    (chapter) => (
                      <Link
                        key={
                          chapter.id
                        }
                        to={`/read/${chapter.id}`}
                        className="group flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-secondary/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary">
                            Chapter{" "}
                            {
                              chapter.chapter_number
                            }
                          </p>

                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {
                              chapter.title
                            }
                          </p>
                        </div>

                        <div className="ml-4 flex shrink-0 items-center gap-3">
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            {Number(
                              chapter.word_count ??
                                0,
                            ).toLocaleString(
                              "id-ID",
                            )}{" "}
                            kata
                          </span>

                          <Play
                            size={15}
                            className="text-muted-foreground transition-colors group-hover:text-primary"
                          />
                        </div>
                      </Link>
                    ),
                  )}
                </div>

                {totalChapterPages > 1 && (
                  <div className="mt-6 border-t border-border pt-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Halaman{" "}
                        <span className="font-medium text-foreground">
                          {chapterPage}
                        </span>{" "}
                        dari{" "}
                        <span className="font-medium text-foreground">
                          {
                            totalChapterPages
                          }
                        </span>
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            changeChapterPage(
                              chapterPage -
                                1,
                            )
                          }
                          disabled={
                            chapterPage ===
                            1
                          }
                        >
                          <ChevronLeft
                            size={16}
                            className="mr-1"
                          />
                          Sebelumnya
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            {
                              length:
                                totalChapterPages,
                            },
                          )
                            .map(
                              (
                                _,
                                index,
                              ) =>
                                index +
                                1,
                            )
                            .filter(
                              (
                                page,
                              ) => {
                                if (
                                  totalChapterPages <=
                                  7
                                ) {
                                  return true;
                                }

                                return (
                                  page ===
                                    1 ||
                                  page ===
                                    totalChapterPages ||
                                  Math.abs(
                                    page -
                                      chapterPage,
                                  ) <=
                                    1
                                );
                              },
                            )
                            .map(
                              (
                                page,
                                index,
                                pages,
                              ) => {
                                const previousPage =
                                  pages[
                                    index -
                                      1
                                  ];

                                const showEllipsis =
                                  previousPage &&
                                  page -
                                    previousPage >
                                    1;

                                return (
                                  <div
                                    key={
                                      page
                                    }
                                    className="flex items-center gap-1"
                                  >
                                    {showEllipsis && (
                                      <span className="px-1 text-xs text-muted-foreground">
                                        ...
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        changeChapterPage(
                                          page,
                                        )
                                      }
                                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                                        chapterPage ===
                                        page
                                          ? "bg-primary text-primary-foreground"
                                          : "border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                                      }`}
                                    >
                                      {
                                        page
                                      }
                                    </button>
                                  </div>
                                );
                              },
                            )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            changeChapterPage(
                              chapterPage +
                                1,
                            )
                          }
                          disabled={
                            chapterPage ===
                            totalChapterPages
                          }
                        >
                          Berikutnya
                          <ChevronRight
                            size={16}
                            className="ml-1"
                          />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-[11px] text-muted-foreground">
                      Menampilkan maksimal{" "}
                      {
                        CHAPTERS_PER_PAGE
                      }{" "}
                      chapter per halaman.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div
            id="comments"
            className="mt-6 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle
                    size={20}
                    className="text-primary"
                  />

                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Komentar
                  </h2>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {totalCommentCount} komentar pada novel ini
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-border/70 bg-secondary/20 p-4">
              {currentUser ? (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {currentUser
                      .user_metadata
                      ?.avatar ||
                    currentUser
                      .user_metadata
                      ?.avatar_url ? (
                      <img
                        src={
                          currentUser
                            .user_metadata
                            ?.avatar ||
                          currentUser
                            .user_metadata
                            ?.avatar_url
                        }
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (
                        currentUser
                          .user_metadata
                          ?.display_name ||
                        currentUser
                          .user_metadata
                          ?.username ||
                        currentUser.email ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <textarea
                      value={
                        commentContent
                      }
                      onChange={(
                        event,
                      ) => {
                        setCommentContent(
                          event.target
                            .value,
                        );
                        setCommentError(
                          "",
                        );
                      }}
                      rows={4}
                      maxLength={2000}
                      disabled={
                        commentSubmitting
                      }
                      placeholder="Tulis komentar kamu tentang novel ini..."
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {
                          commentContent.length
                        }
                        /2000
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        onClick={
                          submitComment
                        }
                        disabled={
                          commentSubmitting ||
                          !commentContent.trim()
                        }
                      >
                        {commentSubmitting ? (
                          <>
                            <Loader2
                              size={15}
                              className="mr-2 animate-spin"
                            />
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Send
                              size={15}
                              className="mr-2"
                            />
                            Kirim Komentar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background px-4 py-4 text-center">
                  <MessageCircle
                    size={24}
                    className="mx-auto text-muted-foreground"
                  />

                  <p className="mt-2 text-sm font-medium text-foreground">
                    Login untuk berkomentar
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Kamu harus login terlebih dahulu untuk menulis komentar.
                  </p>
                </div>
              )}
            </div>

            {commentError && (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {commentError}
              </div>
            )}

            {commentLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2
                  size={20}
                  className="mr-2 animate-spin text-primary"
                />
                Memuat komentar...
              </div>
            ) : comments.length === 0 ? (
              <div className="py-10 text-center">
                <MessageCircle
                  size={32}
                  className="mx-auto text-muted-foreground"
                />

                <p className="mt-3 font-medium text-foreground">
                  Belum ada komentar
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Jadilah yang pertama memberikan komentar pada novel ini.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {comments.map(
                  (comment) => (
                    <MainComment
                      key={
                        comment.id
                      }
                      comment={
                        comment
                      }
                      currentUserId={
                        currentUserId
                      }
                      replyingTo={
                        replyingTo
                      }
                      replyRootId={
                        replyRootId
                      }
                      replyingToName={
                        replyingToName
                      }
                      replyText={
                        replyText
                      }
                      replyLoading={
                        replyLoading
                      }
                      commentDeletingId={
                        commentDeletingId
                      }
                      onStartReply={
                        startReply
                      }
                      onDeleteComment={
                        deleteComment
                      }
                      onReplyTextChange={
                        setReplyText
                      }
                      onCancelReply={
                        cancelReply
                      }
                      onSubmitReply={
                        submitReply
                      }
                      onClearError={() =>
                        setCommentError(
                          "",
                        )
                      }
                      formatCommentDate={
                        formatCommentDate
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }