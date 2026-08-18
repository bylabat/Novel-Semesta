import { useEffect, useState } from "react";
import { Clock, Eye, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Profile {
  username: string | null;
  display_name: string | null;
}

interface Novel {
  id: string;
  title: string;
  cover: string | null;
  status: string;
  updated_at: string;
  views: number | null;
  author_id: string;
  profiles: Profile | Profile[] | null;
  genres: string[];
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const diffInSeconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000,
  );

  if (diffInSeconds < 0) {
    return 'Baru saja';
  }

  if (diffInSeconds < 60) {
    return 'Baru saja';
  }

  const diffInMinutes = Math.floor(
    diffInSeconds / 60,
  );

  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit lalu`;
  }

  const diffInHours = Math.floor(
    diffInMinutes / 60,
  );

  if (diffInHours < 24) {
    return `${diffInHours} jam lalu`;
  }

  const diffInDays = Math.floor(
    diffInHours / 24,
  );

  if (diffInDays < 7) {
    return `${diffInDays} hari lalu`;
  }

  const diffInWeeks = Math.floor(
    diffInDays / 7,
  );

  if (diffInWeeks < 4) {
    return `${diffInWeeks} minggu lalu`;
  }

  const diffInMonths = Math.floor(
    diffInDays / 30,
  );

  if (diffInMonths < 12) {
    return `${diffInMonths} bulan lalu`;
  }

  const diffInYears = Math.floor(
    diffInDays / 365,
  );

  return `${diffInYears} tahun lalu`;
}

export function LatestNovels() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestNovels() {
      setLoading(true);

      try {
        // ==========================================
        // 1. AMBIL NOVEL TERBARU
        // ==========================================

        const { data, error } = await supabase
          .from("novels")
          .select(
            `
            id,
            title,
            cover,
            status,
            updated_at,
            views,
            author_id,
            profiles:author_id (
              username,
              display_name
            )
          `,
          )
          .eq("visibility", "public")
          .order("updated_at", {
            ascending: false,
          })
          .limit(6);

        if (cancelled) return;

        if (error) {
          console.error("Gagal mengambil novel terbaru:", error);

          setNovels([]);
          setLoading(false);
          return;
        }

        const novelData = data ?? [];

        // ==========================================
        // 2. TIDAK ADA NOVEL
        // ==========================================

        if (novelData.length === 0) {
          setNovels([]);
          setLoading(false);
          return;
        }

        // ==========================================
        // 3. AMBIL ID NOVEL
        // ==========================================

        const novelIds = novelData.map((novel) => novel.id);

        // ==========================================
        // 4. AMBIL GENRE
        // ==========================================

        const { data: genreRelations, error: genreError } = await supabase
          .from("novel_genres")
          .select(
            `
            novel_id,
            genres (
              name
            )
          `,
          )
          .in("novel_id", novelIds);

        if (cancelled) return;

        if (genreError) {
          console.error("Gagal mengambil genre novel terbaru:", genreError);
        }

        // ==========================================
        // 5. GABUNGKAN GENRE
        // ==========================================

        const formattedNovels: Novel[] = novelData.map((novel) => {
          const genres = (genreRelations ?? [])
            .filter((relation) => relation.novel_id === novel.id)
            .map((relation) => {
              const genre = Array.isArray(relation.genres)
                ? relation.genres[0]
                : relation.genres;

              return genre?.name ?? "";
            })
            .filter(Boolean);

          return {
            ...novel,
            views: novel.views ?? 0,
            genres,
          } as Novel;
        });

        setNovels(formattedNovels);
        setLoading(false);
      } catch (error) {
        console.error("Gagal memuat novel terbaru:", error);

        if (!cancelled) {
          setNovels([]);
          setLoading(false);
        }
      }
    }

    loadLatestNovels();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Novel Terbaru"
        subtitle="Novel yang baru saja diperbarui"
        link="/terbaru"
      />

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-primary" />
            Memuat novel...
          </div>
        </div>
      ) : novels.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">Belum ada novel</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada novel publik yang tersedia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {novels.map((novel, index) => {
            const author = Array.isArray(novel.profiles)
              ? novel.profiles[0]
              : novel.profiles;

            return (
              <Link
                key={novel.id}
                to={`/novel/${novel.id}`}
                className={cn(
                  "group flex gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
                  index === 0 && "sm:col-span-2 lg:col-span-1",
                )}
              >
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={novel.cover || "/placeholder.svg"}
                    alt={novel.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-display text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {novel.title}
                    </h3>

                    <Badge className="shrink-0 bg-success text-white">
                      Baru
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {author?.display_name || author?.username || "Author"}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {novel.genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {novel.views ?? 0}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatRelativeTime(novel.updated_at)}
                    </span>

                    <ChevronRight
                      size={14}
                      className="ml-auto shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
