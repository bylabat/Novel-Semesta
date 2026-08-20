import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar: string | null;
  bio: string | null;
  role:
    | 'reader'
    | 'author'
    | 'moderator'
    | 'admin';
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;

  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<{ error: string | null }>;

  signIn: (
    identifier: string,
    password: string
  ) => Promise<{ error: string | null }>;

  signInWithGoogle: () => Promise<{
    error: string | null;
  }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ==========================================================
  // CREATE PROFILE IF MISSING
  // ==========================================================

  const ensureProfile = useCallback(
    async (authUser: User) => {
      try {
        // ------------------------------------------------------
        // CHECK EXISTING PROFILE
        // ------------------------------------------------------

        const {
          data: existingProfile,
          error: fetchError,
        } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (fetchError) {
          console.error(
            'Error fetching profile:',
            fetchError
          );

          return null;
        }

        // ------------------------------------------------------
        // PROFILE SUDAH ADA
        // ------------------------------------------------------

        if (existingProfile) {
          setProfile(
            existingProfile as Profile
          );

          return existingProfile as Profile;
        }

        // ------------------------------------------------------
        // DATA DASAR USER
        // ------------------------------------------------------

        const metadata =
          authUser.user_metadata ?? {};

        const email =
          authUser.email ?? '';

        const metadataUsername =
          typeof metadata.username ===
          'string'
            ? metadata.username
            : '';

        const metadataDisplayName =
          typeof metadata.display_name ===
          'string'
            ? metadata.display_name
            : '';

        /*
         * Untuk Google OAuth atau user yang belum
         * mempunyai username dari metadata, gunakan
         * bagian sebelum @ sebagai username dasar.
         */
        let username =
          metadataUsername.trim();

        if (!username) {
          username =
            email
              .split('@')[0]
              .toLowerCase()
              .replace(
                /[^a-z0-9_]/g,
                ''
              )
              .slice(0, 30);
        }

        if (!username) {
          username = `user_${authUser.id.slice(
            0,
            8
          )}`;
        }

        const displayName =
          metadataDisplayName.trim() ||
          username;

        // ------------------------------------------------------
        // CREATE PROFILE
        // ------------------------------------------------------

        const {
          data: newProfile,
          error: insertError,
        } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            username,
            email,
            display_name:
              displayName,
            avatar:
              typeof metadata.avatar_url ===
              'string'
                ? metadata.avatar_url
                : null,
            bio: null,
            role: 'reader',
          })
          .select('*')
          .single();

        if (insertError) {
          console.error(
            'Error creating profile:',
            insertError
          );

          return null;
        }

        const createdProfile =
          newProfile as Profile;

        setProfile(createdProfile);

        return createdProfile;
      } catch (error) {
        console.error(
          'Unexpected error ensuring profile:',
          error
        );

        return null;
      }
    },
    []
  );

  // ==========================================================
  // FETCH / ENSURE PROFILE
  // ==========================================================

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const {
          data: authUserData,
        } =
          await supabase.auth.getUser();

        const authUser =
          authUserData.user;

        if (
          !authUser ||
          authUser.id !== userId
        ) {
          setProfile(null);
          return null;
        }

        return await ensureProfile(
          authUser
        );
      } catch (error) {
        console.error(
          'Error fetching profile:',
          error
        );

        setProfile(null);

        return null;
      }
    },
    [ensureProfile]
  );

  // ==========================================================
  // AUTH STATE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: {
            session: currentSession,
          },
        } =
          await supabase.auth.getSession();

        if (!mounted) return;

        setSession(
          currentSession
        );

        setUser(
          currentSession?.user ?? null
        );

        if (currentSession?.user) {
          await fetchProfile(
            currentSession.user.id
          );
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(
          'Auth initialization error:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!mounted) return;

          setSession(newSession);

          setUser(
            newSession?.user ?? null
          );

          if (!newSession?.user) {
            setProfile(null);
            setLoading(false);
            return;
          }

          /*
           * Jangan menjalankan query Supabase langsung
           * secara await di dalam callback auth.
           */
          setTimeout(() => {
            if (!mounted) return;

            fetchProfile(
              newSession.user.id
            ).finally(() => {
              if (mounted) {
                setLoading(false);
              }
            });
          }, 0);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // ==========================================================
  // SIGN UP
  // ==========================================================

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      displayName: string
    ) => {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name:
                displayName,
            },
          },
        });

      if (error) {
        return {
          error: error.message,
        };
      }

      /*
       * Jika Supabase langsung memberikan session/user,
       * pastikan profile dibuat.
       */
      if (data.user) {
        const {
          data: existingProfile,
        } = await supabase
          .from('profiles')
          .select('id')
          .eq(
            'id',
            data.user.id
          )
          .maybeSingle();

        if (!existingProfile) {
          const {
            error: profileError,
          } =
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username,
                email,
                display_name:
                  displayName,
                avatar: null,
                bio: null,
                role: 'reader',
              });

          if (profileError) {
            console.error(
              'Failed to create profile:',
              profileError
            );
          }
        } else {
          const {
            error: updateError,
          } =
            await supabase
              .from('profiles')
              .update({
                username,
                display_name:
                  displayName,
              })
              .eq(
                'id',
                data.user.id
              );

          if (updateError) {
            console.error(
              'Failed to update profile:',
              updateError
            );
          }
        }
      }

      return {
        error: null,
      };
    },
    []
  );

  // ==========================================================
  // SIGN IN EMAIL / USERNAME
  // ==========================================================

  const signIn = useCallback(
    async (
      identifier: string,
      password: string
    ) => {
      const isEmail =
        identifier.includes('@');

      if (isEmail) {
        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email: identifier,
              password,
            }
          );

        if (error) {
          return {
            error: error.message,
          };
        }

        /*
         * Pastikan profile tersedia.
         */
        if (data.user) {
          await fetchProfile(
            data.user.id
          );
        }

        return {
          error: null,
        };
      }

      // ======================================================
      // LOGIN MENGGUNAKAN USERNAME
      // ======================================================

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from('profiles')
          .select('email')
          .eq(
            'username',
            identifier
          )
          .maybeSingle();

      if (
        profileError ||
        !profileData
      ) {
        return {
          error:
            'Username tidak ditemukan.',
        };
      }

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              profileData.email,
            password,
          }
        );

      if (error) {
        return {
          error: error.message,
        };
      }

      if (data.user) {
        await fetchProfile(
          data.user.id
        );
      }

      return {
        error: null,
      };
    },
    [fetchProfile]
  );

  // ==========================================================
  // GOOGLE LOGIN
  // ==========================================================

  const signInWithGoogle =
    useCallback(async () => {
      const {
        error,
      } =
        await supabase.auth.signInWithOAuth(
          {
            provider: 'google',
            options: {
              redirectTo:
                'https://2a83c6f2-56c9-4fe2-9dde-46786d7b9c29-00-18mh8tk036uyj.pike.replit.dev',
            },
          }
        );

      return {
        error:
          error?.message ?? null,
      };
    }, []);

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  const signOut =
    useCallback(async () => {
      await supabase.auth.signOut();

      setProfile(null);
      setUser(null);
      setSession(null);
    }, []);

  // ==========================================================
  // REFRESH PROFILE
  // ==========================================================

  const refreshProfile =
    useCallback(async () => {
      if (user) {
        await fetchProfile(
          user.id
        );
      }
    }, [
      user,
      fetchProfile,
    ]);

  // ==========================================================
  // PROVIDER
  // ==========================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}