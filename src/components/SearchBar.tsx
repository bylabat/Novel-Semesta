import { Search, X, Loader2 } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSubmit?: (query: string) => void;
}

interface SearchNovel {
  id: string;
  title: string;
}

export function SearchBar({
  placeholder = 'Cari novel, author...',
  className,
  onSubmit,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] =
    useState<SearchNovel[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [showResults, setShowResults] =
    useState(false);

  const navigate = useNavigate();
  const searchRef =
    useRef<HTMLDivElement>(null);

  // ==========================================================
  // AUTOCOMPLETE
  // ==========================================================

  useEffect(() => {
    const searchQuery =
      query.trim();

    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(
      async () => {
        setLoading(true);

        const {
          data,
          error,
        } = await supabase
          .from('novels')
          .select(
            `
              id,
              title
            `,
          )
          .eq(
            'visibility',
            'public',
          )
          .ilike(
            'title',
            `%${searchQuery}%`,
          )
          .order(
            'title',
            {
              ascending: true,
            },
          )
          .limit(5);

        if (cancelled) return;

        if (error) {
          console.error(
            'Gagal mencari novel:',
            error,
          );

          setResults([]);
        } else {
          setResults(
            (data ??
              []) as SearchNovel[],
          );
        }

        setLoading(false);
        setShowResults(true);
      },
      300,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // ==========================================================
  // KLIK DI LUAR SEARCH
  // ==========================================================

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        searchRef.current &&
        !searchRef.current.contains(
          event.target as Node,
        )
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );
    };
  }, []);

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = (
    e: FormEvent,
  ) => {
    e.preventDefault();

    const searchQuery =
      query.trim();

    if (!searchQuery) {
      return;
    }

    onSubmit?.(searchQuery);

    setShowResults(false);
  };

  // ==========================================================
  // PILIH HASIL
  // ==========================================================

  const handleSelectNovel = (
    novel: SearchNovel,
  ) => {
    setShowResults(false);
    setQuery(novel.title);

    navigate(
      `/novel/${novel.id}`,
    );
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div
      ref={searchRef}
      className={cn(
        'relative w-full',
        className,
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full"
      >
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(
              e.target.value,
            );
            setShowResults(true);
          }}
          onFocus={() => {
            if (
              query.trim()
                .length >= 2
            ) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        {loading ? (
          <Loader2
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary"
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>
        ) : null}
      </form>

      {/* =====================================================
          HASIL AUTOCOMPLETE
          ===================================================== */}

      {showResults &&
        query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-5 text-sm text-muted-foreground">
                <Loader2
                  size={16}
                  className="mr-2 animate-spin text-primary"
                />

                Mencari novel...
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map(
                  (novel) => (
                    <button
                      key={
                        novel.id
                      }
                      type="button"
                      onClick={() =>
                        handleSelectNovel(
                          novel,
                        )
                      }
                      className="flex w-full items-center px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Search
                        size={15}
                        className="mr-3 shrink-0 text-muted-foreground"
                      />

                      <span className="line-clamp-1">
                        {novel.title}
                      </span>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                Novel tidak ditemukan.
              </div>
            )}
          </div>
        )}
    </div>
  );
}