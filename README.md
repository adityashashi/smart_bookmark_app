# Smart Bookmark App

Simple bookmark manager built with:

- Next.js (App Router)
- Supabase (Auth + Postgres + Realtime)
- Tailwind CSS

## Features

1. Google OAuth login only (no email/password)
2. Logged-in user can add bookmark (`url` + `title`)
3. Bookmarks are private per user (enforced by RLS)
4. Bookmark list updates in realtime across tabs
5. User can delete own bookmarks

## Live URL

- Vercel: `ADD_YOUR_VERCEL_URL_HERE`

## Public GitHub Repo

- Repo: `ADD_YOUR_GITHUB_REPO_URL_HERE`

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy `.env.example` to `.env.local` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3) Supabase SQL setup

Run `supabase/schema.sql` in Supabase SQL Editor.

This creates:

- `bookmarks` table
- RLS policies for select/insert/delete only for owner
- Realtime publication for `bookmarks`

### 4) Configure Google OAuth in Supabase

In Supabase Dashboard:

- Auth -> Providers -> Google -> Enable
- Add Google OAuth client ID + secret from Google Cloud Console
- Keep Email provider disabled for this assignment

In Google Cloud Console OAuth client:

- Authorized redirect URI:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

In Supabase Auth URL settings:

- Site URL:
  - `http://localhost:3000`
- Additional redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

### 5) Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Push code to GitHub
2. Import repo in Vercel
3. Add env vars in Vercel project settings:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. Add Vercel callback URL in Supabase Auth redirect list
6. Test login and realtime in production

## Project Structure

- `src/app/page.tsx` - Server-rendered auth gate + initial bookmarks fetch
- `src/components/sign-in-button.tsx` - Google OAuth sign-in button
- `src/components/bookmarks-dashboard.tsx` - Add/delete bookmarks + realtime updates
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `src/lib/supabase/*` - Browser/server/middleware Supabase clients
- `src/proxy.ts` - Session refresh proxy
- `supabase/schema.sql` - Table, RLS policies, realtime setup

## Problems Faced and How They Were Solved

1. **OAuth callback loop / no session after login**
	- Cause: callback route/session cookies not handled correctly.
	- Fix: added `/auth/callback` route with `exchangeCodeForSession` and middleware session refresh.

2. **Cross-tab realtime not updating**
	- Cause: realtime subscription not scoped properly.
	- Fix: subscribed to `postgres_changes` on `bookmarks` with `user_id` filter and updated local state on INSERT/DELETE.

3. **Data privacy between users**
	- Cause: without RLS, client constraints alone are insufficient.
	- Fix: enabled RLS + explicit select/insert/delete owner-only policies using `auth.uid() = user_id`.

4. **Incorrect/missing redirect URLs in provider settings**
	- Cause: mismatch between local/prod callback URLs.
	- Fix: documented both local and production callback URLs and updated Supabase/Google settings.

## Verification Checklist

- [ ] Google login works
- [ ] Add bookmark works
- [ ] User A cannot view User B data
- [ ] Realtime updates work across two tabs
- [ ] Delete own bookmark works
- [ ] Production Vercel URL works
