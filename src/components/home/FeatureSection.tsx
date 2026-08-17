import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { features } from '@/data/features';

export function FeatureSection() {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-6 w-1 rounded-full bg-primary glow-primary-sm" />
        <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">Mengapa Novel Semesta?</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => {
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[feature.icon] ?? Icons.Sparkles;
          return (
            <div
              key={feature.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                <Icon className="text-primary" size={24} />
              </div>
              <h3 className="relative mt-4 font-display text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
