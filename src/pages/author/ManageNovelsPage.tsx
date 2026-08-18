import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Genre {
  id: string;
  name: string;
}

interface NovelGenre {
  novel_id: string;
  genre_id: string;
  genres: Genre | null;
}

interface Novel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string;
  visibility: string;
  updated_at: string;
  novel_genres: NovelGenre[];
}

export default function ManageNovelsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    let cancelled = false;

    async function fetchNovels() {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('novels')
        .select(`
          id,
          title,
          description,
          cover,
          status,
          visibility,
          updated_at,
          novel_genres (
            novel_id,
            genre_id,
            genres (
              id,
              name
            )
          )
        `)
        .eq('author_id', userId)
        .order('updated_at', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        console.error('Gagal mengambil novel:', fetchError);
        setError(fetchError.message);
        setNovels([]);
      } else {
        setNovels((data ?? []) as unknown as Novel[]);
      }

      setLoading(false);
    }

    fetchNovels();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDelete = async (novel: Novel) => {
    const confirmed = window.confirm(
      `Hapus novel "${novel.title}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    setDeletingId(novel.id);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('novels')
        .delete()
        .eq('id', novel.id)
        .eq('author_id', user?.id);

      if (deleteError) {
        throw deleteError;
      }

      setNovels((current) =>
        current.filter((item) => item.id !== novel.id)
      );
    } catch (err) {
      console.error('Gagal menghapus novel:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus novel.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back */}
      <Link
        to="/author/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Kembali ke Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Kelola Novel
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Kelola semua novel yang kamu buat.
            </p>
          </div>
        </div>

        <Button
          className="glow-primary-sm"
          onClick={() => navigate('/author/create-novel')}
        >
          <Plus size={17} className="mr-2" />
          Buat Novel Baru
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            Memuat novel...
          </div>
        </div>
      ) : novels.length === 0 ? (
        <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen size={32} className="text-primary" />
          </div>

          <h2 className="font-display text-lg font-semibold text-foreground">
            Belum ada novel
          </h2>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Kamu belum memiliki novel. Buat novel pertamamu untuk mulai
            menulis.
          </p>

          <Button
            className="mt-5 glow-primary-sm"
            onClick={() => navigate('/author/create-novel')}
          >
            <Plus size={16} className="mr-2" />
            Buat Novel Baru
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {novels.map((novel) => (
            <div
              key={novel.id}
              className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/30"
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                {/* Cover */}
                <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {novel.cover ? (
                    <img
                      src={novel.cover}
                      alt={novel.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen
                        size={28}
                        className="text-muted-foreground"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div>
                    <Link
                      to={`/novel/${novel.id}`}
                      className="font-display text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {novel.title}
                    </Link>

                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {novel.description || 'Belum ada deskripsi.'}
                    </p>
                  </div>

                  {/* GENRES */}
                  {novel.novel_genres?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {novel.novel_genres.map((item) =>
                        item.genres ? (
                          <span
                            key={item.genre_id}
                            className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground"
                          >
                            {item.genres.name}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        novel.status === 'ongoing' &&
                          'bg-blue-500/10 text-blue-400',
                        novel.status === 'completed' &&
                          'bg-green-500/10 text-green-400',
                        novel.status === 'hiatus' &&
                          'bg-amber-500/10 text-amber-400'
                      )}
                    >
                      {novel.status === 'ongoing'
                        ? 'Ongoing'
                        : novel.status === 'completed'
                          ? 'Completed'
                          : 'Hiatus'}
                    </span>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        novel.visibility === 'public'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {novel.visibility === 'public'
                        ? 'Publik'
                        : 'Private'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:justify-center">
                  <Button
  variant="outline"
  size="sm"
  onClick={() =>
    navigate(`/author/manage-chapters/${novel.id}`)
  }
>
  <BookOpen size={15} className="mr-1.5" />
  Chapter
</Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(`/author/edit-novel/${novel.id}`)
                    }
                  >
                    <Edit size={15} className="mr-1.5" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === novel.id}
                    onClick={() => handleDelete(novel)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === novel.id ? (
                      <Loader2
                        size={15}
                        className="mr-1.5 animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} className="mr-1.5" />
                    )}
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}