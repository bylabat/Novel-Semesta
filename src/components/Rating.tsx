import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { star: 12, text: 'text-xs' },
  md: { star: 14, text: 'text-sm' },
  lg: { star: 16, text: 'text-base' },
};

export function Rating({ value, count, size = 'sm', showCount = true, className }: RatingProps) {
  const config = sizeConfig[size];
  const fullStars = Math.floor(value);
  const hasHalf = value % 1 >= 0.5;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFull = i < fullStars;
          const isHalf = i === fullStars && hasHalf;
          return (
            <Star
              key={i}
              size={config.star}
              className={cn(
                'transition-colors',
                isFull || isHalf
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted-foreground/40'
              )}
            />
          );
        })}
      </div>
      <span className={cn('font-semibold text-foreground', config.text)}>
        {value.toFixed(1)}
      </span>
      {showCount && count !== undefined && (
        <span className={cn('text-muted-foreground', config.text)}>
          ({count.toLocaleString('id-ID')})
        </span>
      )}
    </div>
  );
}
