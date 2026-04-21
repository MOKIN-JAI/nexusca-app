# NexusCA — CA Firm Intelligence Platform

A relational dashboard for Indian Chartered Accountancy firms. Manage clients, banks, properties, ITRs, debtors and KYC docs with strict per-tenant Row Level Security.

## Tech stack

- **Frontend:** React 18 · Vite 5 · TypeScript 5
- **Styling:** Tailwind CSS v3 (HSL semantic tokens) · shadcn/ui · lucide-react
- **State / data:** Zustand · TanStack Query
- **Maps / charts:** react-leaflet · recharts
- **Backend:** Supabase (Postgres + Auth + Storage + RLS)
- **Hosting:** GitHub Pages (static) deployed via GitHub Actions

---

## 1. Local setup

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
# edit .env and paste your Supabase URL + anon key

# 3. Run dev server (http://localhost:8080)
npm run dev
```

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Your Supabase project URL, e.g. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key from Supabase → Settings → API |
| `VITE_BASE_PATH` | no | Override Vite `base`. Default `/nexusca-app/` in production, `/` in dev. Set to `/` for a custom domain. |

---

## 2. Supabase setup

1. Create a free project at <https://supabase.com>.
2. Copy **Project URL** and **anon public key** from Settings → API into your `.env`.
3. In **SQL Editor**, run in order:
   - `supabase/schema.sql` — tables, enums, `has_role()`, helper functions
   - `supabase/rls.sql` — Row-Level Security policies
   - `supabase/seed.sql` — demo banks, clients, debtors, ITRs (run **after** creating the auth users below)
4. **Storage** → create private buckets: `kyc-docs`, `property-docs`, `bank-docs`, `itr-docs`. Create one public bucket: `avatars`.
5. **Authentication → Users → Add user** (tick "Auto Confirm User"):
   - `priya@nexusca.demo` / `Nexus@123`
   - `rajesh@demo.in` / `Nexus@123`
   - `sunita@demo.in` / `Nexus@123`
6. Re-run `supabase/seed.sql` so Priya is promoted to `employee` and demo data is linked.

---

## 3. Deploy to GitHub Pages

1. Push the repo to GitHub. Name it **`nexusca-app`** (or update `VITE_BASE_PATH` in repo secrets to match a different name).
2. **Settings → Pages → Build and deployment → Source = GitHub Actions** (the included workflow targets the `gh-pages` branch via `peaceiris/actions-gh-pages`, so also set Source = "Deploy from a branch" → branch `gh-pages` / folder `/ (root)` after the first run).
3. **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main`. The workflow at `.github/workflows/deploy.yml` will:
   - install deps
   - build with your secrets injected
   - copy `index.html` → `404.html` (SPA fallback for deep links)
   - publish `dist/` to the `gh-pages` branch
5. Visit `https://<your-username>.github.io/nexusca-app/`.

### Routing on GitHub Pages

GitHub Pages serves static files only, so deep links like `/employee/clients` would 404 on refresh. We solve this with the **404.html redirect trick** (`public/404.html` + a small decoder in `index.html`). All routes work after deployment:

- `/nexusca-app/`
- `/nexusca-app/login`
- `/nexusca-app/employee`
- `/nexusca-app/employee/clients`
- `/nexusca-app/employee/banks`
- `/nexusca-app/employee/risks`
- `/nexusca-app/employee/tax`
- `/nexusca-app/client`

---

## Demo credentials

| Email | Password | Role | Sees |
|---|---|---|---|
| `priya@nexusca.demo` | `Nexus@123` | Employee | All assigned clients, bank overlaps, risks, cross-firm advisory |
| `rajesh@demo.in` | `Nexus@123` | Customer | Own profile only (RLS enforced) |
| `sunita@demo.in` | `Nexus@123` | Customer | Own profile only (RLS enforced) |

You can also self-register from the Login screen (Sign up tab) — new accounts are auto-seeded with demo bank, property, debtor and KYC records via the `handle_new_customer` trigger.

---

## Scripts

```bash
npm run dev        # local dev (port 8080)
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run lint       # eslint
npm run test       # vitest
```
