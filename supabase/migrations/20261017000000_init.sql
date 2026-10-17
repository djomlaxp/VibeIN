-- VibeIN: initial schema
-- Rules from the plan: report only within 100 m of the venue, one report per
-- venue per 15 minutes per user, videos up to 60 s deleted after 3 hours unless
-- the venue owner archives them.

create extension if not exists postgis;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type user_role as enum ('user', 'owner', 'admin');
create type venue_type as enum ('club', 'cafe', 'restaurant', 'concert_venue', 'stadium');
create type post_type as enum ('promo', 'event', 'info');
create type claim_status as enum ('pending', 'approved', 'rejected');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type venue_type not null,
  location geography(point, 4326) not null,
  address text,
  city text not null default 'Pančevo',
  description text,
  opening_hours jsonb,
  contact jsonb,
  photos text[] not null default '{}',
  owner_id uuid references profiles (id) on delete set null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index venues_location_idx on venues using gist (location);
create index venues_city_idx on venues (city);

create table venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  proof text,
  status claim_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table vibe_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  vibe smallint not null check (vibe between 1 and 5),
  crowd smallint not null check (crowd between 0 and 3), -- prazno, umereno, puno, krcato
  music_genre text,
  music_volume smallint check (music_volume between 1 and 5),
  queue_minutes smallint check (queue_minutes >= 0),
  comment text check (char_length(comment) <= 280),
  video_path text,
  video_duration_s smallint check (video_duration_s between 1 and 60),
  video_expires_at timestamptz,
  archived boolean not null default false,
  archived_at timestamptz,
  user_location geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  check ((video_path is null) = (video_duration_s is null))
);
create index vibe_reports_venue_time_idx on vibe_reports (venue_id, created_at desc);
create index vibe_reports_user_venue_time_idx on vibe_reports (user_id, venue_id, created_at desc);
create index vibe_reports_video_expiry_idx on vibe_reports (video_expires_at)
  where video_path is not null and not archived;

create table posts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  type post_type not null,
  title text not null,
  body text,
  image_url text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now()
);
create index posts_venue_idx on posts (venue_id, created_at desc);

create table favorites (
  user_id uuid not null references profiles (id) on delete cascade,
  venue_id uuid not null references venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

create table content_flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('report', 'post')),
  target_id uuid not null,
  user_id uuid not null references profiles (id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'removed', 'dismissed')),
  created_at timestamptz not null default now()
);

-- New auth user -> profile row
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Live vibe: reports from the last 90 minutes, newer reports weigh more
-- ---------------------------------------------------------------------------

create view venue_vibe_now with (security_invoker = true) as
select
  v.id as venue_id,
  round((sum(r.vibe * w.weight) / nullif(sum(w.weight), 0))::numeric, 1) as vibe_score,
  round((sum(r.crowd * w.weight) / nullif(sum(w.weight), 0))::numeric)::smallint as crowd,
  count(r.id) as report_count,
  max(r.created_at) as last_report_at
from venues v
left join vibe_reports r
  on r.venue_id = v.id and r.created_at > now() - interval '90 minutes'
left join lateral (
  select 1.0 - extract(epoch from now() - r.created_at) / (90 * 60) * 0.75 as weight
) w on r.id is not null
group by v.id;

-- ---------------------------------------------------------------------------
-- Submitting a report: all rules are enforced here, clients cannot insert directly
-- ---------------------------------------------------------------------------

create function submit_vibe_report(
  p_venue_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_vibe smallint,
  p_crowd smallint,
  p_music_genre text default null,
  p_music_volume smallint default null,
  p_queue_minutes smallint default null,
  p_comment text default null,
  p_video_path text default null,
  p_video_duration_s smallint default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_point geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  v_venue venues%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_venue from venues where id = p_venue_id;
  if not found then
    raise exception 'venue_not_found';
  end if;

  if v_venue.owner_id = v_uid then
    raise exception 'owner_cannot_report';
  end if;

  if not st_dwithin(v_venue.location, v_point, 100) then
    raise exception 'too_far_from_venue';
  end if;

  if exists (
    select 1 from vibe_reports
    where user_id = v_uid and venue_id = p_venue_id
      and created_at > now() - interval '15 minutes'
  ) then
    raise exception 'rate_limited';
  end if;

  -- Videos live in the user's own folder: vibe-videos/<uid>/<file>
  if p_video_path is not null and split_part(p_video_path, '/', 1) <> v_uid::text then
    raise exception 'invalid_video_path';
  end if;

  insert into vibe_reports (
    venue_id, user_id, vibe, crowd, music_genre, music_volume, queue_minutes,
    comment, video_path, video_duration_s, video_expires_at, user_location
  ) values (
    p_venue_id, v_uid, p_vibe, p_crowd, p_music_genre, p_music_volume, p_queue_minutes,
    p_comment, p_video_path, p_video_duration_s,
    case when p_video_path is not null then now() + interval '3 hours' end,
    v_point
  ) returning id into v_id;

  return v_id;
end $$;

-- Venue owner keeps a user's video on the venue profile (or removes it again)
create function set_video_archived(p_report_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_report vibe_reports%rowtype;
begin
  select r.* into v_report
  from vibe_reports r join venues v on v.id = r.venue_id
  where r.id = p_report_id and v.owner_id = auth.uid() and v.verified;
  if not found then
    raise exception 'not_venue_owner';
  end if;
  if v_report.video_path is null then
    raise exception 'no_video';
  end if;
  if p_archived and not v_report.archived and v_report.video_expires_at <= now() then
    raise exception 'video_expired';
  end if;

  update vibe_reports
  set archived = p_archived,
      archived_at = case when p_archived then now() end,
      -- un-archiving lets the normal cleanup delete it
      video_expires_at = case when p_archived then video_expires_at else least(video_expires_at, now()) end
  where id = p_report_id;
end $$;

-- ---------------------------------------------------------------------------
-- Video storage and 3 hour cleanup
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vibe-videos', 'vibe-videos', true, 50 * 1024 * 1024, array['video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

create policy "users upload videos to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vibe-videos' and (storage.foldername(name))[1] = auth.uid()::text);

create function cleanup_expired_videos() returns integer
language plpgsql security definer set search_path = public, storage as $$
declare
  v_paths text[];
begin
  select coalesce(array_agg(video_path), '{}') into v_paths
  from vibe_reports
  where video_path is not null and not archived and video_expires_at <= now();

  if cardinality(v_paths) = 0 then
    return 0;
  end if;

  delete from storage.objects where bucket_id = 'vibe-videos' and name = any (v_paths);

  update vibe_reports
  set video_path = null, video_duration_s = null
  where video_path = any (v_paths);

  return cardinality(v_paths);
end $$;

revoke execute on function cleanup_expired_videos() from public, anon, authenticated;

select cron.schedule('cleanup-expired-videos', '*/15 * * * *', 'select cleanup_expired_videos()');

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table venues enable row level security;
alter table venue_claims enable row level security;
alter table vibe_reports enable row level security;
alter table posts enable row level security;
alter table favorites enable row level security;
alter table content_flags enable row level security;

create policy "profiles are public" on profiles for select using (true);
create policy "users edit own profile" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "venues are public" on venues for select using (true);
create policy "owners edit their venue" on venues for update
  using (owner_id = auth.uid() and verified) with check (owner_id = auth.uid() and verified);
create policy "admins manage venues" on venues for all using (is_admin()) with check (is_admin());

create policy "users see own claims" on venue_claims for select using (user_id = auth.uid() or is_admin());
create policy "users create claims" on venue_claims for insert with check (user_id = auth.uid() and status = 'pending');
create policy "admins review claims" on venue_claims for update using (is_admin());

-- Reports are inserted only through submit_vibe_report()
create policy "reports are public" on vibe_reports for select using (true);
-- The reporter's GPS position is never readable by clients
revoke select on vibe_reports from anon, authenticated;
grant select (id, venue_id, user_id, vibe, crowd, music_genre, music_volume, queue_minutes,
  comment, video_path, video_duration_s, video_expires_at, archived, archived_at, created_at)
  on vibe_reports to anon, authenticated;
create policy "users delete own reports" on vibe_reports for delete using (user_id = auth.uid() or is_admin());

create policy "posts are public" on posts for select using (true);
create policy "owners manage posts" on posts for all
  using (exists (select 1 from venues v where v.id = venue_id and v.owner_id = auth.uid() and v.verified))
  with check (author_id = auth.uid() and exists (select 1 from venues v where v.id = venue_id and v.owner_id = auth.uid() and v.verified));
create policy "admins manage posts" on posts for all using (is_admin()) with check (is_admin());

create policy "users manage own favorites" on favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users create flags" on content_flags for insert with check (user_id = auth.uid());
create policy "admins manage flags" on content_flags for all using (is_admin()) with check (is_admin());

-- Coordinates for the app (geography is not readable as lat/lng over the REST API)
create view venues_with_coords with (security_invoker = true) as
select v.*, st_y(v.location::geometry) as lat, st_x(v.location::geometry) as lng
from venues v;
