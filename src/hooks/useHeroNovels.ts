import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface HeroNovel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  views: number;
  type: 'popular' | 'new';
  genres: string[];
}

export function useHeroNovels() {
  const [novels, setNovels] = useState<HeroNovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHeroNovels() {
      setLoading(true);

      try {
        // ==========================================
        // 1. NOVEL PALING POPULER
        // ==========================================

        const {
          data: popular,
          error: popularError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            views
          `)
          .eq('visibility', 'public')
          .order('views', {
            ascending: false,
            nullsFirst: false,
          })
          .limit(3);

        if (popularError) {
          console.error(
            'Gagal mengambil novel populer:',
            popularError
          );
        }

        // ==========================================
        // 2. NOVEL TERBARU
        // ==========================================

        const {
          data: latest,
          error: latestError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            views
          `)
          .eq('visibility', 'public')
          .order('created_at', {
            ascending: false,
          })
          .limit(3);

        if (latestError) {
          console.error(
            'Gagal mengambil novel terbaru:',
            latestError
          );
        }

        // ==========================================
        // 3. GABUNGKAN NOVEL
        //    Hindari novel yang sama
        // ==========================================

        const popularNovels: HeroNovel[] =
          (popular ?? []).map((novel) => ({
            ...novel,
            views: novel.views ?? 0,
            type: 'popular',
            genres: [],
          }));

        const latestNovels: HeroNovel[] =
          (latest ?? []).map((novel) => ({
            ...novel,
            views: novel.views ?? 0,
            type: 'new',
            genres: [],
          }));

        const combinedNovels: HeroNovel[] = [
          ...popularNovels,
          ...latestNovels.filter(
            (latestNovel) =>
              !popularNovels.some(
                (popularNovel) =>
                  popularNovel.id === latestNovel.id
              )
          ),
        ];

        // ==========================================
        // 4. AMBIL GENRE DARI SUPABASE
        // ==========================================

        const novelIds = combinedNovels.map(
          (novel) => novel.id
        );

        let genreRelations: any[] = [];

        if (novelIds.length > 0) {
          const {
            data,
            error: genreError,
          } = await supabase
            .from('novel_genres')
            .select(`
              novel_id,
              genres (
                name
              )
            `)
            .in('novel_id', novelIds);

          if (genreError) {
            console.error(
              'Gagal mengambil genre HeroBanner:',
              genreError
            );
          } else {
            genreRelations = data ?? [];
          }
        }

        // ==========================================
        // 5. MASUKKAN GENRE KE MASING-MASING NOVEL
        // ==========================================

        const novelsWithGenres: HeroNovel[] =
          combinedNovels.map((novel) => {
            const genres = genreRelations
              .filter(
                (relation) =>
                  relation.novel_id === novel.id
              )
              .map((relation) => {
                const genre = relation.genres as
                  | { name: string }
                  | null;

                return genre?.name;
              })
              .filter(
                (name): name is string =>
                  Boolean(name)
              );

            return {
              ...novel,
              genres,
            };
          });

        // ==========================================
        // 6. SIMPAN KE STATE
        // ==========================================

        setNovels(novelsWithGenres);
      } catch (error) {
        console.error(
          'Gagal memuat HeroBanner:',
          error
        );

        setNovels([]);
      } finally {
        setLoading(false);
      }
    }

    loadHeroNovels();
  }, []);

  return {
    novels,
    loading,
  };
}