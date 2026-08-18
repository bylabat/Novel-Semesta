import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { GenreCard } from '@/components/GenreCard';

interface Genre {
  id: string;
  name: string;
  slug: string | null;
}

export default function GenrePage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadGenres() {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('genres')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (error) {
        console.error('Gagal mengambil genre:', error);
        setError(error.message);
        setGenres([]);
      } else {
        setGenres(data ?? []);
      }

      setLoading(false);
    }

    loadGenres();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={22}
            className="animate-spin text-primary"
          />
          Memuat genre...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="font-medium text-destructive">
            Gagal memuat genre
          </p>

          <p className="mt-2 text-sm text-destructive/80">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Genre
        </h1>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Pilih genre favoritmu dan temukan novel yang sesuai dengan
        selera bacaanmu.
      </p>

      {genres.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="font-medium text-foreground">
            Belum ada genre
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Genre belum tersedia di database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {genres.map((genre) => (
          <GenreCard
            key={genre.id}
            genre={{
              id: genre.id,
              name: genre.name,
              slug: genre.slug,
              icon: 'BookOpen',
              count: 0,
              color: 'from-primary/20 to-primary/5',
            }}
          />
          ))}
        </div>
      )}
    </div>
  );
}