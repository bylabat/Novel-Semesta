import { useState, type FormEvent } from 'react';
import {
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { toast } = useToast();

  const {
    signIn,
    signInWithGoogle,
  } = useAuth();

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [identifier, setIdentifier] =
    useState('');

  const [password, setPassword] =
    useState('');

  const from =
    (location.state as {
      from?: string;
    })?.from ?? '/';

  // ==========================================================
  // LOGIN EMAIL / USERNAME
  // ==========================================================

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (loading || googleLoading) return;

    setLoading(true);

    const { error } =
      await signIn(
        identifier,
        password
      );

    if (error) {
      toast({
        title: 'Gagal masuk',
        description: error,
        variant: 'destructive',
      });

      setLoading(false);
      return;
    }

    toast({
      title: 'Berhasil masuk',
      description:
        'Selamat datang kembali di Novel Semesta!',
    });

    navigate(from);
  };

  // ==========================================================
  // LOGIN GOOGLE
  // ==========================================================

  const handleGoogleLogin =
    async () => {
      if (
        loading ||
        googleLoading
      ) {
        return;
      }

      setGoogleLoading(true);

      const { error } =
        await signInWithGoogle();

      if (error) {
        toast({
          title:
            'Gagal masuk dengan Google',
          description: error,
          variant: 'destructive',
        });

        setGoogleLoading(false);
      }
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* ====================================================
            LOGO / HEADER
        ===================================================== */}

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
              <BookOpen
                size={24}
                className="text-white"
              />
            </div>
          </Link>

          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
            Selamat Datang Kembali
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Masuk untuk melanjutkan petualangan
            bacaanmu
          </p>
        </div>

        {/* ====================================================
            LOGIN CARD
        ===================================================== */}

        <div className="rounded-2xl border border-border bg-card p-6">

          {/* ==================================================
              GOOGLE LOGIN
          =================================================== */}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={
              handleGoogleLogin
            }
            disabled={
              loading ||
              googleLoading
            }
          >
            {googleLoading ? (
              <>
                <Loader2
                  size={18}
                  className="mr-2 animate-spin"
                />
                Menghubungkan ke Google...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="mr-2 shrink-0"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.4Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.75Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.86A5.85 5.85 0 0 1 6.23 12c0-.65.11-1.28.31-1.86V7.62H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.38l3.24-2.52Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.1 14.63 2.25 12 2.25A9.74 9.74 0 0 0 3.3 7.62l3.24 2.52C7.31 7.83 9.46 6.11 12 6.11Z"
                  />
                </svg>

                Lanjutkan dengan Google
              </>
            )}
          </Button>

          {/* ==================================================
              DIVIDER
          =================================================== */}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />

            <span className="text-xs text-muted-foreground">
              atau masuk dengan email
            </span>

            <div className="h-px flex-1 bg-border" />
          </div>

          {/* ==================================================
              EMAIL / USERNAME LOGIN
          =================================================== */}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* EMAIL / USERNAME */}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email atau Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(
                      e.target.value
                    )
                  }
                  placeholder="nama@email.com atau username"
                  className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* PASSWORD */}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-secondary/50 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* OPTIONS */}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  className="rounded border-border"
                />

                Ingat saya
              </label>

              <Link
                to="/forgot-password"
                className="text-primary hover:underline"
              >
                Lupa password?
              </Link>
            </div>

            {/* LOGIN BUTTON */}

            <Button
              type="submit"
              className="w-full glow-primary-sm"
              size="lg"
              disabled={
                loading ||
                googleLoading
              }
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="mr-2 animate-spin"
                  />

                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>

          {/* ==================================================
              REGISTER
          =================================================== */}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}

            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}