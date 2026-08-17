import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Eye,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Novel {
  id: string;
  title: string;
  cover: string | null;
}

interface Chapter {
  id: string;
  novel_id: string;
  title: string;
  chapter_number: number;
  content: string;
  published: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export default function ManageChaptersPage() {
  const { novelId } = useParams<{ novelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !novelId) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');

      const { data: novelData, error: novelError } = await supabase
        .from('novels')
        .select('id, title, cover')
        .eq('id', novelId)
        .eq('author_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (novelError) {
        console.error('Gagal mengambil novel:', novelError);
        setError(novelError.message);
        setLoading(false);
        return;
      }

      if (!novelData) {
        setError('Novel tidak ditemukan atau bukan milik kamu.');
        setLoading(false);
        return;
      }

      setNovel(novelData);

      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select(
          'id, novel_id, title, chapter_number, content, published, word_count, created_at, updated_at'
        )
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true });

      if (cancelled) return;

      if (chapterError) {
        console.error('Gagal mengambil chapter:', chapterError);
        setError(chapterError.message);
        setChapters([]);
      } else {
        setChapters((chapterData ?? []) as Chapter[]);
      }

      setLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, novelId]);

  const handleDelete = async (chapter: Chapter) => {
    const confirmed = window.confirm(
      `Hapus Chapter ${chapter.chapter_number} "${chapter.title}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    setDeletingId(chapter.id);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapter.id)
        .eq('novel_id', novelId);

      if (deleteError) {
        throw deleteError;
      }

      setChapters((current) =>
        current.filter((item) => item.id !== chapter.id)
      );
    } catch (err) {
      console.error('Gagal menghapus chapter:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus chapter.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublished = async (chapter: Chapter) => {
    setError('');

    const { error: updateError } = await supabase
      .from('chapters')
      .update({
        published: !chapter.published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chapter.id)
      .eq('novel_id', novelId);

    if (updateError) {
      console.error('Gagal mengubah status chapter:', updateError);
      setError(updateError.message);
      return;
    }

    setChapters((current) =>
      current.map((item) =>
        item.id === chapter.id
          ? { ...item, published: !item.published }
          : item
      )
    );
  };

  if (!user || !novelId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/author/manage-novels"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={16} />
        Kembali ke Kelola Novel
      </Link>

      {loading ? (
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
            Memuat chapter...
          </div>
        </div>
      ) : error && !novel ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {novel?.cover ? (
                  <img
                    src={novel.cover}
                    alt={novel.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen
                      size={20}
                      className="text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <div className="h-7 w-1 rounded-full bg-primary glow-primary-sm" />
                  <h1 className="truncate font-display text-2xl font-bold text-foreground">
                    Kelola Chapter
                  </h1>
                </div>

                <p className="truncate text-sm text-muted-foreground">
                  {novel?.title}
                </p>
              </div>
            </div>

            <Button
              className="glow-primary-sm"
              onClick={() =>
                navigate(`/author/write-chapter?novel=${novelId}`)
              }
            >
              <Plus size={17} className="mr-2" />
              Tulis Chapter
            </Button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Empty */}
          {chapters.length === 0 ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <BookOpen size={32} className="text-primary" />
              </div>

              <h2 className="font-display text-lg font-semibold text-foreground">
                Belum ada chapter
              </h2>

              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Novel ini belum memiliki chapter. Mulai tulis chapter
                pertama kamu.
              </p>

              <Button
                className="mt-5 glow-primary-sm"
                onClick={() =>
                  navigate(`/author/write-chapter?novel=${novelId}`)
                }
              >
                <Plus size={16} className="mr-2" />
                Tulis Chapter Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    {/* Number */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary">
                      {chapter.chapter_number}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-base font-semibold text-foreground">
                        Chapter {chapter.chapter_number}: {chapter.title}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {chapter.word_count?.toLocaleString('id-ID') ?? 0}{' '}
                          kata
                        </span>

                        <span>•</span>

                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 font-medium',
                            chapter.published
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {chapter.published ? 'Terbit' : 'Draft'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {chapter.published && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/novel/${novelId}`)
                          }
                        >
                          <Eye size={15} className="mr-1.5" />
                          Lihat
                        </Button>
                      )}

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
                          navigate(
                            `/author/edit-chapter/${chapter.id}`
                          )
                        }
                      >
                        <Edit size={15} className="mr-1.5" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublished(chapter)}
                      >
                        {chapter.published
                          ? 'Jadikan Draft'
                          : 'Terbitkan'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === chapter.id}
                        onClick={() => handleDelete(chapter)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {deletingId === chapter.id ? (
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
        </>
      )}
    </div>
  );
}