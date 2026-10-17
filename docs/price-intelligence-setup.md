# TrueSource background intelligence

The codebase contains two Trigger.dev tasks:

- `truesource-marketplace-scan` runs every minute. Crawlee limits the worker to
  six concurrent searches, 60 requests per minute, two retries, and a one-second
  same-domain delay. Existing per-platform cooldowns and jitter still apply.
- `truesource-enrich-price-history` runs every ten minutes. Transformers.js
  creates 384-dimensional MiniLM embeddings and stores them in Supabase pgvector.

The existing `/api/cron` scheduler remains a working fallback. Do not disable it
until Trigger.dev shows successful production runs.

## One-time activation

1. Run `supabase/migrations/20261017_price_intelligence.sql` in the Supabase SQL
   editor. This creates the private `market_history` table, HNSW vector index,
   and server-only similarity function.
2. Create a Trigger.dev project and set its project reference as
   `TRIGGER_PROJECT_REF`.
3. In Trigger.dev Production environment variables, add the existing
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` values. The
   Trigger.dev Vercel integration can sync these without copying them manually.
4. Run `npm run trigger:deploy` once, or connect the Trigger.dev GitHub/Vercel
   integration for automatic deployments.
5. Confirm both tasks have a successful run before replacing any existing cron.

No Hugging Face API key is required. The open-source model is downloaded and
cached inside the Trigger.dev worker on first use.

