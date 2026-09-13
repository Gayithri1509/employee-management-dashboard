# EMS -- Employee Management System

A role-based employee management dashboard: employee and department CRUD,
organization-wide search/filter/sort, an automatic audit trail, and
employee self-service, built on React + TypeScript + Vite with Supabase
(Postgres, Auth, Row Level Security) as the backend. There is no other
server -- the browser talks to Supabase directly, with Postgres itself
(RLS policies and SECURITY DEFINER functions) as the authorization
boundary.

## Requirements

- Node.js 20+
- A Supabase project (free tier is enough) with this repo's migrations
  applied (`supabase/migrations/`, in order)

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your Supabase project's URL
   and publishable ("anon") key (Project Settings > API in the Supabase
   dashboard). See `.env.example` for exactly which key is safe here --
   the `service_role` key must never go in this file or anywhere else the
   browser can read it.
3. Apply the database schema to your Supabase project:
   ```sh
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This runs every file in `supabase/migrations/` in order: schema,
   triggers, seed data (8 departments, 120 employees), RLS policies, and
   the SECURITY DEFINER RPCs that mutations go through. See
   `docs/database-architecture.md` for the schema and
   `supabase/migrations/0012_rls_security_foundation.sql` /
   `0013_employee_mutation_rpcs.sql` for the security model.
4. Create at least one real account by running the app and using the
   "Sign up" link on the sign-in page. New accounts always start with the
   `employee` role (hard-coded server-side, see
   `supabase/migrations/0011_profiles_signup_trigger.sql`, and never
   settable by the client). To bootstrap your first Admin, promote that one
   account by updating its `profiles.role` value directly in the Supabase
   dashboard (a one-time step -- `set_user_role` can't be used yet because
   no Admin exists to call it). After that, use the in-app **User & Access**
   page (Admin only) for every further role change -- it's the audited,
   secure path (`supabase/migrations/0016_admin_user_management_rpcs.sql`),
   and going back to the dashboard for later role changes should not be
   necessary.

## Running

```sh
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check (tsc) + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
npm test          # vitest
```

## Roles

Four roles exist (`profiles.role`): `admin`, `hr_manager`, `hr_staff`,
`employee`. What each can see and do is defined once, in
`src/lib/authorization.ts`, and enforced independently (and
authoritatively) by the database -- RLS policies in
`supabase/migrations/0012_rls_security_foundation.sql` and the mutation
RPCs in `0013_employee_mutation_rpcs.sql`/`0014_update_my_profile_rpc.sql`.
The frontend's role checks are a UX convenience; they are never the
security boundary.

## Deployment notes

- This is a static single-page app (Vite build output in `dist/`) that
  talks directly to Supabase -- any static host works (Netlify, Vercel,
  Cloudflare Pages, S3+CDN, etc.). No server-side runtime is required.
- **SPA fallback routing is already configured.** The app uses
  `react-router-dom`'s `BrowserRouter`, so every route (e.g. `/employees`,
  `/settings`) must be served `index.html` on a direct request/refresh,
  not a 404. `public/_redirects` (Netlify, Cloudflare Pages) and
  `vercel.json` (Vercel) both ship in this repo for that. Deploying
  somewhere else (e.g. S3+CloudFront, GitHub Pages) still needs an
  equivalent rewrite rule configured on that host.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as
  environment variables in your host's build settings -- never commit a
  real `.env` file (already covered by `.gitignore`).
- Run `npm run build` as your build command and serve the `dist/`
  directory.

## Project structure

```
src/
  pages/            One component per route (OverviewPage, EmployeesPage, ...)
  layouts/           AppLayout (sidebar + header + the shared org-data fetch)
  routes/            RequireCapability (route-level authorization guard)
  components/         Reusable presentational UI (cards, modals, dialogs, states)
  services/supabase/  Typed data-access functions -- the only code that calls Supabase
  lib/authorization.ts  The single role -> capability mapping
  hooks/               useCapabilities, useOrgData
  contexts/AuthContext.tsx  Session/profile/role state
  types/                 Employee/Database/Capability/etc. types
supabase/
  migrations/        Ordered, numbered SQL migrations (schema, RLS, RPCs)
docs/                 Design/architecture notes from earlier development stages
```

See `docs/database-architecture.md` for the database schema and design
rationale in depth.
