import { genres } from '@/data/genres';
import { GenreCard } from '@/components/GenreCard';
import { SectionHeader } from '@/components/SectionHeader';

export function GenreSection() {
  return (
    <section className="space-y-5">
      <SectionHeader title="Genre" subtitle="Temukan novel favoritmu berdasarkan genre" link="/genre" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {genres.map((genre) => (
          <GenreCard key={genre.id} genre={genre} />
        ))}
      </div>
    </section>
  );
}
