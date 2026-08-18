# Novel-Semesta

Novel-Semesta is a React + Vite + TypeScript web app for browsing, reading, and publishing Indonesian novels. Supabase provides authentication and application data.

## Running on Replit

The project runs with:

```bash
npm run dev
```

The Replit workflow serves the Vite app on port 5000.

## Required environment

Set these Replit Secrets before using Supabase-backed features:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The SQL migrations in `supabase/migrations/` must be applied to the connected Supabase project.

## User preferences

- Preserve the existing React/Vite/Supabase stack and project structure.