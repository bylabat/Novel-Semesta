import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';


export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/settings/profile' } });
      return;
    }
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setAvatar(profile.avatar ?? '');
      setBio(profile.bio ?? '');
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        avatar: avatar || null,
        bio: bio || null,
      })
      .eq('id', user.id);

    if (error) {
      toast({ title: 'Gagal menyimpan', description: error.message });
      setLoading(false);
      return;
    }

    await refreshProfile();
    toast({ title: 'Tersimpan', description: 'Profil kamu telah diperbarui.' });
    setLoading(false);
  };

  if (!user) return null;

  const avatarUrl = profile?.avatar;
  const initials = (profile?.display_name || profile?.username || 'NS').slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />
        <h1 className="font-display text-2xl font-bold text-foreground">Pengaturan Profil</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover border border-border" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 text-2xl font-bold text-primary">
              {initials}
            </div>
          )}
          <div>
            <p className="font-display font-semibold text-foreground">{profile?.display_name || profile?.username}</p>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        {/* Avatar URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">URL Avatar</label>
          <div className="relative">
            <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <p className="text-xs text-muted-foreground">Tempelkan URL gambar untuk avatar kamu.</p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nama Tampilan</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nama yang ditampilkan"
            className="h-11 w-full rounded-lg border border-border bg-secondary/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ceritakan sedikit tentang dirimu..."
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/500</p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="glow-primary-sm" disabled={loading}>
            {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Menyimpan...</> : <><Save size={16} className="mr-1.5" /> Simpan Perubahan</>}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/profile/${profile?.username ?? ''}`)}>
            Lihat Profil
          </Button>
        </div>
      </form>
    </div>
  );
}
