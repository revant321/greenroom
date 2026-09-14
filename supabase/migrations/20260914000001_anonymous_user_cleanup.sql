-- 20260914000001_anonymous_user_cleanup.sql
--
-- Guest mode (issue #51) signs people in as anonymous Supabase users. Anyone
-- who opens the app once and never comes back leaves an empty auth.users row
-- behind. This migration adds a function that deletes anonymous users who
-- are older than a cutoff AND own nothing, and schedules it nightly with
-- pg_cron when that extension is available.
--
-- Every content table hangs off either shows or songs (musical numbers,
-- scenes, harmonies, recordings, videos and PDFs all reference a show;
-- parts, tracks and sheet music all reference a song), so "owns nothing"
-- only has to check those two tables. Deleting the auth.users row cascades
-- through every user_id foreign key, which is a no-op for an empty user.

create or replace function public.delete_abandoned_anonymous_users(
  older_than interval default interval '30 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with doomed as (
    delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - older_than
      and not exists (select 1 from public.shows s where s.user_id = u.id)
      and not exists (select 1 from public.songs g where g.user_id = u.id)
    returning u.id
  )
  select count(*) into deleted_count from doomed;
  return deleted_count;
end;
$$;

-- Only the server (service role / cron) should be able to run this.
revoke all on function public.delete_abandoned_anonymous_users(interval) from public;
revoke all on function public.delete_abandoned_anonymous_users(interval) from anon, authenticated;

-- Schedule nightly at 04:15 UTC if pg_cron is enabled. Enabling it is a
-- one-time dashboard step: Database → Extensions → pg_cron → Enable.
-- Re-running this migration after enabling the extension picks the job up.
do $cleanup$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'delete_abandoned_anonymous_users';
    perform cron.schedule(
      'delete_abandoned_anonymous_users',
      '15 4 * * *',
      $job$ select public.delete_abandoned_anonymous_users(interval '30 days'); $job$
    );
  else
    raise notice 'pg_cron is not enabled; skipped scheduling delete_abandoned_anonymous_users. Enable it in Database → Extensions, then follow docs/guest-mode.md to schedule the job.';
  end if;
end $cleanup$;
