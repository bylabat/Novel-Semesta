import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Settings,
  Users,
  UserPlus,
  Loader2,
  Calendar,
  UserRound,
  PenLine,
  Sparkles,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { NovelCard } from '@/components/NovelCard';
import { EmptyState } from '@/components/EmptyState';

import { cn } from '@/lib/utils';

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
  const { username } = useParams<{
    username: string;
  }>();

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
        // ======================================================
        // PROFILE
        // ======================================================

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

        // ======================================================
        // COUNTS
        // ======================================================

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

        // ======================================================
        // AUTHOR NOVELS
        // ======================================================

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

          // ====================================================
          // RATINGS + CHAPTER COUNT
          // ====================================================

          if (novelIds.length > 0) {
            // --------------------------------------------------
            // RATINGS
            // --------------------------------------------------

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

                      return;
                    }

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
                );
              }
            }

            // --------------------------------------------------
            // CHAPTER COUNT
            // --------------------------------------------------

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

          // ====================================================
          // MAP NOVELS
          // ====================================================

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

        // ======================================================
        // CHECK FOLLOW
        // ======================================================

        if (
          currentUser &&
          currentUser.id !==
            profileData.id
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
  }, [
    username,
    currentUser,
  ]);

  // ==========================================================
  // FOLLOW / UNFOLLOW
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
      // ======================================================
      // UNFOLLOW
      // ======================================================

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

        return;
      }

      // ======================================================
      // FOLLOW
      // ======================================================

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
  // PROFILE NOT FOUND
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

  const canWriteNovel =
    isOwnProfile &&
    (
      profile.role === 'author' ||
      profile.role === 'admin'
    );

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

  const roleLabel =
    profile.role === 'admin'
      ? 'Admin'
      : profile.role === 'author'
        ? 'Penulis'
        : profile.role === 'moderator'
          ? 'Moderator'
          : 'Pembaca';

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-5 sm:px-6 sm:pt-8 lg:px-8">

      {/* ======================================================
          PROFILE HERO
      ======================================================= */}

      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">

        {/* Decorative Background */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        </div>

        <div className="relative p-5 sm:p-8 lg:p-10">

          {/* ==================================================
              TOP PROFILE
          =================================================== */}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

            {/* AVATAR */}

            <div className="flex shrink-0 justify-center lg:justify-start">
              <div className="relative">

                <div className="absolute -inset-1 rounded-[1.35rem] bg-primary/20 blur-md" />

                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="relative h-28 w-28 rounded-[1.25rem] border-2 border-border bg-secondary object-cover shadow-xl sm:h-32 sm:w-32"
                  />
                ) : (
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-[1.25rem] border-2 border-border bg-primary/15 text-4xl font-bold text-primary shadow-xl sm:h-32 sm:w-32">
                    {initials}
                  </div>
                )}

                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-lg">
                  <UserRound size={14} />
                </div>

              </div>
            </div>

            {/* PROFILE INFO */}

            <div className="min-w-0 flex-1 text-center lg:text-left">

              <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center">

                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {displayName}
                </h1>

                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Sparkles size={12} />
                  {roleLabel}
                </span>

              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                @{profile.username}
              </p>

              {/* BIO */}

              {profile.bio ? (
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground lg:mx-0">
                  {profile.bio}
                </p>
              ) : (
                <p className="mx-auto mt-4 max-w-2xl text-sm italic text-muted-foreground/60 lg:mx-0">
                  Belum menambahkan bio.
                </p>
              )}

              {/* META */}

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground lg:justify-start">

                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} />
                  Bergabung {joinDate}
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />

                <span className="inline-flex items-center gap-1.5">
                  <PenLine size={14} />
                  {profile.novel_count} novel
                </span>

              </div>

            </div>

            {/* =================================================
                ACTION
            ================================================== */}

            <div className="flex shrink-0 justify-center lg:justify-end">

              {isOwnProfile ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(
                      '/settings/profile'
                    )
                  }
                  className="h-10 rounded-xl px-4"
                >
                  <Settings
                    size={16}
                    className="mr-2"
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
                  disabled={
                    followAction
                  }
                  className={cn(
                    'h-10 rounded-xl px-5',
                    !isFollowing &&
                      'glow-primary-sm'
                  )}
                >
                  {followAction && (
                    <Loader2
                      size={16}
                      className="mr-2 animate-spin"
                    />
                  )}

                  {isFollowing
                    ? 'Mengikuti'
                    : 'Ikuti'}
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="h-10 rounded-xl px-5 glow-primary-sm"
                  onClick={() =>
                    navigate('/login')
                  }
                >
                  Masuk untuk Mengikuti
                </Button>
              )}

            </div>
          </div>

          {/* ==================================================
              STATISTICS
          =================================================== */}

          <div className="mt-7 grid grid-cols-3 overflow-hidden rounded-2xl border border-border bg-background/40">

            {/* NOVEL */}

            <div className="flex flex-col items-center justify-center border-r border-border px-2 py-4">
              <BookOpen
                size={17}
                className="mb-1.5 text-primary"
              />

              <span className="text-lg font-bold text-foreground">
                {profile.novel_count}
              </span>

              <span className="text-[11px] text-muted-foreground sm:text-xs">
                Novel
              </span>
            </div>

            {/* FOLLOWERS */}

            <button
              type="button"
              className="flex flex-col items-center justify-center border-r border-border px-2 py-4 transition-colors hover:bg-secondary/40"
            >
              <Users
                size={17}
                className="mb-1.5 text-primary"
              />

              <span className="text-lg font-bold text-foreground">
                {profile.follower_count}
              </span>

              <span className="text-[11px] text-muted-foreground sm:text-xs">
                Pengikut
              </span>
            </button>

            {/* FOLLOWING */}

            <div className="flex flex-col items-center justify-center px-2 py-4">
              <UserPlus
                size={17}
                className="mb-1.5 text-primary"
              />

              <span className="text-lg font-bold text-foreground">
                {profile.following_count}
              </span>

              <span className="text-[11px] text-muted-foreground sm:text-xs">
                Mengikuti
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================
          NOVEL SECTION
      ======================================================= */}

      <section className="mt-8 sm:mt-10">

        {/* SECTION HEADER */}

        <div className="mb-5 flex items-end justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div className="h-8 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_12px_rgba(168,85,247,0.45)]" />

            <div className="min-w-0">

              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                Karya Penulis
              </p>

              <h2 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
                Novel oleh {displayName}
              </h2>

            </div>
          </div>

          {novels.length > 0 && (
            <span className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              {novels.length} karya
            </span>
          )}

        </div>

        {/* ====================================================
            NOVEL GRID
        ===================================================== */}

        {novels.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

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
          /* ==================================================
             EMPTY STATE
          =================================================== */

          <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-14 text-center sm:py-16">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen size={28} />
            </div>

            <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
              Belum ada novel
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {isOwnProfile
                ? 'Kamu belum menerbitkan novel. Mulai tulis ceritamu dan bagikan ke pembaca di Novel Semesta.'
                : `${displayName} belum menerbitkan novel.`}
            </p>

            {/* =================================================
                TULIS NOVEL
                HANYA UNTUK PROFILE SENDIRI + AUTHOR/ADMIN
            ================================================== */}

            {canWriteNovel && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() =>
                    navigate(
                      '/author/create-novel'
                    )
                  }
                  className="h-10 rounded-xl px-5 glow-primary-sm"
                >
                  <BookOpen
                    size={16}
                    className="mr-1.5"
                  />
                  Tulis Novel
                </Button>
              </div>
            )}

          </div>
        )}

      </section>
    </main>
  );
}