import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checkUsername = async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .maybeSingle();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username hanya boleh huruf, angka, dan underscore.';
    } else if (usernameAvailable === false) {
      newErrors.username = 'Username sudah digunakan.';
    }

    if (!email.includes('@') || !email.includes('.')) {
      newErrors.email = 'Email tidak valid.';
    }

    if (password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Password dan konfirmasi tidak sama.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    const { error } = await signUp(email, password, username, displayName);

    if (error) {
      toast({
        title: 'Gagal mendaftar',
        description: error,
      });
      setLoading(false);
      return;
    }

    toast({
      title: 'Pendaftaran berhasil!',
      description: 'Akunmu telah dibuat. Selamat datang di Novel Semesta!',
    });
    navigate('/');
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
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Buat Akun Baru</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bergabung dengan jutaan pembaca di Novel Semesta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors({ ...errors, username: '' });
                  checkUsername(e.target.value);
                }}
                placeholder="username kamu"
                className={cn(
                  'h-11 w-full rounded-lg border bg-secondary/50 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  errors.username
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary/50 focus:ring-primary/20'
                )}
              />
              {checkingUsername && <Loader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
              {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                <Check size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success" />
              )}
              {!checkingUsername && usernameAvailable === false && (
                <X size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-destructive" />
              )}
            </div>
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nama Tampilan</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama yang ditampilkan"
                className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({ ...errors, email: '' });
                }}
                placeholder="nama@email.com"
                className={cn(
                  'h-11 w-full rounded-lg border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  errors.email
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary/50 focus:ring-primary/20'
                )}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({ ...errors, password: '' });
                }}
                placeholder="Minimal 8 karakter"
                className={cn(
                  'h-11 w-full rounded-lg border bg-secondary/50 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  errors.password
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary/50 focus:ring-primary/20'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Konfirmasi Password</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors({ ...errors, confirmPassword: '' });
                }}
                placeholder="Ulangi password"
                className={cn(
                  'h-11 w-full rounded-lg border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                  errors.confirmPassword
                    ? 'border-destructive focus:ring-destructive/20'
                    : 'border-border focus:border-primary/50 focus:ring-primary/20'
                )}
              />
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
          </div>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" required className="mt-1 rounded border-border" />
            <span>Saya menyetujui <a href="#" className="text-primary hover:underline">Syarat & Ketentuan</a> dan <a href="#" className="text-primary hover:underline">Kebijakan Privasi</a></span>
          </label>
          <Button type="submit" className="w-full glow-primary-sm" size="lg" disabled={loading}>
            {loading ? <><Loader2 size={18} className="mr-2 animate-spin" /> Memproses...</> : 'Daftar'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Masuk di sini</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
