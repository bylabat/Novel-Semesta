import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Novel {
  id: string;
  title: string;
}

export default function WriteChapterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loadingNovels, setLoadingNovels] = useState(true);

  const [novelId, setNovelId] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    let cancelled = false;

    async function fetchNovels() {
      setLoadingNovels(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('novels')
        .select('id, title')
        .eq('author_id', userId)
        .order('title', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('Gagal mengambil novel:', fetchError);
        setError(fetchError.message);
        setNovels([]);
      } else {
        setNovels(data ?? []);

        if (data && data.length > 0) {
          setNovelId(data[0].id);
        }
      }

      setLoadingNovels(false);
    }

    fetchNovels();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();

    if (!trimmed) {
      return 0;
    }

    return trimmed.split(/\s+/).length;
  }, [content]);

  const handleSave = async (published: boolean) => {
    if (!user) return;

    setError('');
    setSuccess('');

    if (!novelId) {
      setError('Silakan pilih novel terlebih dahulu.');
      return;
    }

    if (!chapterNumber.trim()) {
      setError('Nomor chapter wajib diisi.');
      return;
    }

    const parsedChapterNumber = Number(chapterNumber);

    if (
      !Number.isInteger(parsedChapterNumber) ||
      parsedChapterNumber < 1
    ) {
      setError('Nomor chapter harus berupa angka bulat minimal 1.');
      return;
    }

    if (!title.trim()) {
      setError('Judul chapter wajib diisi.');
      return;
    }

    if (!content.trim()) {
      setError('Isi chapter tidak boleh kosong.');
      return;
    }

    setSaving(true);

    try {
      // Pastikan novel benar-benar milik author yang sedang login.
      const { data: ownedNovel, error: novelError } = await supabase
        .from('novels')
        .select('id')
        .eq('id', novelId)
        .eq('author_id', user.id)
        .maybeSingle();

      if (novelError) {
        throw novelError;
      }

      if (!ownedNovel) {
        throw new Error('Novel tidak ditemukan atau bukan milik kamu.');
      }

      // Cek apakah nomor chapter sudah digunakan.
      const { data: existingChapter, error: existingError } =
        await supabase
          .from('chapters')
          .select('id')
          .eq('novel_id', novelId)
          .eq('chapter_number', parsedChapterNumber)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingChapter) {
        setError(
          `Chapter ${parsedChapterNumber} sudah ada untuk novel ini.`
        );
        return;
      }

      const { error: insertError } = await supabase
        .from('chapters')
        .insert({
          novel_id: novelId,
          title: title.trim(),
          chapter_number: parsedChapterNumber,
          content: content.trim(),
          published,
          word_count: wordCount,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(
        published
          ? 'Chapter berhasil diterbitkan.'
          : 'Chapter berhasil disimpan sebagai draft.'
      );

      setTitle('');
      setContent('');
      setChapterNumber('');

      setTimeout(() => {
        navigate('/author/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Gagal menyimpan chapter:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan chapter.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
            Tulis Chapter
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Tulis chapter baru untuk novel kamu.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
        {/* Novel */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Novel
          </label>

          {loadingNovels ? (
            <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Memuat novel...
            </div>
          ) : novels.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
              Kamu belum memiliki novel. Buat novel terlebih dahulu.
            </div>
          ) : (
            <div className="relative">
              <BookOpen
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />

              <select
                value={novelId}
                onChange={(e) => setNovelId(e.target.value)}
                disabled={saving}
                className="h-11 w-full appearance-none rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {novels.map((novel) => (
                  <option key={novel.id} value={novel.id}>
                    {novel.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chapter number */}
        <div>
          <label
            htmlFor="chapter-number"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Nomor Chapter
          </label>

          <input
            id="chapter-number"
            type="number"
            min="1"
            value={chapterNumber}
            onChange={(e) => setChapterNumber(e.target.value)}
            disabled={saving}
            placeholder="Contoh: 1"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="chapter-title"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Judul Chapter
          </label>

          <input
            id="chapter-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            placeholder="Contoh: Pertemuan Pertama"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Content */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="chapter-content"
              className="block text-sm font-medium text-foreground"
            >
              Isi Chapter
            </label>

            <span className="text-xs text-muted-foreground">
              {wordCount.toLocaleString('id-ID')} kata
            </span>
          </div>

          <textarea
            id="chapter-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={saving}
            placeholder="Mulai tulis cerita chapter kamu di sini..."
            rows={20}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving || loadingNovels || novels.length === 0}
            onClick={() => handleSave(false)}
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Simpan Draft
          </Button>

          <Button
            type="button"
            className="glow-primary-sm"
            disabled={saving || loadingNovels || novels.length === 0}
            onClick={() => handleSave(true)}
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            Terbitkan
          </Button>
        </div>
      </div>
    </div>
  );
}