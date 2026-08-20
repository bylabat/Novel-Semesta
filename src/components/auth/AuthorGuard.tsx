import { type ReactNode, useEffect, useState } from 'react';
import {
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function AuthorGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();

  const [checkingNovels, setCheckingNovels] =
    useState(true);

  const [hasNovel, setHasNovel] =
    useState(false);

  // ==========================================================
  // CEK APAKAH USER SUDAH PUNYA NOVEL
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function checkNovel() {
      // Belum login
      if (!user) {
        if (!cancelled) {
          setHasNovel(false);
          setCheckingNovels(false);
        }

        return;
      }

      // Admin tidak perlu dicek novel
      if (profile?.role === 'admin') {
        if (!cancelled) {
          setHasNovel(true);
          setCheckingNovels(false);
        }

        return;
      }

      setCheckingNovels(true);

      const { data, error } = await supabase
        .from('novels')
        .select('id')
        .eq('author_id', user.id)
        .limit(1);

      if (cancelled) return;

      if (error) {
        console.error(
          'Gagal mengecek novel user:',
          error
        );

        setHasNovel(false);
      } else {
        setHasNovel(
          Boolean(data && data.length > 0)
        );
      }

      setCheckingNovels(false);
    }

    checkNovel();

    return () => {
      cancelled = true;
    };
  }, [user, profile?.role]);

  // ==========================================================
  // LOADING AUTH
  // ==========================================================

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={32}
            className="animate-spin text-primary"
          />

          Memeriksa akun...
        </div>
      </div>
    );
  }

  // ==========================================================
  // BELUM LOGIN
  // ==========================================================

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
        }}
        replace
      />
    );
  }

  // ==========================================================
  // CEK NOVEL
  // ==========================================================

  if (checkingNovels) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={32}
            className="animate-spin text-primary"
          />

          Memeriksa status penulis...
        </div>
      </div>
    );
  }

  // ==========================================================
  // ADMIN
  //
  // Admin selalu boleh masuk.
  // ==========================================================

  if (profile?.role === 'admin') {
    return <>{children}</>;
  }

  // ==========================================================
  // READER YANG BELUM PUNYA NOVEL
  //
  // Mereka tetap boleh membuat novel pertama.
  //
  // Contoh:
  // /author/create-novel
  // ==========================================================

  const isCreateNovelPage =
    location.pathname === '/author/create-novel';

  if (!hasNovel && isCreateNovelPage) {
    return <>{children}</>;
  }

  // ==========================================================
  // READER YANG BELUM PUNYA NOVEL
  //
  // Tidak boleh masuk dashboard / kelola novel / edit.
  // ==========================================================

  if (!hasNovel) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Belum Menjadi Penulis
        </h1>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Kamu belum memiliki novel. Buat novel pertama kamu
          untuk mulai menjadi penulis di Novel Semesta.
        </p>

        <Navigate
          to="/author/create-novel"
          replace
        />
      </div>
    );
  }

  // ==========================================================
  // READER YANG SUDAH PUNYA NOVEL
  //
  // Sudah dianggap sebagai PENULIS.
  // ==========================================================

  return <>{children}</>;
}