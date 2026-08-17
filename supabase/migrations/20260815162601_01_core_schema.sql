/*
# Novel Semesta — Core Schema (Profiles, Genres, Novels, Chapters)

## Overview
This migration creates the foundational tables for the Novel Semesta platform:
user profiles, genres, novels, novel-genre relationships, and chapters.

## New Tables

### 1. profiles
Extends Supabase's built-in `auth.users` with public-facing user data.
- `id` (uuid, PK) — references `auth.users(id)` ON DELETE CASCADE
- `username` (text, unique, not null) — unique handle for profile URLs
- `email` (text, not null) — synced from auth.users
- `display_name` (text) — user's display name
- `avatar` (text) — avatar image URL
- `bio` (text) — user bio
- `role` (text, default 'reader') — one of: reader, author, moderator, admin
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 2. genres
- `id` (uuid, PK)
- `name` (text, unique, not null)
- `slug` (text, unique, not null)
- `created_at` (timestamptz, default now())

### 3. novels
- `id` (uuid, PK)
- `title` (text, not null)
- `slug` (text, unique, not null)
- `description` (text)
- `cover` (text) — cover image URL
- `author_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `status` (text, default 'ongoing') — one of: ongoing, completed, hiatus
- `visibility` (text, default 'public') — one of: public, private
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 4. novel_genres
Join table between novels and genres.
- `novel_id` (uuid) — references `novels(id)` ON DELETE CASCADE
- `genre_id` (uuid) — references `genres(id)` ON DELETE CASCADE
- PK: (novel_id, genre_id)

### 5. chapters
- `id` (uuid, PK)
- `novel_id` (uuid, not null) — references `novels(id)` ON DELETE CASCADE
- `title` (text, not null)
- `content` (text) — chapter content
- `chapter_number` (integer, not null)
- `word_count` (integer, default 0)
- `published` (boolean, default false)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Indexes
- `profiles_username_idx` — unique index on profiles.username
- `novels_slug_idx` — unique index on novels.slug
- `novels_author_id_idx` — index for querying novels by author
- `chapters_novel_id_idx` — index for querying chapters by novel
- `chapters_novel_chapter_idx` — unique composite for chapter ordering per novel

## Security (RLS)
- **profiles**: SELECT is public (anyone can view profiles). INSERT/UPDATE only for own profile.
- **genres**: SELECT is public. No INSERT/UPDATE/DELETE from client (managed via service role).
- **novels**: SELECT for public novels (visibility='public') OR own novels. INSERT/UPDATE/DELETE for own novels only.
- **novel_genres**: SELECT is public. INSERT/UPDATE/DELETE for novels owned by the user.
- **chapters**: SELECT for published chapters on public novels, OR own novels. INSERT/UPDATE/DELETE for own novels.

## Triggers
- `handle_new_user` — auto-creates a profile row when a new auth.users row is created.
- `update_updated_at` — auto-updates `updated_at` on profiles, novels, and chapters.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  display_name text,
  avatar text,
  bio text,
  role text NOT NULL DEFAULT 'reader' CHECK (role IN ('reader', 'author', 'moderator', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- GENRES
-- ============================================================
CREATE TABLE IF NOT EXISTS genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genres_select_public" ON genres;
CREATE POLICY "genres_select_public"
  ON genres FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- NOVELS
-- ============================================================
CREATE TABLE IF NOT EXISTS novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  cover text,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE novels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novels_select_public_or_own" ON novels;
CREATE POLICY "novels_select_public_or_own"
  ON novels FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public' OR author_id = auth.uid());

DROP POLICY IF EXISTS "novels_insert_own" ON novels;
CREATE POLICY "novels_insert_own"
  ON novels FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "novels_update_own" ON novels;
CREATE POLICY "novels_update_own"
  ON novels FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "novels_delete_own" ON novels;
CREATE POLICY "novels_delete_own"
  ON novels FOR DELETE
  TO authenticated USING (author_id = auth.uid());

-- ============================================================
-- NOVEL_GENRES
-- ============================================================
CREATE TABLE IF NOT EXISTS novel_genres (
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (novel_id, genre_id)
);

ALTER TABLE novel_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novel_genres_select_public" ON novel_genres;
CREATE POLICY "novel_genres_select_public"
  ON novel_genres FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "novel_genres_insert_own" ON novel_genres;
CREATE POLICY "novel_genres_insert_own"
  ON novel_genres FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM novels WHERE novels.id = novel_genres.novel_id AND novels.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "novel_genres_delete_own" ON novel_genres;
CREATE POLICY "novel_genres_delete_own"
  ON novel_genres FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM novels WHERE novels.id = novel_genres.novel_id AND novels.author_id = auth.uid())
  );

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  chapter_number integer NOT NULL,
  word_count integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapters_select_published_or_own" ON chapters;
CREATE POLICY "chapters_select_published_or_own"
  ON chapters FOR SELECT
  TO anon, authenticated
  USING (
    published = true AND EXISTS (
      SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.visibility = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chapters_insert_own" ON chapters;
CREATE POLICY "chapters_insert_own"
  ON chapters FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid())
  );

DROP POLICY IF EXISTS "chapters_update_own" ON chapters;
CREATE POLICY "chapters_update_own"
  ON chapters FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid()));

DROP POLICY IF EXISTS "chapters_delete_own" ON chapters;
CREATE POLICY "chapters_delete_own"
  ON chapters FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM novels WHERE novels.id = chapters.novel_id AND novels.author_id = auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS novels_author_id_idx ON novels(author_id);
CREATE INDEX IF NOT EXISTS chapters_novel_id_idx ON chapters(novel_id);
CREATE UNIQUE INDEX IF NOT EXISTS chapters_novel_chapter_idx ON chapters(novel_id, chapter_number);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::text, 1, 8),
    SPLIT_PART(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS novels_updated_at ON novels;
CREATE TRIGGER novels_updated_at
  BEFORE UPDATE ON novels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS chapters_updated_at ON chapters;
CREATE TRIGGER chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED GENRES
-- ============================================================
INSERT INTO genres (name, slug) VALUES
  ('Action', 'action'),
  ('Fantasy', 'fantasy'),
  ('Romance', 'romance'),
  ('Reinkarnasi', 'reinkarnasi'),
  ('Martial Arts', 'martial-arts'),
  ('Sci-Fi', 'sci-fi'),
  ('Horror', 'horror'),
  ('Komedi', 'komedi'),
  ('Slice of Life', 'slice-of-life'),
  ('Mystery', 'mystery'),
  ('Thriller', 'thriller'),
  ('Drama', 'drama')
ON CONFLICT (name) DO NOTHING;
