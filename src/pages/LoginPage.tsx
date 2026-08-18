import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Lock, Eye, EyeOff, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string })?.from ?? '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(identifier, password);

    if (error) {
      toast({
        title: 'Gagal masuk',
        description: error,
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'Berhasil masuk',
      description: 'Selamat datang kembali di Novel Semesta!',
    });
    navigate(from);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
              <BookOpen size={24} className="text-white" />
            </div>
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Selamat Datang Kembali</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk melanjutkan petualangan bacaanmu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email atau Username</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nama@email.com atau username"
                className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" className="rounded border-border" /> Ingat saya
            </label>
            <a href="#" className="text-primary hover:underline">Lupa password?</a>
          </div>
          <Button type="submit" className="w-full glow-primary-sm" size="lg" disabled={loading}>
            {loading ? <><Loader2 size={18} className="mr-2 animate-spin" /> Memproses...</> : 'Masuk'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">Daftar sekarang</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
