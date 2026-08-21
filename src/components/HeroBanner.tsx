import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHeroNovels } from '@/hooks/useHeroNovels';

const AUTOPLAY_INTERVAL = 6000;

export function HeroBanner() {
  const { novels, loading } = useHeroNovels();

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(() => {
    if (novels.length === 0) return;

    setCurrent((prev) => (prev + 1) % novels.length);
  }, [novels.length]);

  const prev = useCallback(() => {
    if (novels.length === 0) return;

    setCurrent(
      (prev) =>
        (prev - 1 + novels.length) % novels.length,
    );
  }, [novels.length]);

  useEffect(() => {
    if (isPaused || novels.length <= 1) return;

    const timer = setInterval(
      next,
      AUTOPLAY_INTERVAL,
    );

    return () => clearInterval(timer);
  }, [next, isPaused, novels.length]);

  useEffect(() => {
    if (current >= novels.length) {
      setCurrent(0);
    }
  }, [current, novels.length]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <section className="relative flex h-[520px] w-full items-center justify-center bg-background sm:h-[560px] lg:h-[640px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            size={24}
            className="animate-spin text-primary"
          />
          Memuat novel...
        </div>
      </section>
    );
  }

  // ==========================================
  // JIKA TIDAK ADA NOVEL
  // ==========================================

  if (novels.length === 0) {
    return (
      <section className="relative flex h-[520px] w-full items-center justify-center bg-background sm:h-[560px] lg:h-[640px]">
        <p className="text-sm text-muted-foreground">
          Belum ada novel untuk ditampilkan.
        </p>
      </section>
    );
  }

  const slide = novels[current];

  return (
    <section
      className="relative w-full overflow-hidden touch-pan-y"
      onTouchStart={(e) => {
        touchStartX.current =
          e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;

        const touchEndX =
          e.changedTouches[0].clientX;

        const distance =
          touchStartX.current - touchEndX;

        const SWIPE_THRESHOLD = 50;

        if (Math.abs(distance) >= SWIPE_THRESHOLD) {
          if (distance > 0) {
            next();
          } else {
            prev();
          }
        }

        touchStartX.current = null;
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ==========================================
          BACKGROUND IMAGES
      ========================================== */}

      <div className="relative h-[520px] w-full bg-background sm:h-[560px] lg:h-[640px]">
        {novels.map((novel, i) => (
          <div
            key={novel.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              i === current
                ? 'opacity-100'
                : 'opacity-0',
            )}
          >
            {/* Background blur agar gambar tidak perlu
                dipaksa memenuhi ukuran banner */}
            {novel.cover && (
              <>
                <img
                  src={novel.cover}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
                />

                <div className="absolute inset-0 bg-background/30" />

                {/* Gambar utama.
                    object-contain menjaga seluruh gambar
                    tetap terlihat tanpa terpotong. */}
                <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 lg:px-12">
                  <img
                    src={novel.cover}
                    alt={novel.title}
                    className="h-full w-full object-contain object-center"
                  />
                </div>
              </>
            )}

            {/* Overlay bawah */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/15" />

            {/* Overlay kiri untuk keterbacaan konten */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />

            {/* Overlay tambahan khusus mobile */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/80 sm:hidden" />
          </div>
        ))}
      </div>

      {/* ==========================================
          CONTENT
      ========================================== */}

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <div
              key={slide.id}
              className="animate-slide-up"
            >
              {/* BADGE */}

              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-wider text-primary backdrop-blur-sm sm:text-xs">
                {slide.type === 'popular'
                  ? 'NOVEL TERPOPULER'
                  : 'NOVEL BARU'}
              </span>

              {/* TITLE */}

              <h1 className="mt-3 max-w-[90%] font-display text-2xl font-extrabold leading-tight text-foreground text-glow sm:mt-4 sm:max-w-2xl sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>

              {/* DESCRIPTION */}

              <p className="mt-3 line-clamp-3 max-w-xl text-xs leading-5 text-muted-foreground sm:mt-4 sm:line-clamp-none sm:text-base sm:leading-7 lg:text-lg">
                {slide.description ||
                  'Baca novel ini hanya di Novel Semesta.'}
              </p>

              {/* GENRE */}

              {slide.genres.length > 0 && (
                <div className="mt-4 flex max-w-xl flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
                  {slide.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-lg border border-border bg-card/60 px-2.5 py-1 text-[10px] font-medium text-foreground backdrop-blur-sm sm:px-3 sm:text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* BUTTON */}

              <div className="mt-5 flex flex-wrap gap-2 sm:mt-7 sm:gap-3">
                <Button
                  size="lg"
                  className="glow-primary group h-10 px-4 text-xs sm:h-11 sm:px-5 sm:text-sm"
                  asChild
                >
                  <Link
                    to={`/novel/${slide.id}`}
                  >
                    <Play
                      size={16}
                      className="mr-1 fill-white sm:h-[18px] sm:w-[18px]"
                    />
                    Baca Sekarang
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-10 border-border bg-card/40 px-4 text-xs backdrop-blur-sm hover:bg-card/70 sm:h-11 sm:px-5 sm:text-sm"
                  asChild
                >
                  <Link
                    to={`/novel/${slide.id}`}
                  >
                    <Info
                      size={16}
                      className="mr-1 sm:h-[18px] sm:w-[18px]"
                    />
                    Lihat Detail
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          ARROWS
      ========================================== */}

      {novels.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Sebelumnya"
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-sm transition-all hover:border-primary hover:bg-primary hover:text-white lg:flex"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            onClick={next}
            aria-label="Berikutnya"
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-sm transition-all hover:border-primary hover:bg-primary hover:text-white lg:flex"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* ==========================================
          INDICATORS
      ========================================== */}

      {novels.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-6">
          {novels.map((novel, i) => (
            <button
              key={novel.id}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === current
                  ? 'w-8 bg-primary glow-primary-sm'
                  : 'w-2 bg-foreground/30 hover:bg-foreground/50',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}