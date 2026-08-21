import { useEffect, useState } from "react";
import {
  Clock,
  Eye,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";

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
    return "Baru saja";
  }

  if (diffInSeconds < 60) {
    return "Baru saja";
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
          console.error(
            "Gagal mengambil novel terbaru:",
            error,
          );

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

        const novelIds = novelData.map(
          (novel) => novel.id,
        );

        // ==========================================
        // 4. AMBIL GENRE
        // ==========================================

        const {
          data: genreRelations,
          error: genreError,
        } = await supabase
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
          console.error(
            "Gagal mengambil genre novel terbaru:",
            genreError,
          );
        }

        // ==========================================
        // 5. GABUNGKAN GENRE
        // ==========================================

        const formattedNovels: Novel[] =
          novelData.map((novel) => {
            const genres = (genreRelations ?? [])
              .filter(
                (relation) =>
                  relation.novel_id === novel.id,
              )
              .map((relation) => {
                const genre = Array.isArray(
                  relation.genres,
                )
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
        console.error(
          "Gagal memuat novel terbaru:",
          error,
        );

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

      {/* ==========================================
          LOADING
      ========================================== */}

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              size={20}
              className="animate-spin text-primary"
            />

            Memuat novel...
          </div>
        </div>
      ) : novels.length === 0 ? (
        /* ==========================================
           EMPTY
        ========================================== */

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">
            Belum ada novel
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Belum ada novel publik yang tersedia.
          </p>
        </div>
      ) : (
        /* ==========================================
           NOVELS
        ========================================== */

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {novels.map((novel) => {
            const author = Array.isArray(
              novel.profiles,
            )
              ? novel.profiles[0]
              : novel.profiles;

            return (
              <Link
                key={novel.id}
                to={`/novel/${novel.id}`}
                className="group flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
              >
                {/* COVER */}

                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-[74px]">
                  <img
                    src={
                      novel.cover ||
                      "/placeholder.svg"
                    }
                    alt={novel.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* CONTENT */}

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  {/* TITLE + BADGE */}

                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {novel.title}
                    </h3>

                    <Badge className="shrink-0 bg-success px-2 text-[10px] text-white">
                      Baru
                    </Badge>
                  </div>

                  {/* AUTHOR */}

                  <p className="truncate text-xs text-muted-foreground">
                    {author?.display_name ||
                      author?.username ||
                      "Author"}
                  </p>

                  {/* GENRES */}

                  {novel.genres.length > 0 && (
                    <div className="flex min-w-0 flex-wrap gap-1 overflow-hidden">
                      {novel.genres
                        .slice(0, 2)
                        .map((genre) => (
                          <span
                            key={genre}
                            className="max-w-full truncate rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {genre}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* META */}

                  <div className="mt-auto flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground sm:gap-3 sm:text-xs">
                    <span className="flex shrink-0 items-center gap-1">
                      <Eye size={12} />
                      {novel.views ?? 0}
                    </span>

                    <span className="flex min-w-0 items-center gap-1 truncate">
                      <Clock
                        size={12}
                        className="shrink-0"
                      />
                      <span className="truncate">
                        {formatRelativeTime(
                          novel.updated_at,
                        )}
                      </span>
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