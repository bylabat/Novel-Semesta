import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Search,
  Users,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string | null;
  created_at: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);

    const { data, error: usersError } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      role,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    });

    if (usersError) {
      console.error(
        'Gagal mengambil pengguna:',
        usersError,
      );

      setError(
        'Gagal memuat daftar pengguna.',
      );
      setUsers([]);
    } else {
      const sortedUsers = [
        ...(data ?? []),
      ].sort((a, b) => {
        const aIsAdmin =
          a.role?.toLowerCase() === 'admin';

        const bIsAdmin =
          b.role?.toLowerCase() === 'admin';

        if (aIsAdmin && !bIsAdmin) {
          return -1;
        }

        if (!aIsAdmin && bIsAdmin) {
          return 1;
        }

        return 0;
      });

      setUsers(
        sortedUsers as Profile[],
      );
    }

    setLoading(false);
  }

  const filteredUsers = users.filter((user) => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return true;
    }

    return (
      user.username
        ?.toLowerCase()
        .includes(keyword) ||
      user.display_name
        ?.toLowerCase()
        .includes(keyword) ||
      user.role
        ?.toLowerCase()
        .includes(keyword)
    );
  });

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/admin/dashboard"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users
                  size={24}
                  className="text-primary"
                />
              </div>

              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Daftar Pengguna
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Kelola seluruh pengguna Novel Semesta.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total:{' '}
            <span className="font-semibold text-foreground">
              {users.length}
            </span>{' '}
            pengguna
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari username, nama, atau role..."
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>

        {/* CONTENT */}
        <section className="rounded-2xl border border-border bg-card">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Memuat pengguna...
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <p className="font-medium text-destructive">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchUsers}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <Users
                  size={40}
                  className="mx-auto text-muted-foreground"
                />

                <p className="mt-4 font-medium text-foreground">
                  Tidak ada pengguna ditemukan
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Coba gunakan kata pencarian lain.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Pengguna
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Username
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Role
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Bergabung
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              {(
                                user.display_name ||
                                user.username ||
                                'U'
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {user.display_name ||
                                  'Tanpa nama'}
                              </p>

                              <p className="truncate text-xs text-muted-foreground">
                                {user.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {user.username
                            ? `@${user.username}`
                            : '-'}
                        </td>

                        <td className="px-5 py-4">
                          {user.role?.toLowerCase() === 'admin' ? (
                            <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase text-red-400">
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-foreground">
                              {user.role || 'reader'}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {user.created_at
                            ? new Date(
                                user.created_at,
                              ).toLocaleDateString(
                                'id-ID',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                },
                              )
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="divide-y divide-border md:hidden">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 transition-colors active:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {(
                          user.display_name ||
                          user.username ||
                          'U'
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {user.display_name ||
                                'Tanpa nama'}
                            </p>

                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                              {user.username
                                ? `@${user.username}`
                                : 'Username belum diatur'}
                            </p>
                          </div>

                          {user.role?.toLowerCase() === 'admin' ? (
                            <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">
                              ADMIN
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium capitalize text-foreground">
                              {user.role || 'reader'}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-muted/20 p-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Bergabung
                            </p>

                            <p className="mt-1 truncate text-xs text-foreground">
                              {user.created_at
                                ? new Date(
                                    user.created_at,
                                  ).toLocaleDateString(
                                    'id-ID',
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )
                                : '-'}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              ID Pengguna
                            </p>

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {user.id}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

      </div>
    </main>
  );
}