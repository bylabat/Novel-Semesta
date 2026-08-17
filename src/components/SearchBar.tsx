import { Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSubmit?: (query: string) => void;
}

export function SearchBar({ placeholder = 'Cari novel, author...', className, onSubmit }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(query);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full', className)}>
      <Search
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary/50 focus:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
}
