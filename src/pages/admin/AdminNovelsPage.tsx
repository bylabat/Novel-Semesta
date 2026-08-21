import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  Loader2,
  Search,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type Novel = {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  visibility: string | null;
  author_id: string;
  views: number | null;
  view: number | null;
  created_at: string | null;
};

type Author = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type NovelItem = Novel & {
  author: Author | null;
};

export default function AdminNovelsPage() {
  const [novels, setNovels] = useState<NovelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNovels();
  }, []);

  async function fetchNovels() {
    setLoading(true);
    setError(null);

    const { data, error: novelsError } =
      await supabase
        .from('novels')
        .select(`
          id,
          title,
          description,
          cover,
          status,
          visibility,
          author_id,
          views,
          view,
          created_at
        `)
        .order('created_at', {
          ascending: false,
        });

    if (novelsError) {
      console.error(
        'Gagal mengambil novel:',
        novelsError,
      );

      setError(
        'Gagal memuat daftar novel.',
      );
      setNovels([]);
      setLoading(false);
      return;
    }

    const novelRows =
      (data ?? []) as Novel[];

    const authorIds = [
      ...new Set(
        novelRows
          .map(
            (novel) =>
              novel.author_id,
          )
          .filter(Boolean),
      ),
    ];

    let authorsData: Author[] = [];

    if (authorIds.length > 0) {
      const {
        data: authors,
        error: authorsError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name
        `)
        .in('id', authorIds);

      if (authorsError) {
        console.error(
          'Gagal mengambil author:',
          authorsError,
        );
      } else {
        authorsData =
          (authors ?? []) as Author[];
      }
    }

    const authorMap = new Map(
      authorsData.map((author) => [
        author.id,
        author,
      ]),
    );

    const result: NovelItem[] =
      novelRows.map((novel) => ({
        ...novel,
        author:
          authorMap.get(
            novel.author_id,
          ) ?? null,
      }));

    setNovels(result);
    setLoading(false);
  }

  function isPublic(
    visibility: string | null,
  ) {
    return (
      visibility?.toLowerCase() ===
      'public'
    );
  }

  function isBlocked(
    visibility: string | null,
  ) {
    return (
      visibility?.toLowerCase() ===
      'blocked'
    );
  }

  const filteredNovels =
    novels
      .filter((novel) => {
        const keyword = search
          .trim()
          .toLowerCase();

        if (!keyword) {
          return true;
        }

        return (
          novel.title
            .toLowerCase()
            .includes(keyword) ||
          novel.author?.username
            ?.toLowerCase()
            .includes(keyword) ||
          novel.author?.display_name
            ?.toLowerCase()
            .includes(keyword) ||
          novel.status
            ?.toLowerCase()
            .includes(keyword) ||
          novel.visibility
            ?.toLowerCase()
            .includes(keyword)
        );
      })
      .sort((a, b) => {
        const aBlocked =
          isBlocked(a.visibility);

        const bBlocked =
          isBlocked(b.visibility);

        if (
          !aBlocked &&
          bBlocked
        ) {
          return -1;
        }

        if (
          aBlocked &&
          !bBlocked
        ) {
          return 1;
        }

        return 0;
      });

  const publicNovels =
    filteredNovels.filter(
      (novel) =>
        !isBlocked(
          novel.visibility,
        ),
    );

  const blockedNovels =
    filteredNovels.filter(
      (novel) =>
        isBlocked(
          novel.visibility,
        ),
    );

  function getViews(novel: Novel) {
    return (
      novel.views ??
      novel.view ??
      0
    );
  }

  function getAuthorName(
    novel: NovelItem,
  ) {
    return (
      novel.author?.display_name ||
      novel.author?.username ||
      'Author tidak diketahui'
    );
  }

  async function makeNovelPublic(
    novelId: string,
  ) {
    const confirmed = window.confirm(
      'Jadikan novel ini publik kembali?',
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from('novels')
      .update({
        visibility: 'public',
      })
      .eq('id', novelId);

    if (error) {
      console.error(
        'Gagal menjadikan novel publik:',
        error,
      );

      window.alert(
        'Gagal menjadikan novel publik.',
      );

      return;
    }

    setNovels((current) =>
      current.map((novel) =>
        novel.id === novelId
          ? {
              ...novel,
              visibility: 'public',
            }
          : novel,
      ),
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <BookOpen
                  size={24}
                  className="text-blue-400"
                />
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Daftar Novel
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola seluruh novel Novel Semesta.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">
              {novels.length}
            </span>{' '}
            novel
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Cari judul, author, status, atau visibility..."
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>

        {/* CONTENT */}
        <section className="rounded-2xl border border-border bg-card">

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Memuat novel...
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
                  onClick={fetchNovels}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Coba Lagi
                </button>
              </div>
            </div>

          ) : filteredNovels.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <BookOpen
                  size={40}
                  className="mx-auto text-muted-foreground"
                />

                <p className="mt-4 font-medium text-foreground">
                  Tidak ada novel ditemukan
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Coba gunakan kata pencarian lain.
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* =====================================================
                  DESKTOP
              ====================================================== */}

              <div className="hidden overflow-x-auto md:block">

                {/* NOVEL PUBLIK */}
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-400">
                    Novel Publik
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {publicNovels.length} novel publik
                  </p>
                </div>

                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Novel
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Author
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Views
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Visibility
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aksi
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dibuat
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {publicNovels.map(
                      (novel) => (
                        <tr
                          key={novel.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {novel.cover ? (
                                <img
                                  src={novel.cover}
                                  alt={novel.title}
                                  className="h-12 w-9 shrink-0 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                  <BookOpen
                                    size={18}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {novel.title}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {getAuthorName(novel)}
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {getViews(
                              novel,
                            ).toLocaleString(
                              'id-ID',
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase text-emerald-400">
                              {novel.visibility ||
                                'public'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm capitalize text-muted-foreground">
                            {novel.status ||
                              '-'}
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {novel.created_at
                              ? new Date(
                                  novel.created_at,
                                ).toLocaleDateString(
                                  'id-ID',
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  },
                                )
                              : '-'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>

                {/* PEMISAH */}
                <div className="border-b border-t border-border bg-muted/10 px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-red-400">
                    Novel Diblokir
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {blockedNovels.length} novel diblokir
                  </p>
                </div>

                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Novel
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Author
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Views
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Visibility
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aksi
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dibuat
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {blockedNovels.map(
                      (novel) => (
                        <tr
                          key={novel.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {novel.cover ? (
                                <img
                                  src={novel.cover}
                                  alt={novel.title}
                                  className="h-12 w-9 shrink-0 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                  <BookOpen
                                    size={18}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {novel.title}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {getAuthorName(novel)}
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {getViews(
                              novel,
                            ).toLocaleString(
                              'id-ID',
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase text-red-400">
                              {novel.visibility ||
                                'blocked'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm capitalize text-muted-foreground">
                            {novel.status ||
                              '-'}
                          </td>

                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                makeNovelPublic(
                                  novel.id,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                            >
                              <CheckCircle2
                                size={15}
                              />
                              Jadikan Publik
                            </button>
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {novel.created_at
                              ? new Date(
                                  novel.created_at,
                                ).toLocaleDateString(
                                  'id-ID',
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  },
                                )
                              : '-'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* =====================================================
                  MOBILE
              ====================================================== */}

              <div className="md:hidden">

                {/* NOVEL PUBLIK */}
                <div className="border-b border-border bg-emerald-500/5 px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-400">
                    Novel Publik
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {publicNovels.length} novel publik
                  </p>
                </div>

                {/* CARD NOVEL PUBLIK */}
                <div className="divide-y divide-border">
                  {publicNovels.map(
                    (novel) => (
                      <div
                        key={novel.id}
                        className="p-4"
                      >
                        <div className="flex gap-3">

                          {novel.cover ? (
                            <img
                              src={novel.cover}
                              alt={novel.title}
                              className="h-24 w-16 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <BookOpen
                                size={22}
                                className="text-muted-foreground"
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <p className="line-clamp-2 font-semibold text-foreground">
                                {novel.title}
                              </p>

                              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                                PUBLIK
                              </span>

                            </div>

                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {getAuthorName(
                                novel,
                              )}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">

                              <div className="rounded-xl bg-muted/20 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Views
                                </p>

                                <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
                                  <Eye size={13} />

                                  {getViews(
                                    novel,
                                  ).toLocaleString(
                                    'id-ID',
                                  )}
                                </div>
                              </div>

                              <div className="rounded-xl bg-muted/20 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Status
                                </p>

                                <p className="mt-1 truncate text-xs capitalize text-foreground">
                                  {novel.status ||
                                    '-'}
                                </p>
                              </div>

                            </div>

                            <div className="mt-2 text-[11px] text-muted-foreground">
                              Dibuat:{' '}
                              {novel.created_at
                                ? new Date(
                                    novel.created_at,
                                  ).toLocaleDateString(
                                    'id-ID',
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )
                                : '-'}
                            </div>

                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  {publicNovels.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada novel publik.
                    </div>
                  )}
                </div>

                {/* =================================================
                    PEMISAH MOBILE
                ================================================== */}

                <div className="border-b border-t border-border bg-red-500/5 px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-red-400">
                    Novel Diblokir
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {blockedNovels.length} novel diblokir
                  </p>
                </div>

                {/* CARD NOVEL DIBLOKIR */}
                <div className="divide-y divide-border">
                  {blockedNovels.map(
                    (novel) => (
                      <div
                        key={novel.id}
                        className="p-4"
                      >
                        <div className="flex gap-3">

                          {novel.cover ? (
                            <img
                              src={novel.cover}
                              alt={novel.title}
                              className="h-24 w-16 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <BookOpen
                                size={22}
                                className="text-muted-foreground"
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <p className="line-clamp-2 font-semibold text-foreground">
                                {novel.title}
                              </p>

                              <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                                DIBLOKIR
                              </span>

                            </div>

                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {getAuthorName(
                                novel,
                              )}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">

                              <div className="rounded-xl bg-muted/20 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Views
                                </p>

                                <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
                                  <Eye size={13} />

                                  {getViews(
                                    novel,
                                  ).toLocaleString(
                                    'id-ID',
                                  )}
                                </div>
                              </div>

                              <div className="rounded-xl bg-muted/20 p-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Status
                                </p>

                                <p className="mt-1 truncate text-xs capitalize text-foreground">
                                  {novel.status ||
                                    '-'}
                                </p>
                              </div>

                            </div>

                            <div className="mt-2 text-[11px] text-muted-foreground">
                              Dibuat:{' '}
                              {novel.created_at
                                ? new Date(
                                    novel.created_at,
                                  ).toLocaleDateString(
                                    'id-ID',
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )
                                : '-'}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                makeNovelPublic(
                                  novel.id,
                                )
                              }
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                            >
                              <CheckCircle2
                                size={15}
                              />
                              Jadikan Publik
                            </button>

                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  {blockedNovels.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada novel yang diblokir.
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

        </section>
      </div>
    </main>
  );
}