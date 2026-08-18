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
        (prev - 1 + novels.length) % novels.length
    );
  }, [novels.length]);

  useEffect(() => {
    if (isPaused || novels.length <= 1) return;

    const timer = setInterval(
      next,
      AUTOPLAY_INTERVAL
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
      <section className="relative flex h-[480px] w-full items-center justify-center bg-background sm:h-[560px] lg:h-[640px]">
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
      <section className="relative flex h-[480px] w-full items-center justify-center bg-background sm:h-[560px] lg:h-[640px]">
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
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;

            const touchEndX = e.changedTouches[0].clientX;
            const distance = touchStartX.current - touchEndX;

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

      <div className="relative h-[480px] w-full sm:h-[560px] lg:h-[640px]">
        {novels.map((novel, i) => (
          <div
            key={novel.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              i === current
                ? 'opacity-100'
                : 'opacity-0'
            )}
          >
            {novel.cover && (
              <img
                src={novel.cover}
                alt={novel.title}
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />

            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          </div>
        ))}
      </div>

      {/* ==========================================
          CONTENT
      ========================================== */}

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div
              key={slide.id}
              className="animate-slide-up"
            >
              {/* BADGE */}

              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary backdrop-blur-sm">
                {slide.type === 'popular'
                  ? 'NOVEL TERPOPULER'
                  : 'NOVEL BARU'}
              </span>

              {/* TITLE */}

              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground text-glow sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>

              {/* DESCRIPTION */}

              <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                {slide.description ||
                  'Baca novel ini hanya di Novel Semesta.'}
              </p>

              {/* GENRE */}

              {slide.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {slide.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-lg border border-border bg-card/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* BUTTON */}

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="glow-primary group"
                  asChild
                >
                  <Link
                    to={`/novel/${slide.id}`}
                  >
                    <Play
                      size={18}
                      className="mr-1 fill-white"
                    />
                    Baca Sekarang
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-border bg-card/40 backdrop-blur-sm hover:bg-card/70"
                  asChild
                >
                  <Link
                    to={`/novel/${slide.id}`}
                  >
                    <Info
                      size={18}
                      className="mr-1"
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
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {novels.map((novel, i) => (
            <button
              key={novel.id}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === current
                  ? 'w-8 bg-primary glow-primary-sm'
                  : 'w-2 bg-foreground/30 hover:bg-foreground/50'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}