import { type LucideIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  comingSoon?: boolean;
}

export function PagePlaceholder({ icon: Icon, title, description, comingSoon = true }: PagePlaceholderProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-glow-pulse rounded-3xl bg-primary/20 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-primary/20 bg-card">
          <Icon className="text-primary" size={44} />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
      {comingSoon && (
        <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wider text-primary">
          COMING SOON
        </span>
      )}
      <Button variant="outline" asChild>
        <Link to="/">
          <ArrowLeft size={16} className="mr-1.5" />
          Kembali ke Beranda
        </Link>
      </Button>
    </div>
  );
}
