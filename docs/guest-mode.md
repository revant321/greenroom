# Guest mode

greenroom can be used without creating an account. This doc explains how it
works, the one-time Supabase dashboard setup, how to verify the security
rules, and the text to paste into App Store review notes.

Tracking issue: https://github.com/revant321/greenroom/issues/51

## How it works (Option A from the issue: anonymous Supabase auth)

A guest is a real Supabase Auth user with no email, created with
`supabase.auth.signInAnonymously()`. Its JWT (the signed token the app sends
with every request) carries `is_anonymous: true` and a normal `sub` (user id).

Because it is a normal user:

- Every table's `user_id` default (`auth.uid()`) and every Row-Level Security
  policy (`user_id = auth.uid()`) works unchanged. RLS is the Postgres feature
  that filters rows per user on the server.
- Media uploads go to the same `media` bucket under the guest's id prefix.
- **Creating an account later does not move any data.** The app calls
  `linkIdentity` (Apple / Google) or `updateUser({ email, password })`
  (email), which attach a login method to the *same* user id.

### App flow

| Situation | What happens |
| --- | --- |
| Fresh install, online | `app/index.tsx` signs in as a guest automatically and opens Shows. No sign-in screen. |
| Fresh install, offline | Guest sign-in fails, a toast explains, and the login screen appears (it has "Continue without an account" for retrying). |
| Cold start after a sign-out | Login screen. `signOut()` stores a flag in the local SQLite KV store so we never silently mint a second guest for someone who chose to sign out. |
| Guest taps "Create an account" (Settings, banner, or sign-out warning) | `app/(app)/upgrade.tsx` links Apple / Google / email to the existing guest user. |
| The chosen identity already belongs to another greenroom account | Supabase returns `identity_already_exists` (or `email_exists`). Nothing is changed. The app shows a choice: keep working as a guest, or switch to that account (guest data is left behind, not deleted). |
| Email confirmation is on in Supabase | After entering email + password the user stays a guest until they tap the link in the email. The app tells them so. Their session becomes non-guest on the next token refresh. |
| Guest taps Sign out | A destructive confirmation warns the work will be permanently lost and offers "Create an account" instead. |

### What a guest can't do

Nothing today. Every feature works for a guest exactly as for a signed-in
user. If a future feature needs a verified email (sharing, notifications),
gate it on `useAuth().isGuest` and point the user at `/upgrade`.

## One-time Supabase dashboard setup

Do these in https://supabase.com → your project. Each is a single toggle.

1. **Allow guests.** Authentication → Sign In / Providers → scroll to
   "Anonymous sign-ins" → turn **on** → Save.
2. **Allow linking a login to an existing user.** Same page → "Allow manual
   linking" → turn **on** → Save. Without this, "Create an account" fails
   with `manual_linking_disabled`.
3. **(Recommended) Turn on the abuse guard.** Anonymous sign-ins can be
   spammed. Authentication → Rate Limits → lower "Anonymous sign-ins" if the
   default looks high for a personal app. Enabling a captcha is optional and
   not wired into the app.
4. **Cleanup job.** Database → Extensions → search `pg_cron` → Enable. Then
   apply the migration `supabase/migrations/20260914000001_anonymous_user_cleanup.sql`
   (it self-schedules when pg_cron is present). If the migration was applied
   before pg_cron was enabled, run this once in the SQL Editor:

   ```sql
   select cron.schedule(
     'delete_abandoned_anonymous_users',
     '15 4 * * *',
     $$select public.delete_abandoned_anonymous_users(interval '30 days');$$
   );
   ```

   The job deletes anonymous users older than 30 days that own no shows and
   no songs. A guest who has created anything is never touched.

## Verifying RLS for guests (do not assume)

Run this in the SQL Editor. It impersonates two guest users and checks that
neither can see the other's rows. Replace the two UUIDs with any two values;
they only have to differ.

```sql
begin;

-- Create two throwaway anonymous users.
insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- Act as guest 1 and create a show. `request.jwt.claims` is how auth.uid()
-- learns who is calling when there is no real HTTP request.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true}', true);
insert into public.shows (name) values ('Guest one show');
select count(*) as guest1_sees from public.shows;   -- expect 1

-- Act as guest 2.
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","is_anonymous":true}', true);
select count(*) as guest2_sees from public.shows;   -- expect 0

-- Guest 2 must also be unable to update or delete guest 1's row.
update public.shows set name = 'hacked' where name = 'Guest one show';  -- 0 rows
delete from public.shows where name = 'Guest one show';                 -- 0 rows

rollback;  -- throws everything away
```

Expected results are in the comments. If `guest2_sees` is anything other
than 0, stop and fix the policies before shipping.

Storage follows the same rule: the `media_*` policies compare the first
folder of the object path with `auth.uid()::text`, and a guest's uploads are
placed under its own id by `uploadMedia`.

## App Store review notes (paste into App Store Connect → App Review Information → Notes)

> greenroom does not require an account. On first launch the app creates an
> anonymous session automatically and opens directly to the Shows tab. All
> features (shows, musical numbers, scenes, audio recording, video, PDFs,
> songs) are available without signing in.
>
> Creating an account is optional and exists only so a user can keep their
> data across devices. It is offered in Settings → "Create an account" and
> supports Sign in with Apple, Google, or email and password.
>
> To review the sign-in flows you may use Sign in with Apple with any Apple
> ID, or the email/password test account: [fill in a Supabase test user
> before submitting]. Signing out of a guest session permanently discards
> that guest's data; the app warns before doing so.

## Known limitations

- **First launch needs network.** Guest sign-in creates a row on Supabase.
  Offline first launches land on the login screen with a retry button. This
  is the one thing the local-only design (Option B in the issue) would have
  fixed, and the issue judged it not worth a second data layer.
- **Two accounts can't be merged.** If a guest links an identity that already
  has its own greenroom account, the app offers to switch but the guest rows
  stay under the guest id. They are not deleted (the cleanup job only removes
  users who own nothing), so a manual merge is possible from the SQL Editor by
  updating `user_id` on the guest's rows.
- **Email confirmation is asynchronous.** With "Confirm email" on, the user
  stays a guest until they tap the link. The app can't deep-link back from
  that email yet; the session updates on the next token refresh (about an
  hour) or the next cold start.
