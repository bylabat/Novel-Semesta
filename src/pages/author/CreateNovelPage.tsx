import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ImagePlus,
  Loader2,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Genre {
  id: string;
  name: string;
  slug?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CreateNovelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [visibility, setVisibility] = useState('public');

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [loadingGenres, setLoadingGenres] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchGenres() {
      setLoadingGenres(true);

      const { data, error: genresError } = await supabase
        .from('genres')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (cancelled) return;

      if (genresError) {
        console.error('Gagal mengambil genre:', genresError);
        setError(`Gagal mengambil genre: ${genresError.message}`);
      } else {
        setGenres((data ?? []) as Genre[]);
      }

      setLoadingGenres(false);
    }

    fetchGenres();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCoverChange = (file: File | null) => {
    setError('');

    if (!file) {
      setCoverFile(null);
      setCoverPreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('File cover harus berupa gambar.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran cover maksimal 5 MB.');
      return;
    }

    setCoverFile(file);

    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
  };

  const toggleGenre = (genreId: string) => {
    setError('');

    setSelectedGenres((current) => {
      if (current.includes(genreId)) {
        return current.filter((id) => id !== genreId);
      }

      if (current.length >= 5) {
        setError('Maksimal 5 genre.');
        return current;
      }

      return [...current, genreId];
    });
  };

  const createSlug = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    if (!user) {
      setError('Kamu harus login terlebih dahulu.');
      return;
    }

    if (!title.trim()) {
      setError('Judul novel wajib diisi.');
      return;
    }

    if (!description.trim()) {
      setError('Deskripsi novel wajib diisi.');
      return;
    }

    if (selectedGenres.length === 0) {
      setError('Pilih minimal satu genre.');
      return;
    }

    if (!coverFile) {
      setError('Cover novel wajib dipilih.');
      return;
    }

    setSaving(true);

    try {
      /*
       * 1. Upload cover ke Supabase Storage
       */
      const extension =
        coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';

      const fileName = `${crypto.randomUUID()}.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('novel-covers')
        .upload(filePath, coverFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: coverFile.type,
        });

      if (uploadError) {
        throw new Error(
          `Upload cover gagal: ${uploadError.message}`
        );
      }

      /*
       * 2. Ambil URL public cover
       */
      const { data: publicUrlData } = supabase.storage
        .from('novel-covers')
        .getPublicUrl(filePath);

      const coverUrl = publicUrlData.publicUrl;

      /*
       * 3. Simpan novel
       */
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert({
          title: title.trim(),
          slug: createSlug(title),
          description: description.trim(),
          cover: coverUrl,
          author_id: user.id,
          status,
          visibility,
        })
        .select('id')
        .single();

      if (novelError) {
        throw new Error(
          `Gagal menyimpan novel: ${novelError.message}`
        );
      }

      /*
       * 4. Simpan genre novel
       */
      const genreRows = selectedGenres.map((genreId) => ({
        novel_id: novel.id,
        genre_id: genreId,
      }));

      const { error: genreError } = await supabase
        .from('novel_genres')
        .insert(genreRows);

      if (genreError) {
        /*
         * Jika genre gagal, novel tetap sudah tersimpan.
         * Error tetap ditampilkan supaya bisa diperbaiki.
         */
        throw new Error(
          `Novel berhasil dibuat, tetapi genre gagal disimpan: ${genreError.message}`
        );
      }

      /*
       * 5. Berhasil
       */
      navigate('/author/manage-novels');
    } catch (err) {
      console.error('Gagal membuat novel:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat membuat novel.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/author/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Kembali ke Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Buat Novel Baru
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Buat dan publikasikan novel kamu.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* COVER */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Cover Novel
          </h2>

          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="h-56 w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Preview cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                  <BookOpen
                    size={36}
                    className="text-muted-foreground"
                  />

                  <span className="px-3 text-xs text-muted-foreground">
                    Belum ada cover
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-3">
              <label
                htmlFor="cover"
                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus size={17} />
                Pilih Cover
              </label>

              <input
                id="cover"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  handleCoverChange(
                    event.target.files?.[0] ?? null
                  );
                }}
                disabled={saving}
              />

              <p className="text-xs text-muted-foreground">
                JPG, PNG, atau WEBP. Maksimal 5 MB.
              </p>
            </div>
          </div>
        </div>

        {/* INFORMASI */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-5 font-display text-lg font-semibold text-foreground">
            Informasi Novel
          </h2>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Judul Novel
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Masukkan judul novel"
                disabled={saving}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Deskripsi
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Ceritakan tentang novel kamu..."
                rows={7}
                disabled={saving}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Status
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="visibility"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Visibility
              </label>

              <select
                id="visibility"
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>

        {/* GENRE */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
            Genre
          </h2>

          <p className="mb-4 text-xs text-muted-foreground">
            Pilih minimal 1 dan maksimal 5 genre.
          </p>

          {loadingGenres ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Memuat genre...
            </div>
          ) : genres.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada genre tersedia.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const selected = selectedGenres.includes(
                  genre.id
                );

                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() =>
                      toggleGenre(genre.id)
                    }
                    disabled={saving}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* BUTTON */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() =>
              navigate('/author/dashboard')
            }
          >
            Batal
          </Button>

          <Button
            type="submit"
            className="glow-primary-sm"
            disabled={saving || loadingGenres}
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="mr-2 animate-spin"
                />
                Menyimpan...
              </>
            ) : (
              <>
                <Plus
                  size={17}
                  className="mr-2"
                />
                Buat Novel
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}