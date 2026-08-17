import { HeroBanner } from '@/components/HeroBanner';
import { PopularNovels } from '@/components/home/PopularNovels';
import { LatestNovels } from '@/components/home/LatestNovels';
import { GenreSection } from '@/components/home/GenreSection';
import { FeatureSection } from '@/components/home/FeatureSection';

export default function HomePage() {
  return (
    <div className="space-y-12 pb-12 sm:space-y-16">
      <HeroBanner />

      <div className="mx-auto max-w-[1440px] space-y-12 px-4 sm:space-y-16 sm:px-6 lg:px-8">
        <PopularNovels />
        <LatestNovels />
        <GenreSection />
        <FeatureSection />
      </div>
    </div>
  );
}
