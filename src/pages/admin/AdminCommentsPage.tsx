import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type Comment = {
  id: string;
  user_id: string;
  novel_id: string;
  chapter_id: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
  is_blocked: boolean;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type Novel = {
  id: string;
  title: string;
};

type Chapter = {
  id: string;
  title: string;
};

type CommentItem = Comment & {
  profile: Profile | null;
  novel: Novel | null;
  chapter: Chapter | null;
};

const PAGE_SIZE = 100;

type CommentTab = 'active' | 'blocked';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [totalComments, setTotalComments] = useState(0);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNovel, setSelectedNovel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [activeTab, setActiveTab] =
    useState<CommentTab>('active');

  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(totalComments / PAGE_SIZE),
  );

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchComments();
  }, [
    currentPage,
    search,
    selectedNovel,
    activeTab,
  ]);

  async function fetchNovels() {
    const {
      data,
      error: novelsError,
    } = await supabase
      .from('novels')
      .select('id, title')
      .order('title', {
        ascending: true,
      });

    if (novelsError) {
      console.error(
        'Gagal mengambil daftar novel:',
        novelsError,
      );

      return;
    }

    setNovels((data ?? []) as Novel[]);
  }

  async function fetchComments() {
    setLoading(true);
    setError(null);

    const from =
      (currentPage - 1) * PAGE_SIZE;

    const to =
      from + PAGE_SIZE - 1;

    let query = supabase
      .from('comments')
      .select(
        `
          id,
          user_id,
          novel_id,
          chapter_id,
          content,
          created_at,
          updated_at,
          is_blocked
        `,
        {
          count: 'exact',
        },
      )
      .eq(
        'is_blocked',
        activeTab === 'blocked',
      )
      .order('created_at', {
        ascending: false,
      })
      .range(from, to);

    if (selectedNovel) {
      query = query.eq(
        'novel_id',
        selectedNovel,
      );
    }

    if (search.trim()) {
      query = query.ilike(
        'content',
        `%${search.trim()}%`,
      );
    }

    const {
      data,
      error: commentsError,
      count,
    } = await query;

    if (commentsError) {
      console.error(
        'Gagal mengambil komentar:',
        commentsError,
      );

      setError(
        'Gagal memuat daftar komentar.',
      );

      setComments([]);
      setTotalComments(0);
      setLoading(false);

      return;
    }

    const commentRows =
      (data ?? []) as Comment[];

    const userIds = [
      ...new Set(
        commentRows
          .map(
            (comment) =>
              comment.user_id,
          )
          .filter(Boolean),
      ),
    ];

    const novelIds = [
      ...new Set(
        commentRows
          .map(
            (comment) =>
              comment.novel_id,
          )
          .filter(Boolean),
      ),
    ];

    const chapterIds = [
      ...new Set(
        commentRows
          .map(
            (comment) =>
              comment.chapter_id,
          )
          .filter(Boolean),
      ),
    ];

    let profilesData: Profile[] = [];
    let novelsData: Novel[] = [];
    let chaptersData: Chapter[] = [];

    if (userIds.length > 0) {
      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(
          `
            id,
            username,
            display_name
          `,
        )
        .in('id', userIds);

      if (profilesError) {
        console.error(
          'Gagal mengambil pengguna komentar:',
          profilesError,
        );
      } else {
        profilesData =
          (profiles ?? []) as Profile[];
      }
    }

    if (novelIds.length > 0) {
      const {
        data: relatedNovels,
        error: novelsError,
      } = await supabase
        .from('novels')
        .select(
          `
            id,
            title
          `,
        )
        .in('id', novelIds);

      if (novelsError) {
        console.error(
          'Gagal mengambil novel komentar:',
          novelsError,
        );
      } else {
        novelsData =
          (relatedNovels ?? []) as Novel[];
      }
    }

    if (chapterIds.length > 0) {
      const {
        data: relatedChapters,
        error: chaptersError,
      } = await supabase
        .from('chapters')
        .select(
          `
            id,
            title
          `,
        )
        .in('id', chapterIds);

      if (chaptersError) {
        console.error(
          'Gagal mengambil chapter komentar:',
          chaptersError,
        );
      } else {
        chaptersData =
          (relatedChapters ?? []) as Chapter[];
      }
    }

    const profileMap = new Map(
      profilesData.map(
        (profile) => [
          profile.id,
          profile,
        ],
      ),
    );

    const novelMap = new Map(
      novelsData.map(
        (novel) => [
          novel.id,
          novel,
        ],
      ),
    );

    const chapterMap = new Map(
      chaptersData.map(
        (chapter) => [
          chapter.id,
          chapter,
        ],
      ),
    );

    const result: CommentItem[] =
      commentRows.map(
        (comment) => ({
          ...comment,

          profile:
            profileMap.get(
              comment.user_id,
            ) ?? null,

          novel:
            novelMap.get(
              comment.novel_id,
            ) ?? null,

          chapter:
            comment.chapter_id
              ? chapterMap.get(
                  comment.chapter_id,
                ) ?? null
              : null,
        }),
      );

    setComments(result);
    setTotalComments(count ?? 0);
    setLoading(false);
  }

  async function handleBlockComment(
    comment: CommentItem,
  ) {
    const action = comment.is_blocked
      ? 'membuka blokir'
      : 'memblokir';

    const confirmed = window.confirm(
      comment.is_blocked
        ? 'Yakin ingin membuka blokir komentar ini? Komentar akan kembali dapat dilihat pengguna.'
        : 'Yakin ingin memblokir komentar ini? Komentar tidak akan ditampilkan kepada pengguna.',
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(comment.id);

    const {
      error: updateError,
    } = await supabase
      .from('comments')
      .update({
        is_blocked: !comment.is_blocked,
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', comment.id);

    if (updateError) {
      console.error(
        `Gagal ${action} komentar:`,
        updateError,
      );

      window.alert(
        `Gagal ${action} komentar.`,
      );

      setActionLoading(null);

      return;
    }

    /*
     * Karena komentar sekarang sudah berpindah
     * kategori, langsung hapus dari daftar saat ini.
     * Contoh:
     * Aktif -> Blokir -> hilang dari tab Aktif.
     * Diblokir -> Buka Blokir -> hilang dari tab Diblokir.
     */
    setComments((currentComments) =>
      currentComments.filter(
        (item) =>
          item.id !== comment.id,
      ),
    );

    setTotalComments((total) =>
      Math.max(0, total - 1),
    );

    setActionLoading(null);

    /*
     * Jika halaman menjadi kosong dan bukan
     * halaman pertama, kembali satu halaman.
     */
    if (
      comments.length === 1 &&
      currentPage > 1
    ) {
      setCurrentPage((page) =>
        Math.max(1, page - 1),
      );
    }
  }

  async function handleDeleteComment(
    comment: CommentItem,
  ) {
    const confirmed = window.confirm(
      'Yakin ingin menghapus komentar ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(comment.id);

    const {
      error: deleteError,
    } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment.id);

    if (deleteError) {
      console.error(
        'Gagal menghapus komentar:',
        deleteError,
      );

      window.alert(
        'Gagal menghapus komentar.',
      );

      setActionLoading(null);

      return;
    }

    setComments((currentComments) =>
      currentComments.filter(
        (item) =>
          item.id !== comment.id,
      ),
    );

    setTotalComments((total) =>
      Math.max(0, total - 1),
    );

    setActionLoading(null);

    if (
      comments.length === 1 &&
      currentPage > 1
    ) {
      setCurrentPage((page) =>
        Math.max(1, page - 1),
      );
    }
  }

  function handleSearch(
    value: string,
  ) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleNovelChange(
    value: string,
  ) {
    setSelectedNovel(value);
    setCurrentPage(1);
  }

  function handleTabChange(
    tab: CommentTab,
  ) {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((page) =>
      Math.max(1, page - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(
        totalPages,
        page + 1,
      ),
    );
  }

  function formatDate(
    date: string | null,
  ) {
    if (!date) {
      return '-';
    }

    return new Date(
      date,
    ).toLocaleDateString(
      'id-ID',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    );
  }

  function getUserName(
    profile: Profile | null,
  ) {
    return (
      profile?.display_name ||
      profile?.username ||
      'Pengguna tidak diketahui'
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <Link
              to="/admin/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                <MessageCircle
                  size={24}
                  className="text-orange-400"
                />
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Daftar Komentar
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola seluruh komentar Novel Semesta.
                </p>
              </div>

            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total{' '}
            {activeTab === 'active'
              ? 'aktif'
              : 'diblokir'}
            :{' '}
            <span className="font-semibold text-foreground">
              {totalComments.toLocaleString(
                'id-ID',
              )}
            </span>{' '}
            komentar
          </div>

        </div>

        {/* TAB */}
        <div className="mb-6 rounded-xl border border-border bg-card p-1.5">

          <div className="grid grid-cols-2 gap-1.5">

            <button
              type="button"
              onClick={() =>
                handleTabChange(
                  'active',
                )
              }
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ShieldCheck size={17} />

              Komentar Aktif
            </button>

            <button
              type="button"
              onClick={() =>
                handleTabChange(
                  'blocked',
                )
              }
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'blocked'
                  ? 'bg-red-500/10 text-red-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ShieldAlert size={17} />

              Komentar Diblokir
            </button>

          </div>

        </div>

        {/* FILTER */}
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_280px]">

          {/* SEARCH */}
          <div className="relative">

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                handleSearch(
                  event.target.value,
                )
              }
              placeholder="Cari isi komentar..."
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />

          </div>

          {/* NOVEL FILTER */}
          <select
            value={selectedNovel}
            onChange={(event) =>
              handleNovelChange(
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50"
          >
            <option value="">
              Semua Novel
            </option>

            {novels.map(
              (novel) => (
                <option
                  key={novel.id}
                  value={novel.id}
                >
                  {novel.title}
                </option>
              ),
            )}
          </select>

        </div>

        {/* CONTENT */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">

              <div className="flex items-center gap-3 text-muted-foreground">

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Memuat komentar...

              </div>

            </div>

          ) : error ? (

            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">

              <div>

                <p className="font-medium text-destructive">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    fetchComments
                  }
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Coba Lagi
                </button>

              </div>

            </div>

          ) : comments.length === 0 ? (

            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">

              <div>

                {activeTab ===
                'blocked' ? (
                  <ShieldCheck
                    size={40}
                    className="mx-auto text-emerald-400"
                  />
                ) : (
                  <MessageCircle
                    size={40}
                    className="mx-auto text-muted-foreground"
                  />
                )}

                <p className="mt-4 font-medium text-foreground">
                  {activeTab ===
                  'blocked'
                    ? 'Tidak ada komentar yang diblokir'
                    : 'Tidak ada komentar aktif'}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {search ||
                  selectedNovel
                    ? 'Coba gunakan pencarian atau filter lain.'
                    : activeTab ===
                        'blocked'
                      ? 'Semua komentar saat ini masih aktif.'
                      : 'Belum ada komentar aktif.'}
                </p>

              </div>

            </div>

          ) : (

            <>

              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[1100px]">

                  <thead>
                    <tr className="border-b border-border text-left">

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Komentar
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pengguna
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Novel
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Chapter
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dibuat
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aksi
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {comments.map(
                      (comment) => {

                        const isActionLoading =
                          actionLoading ===
                          comment.id;

                        return (
                          <tr
                            key={comment.id}
                            className={`border-b border-border last:border-0 transition-colors ${
                              comment.is_blocked
                                ? 'bg-red-500/[0.04]'
                                : 'hover:bg-muted/30'
                            }`}
                          >

                            {/* KOMENTAR */}
                            <td className="max-w-[360px] px-5 py-4">

                              <div className="mb-2">

                                {comment.is_blocked ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400">
                                    <ShieldAlert
                                      size={11}
                                    />
                                    Diblokir
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                                    <ShieldCheck
                                      size={11}
                                    />
                                    Aktif
                                  </span>
                                )}

                              </div>

                              <p
                                className={`line-clamp-3 text-sm ${
                                  comment.is_blocked
                                    ? 'text-muted-foreground line-through'
                                    : 'text-foreground'
                                }`}
                              >
                                {comment.content}
                              </p>

                              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                {comment.id}
                              </p>

                            </td>

                            {/* PENGGUNA */}
                            <td className="px-5 py-4">

                              <div className="flex items-center gap-2">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                                  <MessageCircle
                                    size={16}
                                    className="text-orange-400"
                                  />
                                </div>

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-medium text-foreground">
                                    {getUserName(
                                      comment.profile,
                                    )}
                                  </p>

                                  {comment.profile?.username && (
                                    <p className="truncate text-xs text-muted-foreground">
                                      @{comment.profile.username}
                                    </p>
                                  )}

                                </div>

                              </div>

                            </td>

                            {/* NOVEL */}
                            <td className="px-5 py-4 text-sm text-muted-foreground">

                              <div className="flex items-center gap-2">

                                <BookOpen size={15} />

                                <span className="max-w-[180px] truncate">
                                  {comment.novel?.title ||
                                    '-'}
                                </span>

                              </div>

                            </td>

                            {/* CHAPTER */}
                            <td className="px-5 py-4 text-sm text-muted-foreground">

                              <div className="flex items-center gap-2">

                                <FileText size={15} />

                                <span className="max-w-[180px] truncate">
                                  {comment.chapter?.title ||
                                    'Komentar novel'}
                                </span>

                              </div>

                            </td>

                            {/* TANGGAL */}
                            <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                              {formatDate(
                                comment.created_at,
                              )}
                            </td>

                            {/* AKSI */}
                            <td className="px-5 py-4">

                              <div className="flex items-center justify-end gap-2">

                                <button
                                  type="button"
                                  disabled={
                                    isActionLoading
                                  }
                                  onClick={() =>
                                    handleBlockComment(
                                      comment,
                                    )
                                  }
                                  title={
                                    comment.is_blocked
                                      ? 'Buka blokir'
                                      : 'Blokir komentar'
                                  }
                                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    comment.is_blocked
                                      ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                                      : 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10'
                                  }`}
                                >

                                  {isActionLoading ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : comment.is_blocked ? (
                                    <ShieldCheck
                                      size={15}
                                    />
                                  ) : (
                                    <ShieldAlert
                                      size={15}
                                    />
                                  )}

                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isActionLoading
                                  }
                                  onClick={() =>
                                    handleDeleteComment(
                                      comment,
                                    )
                                  }
                                  title="Hapus komentar"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      },
                    )}

                  </tbody>

                </table>

              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">

                {comments.map(
                  (comment) => {

                    const isActionLoading =
                      actionLoading ===
                      comment.id;

                    return (
                      <div
                        key={comment.id}
                        className={`p-4 ${
                          comment.is_blocked
                            ? 'bg-red-500/[0.04]'
                            : ''
                        }`}
                      >

                        <div className="flex gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                            <MessageCircle
                              size={18}
                              className="text-orange-400"
                            />
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <div className="min-w-0">

                                <p className="truncate text-sm font-semibold text-foreground">
                                  {getUserName(
                                    comment.profile,
                                  )}
                                </p>

                                {comment.profile?.username && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    @{comment.profile.username}
                                  </p>
                                )}

                              </div>

                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatDate(
                                  comment.created_at,
                                )}
                              </span>

                            </div>

                            {/* STATUS */}
                            <div className="mt-2">

                              {comment.is_blocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400">
                                  <ShieldAlert
                                    size={11}
                                  />
                                  Diblokir
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
                                  <ShieldCheck
                                    size={11}
                                  />
                                  Aktif
                                </span>
                              )}

                            </div>

                            {/* CONTENT */}
                            <p
                              className={`mt-2 text-sm leading-relaxed ${
                                comment.is_blocked
                                  ? 'text-muted-foreground line-through'
                                  : 'text-foreground'
                              }`}
                            >
                              {comment.content}
                            </p>

                            {/* NOVEL & CHAPTER */}
                            <div className="mt-3 space-y-1.5">

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">

                                <BookOpen
                                  size={13}
                                />

                                <span className="truncate">
                                  {comment.novel?.title ||
                                    '-'}
                                </span>

                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">

                                <FileText
                                  size={13}
                                />

                                <span className="truncate">
                                  {comment.chapter?.title ||
                                    'Komentar novel'}
                                </span>

                              </div>

                            </div>

                            {/* ACTIONS */}
                            <div className="mt-4 flex gap-2">

                              <button
                                type="button"
                                disabled={
                                  isActionLoading
                                }
                                onClick={() =>
                                  handleBlockComment(
                                    comment,
                                  )
                                }
                                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                  comment.is_blocked
                                    ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                                    : 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10'
                                }`}
                              >

                                {isActionLoading ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : comment.is_blocked ? (
                                  <ShieldCheck
                                    size={14}
                                  />
                                ) : (
                                  <ShieldAlert
                                    size={14}
                                  />
                                )}

                                {comment.is_blocked
                                  ? 'Buka Blokir'
                                  : 'Blokir'}

                              </button>

                              <button
                                type="button"
                                disabled={
                                  isActionLoading
                                }
                                onClick={() =>
                                  handleDeleteComment(
                                    comment,
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <Trash2
                                  size={14}
                                />

                                Hapus

                              </button>

                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  },
                )}

              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-muted-foreground">

                  Menampilkan{' '}

                  <span className="font-medium text-foreground">
                    {totalComments === 0
                      ? 0
                      : (
                          (currentPage -
                            1) *
                            PAGE_SIZE +
                          1
                        ).toLocaleString(
                          'id-ID',
                        )}
                  </span>

                  {' - '}

                  <span className="font-medium text-foreground">
                    {Math.min(
                      currentPage *
                        PAGE_SIZE,
                      totalComments,
                    ).toLocaleString(
                      'id-ID',
                    )}
                  </span>

                  {' dari '}

                  <span className="font-medium text-foreground">
                    {totalComments.toLocaleString(
                      'id-ID',
                    )}
                  </span>

                  {' komentar'}

                </p>

                <div className="flex items-center justify-between gap-2 sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      goToPreviousPage
                    }
                    disabled={
                      currentPage === 1
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={15}
                    />

                    Sebelumnya

                  </button>

                  <div className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
                    {currentPage}
                  </div>

                  <button
                    type="button"
                    onClick={
                      goToNextPage
                    }
                    disabled={
                      currentPage >=
                      totalPages
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Berikutnya

                    <ChevronRight
                      size={15}
                    />

                  </button>

                </div>

              </div>

            </>

          )}

        </section>

      </div>
    </main>
  );
}