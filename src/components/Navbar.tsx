import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Bell, Menu, X, Search, LogOut, User, Bookmark, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchBar } from './SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Beranda', path: '/' },
  { label: 'Novel', path: '/novel' },
  { label: 'Genre', path: '/genre' },
  { label: 'Populer', path: '/populer' },
  { label: 'Terbaru', path: '/terbaru' },
  { label: 'Ranking', path: '/ranking' },
  { label: 'Komunitas', path: '/komunitas' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl = profile?.avatar;
  const displayName = profile?.display_name || profile?.username || 'Pengguna';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b transition-all duration-300',
          scrolled
            ? 'border-border bg-background/80 backdrop-blur-xl'
            : 'border-transparent bg-background/40 backdrop-blur-sm'
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary glow-primary-sm transition-transform hover:scale-105">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="hidden font-display text-lg font-bold text-foreground sm:block">
              Novel <span className="text-primary">Semesta</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(link.path)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Search (desktop) */}
          <div className="ml-auto hidden w-64 xl:block">
            <SearchBar onSubmit={(q) => navigate(`/novel?q=${encodeURIComponent(q)}`)} />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Cari"
              onClick={() => navigate('/novel')}
            >
              <Search size={20} className="xl:hidden" />
            </button>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Notifikasi"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>

            {user ? (
              /* User menu */
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full border border-border bg-card/50 py-1 pl-1 pr-2 transition-colors hover:border-primary/40"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {initials}
                    </div>
                  )}
                  <span className="hidden text-sm font-medium text-foreground sm:block">{displayName}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl animate-scale-in">
                      <div className="border-b border-border p-3">
                        <p className="truncate font-medium text-foreground">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link to={`/profile/${profile?.username ?? ''}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                          <User size={16} /> Profil Saya
                        </Link>
                        <Link to="/library" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                          <Bookmark size={16} /> Rak Buku
                        </Link>
                        <Link to="/settings/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                          <LayoutDashboard size={16} /> Pengaturan
                        </Link>
                        {(profile?.role === 'author' || profile?.role === 'admin') && (
                          <Link to="/author/dashboard" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10">
                            <LayoutDashboard size={16} /> Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <LogOut size={16} /> Keluar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/login')}>
                  Masuk
                </Button>
                <Button size="sm" className="glow-primary-sm" onClick={() => navigate('/register')}>
                  Daftar
                </Button>
              </>
            )}

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in-fast"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] border-l border-border bg-card p-6 animate-scale-in overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                  <BookOpen size={20} className="text-white" />
                </div>
                <span className="font-display text-lg font-bold">
                  Novel <span className="text-primary">Semesta</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mb-6">
              <SearchBar onSubmit={(q) => { navigate(`/novel?q=${encodeURIComponent(q)}`); setMobileOpen(false); }} />
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(link.path)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 border-t border-border pt-6">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link to={`/profile/${profile?.username ?? ''}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <User size={16} /> Profil Saya
                  </Link>
                  <Link to="/library" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <Bookmark size={16} /> Rak Buku
                  </Link>
                  <Link to="/settings/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                    <LayoutDashboard size={16} /> Pengaturan
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                    Masuk
                  </Button>
                  <Button onClick={() => { navigate('/register'); setMobileOpen(false); }} className="glow-primary-sm">
                    Daftar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
