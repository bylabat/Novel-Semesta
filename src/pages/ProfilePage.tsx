import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Settings,
  Users,
  UserPlus,
  Loader2,
  Calendar,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NovelCard } from '@/components/NovelCard';
import { EmptyState } from '@/components/EmptyState';

import type { Novel } from '@/types';
import type { Profile } from '@/contexts/AuthContext';

interface ProfileWithCounts extends Profile {
  follower_count: number;
  following_count: number;
  novel_count: number;
}

interface SupabaseNovel {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  status: string | null;
  views: number | null;
  created_at: string;
  author_id: string;
}

interface RatingRow {
  novel_id: string;
  rating: number;
}

interface RatingSummary {
  average: number;
  count: number;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const [profile, setProfile] =
    useState<ProfileWithCounts | null>(null);

  const [novels, setNovels] =
    useState<Novel[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followAction, setFollowAction] =
    useState(false);

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!username) {
        setProfile(null);
        setNovels([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // ====================================================
        // 1. AMBIL PROFILE
        // ====================================================

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) {
          console.error(
            'Gagal mengambil profile:',
            profileError
          );

          setError(profileError.message);
          setProfile(null);
          setNovels([]);
          setLoading(false);
          return;
        }

        if (!profileData) {
          setProfile(null);
          setNovels([]);
          setLoading(false);
          return;
        }

        // ====================================================
        // 2. AMBIL JUMLAH FOLLOWER / FOLLOWING / NOVEL
        // ====================================================

        const [
          followersRes,
          followingRes,
          novelsCountRes,
        ] = await Promise.all([
          supabase
            .from('follows')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq(
              'following_id',
              profileData.id
            ),

          supabase
            .from('follows')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq(
              'follower_id',
              profileData.id
            ),

          supabase
            .from('novels')
            .select('id', {
              count: 'exact',
              head: true,
            })
            .eq(
              'author_id',
              profileData.id
            )
            .eq(
              'visibility',
              'public'
            ),
        ]);

        if (cancelled) return;

        // ====================================================
        // 3. PROFILE DENGAN COUNT
        // ====================================================

        const profileWithCounts: ProfileWithCounts = {
          ...profileData,

          follower_count:
            followersRes.count ?? 0,

          following_count:
            followingRes.count ?? 0,

          novel_count:
            novelsCountRes.count ?? 0,
        };

        setProfile(profileWithCounts);

        // ====================================================
        // 4. AMBIL NOVEL AUTHOR
        // ====================================================

        const {
          data: novelData,
          error: novelError,
        } = await supabase
          .from('novels')
          .select(`
            id,
            title,
            description,
            cover,
            status,
            views,
            created_at,
            author_id
          `)
          .eq(
            'author_id',
            profileData.id
          )
          .eq(
            'visibility',
            'public'
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          );

        if (cancelled) return;

        if (novelError) {
          console.error(
            'Gagal mengambil novel profile:',
            novelError
          );

          setNovels([]);
        } else {
          const rows =
            (novelData ?? []) as SupabaseNovel[];

          // ==================================================
          // 5. RATING NOVEL
          // ==================================================

          const novelIds =
            rows.map(
              (novel) => novel.id
            );

          const ratingMap =
            new Map<
              string,
              RatingSummary
            >();

          const chapterCountMap =
            new Map<
              string,
              number
            >();

          if (novelIds.length > 0) {
            // ----------------------------------------------
            // RATINGS
            // ----------------------------------------------

            const {
              data: ratingData,
              error: ratingError,
            } = await supabase
              .from('ratings')
              .select(`
                novel_id,
                rating
              `)
              .in(
                'novel_id',
                novelIds
              );

            if (!cancelled) {
              if (ratingError) {
                console.error(
                  'Gagal mengambil rating profile:',
                  ratingError
                );
              } else {
                const ratings =
                  (ratingData ??
                    []) as RatingRow[];

                ratings.forEach(
                  (rating) => {
                    const current =
                      ratingMap.get(
                        rating.novel_id
                      );

                    if (!current) {
                      ratingMap.set(
                        rating.novel_id,
                        {
                          average:
                            Number(
                              rating.rating
                            ),
                          count: 1,
                        }
                      );
                    } else {
                      const newCount =
                        current.count + 1;

                      ratingMap.set(
                        rating.novel_id,
                        {
                          average:
                            (
                              current.average *
                                current.count +
                              Number(
                                rating.rating
                              )
                            ) /
                            newCount,

                          count:
                            newCount,
                        }
                      );
                    }
                  }
                );
              }
            }

            // ----------------------------------------------
            // CHAPTER COUNT
            // ----------------------------------------------

            const {
              data: chapterData,
              error: chapterError,
            } = await supabase
              .from('chapters')
              .select(`
                novel_id
              `)
              .in(
                'novel_id',
                novelIds
              )
              .eq(
                'published',
                true
              );

            if (!cancelled) {
              if (chapterError) {
                console.error(
                  'Gagal mengambil jumlah chapter profile:',
                  chapterError
                );
              } else {
                const chapters =
                  (chapterData ??
                    []) as {
                    novel_id: string;
                  }[];

                chapters.forEach(
                  (chapter) => {
                    const current =
                      chapterCountMap.get(
                        chapter.novel_id
                      ) ?? 0;

                    chapterCountMap.set(
                      chapter.novel_id,
                      current + 1
                    );
                  }
                );
              }
            }
          }

          if (cancelled) return;

          // ==================================================
          // 6. MAP KE TYPE NOVEL
          // ==================================================

          const mappedNovels: Novel[] =
            rows.map((novel) => {
              const normalizedStatus =
                novel.status
                  ?.toLowerCase() ===
                'completed'
                  ? 'Completed'
                  : novel.status
                      ?.toLowerCase() ===
                    'hiatus'
                    ? 'Hiatus'
                    : 'Ongoing';

              const rating =
                ratingMap.get(
                  novel.id
                );

              const chapterCount =
                chapterCountMap.get(
                  novel.id
                ) ?? 0;

              return {
                id: novel.id,

                title:
                  novel.title,

                author:
                  profileData.display_name ||
                  profileData.username ||
                  'Author',

                cover:
                  novel.cover ||
                  '/placeholder.svg',

                genres: [],

                rating:
                  rating?.average ?? 0,

                ratingCount:
                  rating?.count ?? 0,

                views:
                  Number(
                    novel.views ?? 0
                  ).toLocaleString(
                    'id-ID'
                  ),

                status:
                  normalizedStatus,

                chapterCount,

                latestChapter: '',

                description:
                  novel.description ||
                  'Belum ada deskripsi.',

                isNew: false,

                isHot: false,
              };
            });

          setNovels(mappedNovels);
        }

        // ====================================================
        // 7. CEK FOLLOW
        // ====================================================

        if (
          currentUser &&
          currentUser.id !== profileData.id
        ) {
          const {
            data: followData,
            error: followError,
          } = await supabase
            .from('follows')
            .select('id')
            .eq(
              'follower_id',
              currentUser.id
            )
            .eq(
              'following_id',
              profileData.id
            )
            .maybeSingle();

          if (cancelled) return;

          if (followError) {
            console.error(
              'Gagal mengecek follow:',
              followError
            );

            setIsFollowing(false);
          } else {
            setIsFollowing(
              Boolean(followData)
            );
          }
        } else {
          setIsFollowing(false);
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error(
          'Kesalahan saat memuat profile:',
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Terjadi kesalahan saat memuat profile.'
          );

          setProfile(null);
          setNovels([]);
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [username, currentUser]);

  // ==========================================================
  // FOLLOW
  // ==========================================================

  const handleFollow = async () => {
    if (
      !currentUser ||
      !profile ||
      followAction
    ) {
      return;
    }

    if (
      currentUser.id === profile.id
    ) {
      return;
    }

    setFollowAction(true);

    try {
      if (isFollowing) {
        const {
          error: deleteError,
        } = await supabase
          .from('follows')
          .delete()
          .eq(
            'follower_id',
            currentUser.id
          )
          .eq(
            'following_id',
            profile.id
          );

        if (deleteError) {
          console.error(
            'Gagal berhenti mengikuti:',
            deleteError
          );

          return;
        }

        setIsFollowing(false);

        setProfile(
          (currentProfile) =>
            currentProfile
              ? {
                  ...currentProfile,
                  follower_count:
                    Math.max(
                      0,
                      currentProfile.follower_count -
                        1
                    ),
                }
              : currentProfile
        );
      } else {
        const {
          error: insertError,
        } = await supabase
          .from('follows')
          .insert({
            follower_id:
              currentUser.id,

            following_id:
              profile.id,
          });

        if (insertError) {
          console.error(
            'Gagal mengikuti profile:',
            insertError
          );

          return;
        }

        setIsFollowing(true);

        setProfile(
          (currentProfile) =>
            currentProfile
              ? {
                  ...currentProfile,
                  follower_count:
                    currentProfile.follower_count +
                    1,
                }
              : currentProfile
        );
      }
    } finally {
      setFollowAction(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          size={32}
          className="animate-spin text-primary"
        />
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
          <p className="font-medium text-destructive">
            Gagal memuat profile
          </p>

          <p className="mt-2 break-words text-sm text-destructive/80">
            {error}
          </p>

          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              navigate('/')
            }
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PROFILE TIDAK DITEMUKAN
  // ==========================================================

  if (!profile) {
    return (
      <EmptyState
        icon={Users}
        title="Profil tidak ditemukan"
        description="Pengguna ini mungkin belum terdaftar atau telah menghapus akunnya."
        action={
          <Button
            variant="outline"
            asChild
          >
            <Link to="/">
              Kembali ke Beranda
            </Link>
          </Button>
        }
      />
    );
  }

  // ==========================================================
  // PROFILE DATA
  // ==========================================================

  const isOwnProfile =
    currentUser?.id === profile.id;

  const avatarUrl =
    profile.avatar;

  const displayName =
    profile.display_name ||
    profile.username ||
    'Pengguna';

  const initials =
    displayName
      .slice(0, 2)
      .toUpperCase();

  const joinDate =
    profile.created_at
      ? new Date(
          profile.created_at
        ).toLocaleDateString(
          'id-ID',
          {
            month: 'long',
            year: 'numeric',
          }
        )
      : '-';

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">

      {/* ======================================================
          PROFILE HEADER
      ======================================================= */}

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">

        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">

          {/* AVATAR */}

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-24 w-24 shrink-0 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-3xl font-bold text-primary">
              {initials}
            </div>
          )}

          {/* INFO */}

          <div className="min-w-0 flex-1 text-center sm:text-left">

            <h1 className="font-display text-2xl font-bold text-foreground">
              {displayName}
            </h1>

            {profile.username && (
              <p className="text-sm text-muted-foreground">
                @{profile.username}
              </p>
            )}

            {profile.bio && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}

            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
              <Calendar size={14} />
              <span>
                Bergabung sejak {joinDate}
              </span>
            </div>

            {/* COUNTS */}

            <div className="mt-4 flex flex-wrap justify-center gap-4 sm:justify-start">

              <div className="flex items-center gap-2 text-sm">
                <BookOpen
                  size={16}
                  className="text-primary"
                />

                <span className="font-semibold text-foreground">
                  {profile.novel_count}
                </span>

                <span className="text-muted-foreground">
                  Novel
                </span>
              </div>

              <button
                type="button"
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
              >
                <Users
                  size={16}
                  className="text-primary"
                />

                <span className="font-semibold text-foreground">
                  {profile.follower_count}
                </span>

                <span className="text-muted-foreground">
                  Pengikut
                </span>
              </button>

              <div className="flex items-center gap-2 text-sm">
                <UserPlus
                  size={16}
                  className="text-primary"
                />

                <span className="font-semibold text-foreground">
                  {profile.following_count}
                </span>

                <span className="text-muted-foreground">
                  Mengikuti
                </span>
              </div>

            </div>
          </div>

          {/* ACTION */}

          <div className="flex shrink-0 flex-col gap-2">

            {isOwnProfile ? (
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    '/settings/profile'
                  )
                }
              >
                <Settings
                  size={16}
                  className="mr-1.5"
                />

                Pengaturan
              </Button>
            ) : currentUser ? (
              <Button
                variant={
                  isFollowing
                    ? 'outline'
                    : 'default'
                }
                onClick={
                  handleFollow
                }
                disabled={followAction}
                className={
                  isFollowing
                    ? ''
                    : 'glow-primary-sm'
                }
              >
                {followAction && (
                  <Loader2
                    size={16}
                    className="mr-1.5 animate-spin"
                  />
                )}

                {isFollowing
                  ? 'Mengikuti'
                  : 'Ikuti'}
              </Button>
            ) : (
              <Button
                variant="default"
                className="glow-primary-sm"
                onClick={() =>
                  navigate('/login')
                }
              >
                Masuk untuk Mengikuti
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* ======================================================
          NOVELS
      ======================================================= */}

      <div className="mt-10 space-y-5">

        <div className="flex items-center gap-3">

          <div className="h-6 w-1 rounded-full bg-primary glow-primary-sm" />

          <h2 className="font-display text-xl font-bold text-foreground">
            Novel oleh {displayName}
          </h2>

        </div>

        {novels.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {novels.map(
              (novel) => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                />
              )
            )}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Belum ada novel"
            description={
              isOwnProfile
                ? 'Kamu belum menerbitkan novel.'
                : `${displayName} belum menerbitkan novel.`
            }
          />
        )}

      </div>
    </div>
  );
}