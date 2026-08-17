import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  link?: string;
  linkText?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, link, linkText = 'Lihat Semua', className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary glow-primary-sm" />
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        </div>
        {subtitle && <p className="pl-4 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {link && (
        <Link
          to={link}
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {linkText}
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
