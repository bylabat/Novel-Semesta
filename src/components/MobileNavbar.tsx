import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Bookmark, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const bottomNavItems = [
  { label: 'Beranda', path: '/', icon: Home },
  { label: 'Novel', path: '/novel', icon: BookOpen },
  { label: 'Rak Buku', path: '/library', icon: Bookmark },
  { label: 'Komunitas', path: '/komunitas', icon: Users },
];

export function MobileNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Berhasil keluar', description: 'Sampai jumpa lagi!' });
    navigate('/');
  };

  const avatarUrl = profile?.avatar;
  const displayName = profile?.display_name || profile?.username || 'Pengguna';
  const initials = displayName.slice(0, 2).toUpperCase();

  const profileItem = user
    ? { label: 'Profil', path: `/profile/${profile?.username ?? ''}`, custom: true }
    : { label: 'Profil', path: '/login', custom: false };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                active && 'bg-primary/15'
              )}>
                <Icon size={20} className={cn(active && 'scale-110')} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Profile / Auth */}
        {user ? (
          <button
            onClick={() => navigate(`/profile/${profile?.username ?? ''}`)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
              location.pathname.startsWith('/profile') ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg transition-all',
              location.pathname.startsWith('/profile') && 'bg-primary/15'
            )}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-primary">{initials}</span>
              )}
            </div>
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        ) : (
          <Link
            to="/login"
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors',
              location.pathname === '/login' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
              location.pathname === '/login' && 'bg-primary/15'
            )}>
              <User size={20} />
            </div>
            <span className="text-[10px] font-medium">Masuk</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
