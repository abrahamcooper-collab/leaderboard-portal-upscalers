# Sales Portal

Tracks sales for closers' teams and shows a live leaderboard that plays a
celebration video whenever an admin records a sale.

- **Admins** manage closers, teams, agents, monthly targets and videos, and record sales.
- **Closers** see their team's stats and can rename agents or change their phone numbers.
- **The leaderboard** (`/board`) is built for a TV. It updates live and celebrates each new sale.

Stack: Next.js 16 (App Router, Server Actions), Tailwind CSS v4, Supabase (Postgres, Auth, Realtime, Storage), deployed on Vercel.

## How it fits together

| Piece | Where |
|---|---|
| Database schema, security rules (RLS), leaderboard query | `supabase/migrations/` |
| Monthly totals | Computed from `sales` by the `leaderboard` SQL function. Totals are never stored. |
| Targets | `monthly_targets`. A target carries over to later months until changed. |
| Removing agents and closers | Archives them (`archived_at`) instead of deleting rows, so their sales are kept. A removed agent's sales still count toward the team total that month. The database blocks hard deletes that would take sales with them. |
| Live celebration | The board subscribes to inserts on `sales` (Supabase Realtime). |
| Videos | Supabase Storage bucket `celebration-videos`. The board downloads them once on load. |
| Code by feature | `src/features/{auth,teams,agents,sales,leaderboard}` (queries, actions, components) |

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run each file in `supabase/migrations/` in name order: `20261028000000_init.sql` first, then `20261028010000_archive_instead_of_delete.sql`.

### 2. Create the first admin

1. **Authentication → Users → Add user → Create new user.** Enter the admin's email and a password, and tick **Auto Confirm User**.
2. Copy the new user's **UID**, then run this in the SQL Editor:

   ```sql
   insert into public.profiles (id, full_name, role)
   values ('2ab77850-9ecf-446f-8fc1-25662bbc7846', 'Admin Name', 'admin');
   ```

Create closers from the app (**Teams → New closer**), not from the dashboard.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values from **Project Settings → API Keys**:

- the project URL
- the publishable key
- the secret key, which is server-only: never commit it or give it a `NEXT_PUBLIC_` prefix

Also set `APP_TIMEZONE` (for example `Asia/Karachi` or `America/New_York`). It decides when a month starts and ends.

### 4. Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in as the admin.

## Deploy to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add the four variables from `.env.local` under **Settings → Environment Variables**.
3. Deploy.

The Hobby plan is for non-commercial use only, so use Vercel Pro for the real thing. Supabase's free plan has no backups; move to Pro before the sales data matters.

## Setting up the TV

1. Sign in on the TV's browser (any admin or closer account) and open `/board`.
2. Click **Enable sound**. Browsers block video sound until someone clicks the page once.
3. Click **Full screen**.

The board refreshes itself every 5 minutes. It also catches up after a lost connection, and rolls over to the new month on its own.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Local dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Regenerate route types and run TypeScript |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm db:types` | Regenerate `database.types.ts` from the linked project (needs the Supabase CLI) |

## Changing the schema

Add a new file in `supabase/migrations/` and run it in the SQL Editor. Then update `src/lib/supabase/database.types.ts`, by hand or with `pnpm db:types`.
# leaderboard-portal-upscalers
