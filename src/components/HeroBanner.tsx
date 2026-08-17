import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { heroSlides } from '@/data/hero';
import { cn } from '@/lib/utils';

const AUTOPLAY_INTERVAL = 6000;

export function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const slide = heroSlides[current];

  return (
    <section
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background images */}
      <div className="relative h-[480px] w-full sm:h-[560px] lg:h-[640px]">
        {heroSlides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              i === current ? 'opacity-100' : 'opacity-0'
            )}
          >
            <img
              src={s.cover}
              alt={s.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div key={slide.id} className="animate-slide-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary backdrop-blur-sm">
                {slide.badge}
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground text-glow sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                {slide.description}
              </p>
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
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" className="glow-primary group" asChild>
                  <Link to={`/novel/${slide.id}`}>
                    <Play size={18} className="mr-1 fill-white" />
                    Baca Sekarang
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border bg-card/40 backdrop-blur-sm hover:bg-card/70" asChild>
                  <Link to={`/novel/${slide.id}`}>
                    <Info size={18} className="mr-1" />
                    Lihat Detail
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arrows (desktop) */}
      <button
        onClick={prev}
        aria-label="Sebelumnya"
        className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-sm transition-all hover:bg-primary hover:text-white hover:border-primary lg:flex"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        aria-label="Berikutnya"
        className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/50 text-foreground backdrop-blur-sm transition-all hover:bg-primary hover:text-white hover:border-primary lg:flex"
      >
        <ChevronRight size={22} />
      </button>

      {/* Carousel indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {heroSlides.map((s, i) => (
          <button
            key={s.id}
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
    </section>
  );
}
