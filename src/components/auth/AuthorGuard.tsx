import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function AuthorGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/author/dashboard' }} replace />;
  }

  if (profile?.role !== 'author' && profile?.role !== 'admin') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground">
          Halaman ini khusus untuk author. Akun kamu saat ini terdaftar sebagai reader.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return <>{children}</>;
}
