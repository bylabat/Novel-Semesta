import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Settings, Users, UserPlus, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NovelCard } from '@/components/NovelCard';
import { EmptyState } from '@/components/EmptyState';
import type { Novel } from '@/types';
import type { Profile } from '@/contexts/AuthContext';

interface ProfileWithCounts extends Profile {
  follower_count: number;
  following_count: number;
  novel_count: number;
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileWithCounts | null>(null);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followAction, setFollowAction] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    (async () => {
      // Fetch profile by username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Count followers, following, novels
      const [followersRes, followingRes, novelsRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        supabase.from('novels').select('id', { count: 'exact', head: true }).eq('author_id', profileData.id),
      ]);

      const profileWithCounts: ProfileWithCounts = {
        ...profileData,
        follower_count: followersRes.count ?? 0,
        following_count: followingRes.count ?? 0,
        novel_count: novelsRes.count ?? 0,
      };
      setProfile(profileWithCounts);

      // Fetch novels by this author
      const { data: novelData } = await supabase
        .from('novels')
        .select('*')
        .eq('author_id', profileData.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      setNovels(novelData ?? []);

      // Check if current user follows this profile
      if (currentUser && currentUser.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileData.id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    })();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    if (currentUser.id === profile.id) return;

    setFollowAction(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setProfile({ ...profile, follower_count: profile.follower_count - 1 });
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
      setIsFollowing(true);
      setProfile({ ...profile, follower_count: profile.follower_count + 1 });
    }
    setFollowAction(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={Users}
        title="Profil tidak ditemukan"
        description="Pengguna ini mungkin belum terdaftar atau telah menghapus akunnya."
        action={<Button variant="outline" asChild><Link to="/">Kembali ke Beranda</Link></Button>}
      />
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const avatarUrl = profile.avatar;
  const displayName = profile.display_name || profile.username;
  const initials = displayName.slice(0, 2).toUpperCase();
  const joinDate = new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-24 w-24 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/20 text-3xl font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
              <Calendar size={14} /> Bergabung sejak {joinDate}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen size={16} className="text-primary" />
                <span className="font-semibold text-foreground">{profile.novel_count}</span>
                <span className="text-muted-foreground">Novel</span>
              </div>
              <button className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80">
                <Users size={16} className="text-primary" />
                <span className="font-semibold text-foreground">{profile.follower_count}</span>
                <span className="text-muted-foreground">Pengikut</span>
              </button>
              <div className="flex items-center gap-2 text-sm">
                <UserPlus size={16} className="text-primary" />
                <span className="font-semibold text-foreground">{profile.following_count}</span>
                <span className="text-muted-foreground">Mengikuti</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            {isOwnProfile ? (
              <Button variant="outline" onClick={() => navigate('/settings/profile')}>
                <Settings size={16} className="mr-1.5" /> Pengaturan
              </Button>
            ) : currentUser ? (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                onClick={handleFollow}
                disabled={followAction}
                className={isFollowing ? '' : 'glow-primary-sm'}
              >
                {followAction ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : null}
                {isFollowing ? 'Mengikuti' : 'Ikuti'}
              </Button>
            ) : (
              <Button variant="default" className="glow-primary-sm" onClick={() => navigate('/login')}>
                Masuk untuk Mengikuti
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Novels section */}
      <div className="mt-10 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary glow-primary-sm" />
          <h2 className="font-display text-xl font-bold text-foreground">Novel oleh {displayName}</h2>
        </div>
        {novels.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Belum ada novel"
            description={isOwnProfile ? "Kamu belum menerbitkan novel." : `${displayName} belum menerbitkan novel.`}
          />
        )}
      </div>
    </div>
  );
}
