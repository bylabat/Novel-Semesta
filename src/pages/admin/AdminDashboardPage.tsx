import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ban,BookOpen, CheckCircle2,Clock, Eye, FileWarning,
  Loader2, MessageCircle, Star,Trash2, Users,XCircle,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// TYPES
// ============================================================

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Novel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  visibility: string | null;
  author_id: string;
  views: number | null;
  view: number | null;
}

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
}

interface ReportItem extends Report {
  novel: Novel | null;
  author: Profile | null;
  reporter: Profile | null;
}

interface WebsiteStats {
  totalUsers: number;
  totalNovels: number;
  totalChapters: number;
  totalComments: number;
  totalViews: number;
  totalRatings: number;
  totalReports: number;
  pendingReports: number;
  blockedNovels: number;
  publishedNovels: number;
}

const EMPTY_STATS: WebsiteStats = {
  totalUsers: 0,
  totalNovels: 0,
  totalChapters: 0,
  totalComments: 0,
  totalViews: 0,
  totalRatings: 0,
  totalReports: 0,
  pendingReports: 0,
  blockedNovels: 0,
  publishedNovels: 0,
};

// ============================================================
// PAGE
// ============================================================

  export default function AdminDashboardPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] =
    useState<WebsiteStats>(EMPTY_STATS);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [selectedReport, setSelectedReport] =
    useState<ReportItem | null>(null);

  const [error, setError] = useState('');

  // ==========================================================
  // LOAD ALL REPORT DATA
  // ==========================================================

  const loadReports = useCallback(
    async (): Promise<ReportItem[]> => {
      const {
        data: reportData,
        error: reportError,
      } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          target_type,
          target_id,
          reason,
          description,
          status,
          created_at
        `)
        .eq('target_type', 'novel')
        .order('created_at', {
          ascending: false,
        });

      if (reportError) {
        throw reportError;
      }

      const rawReports =
        (reportData ?? []) as Report[];

      if (rawReports.length === 0) {
        return [];
      }

      // --------------------------------------------------------
      // Novel IDs
      // --------------------------------------------------------

      const novelIds = [
        ...new Set(
          rawReports
            .map((report) => report.target_id)
            .filter(Boolean),
        ),
      ];

      // --------------------------------------------------------
      // Reporter IDs
      // --------------------------------------------------------

      const reporterIds = [
        ...new Set(
          rawReports
            .map(
              (report) =>
                report.reporter_id,
            )
            .filter(Boolean),
        ),
      ];

      let novelsData: Novel[] = [];
      let reportersData: Profile[] = [];
      let authorsData: Profile[] = [];

      // --------------------------------------------------------
      // Fetch novels
      // --------------------------------------------------------

      if (novelIds.length > 0) {
        const {
          data,
          error: novelsError,
        } = await supabase
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
            view
          `)
          .in('id', novelIds);

        if (novelsError) {
          console.error(
            'Gagal mengambil novel laporan:',
            novelsError,
          );
        } else {
          novelsData =
            (data ?? []) as Novel[];
        }
      }

      // --------------------------------------------------------
      // Fetch reporters
      // --------------------------------------------------------

      if (reporterIds.length > 0) {
        const {
          data,
          error: reportersError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            display_name
          `)
          .in('id', reporterIds);

        if (reportersError) {
          console.error(
            'Gagal mengambil reporter:',
            reportersError,
          );
        } else {
          reportersData =
            (data ?? []) as Profile[];
        }
      }

      // --------------------------------------------------------
      // Author IDs
      // --------------------------------------------------------

      const authorIds = [
        ...new Set(
          novelsData
            .map(
              (novel) =>
                novel.author_id,
            )
            .filter(Boolean),
        ),
      ];

      // --------------------------------------------------------
      // Fetch authors
      // --------------------------------------------------------

      if (authorIds.length > 0) {
        const {
          data,
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
            (data ?? []) as Profile[];
        }
      }

      // --------------------------------------------------------
      // Maps
      // --------------------------------------------------------

      const novelsMap = new Map<
        string,
        Novel
      >();

      novelsData.forEach((novel) => {
        novelsMap.set(novel.id, novel);
      });

      const reportersMap = new Map<
        string,
        Profile
      >();

      reportersData.forEach((reporter) => {
        reportersMap.set(
          reporter.id,
          reporter,
        );
      });

      const authorsMap = new Map<
        string,
        Profile
      >();

      authorsData.forEach((author) => {
        authorsMap.set(
          author.id,
          author,
        );
      });

      // --------------------------------------------------------
      // Build report items
      // --------------------------------------------------------

      return rawReports.map((report) => {
        const novel =
          novelsMap.get(
            report.target_id,
          ) ?? null;

        return {
          ...report,
          novel,
          author: novel
            ? authorsMap.get(
                novel.author_id,
              ) ?? null
            : null,
          reporter:
            reportersMap.get(
              report.reporter_id,
            ) ?? null,
        };
      });
    },
    [],
  );

  // ==========================================================
  // LOAD WEBSITE STATISTICS
  // ==========================================================

  const loadStats = useCallback(
    async (): Promise<WebsiteStats> => {
      const [
        usersRes,
        novelsRes,
        chaptersRes,
        commentsRes,
        ratingsRes,
        reportsRes,
        pendingReportsRes,
        blockedNovelsRes,
        publishedNovelsRes,
        viewsRes,
      ] = await Promise.all([
        // ------------------------------------------------------
        // TOTAL USERS
        // ------------------------------------------------------

        supabase
          .from('profiles')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        // ------------------------------------------------------
        // TOTAL NOVELS
        // ------------------------------------------------------

        supabase
          .from('novels')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        // ------------------------------------------------------
        // TOTAL CHAPTERS
        // ------------------------------------------------------

        supabase
          .from('chapters')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        // ------------------------------------------------------
        // TOTAL COMMENTS
        // ------------------------------------------------------

        supabase
          .from('comments')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        // ------------------------------------------------------
        // TOTAL RATINGS
        // ------------------------------------------------------

        supabase
          .from('ratings')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        // ------------------------------------------------------
        // TOTAL REPORTS
        // ------------------------------------------------------

        supabase
          .from('reports')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('target_type', 'novel'),

        // ------------------------------------------------------
        // PENDING REPORTS
        // ------------------------------------------------------

        supabase
          .from('reports')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('target_type', 'novel')
          .eq('status', 'pending'),

        // ------------------------------------------------------
        // BLOCKED NOVELS
        // ------------------------------------------------------

        supabase
          .from('novels')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('visibility', 'blocked'),

        // ------------------------------------------------------
        // PUBLIC NOVELS
        // ------------------------------------------------------

        supabase
          .from('novels')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('visibility', 'public'),

        // ------------------------------------------------------
        // VIEWS
        // ------------------------------------------------------

        supabase
          .from('novels')
          .select('views, view'),
      ]);

      // ========================================================
      // CHECK ERRORS
      // ========================================================

      const statErrors = [
        usersRes.error,
        novelsRes.error,
        chaptersRes.error,
        commentsRes.error,
        ratingsRes.error,
        reportsRes.error,
        pendingReportsRes.error,
        blockedNovelsRes.error,
        publishedNovelsRes.error,
        viewsRes.error,
      ].filter(Boolean);

      if (statErrors.length > 0) {
        console.error(
          'Sebagian statistik gagal diambil:',
          statErrors,
        );
      }

      // ========================================================
      // TOTAL VIEWS
      // ========================================================

      let totalViews = 0;

      if (!viewsRes.error) {
        totalViews =
          (viewsRes.data ?? []).reduce(
            (
              total,
              novel: {
                views: number | null;
                view: number | null;
              },
            ) => {
              const viewsValue =
                Number(
                  novel.views ?? 0,
                );

              const viewValue =
                Number(
                  novel.view ?? 0,
                );

              /*
               * Database memiliki dua kolom:
               * views dan view.
               *
               * Gunakan nilai terbesar agar satu
               * novel tidak dihitung dua kali.
               */
              return (
                total +
                Math.max(
                  viewsValue,
                  viewValue,
                )
              );
            },
            0,
          );
      }

      return {
        totalUsers:
          usersRes.count ?? 0,

        totalNovels:
          novelsRes.count ?? 0,

        totalChapters:
          chaptersRes.count ?? 0,

        totalComments:
          commentsRes.count ?? 0,

        totalViews,

        totalRatings:
          ratingsRes.count ?? 0,

        totalReports:
          reportsRes.count ?? 0,

        pendingReports:
          pendingReportsRes.count ?? 0,

        blockedNovels:
          blockedNovelsRes.count ?? 0,

        publishedNovels:
          publishedNovelsRes.count ?? 0,
      };
    },
    [],
  );

  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  const loadDashboardData =
    useCallback(
      async () => {
        if (
          !user ||
          profile?.role !== 'admin'
        ) {
          return;
        }

        setLoading(true);
        setError('');

        try {
          const [
            loadedStats,
            loadedReports,
          ] = await Promise.all([
            loadStats(),
            loadReports(),
          ]);

          setStats(loadedStats);
          setReports(loadedReports);
        } catch (err) {
          console.error(
            'Kesalahan dashboard admin:',
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat dashboard admin.',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        user,
        profile?.role,
        loadStats,
        loadReports,
      ],
    );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (
      !user ||
      profile?.role !== 'admin'
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError('');

        const [
          loadedStats,
          loadedReports,
        ] = await Promise.all([
          loadStats(),
          loadReports(),
        ]);

        if (cancelled) return;

        setStats(loadedStats);
        setReports(loadedReports);
      } catch (err) {
        if (cancelled) return;

        console.error(
          'Kesalahan dashboard admin:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat memuat dashboard admin.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    profile?.role,
    loadStats,
    loadReports,
  ]);

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function refreshDashboard() {
    await loadDashboardData();
  }

  // ==========================================================
  // UPDATE REPORT STATUS
  // ==========================================================

  async function updateReportStatus(
    reportId: string,
    status: string,
  ) {
    setActionLoading(reportId);

    try {
      const {
        data,
        error: updateError,
      } = await supabase
        .from('reports')
        .update({
          status,
        })
        .eq('id', reportId)
        .select('id, status')
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error(
          'Laporan tidak ditemukan atau tidak dapat diperbarui.',
        );
      }

      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status,
              }
            : report,
        ),
      );

      // Pending hanya berkurang apabila
      // laporan sebelumnya memang pending.
      setStats((current) => {
        const oldReport =
          reports.find(
            (report) =>
              report.id ===
              reportId,
          );

        if (
          oldReport?.status !==
            'pending' ||
          status === 'pending'
        ) {
          return current;
        }

        return {
          ...current,
          pendingReports:
            Math.max(
              0,
              current.pendingReports -
                1,
            ),
        };
      });

      return true;
    } catch (err) {
      console.error(
        'Gagal memperbarui status laporan:',
        err,
      );

      alert(
        `Gagal memperbarui laporan: ${
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan.'
        }`,
      );

      return false;
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // REJECT REPORT
  // ==========================================================

  async function rejectReport(
    report: ReportItem,
  ) {
    if (report.status !== 'pending') {
      return;
    }

    const confirmed =
      window.confirm(
        'Tolak laporan ini?\n\nNovel tidak akan diblokir.',
      );

    if (!confirmed) return;

    const success =
      await updateReportStatus(
        report.id,
        'rejected',
      );

    if (!success) return;

    setSelectedReport(null);

    alert(
      'Laporan berhasil ditolak.',
    );
  }

  // ==========================================================
  // BLOCK NOVEL
  // ==========================================================

  async function blockNovel(
    report: ReportItem,
  ) {
    if (!report.novel) {
      alert(
        'Novel yang dilaporkan tidak ditemukan.',
      );
      return;
    }

    if (report.status !== 'pending') {
      alert(
        'Laporan ini sudah ditangani.',
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Blokir novel "${report.novel.title}"?\n\nNovel akan disembunyikan dari publik dan author akan menerima notifikasi.`,
      );

    if (!confirmed) return;

    setActionLoading(report.id);

    try {
      const novelId =
        report.novel.id;

      const authorId =
        report.novel.author_id;

      const novelTitle =
        report.novel.title;

      // ======================================================
      // 1. BLOCK NOVEL
      // ======================================================

      const {
        data: blockedNovel,
        error: blockError,
      } = await supabase
        .from('novels')
        .update({
          visibility: 'blocked',
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', novelId)
        .select(`
          id,
          visibility
        `)
        .single();

      if (blockError) {
        throw blockError;
      }

      if (!blockedNovel) {
        throw new Error(
          'Novel tidak ditemukan atau tidak dapat diblokir.',
        );
      }

      // ======================================================
      // 2. RESOLVE REPORT
      // ======================================================

      const {
        error: reportError,
      } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
        })
        .eq('id', report.id);

      if (reportError) {
        /*
         * Novel sudah berhasil diblokir.
         * Jangan membatalkan tindakan hanya karena
         * update laporan gagal.
         */
        console.error(
          'Novel berhasil diblokir tetapi status laporan gagal diperbarui:',
          reportError,
        );
      }

      // ======================================================
      // 3. NOTIFICATION
      // ======================================================

      const notificationMessage =
        `Novel "${novelTitle}" telah diblokir oleh administrator karena tidak memenuhi standar website. Novel tersebut saat ini tidak dapat ditampilkan kepada publik. Jika kamu merasa keputusan ini keliru, silakan hubungi administrator.`;

      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: authorId,
          title: 'Novel Diblokir',
          message:
            notificationMessage,
          type: 'novel_blocked',
          read: false,
        });

      if (notificationError) {
        console.error(
          'Gagal membuat notifikasi:',
          notificationError,
        );
      }

      // ======================================================
      // 4. UPDATE LOCAL REPORT
      // ======================================================

      setReports((current) =>
        current.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: 'resolved',
                novel: item.novel
                  ? {
                      ...item.novel,
                      visibility:
                        'blocked',
                    }
                  : null,
              }
            : item,
        ),
      );

      // ======================================================
      // 5. UPDATE STATS
      // ======================================================

      setStats((current) => ({
        ...current,

        blockedNovels:
          current.blockedNovels + 1,

        publishedNovels:
          report.novel?.visibility === 'public'
            ? Math.max(
                0,
                current.publishedNovels - 1,
              )
            : current.publishedNovels,

        pendingReports:
          Math.max(
            0,
            current.pendingReports - 1,
          ),
      }));

      setSelectedReport(null);

      // ======================================================
      // RESULT
      // ======================================================

      if (notificationError) {
        alert(
          'Novel berhasil diblokir, tetapi notifikasi kepada author gagal dibuat.',
        );
      } else {
        alert(
          'Novel berhasil diblokir dan notifikasi telah dikirim kepada author.',
        );
      }
    } catch (err) {
      console.error(
        'Gagal memblokir novel:',
        err,
      );

      alert(
        `Gagal memblokir novel: ${
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan.'
        }`,
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // DELETE NOVEL
  // ==========================================================

  async function deleteNovel(
    report: ReportItem,
  ) {
    if (!report.novel) {
      alert(
        'Novel yang dilaporkan tidak ditemukan.',
      );
      return;
    }

    if (report.status !== 'pending') {
      alert(
        'Laporan ini sudah ditangani.',
      );
      return;
    }

    const confirmed =
      window.confirm(
        `HAPUS PERMANEN novel "${report.novel.title}"?\n\nNovel, chapter, dan data terkait yang memiliki ON DELETE CASCADE dapat ikut terhapus.\n\nTindakan ini tidak dapat dibatalkan.`,
      );

    if (!confirmed) return;

    setActionLoading(report.id);

    try {
      const novelId =
        report.novel.id;

      const authorId =
        report.novel.author_id;

      const novelTitle =
        report.novel.title;

      // Simpan apakah novel sebelumnya publik
      // untuk sinkronisasi statistik.
      const wasPublic =
        report.novel
          .visibility ===
        'public';

      const wasBlocked =
        report.novel
          .visibility ===
        'blocked';

      // ======================================================
      // 1. DELETE NOVEL
      // ======================================================

      const {
        error: deleteError,
      } = await supabase
        .from('novels')
        .delete()
        .eq('id', novelId);

      if (deleteError) {
        throw deleteError;
      }

      // ======================================================
      // 2. RESOLVE REPORT
      // ======================================================

      const {
        error: reportError,
      } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
        })
        .eq('id', report.id);

      if (reportError) {
        console.error(
          'Novel berhasil dihapus tetapi status laporan gagal diperbarui:',
          reportError,
        );
      }

      // ======================================================
      // 3. NOTIFICATION
      // ======================================================

      const {
        error: notificationError,
      } = await supabase
        .from('notifications')
        .insert({
          user_id: authorId,
          title: 'Novel Dihapus',
          message:
            `Novel "${novelTitle}" telah dihapus oleh administrator karena melanggar standar website.`,
          type: 'novel_deleted',
          read: false,
        });

      if (notificationError) {
        console.error(
          'Gagal membuat notifikasi:',
          notificationError,
        );
      }

      // ======================================================
      // 4. UPDATE REPORT UI
      // ======================================================

      setReports((current) =>
        current.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: 'resolved',
                novel: null,
              }
            : item,
        ),
      );

      // ======================================================
      // 5. UPDATE STATS
      // ======================================================

      setStats((current) => ({
        ...current,

        totalNovels:
          Math.max(
            0,
            current.totalNovels - 1,
          ),

        publishedNovels:
          wasPublic
            ? Math.max(
                0,
                current.publishedNovels -
                  1,
              )
            : current.publishedNovels,

        blockedNovels:
          wasBlocked
            ? Math.max(
                0,
                current.blockedNovels -
                  1,
              )
            : current.blockedNovels,

        pendingReports:
          Math.max(
            0,
            current.pendingReports -
              1,
          ),
      }));

      setSelectedReport(null);

      // ======================================================
      // RESULT
      // ======================================================

      if (notificationError) {
        alert(
          'Novel berhasil dihapus, tetapi notifikasi kepada author gagal dibuat.',
        );
      } else {
        alert(
          'Novel berhasil dihapus dan notifikasi telah dikirim kepada author.',
        );
      }
    } catch (err) {
      console.error(
        'Gagal menghapus novel:',
        err,
      );

      alert(
        `Gagal menghapus novel: ${
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan.'
        }`,
      );
    } finally {
      setActionLoading(null);
    }
  }

  // ==========================================================
  // AUTH
  // ==========================================================

  if (!user) {
    return null;
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={24}
            className="animate-spin text-primary"
          />
          Memuat dashboard admin...
        </div>
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle
              size={22}
              className="text-destructive"
            />

            <h2 className="font-semibold text-destructive">
              Gagal memuat dashboard admin
            </h2>
          </div>

          <p className="mt-3 break-words text-sm text-destructive/80">
            {error}
          </p>

          <Button
            className="mt-5"
            variant="outline"
            onClick={refreshDashboard}
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // DISPLAY DATA
  // ==========================================================

  const displayName =
    profile?.display_name ||
    profile?.username ||
    'Admin';

  const pendingReports =
    reports.filter(
      (report) =>
        report.status ===
        'pending',
    );

  const processedReports =
    reports.filter(
      (report) =>
        report.status !==
        'pending',
    );

  const handledReports =
    Math.max(
      0,
      stats.totalReports -
        stats.pendingReports,
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 size={13} />
                Administrator
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Dashboard Admin
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Selamat datang,{' '}
              <span className="font-medium text-foreground">
                {displayName}
              </span>
              . Pantau statistik website dan kelola moderasi Novel Semesta.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={
                refreshDashboard
              }
              disabled={loading}
            >
              <Loader2
                size={16}
                className={cn(
                  'mr-2',
                  loading &&
                    'animate-spin',
                )}
              />
              Refresh
            </Button>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldIcon />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          WEBSITE STATISTICS
      ======================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-foreground">
            Statistik Website
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan data dan aktivitas Novel Semesta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">

          <StatCard
            label="Total Pengguna"
            value={stats.totalUsers}
            icon={Users}
            iconClass="text-primary"
            bgClass="bg-primary/10"
            onClick={() => {
              navigate('/admin/users');
            }}
          />

          <StatCard
            label="Total Novel"
            value={stats.totalNovels}
            icon={BookOpen}
            iconClass="text-blue-400"
            bgClass="bg-blue-500/10"
            onClick={() => {
              navigate('/admin/novels');
            }}
          />

          <StatCard
            label="Total Chapter"
            value={stats.totalChapters}
            icon={BookOpen}
            iconClass="text-violet-400"
            bgClass="bg-violet-500/10"
            onClick={() => {
              navigate('/admin/chapters');
            }}
          />

          <StatCard
            label="Total Komentar"
            value={stats.totalComments}
            icon={MessageCircle}
            iconClass="text-green-400"
            bgClass="bg-green-500/10"
            onClick={() => {
              navigate('/admin/comments');
            }}
          />

          <StatCard
            label="Total Views"
            value={stats.totalViews}
            icon={Eye}
            iconClass="text-amber-400"
            bgClass="bg-amber-500/10"
            onClick={() => {
              alert('Statistik views akan dibuka di sini.');
            }}
          />

          <StatCard
            label="Total Rating"
            value={stats.totalRatings}
            icon={Star}
            iconClass="text-yellow-400"
            bgClass="bg-yellow-500/10"
            onClick={() => {
              alert('Daftar semua rating akan dibuka di sini.');
            }}
          />

          <StatCard
            label="Novel Publik"
            value={stats.publishedNovels}
            icon={CheckCircle2}
            iconClass="text-emerald-400"
            bgClass="bg-emerald-500/10"
            onClick={() => {
              alert('Daftar novel publik akan dibuka di sini.');
            }}
          />

          <StatCard
            label="Novel Diblokir"
            value={stats.blockedNovels}
            icon={Ban}
            iconClass="text-red-400"
            bgClass="bg-red-500/10"
            onClick={() => {
              alert('Daftar novel yang diblokir akan dibuka di sini.');
            }}
          />

          <StatCard
            label="Total Laporan"
            value={stats.totalReports}
            icon={FileWarning}
            iconClass="text-orange-400"
            bgClass="bg-orange-500/10"
            onClick={() => {
              alert('Semua laporan akan dibuka di sini.');
            }}
          />

        </div>
      </section>

      {/* ======================================================
          MODERATION SUMMARY
      ======================================================= */}

          <section className="mt-10">
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-foreground">
                Ringkasan Moderasi
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Kondisi laporan dan novel yang sedang ditangani administrator.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              <SummaryCard
                label="Laporan Menunggu"
                value={stats.pendingReports}
                icon={Clock}
                className="border-amber-500/20 bg-amber-500/5"
                iconClass="text-amber-400"
                onClick={() => {
                  alert('Daftar laporan menunggu akan dibuka di sini.');
                }}
              />

              <SummaryCard
                label="Novel Diblokir"
                value={stats.blockedNovels}
                icon={Ban}
                className="border-red-500/20 bg-red-500/5"
                iconClass="text-red-400"
                onClick={() => {
                  alert('Daftar novel diblokir akan dibuka di sini.');
                }}
              />

              <SummaryCard
                label="Laporan Ditangani"
                value={handledReports}
                icon={CheckCircle2}
                className="border-green-500/20 bg-green-500/5"
                iconClass="text-green-400"
                onClick={() => {
                  alert('Riwayat laporan akan dibuka di sini.');
                }}
              />

            </div>
          </section>

      {/* ======================================================
          PENDING REPORTS
      ======================================================= */}

        <section
          id="pending-reports"
          className="mt-10 scroll-mt-24"
        >

        <div className="mb-5 flex items-center justify-between gap-4">

          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Laporan Menunggu
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Tinjau laporan novel yang masuk sebelum mengambil tindakan.
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            {pendingReports.length}{' '}
            laporan
          </span>

        </div>

        {pendingReports.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
              <CheckCircle2
                size={28}
                className="text-green-400"
              />
            </div>

            <h3 className="mt-4 font-semibold text-foreground">
              Tidak ada laporan yang menunggu
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Semua laporan novel sudah ditangani.
            </p>

          </div>
        ) : (
          <div className="space-y-4">
            {pendingReports.map(
              (report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  actionLoading={
                    actionLoading ===
                    report.id
                  }
                  onView={() =>
                    setSelectedReport(
                      report,
                    )
                  }
                  onReject={() =>
                    rejectReport(
                      report,
                    )
                  }
                  onBlock={() =>
                    blockNovel(
                      report,
                    )
                  }
                  onDelete={() =>
                    deleteNovel(
                      report,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
          {/* ======================================================
              BLOCKED NOVELS
          ====================================================== */}

          <section
            id="blocked-novels"
            className="mt-10 scroll-mt-24"
          >
            <div className="mb-5">
              <h2 className="font-display text-xl font-bold text-foreground">
                Novel Diblokir
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Daftar novel yang telah diblokir oleh administrator.
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                  <Ban
                    size={22}
                    className="text-red-400"
                  />
                </div>

                <div>
                  <p className="font-semibold text-foreground">
                    {stats.blockedNovels} Novel Diblokir
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Novel yang saat ini memiliki status privasi diblokir.
                  </p>
                </div>
              </div>
            </div>
          </section>
      </section>

      {/* ======================================================
          PROCESSED REPORTS
      ======================================================= */}

  {processedReports.length > 0 && (
    <section
      id="processed-reports"
      className="mt-10 scroll-mt-24"
    >

          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-foreground">
              Riwayat Laporan
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Laporan yang sudah diproses oleh admin.
            </p>
          </div>

          <div className="space-y-3">
            {processedReports.map(
              (report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          report.status ===
                            'resolved'
                            ? 'bg-green-500/10 text-green-400'
                            : report.status ===
                              'rejected'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-amber-500/10 text-amber-400',
                        )}
                      >
                        {report.status ===
                        'resolved'
                          ? 'Selesai'
                          : report.status ===
                            'rejected'
                          ? 'Ditolak'
                          : report.status}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(
                          report.created_at,
                        )}
                      </span>

                    </div>

                    <p className="mt-2 truncate font-medium text-foreground">
                      {report.novel?.title ||
                        'Novel sudah tidak tersedia'}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.reason}
                    </p>

                  </div>

                  {report.novel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedReport(
                          report,
                        )
                      }
                    >
                      <Eye
                        size={15}
                        className="mr-2"
                      />
                      Detail
                    </Button>
                  )}

                </div>
              ),
            )}
          </div>

        </section>
      )}

      {/* ======================================================
          DETAIL MODAL
      ======================================================= */}

      {selectedReport && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedReport(
                null,
              );
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-5">

              <div>
                <h2 className="font-display text-lg font-bold text-foreground">
                  Detail Laporan
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(
                    selectedReport.created_at,
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReport(
                    null,
                  )
                }
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <XCircle
                  size={22}
                />
              </button>

            </div>

            <div className="space-y-5 p-5">

              {/* NOVEL */}

              {selectedReport.novel ? (
                <div className="flex gap-4 rounded-2xl border border-border bg-background/40 p-4">

                  <img
                    src={
                      selectedReport
                        .novel
                        .cover ||
                      '/placeholder.svg'
                    }
                    alt={
                      selectedReport
                        .novel
                        .title
                    }
                    className="h-28 w-20 shrink-0 rounded-xl object-cover"
                  />

                  <div className="min-w-0 flex-1">

                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Novel Dilaporkan
                    </p>

                    <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                      {
                        selectedReport
                          .novel
                          .title
                      }
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {
                        selectedReport
                          .novel
                          .description ||
                        'Tidak ada deskripsi.'
                      }
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">

                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                        Status:{' '}
                        {
                          selectedReport
                            .novel
                            .status ||
                          '-'
                        }
                      </span>

                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px]',
                          selectedReport
                            .novel
                            .visibility ===
                            'blocked'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        {
                          selectedReport
                            .novel
                            .visibility ||
                          '-'
                        }
                      </span>

                      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-400">
                        <Eye
                          size={12}
                          className="mr-1 inline"
                        />
                        {formatNumber(
                          getNovelViews(
                            selectedReport
                              .novel,
                          ),
                        )}{' '}
                        views
                      </span>

                    </div>

                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Novel sudah tidak tersedia.
                  </p>
                </div>
              )}

              {/* AUTHOR */}

              {selectedReport.author && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Author
                  </p>

                  <p className="mt-1 text-sm font-medium text-foreground">
                    {selectedReport.author.display_name ||
                      selectedReport.author.username ||
                      'Author'}
                  </p>

                  {selectedReport.author.username && (
                    <p className="text-xs text-muted-foreground">
                      @{selectedReport.author.username}
                    </p>
                  )}
                </div>
              )}

              {/* REPORTER */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dilaporkan oleh
                </p>

                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedReport
                    .reporter
                    ?.display_name ||
                    selectedReport
                      .reporter
                      ?.username ||
                    'Pengguna'}
                </p>
              </div>

              {/* REASON */}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Alasan
                </p>

                <p className="mt-1 rounded-xl border border-border bg-background/40 p-3 text-sm font-medium text-foreground">
                  {selectedReport.reason}
                </p>
              </div>

              {/* DESCRIPTION */}

              {selectedReport.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Keterangan Pelapor
                  </p>

                  <p className="mt-1 whitespace-pre-line rounded-xl border border-border bg-background/40 p-3 text-sm leading-6 text-muted-foreground">
                    {
                      selectedReport.description
                    }
                  </p>
                </div>
              )}

              {/* ACTIONS */}

              {selectedReport.status ===
                'pending' &&
                selectedReport.novel && (
                  <div className="border-t border-border pt-5">

                    <p className="mb-3 text-sm font-semibold text-foreground">
                      Tindakan Admin
                    </p>

                    <div className="grid gap-2 sm:grid-cols-3">

                      {/* REJECT */}

                      <Button
                        variant="outline"
                        disabled={
                          actionLoading !==
                          null
                        }
                        onClick={() =>
                          rejectReport(
                            selectedReport,
                          )
                        }
                      >
                        {actionLoading ===
                        selectedReport.id ? (
                          <Loader2
                            size={16}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <XCircle
                            size={16}
                            className="mr-2"
                          />
                        )}

                        Tolak
                      </Button>

                      {/* BLOCK */}

                      <Button
                        variant="outline"
                        disabled={
                          actionLoading !==
                          null
                        }
                        onClick={() =>
                          blockNovel(
                            selectedReport,
                          )
                        }
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      >
                        {actionLoading ===
                        selectedReport.id ? (
                          <Loader2
                            size={16}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <Ban
                            size={16}
                            className="mr-2"
                          />
                        )}

                        Blokir
                      </Button>

                      {/* DELETE */}

                      <Button
                        variant="destructive"
                        disabled={
                          actionLoading !==
                          null
                        }
                        onClick={() =>
                          deleteNovel(
                            selectedReport,
                          )
                        }
                      >
                        {actionLoading ===
                        selectedReport.id ? (
                          <Loader2
                            size={16}
                            className="mr-2 animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={16}
                            className="mr-2"
                          />
                        )}

                        Hapus Permanen
                      </Button>

                    </div>
                  </div>
                )}

            </div>
          </div>
        </div>
      )}

    </main>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
  bgClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full rounded-2xl border border-border bg-card p-5 text-left transition-all',
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg'
          : 'cursor-default',
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-10 w-10 items-center justify-center rounded-xl',
          bgClass,
        )}
      >
        <Icon
          size={20}
          className={iconClass}
        />
      </div>

      <p className="font-display text-3xl font-bold text-foreground">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {label}
      </p>

      {onClick && (
        <p className="mt-3 text-xs font-medium text-primary">
          Klik untuk melihat detail →
        </p>
      )}
    </button>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
  iconClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  className: string;
  iconClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full rounded-2xl border p-5 text-left transition-all',
        className,
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg'
          : 'cursor-default',
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 font-display text-3xl font-bold text-foreground">
            {formatNumber(value)}
          </p>

          {onClick && (
            <p className="mt-2 text-xs font-medium text-primary">
              Klik untuk melihat detail →
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/50">
          <Icon
            size={22}
            className={iconClass}
          />
        </div>
      </div>
    </button>
  );
}

// ============================================================
// REPORT CARD
// ============================================================

function ReportCard({
  report,
  actionLoading,
  onView,
  onReject,
  onBlock,
  onDelete,
}: {
  report: ReportItem;
  actionLoading: boolean;
  onView: () => void;
  onReject: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const views = report.novel
    ? getNovelViews(report.novel)
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 sm:p-5">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

        {/* NOVEL INFO */}

        <div className="flex min-w-0 flex-1 gap-4">

          <img
            src={
              report.novel?.cover ||
              '/placeholder.svg'
            }
            alt={
              report.novel?.title ||
              'Novel'
            }
            className="h-24 w-16 shrink-0 rounded-xl object-cover"
          />

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                Menunggu
              </span>

              <span className="text-xs text-muted-foreground">
                {formatDate(
                  report.created_at,
                )}
              </span>

            </div>

            <h3 className="mt-2 truncate font-display text-lg font-bold text-foreground">
              {report.novel?.title ||
                'Novel tidak ditemukan'}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Alasan:{' '}
              <span className="font-medium text-foreground">
                {report.reason}
              </span>
            </p>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">

              <span>
                Dilaporkan oleh:{' '}
                {report.reporter
                  ?.display_name ||
                  report.reporter
                    ?.username ||
                  'Pengguna'}
              </span>

              {report.author && (
                <span>
                  Author:{' '}
                  {report.author
                    .display_name ||
                    report.author
                      .username ||
                    'Author'}
                </span>
              )}

              <span>
                <Eye
                  size={12}
                  className="mr-1 inline"
                />
                {formatNumber(
                  views,
                )}{' '}
                views
              </span>

            </div>

          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-2 lg:justify-end">

          <Button
            variant="outline"
            size="sm"
            onClick={onView}
          >
            <Eye
              size={15}
              className="mr-2"
            />
            Detail
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={onReject}
          >
            {actionLoading ? (
              <Loader2
                size={15}
                className="mr-2 animate-spin"
              />
            ) : (
              <XCircle
                size={15}
                className="mr-2"
              />
            )}
            Tolak
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={onBlock}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            {actionLoading ? (
              <Loader2
                size={15}
                className="mr-2 animate-spin"
              />
            ) : (
              <Ban
                size={15}
                className="mr-2"
              />
            )}
            Blokir
          </Button>

          <Button
            variant="destructive"
            size="sm"
            disabled={actionLoading}
            onClick={onDelete}
          >
            {actionLoading ? (
              <Loader2
                size={15}
                className="mr-2 animate-spin"
              />
            ) : (
              <Trash2
                size={15}
                className="mr-2"
              />
            )}
            Hapus
          </Button>

        </div>

      </div>
    </div>
  );
}

// ============================================================
// GET NOVEL VIEWS
// ============================================================

function getNovelViews(
  novel: Novel,
) {
  return Math.max(
    Number(
      novel.views ?? 0,
    ),
    Number(
      novel.view ?? 0,
    ),
  );
}

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleDateString(
    'id-ID',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

// ============================================================
// NUMBER FORMAT
// ============================================================

function formatNumber(
  value: number,
) {
  return Number(
    value || 0,
  ).toLocaleString('id-ID');
}

// ============================================================
// ADMIN ICON
// ============================================================

function ShieldIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">

      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-7 w-7 text-primary"
      >

        <path
          d="M12 3l7 3v5c0 4.5-2.9 8.5-7 10-4.1-1.5-7-5.5-7-10V6l7-3z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M9 12l2 2 4-4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

      </svg>

    </div>
  );
}