import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Loader2,
  Trash2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

interface Novel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string;
}

interface LibraryItem {
  id: string;
  user_id: string;
  novel_id: string;
  created_at: string;
  novels: Novel | null;
}

export default function LibraryPage() {
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      setLoading(true);
      setError('');

      try {
        // ============================================
        // AMBIL USER YANG SEDANG LOGIN
        // ============================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setLibrary([]);
          setLoading(false);
          return;
        }

        // ============================================
        // AMBIL NOVEL DARI RAK
        // ============================================

        const {
          data,
          error: libraryError,
        } = await supabase
          .from('user_library')
          .select(
            `
              id,
              user_id,
              novel_id,
              created_at,
              novels (
                id,
                title,
                description,
                cover,
                status
              )
            `
          )
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (cancelled) return;

        if (libraryError) {
          console.error(
            'Gagal mengambil Rak:',
            libraryError
          );

          setError(libraryError.message);
          setLoading(false);
          return;
        }

        setLibrary(
          (data ?? []) as unknown as LibraryItem[]
        );

        setLoading(false);
      } catch (err) {
        console.error(
          'Kesalahan saat memuat Rak:',
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal memuat Rak.'
          );

          setLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  // ================================================
  // LOADING
  // ================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={24}
            className="animate-spin text-primary"
          />
          Memuat Rak...
        </div>
      </div>
    );
  }

  // ================================================
  // ERROR
  // ================================================

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="font-medium text-destructive">
            Gagal memuat Rak
          </p>

          <p className="mt-2 break-words text-sm text-destructive/80">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ================================================
  // RAK KOSONG
  // ================================================

  if (library.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Rak Saya
            </h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Novel yang kamu simpan akan muncul di sini.
          </p>
        </div>

        <EmptyState
          icon={BookOpen}
          title="Rak masih kosong"
          description="Tambahkan novel ke Rak untuk membacanya kembali dengan mudah."
          action={
            <Button asChild>
              <Link to="/novel">
                Jelajahi Novel
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // ================================================
  // RAK BERISI NOVEL
  // ================================================

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      {/* HEADER */}

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Rak Saya
          </h1>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {library.length} novel tersimpan di Rak kamu.
        </p>
      </div>

      {/* GRID NOVEL */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {library.map((item) => {
          const novel = item.novels;

          if (!novel) {
            return null;
          }

          const cover =
            novel.cover || '/placeholder.svg';

          const statusLabel =
            novel.status === 'ongoing'
              ? 'Ongoing'
              : novel.status === 'completed'
                ? 'Completed'
                : novel.status === 'hiatus'
                  ? 'Hiatus'
                  : novel.status || 'Belum ditentukan';

          return (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
            >
              {/* COVER */}

              <Link to={`/novel/${novel.id}`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                  <img
                    src={cover}
                    alt={novel.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur">
                    {statusLabel}
                  </div>
                </div>
              </Link>

              {/* INFO */}

              <div className="p-3">
                <Link
                  to={`/novel/${novel.id}`}
                  className="block"
                >
                  <h2 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                    {novel.title}
                  </h2>
                </Link>

                {novel.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {novel.description}
                  </p>
                )}

                {/* TOMBOL BACA */}

                <Button
                  size="sm"
                  className="mt-3 w-full"
                  asChild
                >
                  <Link to={`/novel/${novel.id}`}>
                    <BookOpen
                      size={14}
                      className="mr-1.5"
                    />
                    Baca
                  </Link>
                </Button>

                {/* HAPUS DARI RAK */}

                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 w-full text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();

                    if (!user) {
                      return;
                    }

                    const {
                      error: deleteError,
                    } = await supabase
                      .from('user_library')
                      .delete()
                      .eq('user_id', user.id)
                      .eq('novel_id', novel.id);

                    if (deleteError) {
                      console.error(
                        'Gagal menghapus dari Rak:',
                        deleteError
                      );

                      setError(
                        deleteError.message
                      );

                      return;
                    }

                    setLibrary((current) =>
                      current.filter(
                        (libraryItem) =>
                          libraryItem.id !== item.id
                      )
                    );
                  }}
                >
                  <Trash2
                    size={14}
                    className="mr-1.5"
                  />
                  Hapus dari Rak
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}