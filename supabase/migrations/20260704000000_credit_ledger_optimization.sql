-- Optimize credit_ledger: auto-cleanup of old watch ad history

-- ============================================================================
-- 1. Enable pg_cron for scheduled cleanup jobs
-- ============================================================================

create extension if not exists pg_cron;

-- ============================================================================
-- 2. Create cleanup function to delete earn_video entries older than 2 months
-- ============================================================================

create function public.cleanup_old_watch_ad_history()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    delete from public.credit_ledger
    where type = 'earn_video'
      and created_at < now() - interval '2 months';
end;
$$;

-- Schedule the cleanup to run daily at 2 AM UTC
select cron.schedule(
    'cleanup-old-watch-ad-history',
    '0 2 * * *',
    'select public.cleanup_old_watch_ad_history();'
);
