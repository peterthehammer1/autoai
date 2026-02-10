# Project Instructions — Auto Service Booking

## Stack
- **Runtime:** Node.js 18+
- **Hosting:** Vercel (auto-deploys from GitHub on push to main)
- **Database:** Supabase (managed PostgreSQL, accessed via `@supabase/supabase-js`)
- **Source Control:** GitHub

## Deployment
- Push to `main` triggers automatic Vercel deploy
- Environment variables are set in the Vercel dashboard
- Supabase credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

## Database
- Use the Supabase JS client for queries (not raw SQL at runtime)
- Use parameterized queries via Supabase's `.eq()`, `.in()`, etc. — never concatenate SQL
- DDL migrations (CREATE INDEX, CREATE FUNCTION) must be run via the Supabase SQL Editor or `psql`
- PostgreSQL extensions available: `pgvector`, `uuid-ossp`, `pgcrypto`
- DB host is IPv6-only — use Supabase dashboard for migrations unless you have IPv6 connectivity

## Preferences
- Keep dependencies minimal — avoid adding packages unless clearly needed
- Vanilla JS on frontend when possible (no framework overhead)
- Use `express.static` for serving frontend assets
