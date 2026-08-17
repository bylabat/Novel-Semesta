import { genres } from '@/data/genres';
import { GenreCard } from '@/components/GenreCard';

export default function GenrePage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-primary glow-primary-sm" />
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Genre</h1>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Pilih genre favoritmu dan temukan ribuan novel yang sesuai dengan selera bacaanmu.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {genres.map((genre) => (
          <GenreCard key={genre.id} genre={genre} />
        ))}
      </div>
    </div>
  );
}
