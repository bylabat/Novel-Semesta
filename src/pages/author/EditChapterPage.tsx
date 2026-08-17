import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  chapter_number: number;
  content: string;
  published: boolean;
  word_count: number;
}

interface Novel {
  id: string;
  title: string;
}

export default function EditChapterPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [novel, setNovel] = useState<Novel | null>(null);

  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || !chapterId) return;

    let cancelled = false;

    async function fetchChapter() {
      setLoading(true);
      setError('');

      const { data: chapterData, error: chapterError } =
        await supabase
          .from('chapters')
          .select(
            'id, novel_id, title, chapter_number, content, published, word_count'
          )
          .eq('id', chapterId)
          .maybeSingle();

      if (cancelled) return;

      if (chapterError) {
        console.error('Gagal mengambil chapter:', chapterError);
        setError(chapterError.message);
        setLoading(false);
        return;
      }

      if (!chapterData) {
        setError('Chapter tidak ditemukan.');
        setLoading(false);
        return;
      }

      const { data: novelData, error: novelError } =
        await supabase
          .from('novels')
          .select('id, title')
          .eq('id', chapterData.novel_id)
          .eq('author_id', user.id)
          .maybeSingle();

      if (cancelled) return;

      if (novelError) {
        console.error('Gagal memverifikasi novel:', novelError);
        setError(novelError.message);
        setLoading(false);
        return;
      }

      if (!novelData) {
        setError(
          'Kamu tidak memiliki izin untuk mengedit chapter ini.'
        );
        setLoading(false);
        return;
      }

      setChapter(chapterData as Chapter);
      setNovel(novelData);

      setChapterNumber(String(chapterData.chapter_number));
      setTitle(chapterData.title);
      setContent(chapterData.content);

      setLoading(false);
    }

    fetchChapter();

    return () => {
      cancelled = true;
    };
  }, [user, chapterId]);

  const wordCount = useMemo(() => {
    const trimmed = content.trim();

    if (!trimmed) {
      return 0;
    }

    return trimmed.split(/\s+/).length;
  }, [content]);

  const handleSave = async () => {
    if (!user || !chapter || !novel) return;

    setError('');
    setSuccess('');

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
      // Pastikan nomor chapter baru tidak bentrok
      // dengan chapter lain dalam novel yang sama.
      const { data: duplicateChapter, error: duplicateError } =
        await supabase
          .from('chapters')
          .select('id')
          .eq('novel_id', novel.id)
          .eq('chapter_number', parsedChapterNumber)
          .neq('id', chapter.id)
          .maybeSingle();

      if (duplicateError) {
        throw duplicateError;
      }

      if (duplicateChapter) {
        setError(
          `Chapter ${parsedChapterNumber} sudah digunakan oleh chapter lain.`
        );
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          chapter_number: parsedChapterNumber,
          title: title.trim(),
          content: content.trim(),
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapter.id)
        .eq('novel_id', novel.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Chapter berhasil diperbarui.');

      setChapter((current) =>
        current
          ? {
              ...current,
              chapter_number: parsedChapterNumber,
              title: title.trim(),
              content: content.trim(),
              word_count: wordCount,
            }
          : current
      );

      setTimeout(() => {
        navigate(`/author/manage-chapters/${novel.id}`);
      }, 1000);
    } catch (err) {
      console.error('Gagal memperbarui chapter:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui chapter.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user || !chapterId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={22} className="animate-spin" />
          Memuat chapter...
        </div>
      </div>
    );
  }

  if (error && !chapter) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/author/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </Link>

        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to={`/author/manage-chapters/${novel?.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Chapter
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />

          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Edit Chapter
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {novel?.title}
            </p>
          </div>
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
        {/* Nomor */}
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
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Judul */}
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
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Isi */}
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
            rows={20}
            className="w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Status */}
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground">
            Status chapter
          </p>

          <p className="mt-1 text-sm font-medium text-foreground">
            {chapter?.published ? 'Terbit' : 'Draft'}
          </p>
        </div>

        {/* Save */}
        <div className="flex justify-end border-t border-border pt-5">
          <Button
            type="button"
            className="glow-primary-sm"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}