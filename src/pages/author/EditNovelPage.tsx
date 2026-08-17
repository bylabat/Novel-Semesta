import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Save,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Novel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string;
  visibility: string;
}

interface Genre {
  id: string;
  name: string;
}

export default function EditNovelPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ongoing');
  const [visibility, setVisibility] = useState('public');

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || !id) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');

      const [
        novelResult,
        genresResult,
        novelGenresResult,
      ] = await Promise.all([
        supabase
          .from('novels')
          .select(
            'id, title, description, cover, status, visibility'
          )
          .eq('id', id)
          .eq('author_id', user.id)
          .maybeSingle(),

        supabase
          .from('genres')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('novel_genres')
          .select('genre_id')
          .eq('novel_id', id),
      ]);

      if (cancelled) return;

      if (novelResult.error) {
        setError(novelResult.error.message);
        setNovel(null);
        setLoading(false);
        return;
      }

      if (!novelResult.data) {
        setError('Novel tidak ditemukan atau bukan milik kamu.');
        setNovel(null);
        setLoading(false);
        return;
      }

      if (genresResult.error) {
        setError(genresResult.error.message);
        setLoading(false);
        return;
      }

      if (novelGenresResult.error) {
        setError(novelGenresResult.error.message);
        setLoading(false);
        return;
      }

      const novelData = novelResult.data as Novel;

      setNovel(novelData);
      setTitle(novelData.title || '');
      setDescription(novelData.description || '');
      setStatus(novelData.status || 'ongoing');
      setVisibility(novelData.visibility || 'public');

      setGenres((genresResult.data || []) as Genre[]);

      setSelectedGenres(
        (novelGenresResult.data || []).map(
          (item) => item.genre_id
        )
      );

      setLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, id]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverFile]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((id) => id !== genreId)
        : [...current, genreId]
    );
  };

  const handleCoverChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File cover harus berupa gambar.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran cover maksimal 5 MB.');
      return;
    }

    setError('');
    setSuccess('');
    setCoverFile(file);
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile || !user || !id) {
      return novel?.cover ?? null;
    }

    setUploadingCover(true);

    const extension =
      coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';

    const filePath =
      `${user.id}/${id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('novel-covers')
      .upload(filePath, coverFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: coverFile.type,
      });

    if (uploadError) {
      setUploadingCover(false);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('novel-covers')
      .getPublicUrl(filePath);

    setUploadingCover(false);

    return data.publicUrl;
  };

  const saveGenres = async () => {
    if (!id) return;

    const { error: deleteError } = await supabase
      .from('novel_genres')
      .delete()
      .eq('novel_id', id);

    if (deleteError) {
      throw deleteError;
    }

    if (selectedGenres.length === 0) {
      return;
    }

    const rows = selectedGenres.map((genreId) => ({
      novel_id: id,
      genre_id: genreId,
    }));

    const { error: insertError } = await supabase
      .from('novel_genres')
      .insert(rows);

    if (insertError) {
      throw insertError;
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !id) return;

    if (!title.trim()) {
      setError('Judul novel wajib diisi.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let coverUrl = novel?.cover ?? null;

      if (coverFile) {
        coverUrl = await uploadCover();
      }

      const { data, error: updateError } = await supabase
        .from('novels')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          status,
          visibility,
          cover: coverUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('author_id', user.id)
        .select(
          'id, title, description, cover, status, visibility'
        )
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error('Novel tidak berhasil diperbarui.');
      }

      await saveGenres();

      setNovel(data as Novel);
      setCoverFile(null);
      setSuccess('Perubahan novel dan genre berhasil disimpan.');
    } catch (err) {
      console.error('Gagal menyimpan novel:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan perubahan.'
      );
    } finally {
      setSaving(false);
      setUploadingCover(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/author/manage-novels"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Novel
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Edit Novel
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Ubah informasi novel kamu.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            Memuat novel...
          </div>
        </div>
      ) : error && !novel ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      ) : novel ? (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="space-y-6">

            {/* COVER */}
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">
                Cover Novel
              </label>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="h-56 w-40 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Preview cover"
                      className="h-full w-full object-cover"
                    />
                  ) : novel.cover ? (
                    <img
                      src={novel.cover}
                      alt={novel.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen
                        size={36}
                        className="text-muted-foreground"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cover"
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Upload size={16} className="mr-2" />
                    Pilih Cover Baru
                  </label>

                  <input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    disabled={saving || uploadingCover}
                    className="hidden"
                  />

                  <p className="text-xs text-muted-foreground">
                    Format gambar. Maksimal 5 MB.
                  </p>

                  {coverFile && (
                    <p className="text-xs text-primary">
                      File dipilih: {coverFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* TITLE */}
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
                disabled={saving}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Masukkan judul novel"
              />
            </div>

            {/* DESCRIPTION */}
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
                disabled={saving}
                rows={6}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                placeholder="Masukkan deskripsi novel"
              />
            </div>

            {/* GENRES */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Genre
                </label>

                <span className="text-xs text-muted-foreground">
                  {selectedGenres.length} dipilih
                </span>
              </div>

              {genres.length === 0 ? (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  Belum ada genre yang tersedia.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => {
                    const selected =
                      selectedGenres.includes(genre.id);

                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genre.id)}
                        disabled={saving}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm transition-colors',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        )}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Kamu dapat memilih lebih dari satu genre.
              </p>
            </div>

            {/* STATUS */}
            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Status Novel
              </label>

              <select
                id="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="hiatus">Hiatus</option>
              </select>
            </div>

            {/* VISIBILITY */}
            <div>
              <label
                htmlFor="visibility"
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Visibilitas
              </label>

              <select
                id="visibility"
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="public">Publik</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
                {success}
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="submit"
                disabled={saving || uploadingCover}
                className="glow-primary-sm"
              >
                {saving || uploadingCover ? (
                  <Loader2
                    size={17}
                    className="mr-2 animate-spin"
                  />
                ) : (
                  <Save size={17} className="mr-2" />
                )}

                {uploadingCover
                  ? 'Mengupload Cover...'
                  : saving
                    ? 'Menyimpan...'
                    : 'Simpan Perubahan'}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={saving || uploadingCover}
                onClick={() =>
                  navigate('/author/manage-novels')
                }
              >
                Batal
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}