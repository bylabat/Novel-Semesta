import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  MessageSquare,
  Plus,
  Settings,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalNovels: number;
  totalChapters: number;
  publishedChapters: number;
  totalComments: number;
}

interface RecentNovel {
  id: string;
  title: string;
  status: string;
  visibility: string;
  updated_at: string;
}

export default function AuthorDashboardPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalNovels: 0,
    totalChapters: 0,
    publishedChapters: 0,
    totalComments: 0,
  });
  const [recentNovels, setRecentNovels] = useState<RecentNovel[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);

      const { data: novels } = await supabase
        .from('novels')
        .select('id, title, status, visibility, updated_at')
        .eq('author_id', user.id)
        .order('updated_at', { ascending: false });

      if (cancelled) return;

      const novelIds = novels?.map((n) => n.id) ?? [];
      const placeholder = ['00000000-0000-0000-0000-000000000000'];
      const idsForQuery = novelIds.length > 0 ? novelIds : placeholder;

      const [allChaptersRes, publishedChaptersRes, commentsCountRes] = await Promise.all([
        supabase.from('chapters').select('id', { count: 'exact', head: true }).in('novel_id', idsForQuery),
        supabase.from('chapters').select('id', { count: 'exact', head: true }).eq('published', true).in('novel_id', idsForQuery),
        supabase.from('comments').select('id', { count: 'exact', head: true }).in('novel_id', idsForQuery),
      ]);

      if (cancelled) return;

      setStats({
        totalNovels: novels?.length ?? 0,
        totalChapters: allChaptersRes.count ?? 0,
        publishedChapters: publishedChaptersRes.count ?? 0,
        totalComments: commentsCountRes.count ?? 0,
      });
      setRecentNovels((novels as RecentNovel[])?.slice(0, 5) ?? []);
      setLoading(false);
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const displayName = profile?.display_name || profile?.username || 'Author';
  const avatarUrl = profile?.avatar;
  const initials = displayName.slice(0, 2).toUpperCase();

  const statCards = [
    { label: 'Total Novel', value: stats.totalNovels, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Chapter', value: stats.totalChapters, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Chapter Terbit', value: stats.publishedChapters, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Total Komentar', value: stats.totalComments, icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-14 w-14 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-xl font-bold text-primary">
              {initials}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Author Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Selamat datang kembali, <span className="font-medium text-foreground">{displayName}</span>
            </p>
          </div>
        </div>
        <div className="flex h-8 w-1 rounded-full bg-primary glow-primary-sm sm:hidden" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.bg)}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">
                {loading ? <Loader2 size={24} className="animate-spin text-muted-foreground" /> : card.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="glow-primary-sm" size="lg" onClick={() => navigate('/author/create-novel')}>
          <Plus size={18} className="mr-2" /> Buat Novel Baru
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/author/manage-novels')}>
          <Settings size={18} className="mr-2" /> Kelola Novel
        </Button>
      </div>

      {/* Recent novels */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">Novel Terbaru</h2>
          {recentNovels.length > 0 && (
            <Link to="/author/manage-novels" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Lihat semua <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : recentNovels.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen size={32} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Belum ada novel</p>
              <p className="mt-1 text-sm text-muted-foreground">Mulai perjalanan menulis kamu dengan membuat novel pertama.</p>
            </div>
            <Button className="glow-primary-sm" onClick={() => navigate('/author/create-novel')}>
              <Plus size={16} className="mr-2" /> Buat Novel Baru
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNovels.map((novel) => (
              <div
                key={novel.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen size={18} className="text-primary" />
                  </div>
                  <div>
                    <Link to={`/novel/${novel.id}`} className="font-medium text-foreground hover:text-primary">
                      {novel.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-medium',
                          novel.status === 'ongoing' && 'bg-blue-500/10 text-blue-400',
                          novel.status === 'completed' && 'bg-green-500/10 text-green-400',
                          novel.status === 'hiatus' && 'bg-amber-500/10 text-amber-400'
                        )}
                      >
                        {novel.status === 'ongoing' ? 'Ongoing' : novel.status === 'completed' ? 'Completed' : 'Hiatus'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-medium',
                          novel.visibility === 'public' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {novel.visibility === 'public' ? 'Publik' : 'Private'}
                      </span>
                    </div>
                  </div>
                </div>
                <Link to={`/novel/${novel.id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  Kelola <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
