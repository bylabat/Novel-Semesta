import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Users,
  MessageSquare,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Loader2,
  ArrowRight,
  Search,
  AlertTriangle,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  totalNovels: number;
  totalChapters: number;
  totalComments: number;
  totalViews: number;
}

interface AdminNovel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  visibility: string | null;
  views: number | null;
  created_at: string;
  updated_at: string | null;
  author_id: string;
  author_name: string;
  author_username: string;
}

export default function AuthorDashboardPage() {
  const navigate = useNavigate();

  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalNovels: 0,
    totalChapters: 0,
    totalComments: 0,
    totalViews: 0,
  });

  const [novels, setNovels] = useState<AdminNovel[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  // ==========================================================
  // CEK ADMIN
  // ==========================================================

  const isAdmin = profile?.role === 'admin';

  // ==========================================================
  // LOAD DASHBOARD ADMIN
  // ==========================================================

  useEffect(() => {
    if (!user || !profile) return;

    if (profile.role !== 'admin') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAdminDashboard() {
      setLoading(true);

      try {
        // ====================================================
        // STATISTIK WEBSITE
        // ====================================================

        const [
          usersRes,
          novelsRes,
          chaptersRes,
          commentsRes,
          viewsRes,
        ] = await Promise.all([
          // TOTAL USER
          supabase
            .from('profiles')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          // TOTAL NOVEL
          supabase
            .from('novels')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          // TOTAL CHAPTER
          supabase
            .from('chapters')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          // TOTAL KOMENTAR
          supabase
            .from('comments')
            .select('id', {
              count: 'exact',
              head: true,
            }),

          // TOTAL VIEWS
          supabase
            .from('novels')
            .select('views'),
        ]);

        if (cancelled) return;

        const totalViews =
          (viewsRes.data ?? []).reduce(
            (total, novel) =>
              total + Number(novel.views ?? 0),
            0,
          );

        setStats({
          totalUsers: usersRes.count ?? 0,
          totalNovels: novelsRes.count ?? 0,
          totalChapters: chaptersRes.count ?? 0,
          totalComments: commentsRes.count ?? 0,
          totalViews,
        });

        // ====================================================
        // AMBIL SEMUA NOVEL
        // ====================================================

        const {
          data: novelData,
          error: novelError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            status,
            visibility,
            views,
            created_at,
            updated_at,
            author_id
          `)
          .order('updated_at', {
            ascending: false,
          });

        if (cancelled) return;

        if (novelError) {
          console.error(
            'Gagal mengambil daftar novel admin:',
            novelError,
          );

          setNovels([]);
          setLoading(false);
          return;
        }

        const rows = novelData ?? [];

        // ====================================================
        // AMBIL PROFILE AUTHOR
        // ====================================================

        const authorIds = [
          ...new Set(
            rows.map(
              (novel) => novel.author_id,
            ),
          ),
        ];

        let authorMap = new Map<
          string,
          {
            display_name: string | null;
            username: string | null;
          }
        >();

        if (authorIds.length > 0) {
          const {
            data: authorData,
            error: authorError,
          } = await supabase
            .from('profiles')
            .select(
              'id, display_name, username',
            )
            .in('id', authorIds);

          if (authorError) {
            console.error(
              'Gagal mengambil data author:',
              authorError,
            );
          } else {
            authorMap = new Map(
              (authorData ?? []).map(
                (author) => [
                  author.id,
                  {
                    display_name:
                      author.display_name,
                    username:
                      author.username,
                  },
                ],
              ),
            );
          }
        }

        if (cancelled) return;

        // ====================================================
        // MAP NOVEL
        // ====================================================

        const mappedNovels: AdminNovel[] =
          rows.map((novel) => {
            const author =
              authorMap.get(
                novel.author_id,
              );

            return {
              id: novel.id,
              title: novel.title,
              description:
                novel.description,
              cover: novel.cover,
              status: novel.status,
              visibility:
                novel.visibility,
              views: novel.views,
              created_at:
                novel.created_at,
              updated_at:
                novel.updated_at,
              author_id:
                novel.author_id,

              author_name:
                author?.display_name ||
                author?.username ||
                'Pengguna',

              author_username:
                author?.username || '',
            };
          });

        setNovels(mappedNovels);
        setLoading(false);
      } catch (error) {
        console.error(
          'Gagal memuat dashboard admin:',
          error,
        );

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAdminDashboard();

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  // ==========================================================
  // BLOKIR / BUKA BLOKIR NOVEL
  // ==========================================================

  const handleToggleBlock = async (
    novel: AdminNovel,
  ) => {
    if (!isAdmin) return;

    const isBlocked =
      novel.visibility !== 'public';

    const confirmed = window.confirm(
      isBlocked
        ? `Buka blokir novel "${novel.title}"? Novel akan kembali terlihat oleh pembaca.`
        : `Blokir novel "${novel.title}"? Novel akan disembunyikan dari pembaca.`,
    );

    if (!confirmed) return;

    setActionLoading(
      `block-${novel.id}`,
    );

    try {
      const newVisibility =
        isBlocked
          ? 'public'
          : 'private';

      const {
        error,
      } = await supabase
        .from('novels')
        .update({
          visibility:
            newVisibility,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', novel.id);

      if (error) {
        console.error(
          'Gagal mengubah status novel:',
          error,
        );

        window.alert(
          'Gagal mengubah status novel.',
        );

        return;
      }

      setNovels(
        (currentNovels) =>
          currentNovels.map(
            (item) =>
              item.id === novel.id
                ? {
                    ...item,
                    visibility:
                      newVisibility,
                  }
                : item,
          ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // HAPUS NOVEL
  // ==========================================================

  const handleDeleteNovel = async (
    novel: AdminNovel,
  ) => {
    if (!isAdmin) return;

    const confirmed =
      window.confirm(
        `PERINGATAN!\n\nNovel "${novel.title}" akan dihapus secara permanen.\n\nData novel dan data terkait yang menggunakan ON DELETE CASCADE juga dapat ikut terhapus.\n\nApakah kamu benar-benar ingin menghapus novel ini?`,
      );

    if (!confirmed) return;

    setActionLoading(
      `delete-${novel.id}`,
    );

    try {
      const {
        error,
      } = await supabase
        .from('novels')
        .delete()
        .eq('id', novel.id);

      if (error) {
        console.error(
          'Gagal menghapus novel:',
          error,
        );

        window.alert(
          `Gagal menghapus novel: ${error.message}`,
        );

        return;
      }

      setNovels(
        (currentNovels) =>
          currentNovels.filter(
            (item) =>
              item.id !== novel.id,
          ),
      );

      setStats(
        (currentStats) => ({
          ...currentStats,
          totalNovels:
            Math.max(
              0,
              currentStats.totalNovels -
                1,
            ),
        }),
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================================
  // USER BELUM LOGIN
  // ==========================================================

  if (!user) {
    return null;
  }

  // ==========================================================
  // BUKAN ADMIN
  // ==========================================================

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert
              size={30}
              className="text-destructive"
            />
          </div>

          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">
            Akses Ditolak
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Halaman ini hanya dapat diakses
            oleh administrator Novel Semesta.
          </p>

          <Button
            className="mt-6"
            onClick={() =>
              navigate('/')
            }
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // FILTER NOVEL
  // ==========================================================

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredNovels =
    normalizedSearch
      ? novels.filter(
          (novel) =>
            novel.title
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            novel.author_name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            novel.author_username
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
        )
      : novels;

  // ==========================================================
  // STAT CARD
  // ==========================================================

  const statCards = [
    {
      label: 'Total Pengguna',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Total Novel',
      value: stats.totalNovels,
      icon: BookOpen,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total Chapter',
      value: stats.totalChapters,
      icon: FileText,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Total Komentar',
      value: stats.totalComments,
      icon: MessageSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total Views',
      value:
        stats.totalViews.toLocaleString(
          'id-ID',
        ),
      icon: Eye,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
  ];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">

        <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={
                  profile.display_name ||
                  'Admin'
                }
                className="h-14 w-14 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-xl font-bold text-primary">
                {(profile?.display_name ||
                  profile?.username ||
                  'AD')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">

                <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  Dashboard Admin
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <ShieldCheck size={12} />
                  Administrator
                </span>

              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Kelola dan pantau aktivitas
                website Novel Semesta.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================
          STATISTIK
      ======================================================= */}

      <section className="mt-8">

        <div className="mb-4">
          <h2 className="font-display text-xl font-bold text-foreground">
            Statistik Website
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan data Novel Semesta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">

          {statCards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60">
                    <Icon
                      size={20}
                      className={
                        card.color
                      }
                    />
                  </div>

                  <p className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    {loading ? (
                      <Loader2
                        size={24}
                        className="animate-spin text-muted-foreground"
                      />
                    ) : (
                      card.value
                    )}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.label}
                  </p>
                </div>
              );
            },
          )}

        </div>
      </section>

      {/* ======================================================
          MODERASI NOVEL
      ======================================================= */}

      <section className="mt-10">

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-3">

              <div className="h-8 w-1 rounded-full bg-primary" />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Moderasi
                </p>

                <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                  Kelola Novel
                </h2>
              </div>

            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Periksa novel yang diterbitkan
              pengguna dan tindak konten yang
              tidak sesuai standar website.
            </p>
          </div>

          {/* SEARCH */}

          <div className="relative w-full sm:w-72">

            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Cari novel atau author..."
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />

          </div>

        </div>

        {/* ====================================================
            WARNING
        ===================================================== */}

        <div className="mb-5 flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">

          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <div>
            <p className="text-sm font-medium text-foreground">
              Perhatian saat moderasi
            </p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Gunakan <strong>Blokir</strong>{' '}
              untuk menyembunyikan novel dari
              pembaca. Gunakan{' '}
              <strong>Hapus</strong> hanya jika
              novel memang harus dihapus secara
              permanen.
            </p>
          </div>

        </div>

        {/* ====================================================
            NOVEL LIST
        ===================================================== */}

        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2
              size={30}
              className="animate-spin text-primary"
            />
          </div>
        ) : filteredNovels.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen
                size={28}
                className="text-primary"
              />
            </div>

            <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
              {searchQuery
                ? 'Novel tidak ditemukan'
                : 'Belum ada novel'}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Coba gunakan kata pencarian lain.'
                : 'Belum ada novel yang dibuat pengguna.'}
            </p>

          </div>
        ) : (
          <div className="space-y-3">

            {filteredNovels.map(
              (novel) => {

                const isBlocked =
                  novel.visibility !==
                  'public';

                const blockLoading =
                  actionLoading ===
                  `block-${novel.id}`;

                const deleteLoading =
                  actionLoading ===
                  `delete-${novel.id}`;

                return (
                  <div
                    key={novel.id}
                    className={cn(
                      'rounded-2xl border bg-card p-4 transition-colors sm:p-5',
                      isBlocked
                        ? 'border-amber-500/30 bg-amber-500/[0.03]'
                        : 'border-border hover:border-primary/30',
                    )}
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      {/* NOVEL INFO */}

                      <div className="flex min-w-0 items-start gap-4">

                        {novel.cover ? (
                          <img
                            src={
                              novel.cover
                            }
                            alt={
                              novel.title
                            }
                            className="h-20 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <BookOpen
                              size={22}
                              className="text-primary"
                            />
                          </div>
                        )}

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <Link
                              to={`/novel/${novel.id}`}
                              className="truncate font-semibold text-foreground hover:text-primary"
                            >
                              {
                                novel.title
                              }
                            </Link>

                            {isBlocked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                                <ShieldAlert
                                  size={11}
                                />
                                Diblokir
                              </span>
                            )}

                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Oleh{' '}
                            <span className="text-foreground">
                              {
                                novel.author_name
                              }
                            </span>

                            {novel.author_username && (
                              <span className="ml-1">
                                (@
                                {
                                  novel.author_username
                                })
                              </span>
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">

                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 font-medium',
                                novel.status ===
                                  'ongoing' &&
                                  'bg-blue-500/10 text-blue-400',
                                novel.status ===
                                  'completed' &&
                                  'bg-green-500/10 text-green-400',
                                novel.status ===
                                  'hiatus' &&
                                  'bg-amber-500/10 text-amber-400',
                                ![
                                  'ongoing',
                                  'completed',
                                  'hiatus',
                                ].includes(
                                  novel.status ??
                                    '',
                                ) &&
                                  'bg-muted text-muted-foreground',
                              )}
                            >
                              {novel.status ===
                              'ongoing'
                                ? 'Ongoing'
                                : novel.status ===
                                    'completed'
                                  ? 'Completed'
                                  : novel.status ===
                                      'hiatus'
                                    ? 'Hiatus'
                                    : novel.status ||
                                      'Tidak diketahui'}
                            </span>

                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Eye
                                size={12}
                              />
                              {Number(
                                novel.views ??
                                  0,
                              ).toLocaleString(
                                'id-ID',
                              )}{' '}
                              views
                            </span>

                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 font-medium',
                                isBlocked
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-primary/10 text-primary',
                              )}
                            >
                              {isBlocked
                                ? 'Private / Diblokir'
                                : 'Publik'}
                            </span>

                          </div>

                        </div>
                      </div>

                      {/* ACTIONS */}

                      <div className="flex shrink-0 flex-wrap items-center gap-2">

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link
                            to={`/novel/${novel.id}`}
                          >
                            Lihat
                            <ArrowRight
                              size={14}
                              className="ml-1.5"
                            />
                          </Link>
                        </Button>

                        <Button
                          variant={
                            isBlocked
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          disabled={
                            blockLoading ||
                            deleteLoading
                          }
                          onClick={() =>
                            handleToggleBlock(
                              novel,
                            )
                          }
                          className={cn(
                            !isBlocked &&
                              'text-amber-400 hover:text-amber-400',
                          )}
                        >
                          {blockLoading ? (
                            <Loader2
                              size={14}
                              className="mr-1.5 animate-spin"
                            />
                          ) : isBlocked ? (
                            <ShieldCheck
                              size={14}
                              className="mr-1.5"
                            />
                          ) : (
                            <ShieldAlert
                              size={14}
                              className="mr-1.5"
                            />
                          )}

                          {isBlocked
                            ? 'Buka Blokir'
                            : 'Blokir'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            blockLoading ||
                            deleteLoading
                          }
                          onClick={() =>
                            handleDeleteNovel(
                              novel,
                            )
                          }
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {deleteLoading ? (
                            <Loader2
                              size={14}
                              className="mr-1.5 animate-spin"
                            />
                          ) : (
                            <Trash2
                              size={14}
                              className="mr-1.5"
                            />
                          )}

                          Hapus
                        </Button>

                      </div>
                    </div>
                  </div>
                );
              },
            )}

          </div>
        )}

      </section>
    </main>
  );
}