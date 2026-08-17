import { Users, MessageCircle, Heart, TrendingUp } from 'lucide-react';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function KomunitasPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Users className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Komunitas</h1>
          <p className="text-sm text-muted-foreground">Bergabung dengan ribuan pembaca dan penulis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: MessageCircle, label: 'Diskusi', value: '12.4K', sub: 'Thread aktif' },
          { icon: Heart, label: 'Review', value: '45.2K', sub: 'Review novel' },
          { icon: TrendingUp, label: 'Anggota', value: '89.1K', sub: 'Anggota komunitas' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="text-primary" size={24} />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm font-medium text-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <PagePlaceholder
          icon={Users}
          title="Komunitas Novel Semesta"
          description="Forum diskusi, review, dan interaksi antar pembaca serta penulis akan segera hadir."
        />
      </div>
    </div>
  );
}
