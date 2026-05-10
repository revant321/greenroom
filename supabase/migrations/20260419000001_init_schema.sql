-- 20260419000001_init_schema.sql

-- Shows
create table shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  roles jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index shows_user_idx on shows(user_id);

-- Musical numbers
create table musical_numbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index musical_numbers_show_idx on musical_numbers(show_id);

-- Harmonies
create table harmonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  storage_path text not null,
  measure_number integer,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index harmonies_mn_idx on harmonies(musical_number_id);

-- Scenes
create table scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  name text not null,
  "order" integer not null default 0,
  is_user_in_scene boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index scenes_show_idx on scenes(show_id);

-- Scene recordings (audio or video)
create table scene_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references scenes(id) on delete cascade,
  kind text not null check (kind in ('audio','video')),
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index scene_recordings_scene_idx on scene_recordings(scene_id);

-- Dance videos (file OR external url)
create table dance_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  title text not null default '',
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint dance_videos_has_media check (storage_path is not null or external_url is not null)
);
create index dance_videos_mn_idx on dance_videos(musical_number_id);

-- Sheet music (PDF)
create table sheet_music (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  musical_number_id uuid not null references musical_numbers(id) on delete cascade,
  title text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index sheet_music_mn_idx on sheet_music(musical_number_id);

-- Standalone songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_audition_song boolean not null default false,
  category text check (category in ('vocal','guitar')),
  status text not null default 'in-progress' check (status in ('in-progress','completed')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index songs_user_idx on songs(user_id);

-- Song parts (audio clips)
create table song_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  storage_path text not null,
  measure_number integer,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index song_parts_song_idx on song_parts(song_id);

-- Song tracks (audio, video, or link)
create table song_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  kind text not null check (kind in ('audio','video','link')),
  title text not null default '',
  storage_path text,
  external_url text,
  created_at timestamptz not null default now(),
  constraint song_tracks_has_media check (
    (kind = 'link' and external_url is not null) or
    (kind in ('audio','video') and storage_path is not null)
  )
);
create index song_tracks_song_idx on song_tracks(song_id);

-- Song sheet music (PDF)
create table song_sheet_music (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  title text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index song_sheet_music_song_idx on song_sheet_music(song_id);

-- Row-Level Security
alter table shows enable row level security;
alter table musical_numbers enable row level security;
alter table harmonies enable row level security;
alter table scenes enable row level security;
alter table scene_recordings enable row level security;
alter table dance_videos enable row level security;
alter table sheet_music enable row level security;
alter table songs enable row level security;
alter table song_parts enable row level security;
alter table song_tracks enable row level security;
alter table song_sheet_music enable row level security;

-- Owner-only policies (same shape for every table)
do $$
declare t text;
begin
  for t in select unnest(array[
    'shows','musical_numbers','harmonies','scenes','scene_recordings',
    'dance_videos','sheet_music','songs','song_parts','song_tracks','song_sheet_music'
  ]) loop
    execute format('create policy "%1$s_select_own" on %1$s for select using (user_id = auth.uid())', t);
    execute format('create policy "%1$s_insert_own" on %1$s for insert with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_update_own" on %1$s for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "%1$s_delete_own" on %1$s for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Media storage bucket (private)
insert into storage.buckets (id, name, public) values ('media','media', false)
  on conflict (id) do nothing;

create policy "media_read_own" on storage.objects for select
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_insert_own" on storage.objects for insert
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update_own" on storage.objects for update
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
