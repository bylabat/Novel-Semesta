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
  // FETCH PROFILE
  // ==========================================================

  const fetchProfile = useCallback(
    async (userId: string) => {
      const {
        data,
        error,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error(
          'Error fetching profile:',
          error
        );
        return;
      }

      setProfile(
        data as Profile | null
      );
    },
    []
  );

  // ==========================================================
  // AUTH STATE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('GOOGLE/INITIAL SESSION:', session);
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          console.log('AUTH EVENT:', _event, session);
          if (!mounted) return;

          setSession(session);
          setUser(session?.user ?? null);

          if (!session?.user) {
            setProfile(null);
            setLoading(false);
            return;
          }

          // Jangan await fetchProfile di dalam callback auth.
          setTimeout(() => {
            if (!mounted) return;

            fetchProfile(session.user.id)
              .finally(() => {
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

      // Update profile yang dibuat oleh trigger
      if (data.user) {
        const {
          error: updateError,
        } = await supabase
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
        const { error } =
          await supabase.auth.signInWithPassword(
            {
              email: identifier,
              password,
            }
          );

        return {
          error:
            error?.message ?? null,
        };
      }

      // Login menggunakan username
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

      const { error } =
        await supabase.auth.signInWithPassword(
          {
            email:
              profileData.email,
            password,
          }
        );

      return {
        error:
          error?.message ?? null,
      };
    },
    []
  );

  // ==========================================================
  // SIGN IN WITH GOOGLE
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