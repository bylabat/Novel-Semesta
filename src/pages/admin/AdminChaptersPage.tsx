import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type Chapter = {
  id: string;
  title: string;
  novel_id: string;
  created_at: string | null;
};

type Novel = {
  id: string;
  title: string;
};

type ChapterItem = Chapter & {
  novel: Novel | null;
};

const PAGE_SIZE = 100;

export default function AdminChaptersPage() {
  const [chapters, setChapters] =
    useState<ChapterItem[]>([]);

  const [novels, setNovels] =
    useState<Novel[]>([]);

  const [totalChapters, setTotalChapters] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [selectedNovel, setSelectedNovel] =
    useState('');

  const [currentPage, setCurrentPage] =
    useState(1);

  const [error, setError] =
    useState<string | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalChapters / PAGE_SIZE,
    ),
  );

  useEffect(() => {
    fetchNovels();
  }, []);

  useEffect(() => {
    fetchChapters();
  }, [
    currentPage,
    search,
    selectedNovel,
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

    setNovels(
      (data ?? []) as Novel[],
    );
  }

  async function fetchChapters() {
    setLoading(true);
    setError(null);

    const from =
      (currentPage - 1) *
      PAGE_SIZE;

    const to =
      from + PAGE_SIZE - 1;

    let query = supabase
      .from('chapters')
      .select(
        `
          id,
          title,
          novel_id,
          created_at
        `,
        {
          count: 'exact',
        },
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
        'title',
        `%${search.trim()}%`,
      );
    }

    const {
      data,
      error: chaptersError,
      count,
    } = await query;

    if (chaptersError) {
      console.error(
        'Gagal mengambil chapter:',
        chaptersError,
      );

      setError(
        'Gagal memuat daftar chapter.',
      );

      setChapters([]);
      setTotalChapters(0);
      setLoading(false);

      return;
    }

    const chapterRows =
      (data ?? []) as Chapter[];

    const novelIds = [
      ...new Set(
        chapterRows
          .map(
            (chapter) =>
              chapter.novel_id,
          )
          .filter(Boolean),
      ),
    ];

    let novelsData: Novel[] = [];

    if (novelIds.length > 0) {
      const {
        data: relatedNovels,
        error: relatedNovelsError,
      } = await supabase
        .from('novels')
        .select(
          `
            id,
            title
          `,
        )
        .in(
          'id',
          novelIds,
        );

      if (relatedNovelsError) {
        console.error(
          'Gagal mengambil novel chapter:',
          relatedNovelsError,
        );
      } else {
        novelsData =
          (relatedNovels ?? []) as Novel[];
      }
    }

    const novelMap = new Map(
      novelsData.map(
        (novel) => [
          novel.id,
          novel,
        ],
      ),
    );

    const result: ChapterItem[] =
      chapterRows.map(
        (chapter) => ({
          ...chapter,
          novel:
            novelMap.get(
              chapter.novel_id,
            ) ?? null,
        }),
      );

    setChapters(result);
    setTotalChapters(count ?? 0);
    setLoading(false);
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

  function goToPreviousPage() {
    setCurrentPage(
      (page) =>
        Math.max(1, page - 1),
    );
  }

  function goToNextPage() {
    setCurrentPage(
      (page) =>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <FileText
                  size={24}
                  className="text-primary"
                />
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Daftar Chapter
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola seluruh chapter Novel Semesta.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">
              {totalChapters.toLocaleString(
                'id-ID',
              )}
            </span>{' '}
            chapter
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
              placeholder="Cari judul chapter..."
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

            {novels.map((novel) => (
              <option
                key={novel.id}
                value={novel.id}
              >
                {novel.title}
              </option>
            ))}
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
                Memuat chapter...
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
                    fetchChapters
                  }
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Coba Lagi
                </button>
              </div>
            </div>

          ) : chapters.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <BookOpen
                  size={40}
                  className="mx-auto text-muted-foreground"
                />

                <p className="mt-4 font-medium text-foreground">
                  Tidak ada chapter ditemukan
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Coba gunakan pencarian atau filter lain.
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px]">

                  <thead>
                    <tr className="border-b border-border text-left">

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Chapter
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Novel
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dibuat
                      </th>

                    </tr>
                  </thead>

                  <tbody>
                    {chapters.map(
                      (chapter) => (
                        <tr
                          key={chapter.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                        >

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <FileText
                                  size={18}
                                  className="text-primary"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {chapter.title}
                                </p>

                                <p className="truncate text-xs text-muted-foreground">
                                  {chapter.id}
                                </p>
                              </div>

                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {chapter.novel?.title ||
                              '-'}
                          </td>

                          <td className="px-5 py-4 text-sm text-muted-foreground">
                            {formatDate(
                              chapter.created_at,
                            )}
                          </td>

                        </tr>
                      ),
                    )}
                  </tbody>

                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">

                {chapters.map(
                  (chapter) => (
                    <div
                      key={chapter.id}
                      className="p-4"
                    >
                      <div className="flex gap-3">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <FileText
                            size={20}
                            className="text-primary"
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="font-semibold text-foreground">
                            {chapter.title}
                          </p>

                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {chapter.novel?.title ||
                              'Novel tidak diketahui'}
                          </p>

                          <p className="mt-2 text-xs text-muted-foreground">
                            Dibuat:{' '}
                            {formatDate(
                              chapter.created_at,
                            )}
                          </p>

                        </div>

                      </div>
                    </div>
                  ),
                )}

              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-xs text-muted-foreground">
                  Menampilkan{' '}
                  <span className="font-medium text-foreground">
                    {(
                      (currentPage - 1) *
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
                      totalChapters,
                    ).toLocaleString(
                      'id-ID',
                    )}
                  </span>
                  {' dari '}
                  <span className="font-medium text-foreground">
                    {totalChapters.toLocaleString(
                      'id-ID',
                    )}
                  </span>
                  {' chapter'}
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