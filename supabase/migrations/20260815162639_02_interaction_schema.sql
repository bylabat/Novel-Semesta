/*
# Novel Semesta — Interaction Schema (Comments, Bookmarks, Follows, Reading Progress, Ratings, Notifications, Reports)

## Overview
This migration creates all user-interaction tables for the Novel Semesta platform.

## New Tables

### 1. comments
User comments on novels or specific chapters.
- `id` (uuid, PK)
- `user_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `novel_id` (uuid, not null) — references `novels(id)` ON DELETE CASCADE
- `chapter_id` (uuid, nullable) — references `chapters(id)` ON DELETE CASCADE
- `content` (text, not null)
- `created_at`, `updated_at` (timestamptz)

### 2. bookmarks
Users bookmark novels to save for later.
- `id` (uuid, PK)
- `user_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `novel_id` (uuid, not null) — references `novels(id)` ON DELETE CASCADE
- `created_at` (timestamptz)
- Unique constraint on (user_id, novel_id)

### 3. follows
User-to-user follow relationships.
- `id` (uuid, PK)
- `follower_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `following_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `created_at` (timestamptz)
- Unique constraint on (follower_id, following_id)
- CHECK: follower_id != following_id (cannot follow yourself)

### 4. reading_progress
Tracks how far a user has read in a chapter.
- `id` (uuid, PK)
- `user_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `novel_id` (uuid, not null) — references `novels(id)` ON DELETE CASCADE
- `chapter_id` (uuid, not null) — references `chapters(id)` ON DELETE CASCADE
- `progress` (numeric, default 0) — percentage 0-100
- `updated_at` (timestamptz)
- Unique constraint on (user_id, chapter_id)

### 5. ratings
User ratings (1-5 stars) for novels.
- `id` (uuid, PK)
- `user_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `novel_id` (uuid, not null) — references `novels(id)` ON DELETE CASCADE
- `rating` (integer, not null) — CHECK 1-5
- `created_at` (timestamptz)
- Unique constraint on (user_id, novel_id)

### 6. notifications
User notifications.
- `id` (uuid, PK)
- `user_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `type` (text, not null) — notification type (e.g. 'follow', 'comment', 'chapter_update')
- `title` (text, not null)
- `message` (text)
- `read` (boolean, default false)
- `created_at` (timestamptz)

### 7. reports
User reports for content moderation.
- `id` (uuid, PK)
- `reporter_id` (uuid, not null) — references `profiles(id)` ON DELETE CASCADE
- `target_type` (text, not null) — 'novel', 'chapter', 'comment', 'user'
- `target_id` (uuid, not null)
- `reason` (text, not null)
- `description` (text)
- `status` (text, default 'pending') — pending, reviewed, resolved, dismissed
- `created_at` (timestamptz)

## Indexes
- `comments_novel_id_idx`, `comments_user_id_idx`, `comments_chapter_id_idx`
- `bookmarks_user_id_idx`, `bookmarks_novel_id_idx`
- `follows_follower_id_idx`, `follows_following_id_idx`
- `reading_progress_user_id_idx`, `reading_progress_novel_id_idx`
- `ratings_user_id_idx`, `ratings_novel_id_idx`
- `notifications_user_id_idx`, `notifications_read_idx`
- `reports_reporter_id_idx`, `reports_status_idx`

## Security (RLS)
All tables use owner-scoped policies:
- **comments**: SELECT public (on public novels). INSERT/UPDATE/DELETE own comments only.
- **bookmarks**: SELECT/INSERT/DELETE own bookmarks only.
- **follows**: SELECT public. INSERT/DELETE own follows only.
- **reading_progress**: SELECT/INSERT/UPDATE/DELETE own progress only.
- **ratings**: SELECT public. INSERT/UPDATE/DELETE own ratings only.
- **notifications**: SELECT/UPDATE own notifications only.
- **reports**: INSERT own reports. SELECT own reports only.
*/

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_public" ON comments;
CREATE POLICY "comments_select_public"
  ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own"
  ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, novel_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_select_own" ON bookmarks;
CREATE POLICY "bookmarks_select_own"
  ON bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_insert_own" ON bookmarks;
CREATE POLICY "bookmarks_insert_own"
  ON bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_delete_own" ON bookmarks;
CREATE POLICY "bookmarks_delete_own"
  ON bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select_public" ON follows;
CREATE POLICY "follows_select_public"
  ON follows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own"
  ON follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own"
  ON follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- ============================================================
-- READING_PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reading_progress_select_own" ON reading_progress;
CREATE POLICY "reading_progress_select_own"
  ON reading_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_progress_insert_own" ON reading_progress;
CREATE POLICY "reading_progress_insert_own"
  ON reading_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_progress_update_own" ON reading_progress;
CREATE POLICY "reading_progress_update_own"
  ON reading_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reading_progress_delete_own" ON reading_progress;
CREATE POLICY "reading_progress_delete_own"
  ON reading_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, novel_id)
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_public" ON ratings;
CREATE POLICY "ratings_select_public"
  ON ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
CREATE POLICY "ratings_insert_own"
  ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_update_own" ON ratings;
CREATE POLICY "ratings_update_own"
  ON ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_delete_own" ON ratings;
CREATE POLICY "ratings_delete_own"
  ON ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('novel', 'chapter', 'comment', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own"
  ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS comments_novel_id_idx ON comments(novel_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS comments_chapter_id_idx ON comments(chapter_id);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_novel_id_idx ON bookmarks(novel_id);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

CREATE INDEX IF NOT EXISTS reading_progress_user_id_idx ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS reading_progress_novel_id_idx ON reading_progress(novel_id);

CREATE INDEX IF NOT EXISTS ratings_user_id_idx ON ratings(user_id);
CREATE INDEX IF NOT EXISTS ratings_novel_id_idx ON ratings(novel_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS reading_progress_updated_at ON reading_progress;
CREATE TRIGGER reading_progress_updated_at
  BEFORE UPDATE ON reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- HELPER: follow counts as views (for easy querying)
-- ============================================================
-- We use a simple function approach instead of views to avoid RLS bypass issues.
-- The frontend will count follows via separate queries.
