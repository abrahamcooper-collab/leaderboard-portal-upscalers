# Sales Portal

Tracks sales for closers' teams and shows a live leaderboard that plays a
celebration video whenever an admin records a sale.

- **Admins** manage closers, teams, agents, monthly targets and videos, and record sales.
- **Closers** see their team's stats and can rename agents or change their phone numbers.
- **The Sales Floor** (`/sales-floor`) is built for a TV. It updates live and celebrates each new sale.
- **Operations Closeout** (`/operations-closeout`) is the closer race: each closer runs toward their team target, with their photo as the runner's face. After a team's sale, its runner runs for 10 minutes and covers the new distance in exactly that time.
- **Page 3** (`/page-3`) is one full-screen picture, from `public/images/Page3/`.
- **Page 4** (`/page-4`) is one of two full-screen pictures from `public/images/page4/`, the other one on each visit.
- **Slideshow** (`/slideshow`, the ▶ Slideshow button in the header) loops Sales Floor → Operations Closeout → Page 3 → Page 4 with a slow cross-fade. It stays live: sales update the numbers and play their celebration over whatever is showing. Slide times are at the top of `src/app/slideshow/page.tsx`.
- **Photos** of closers and agents come from `public/images/team*/`. A closer's photo is matched by team, an agent's by team and name. The list is in `src/features/teams/roster-photos.ts`.

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
| Team colours and avatars | `teams.color` (palette in `src/features/teams/team-colors.ts`). Bitmojis go in the `avatars` bucket and show initials until set. |
| Code by feature | `src/features/{auth,teams,agents,sales,leaderboard,sales-floor,closer-race}` (queries, actions, components) |

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run each file in `supabase/migrations/` in name order:
   1. `20261028000000_init.sql`
   2. `20261028010000_archive_instead_of_delete.sql`
   3. `20261031000000_sales_floor.sql`
   4. `20261031010000_closer_moods.sql`

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

`vercel.json` runs the server code in Frankfurt (`fra1`), next to the Supabase database (AWS `eu-central-1`). Every page makes several database calls in a row, so keep the two in the same region: if the database ever moves, change `regions` to match.

The Hobby plan is for non-commercial use only, so use Vercel Pro for the real thing. Supabase's free plan has no backups; move to Pro before the sales data matters.

## Setting up the TV

1. Sign in on the TV's browser (any admin or closer account) and click **▶ Slideshow** (or open `/sales-floor` for the leaderboard alone).
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
