-- Testers can report any venue from anywhere, without the 15 minute limit,
-- so the app can be tried far from Pančevo. Add someone in the SQL editor:
--   insert into testers (user_id) select id from auth.users where email = '...';
-- No policies: clients can neither read nor change the list.

create table testers (
  user_id uuid primary key references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table testers enable row level security;

create function is_tester() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from testers where user_id = auth.uid());
$$;
revoke execute on function is_tester() from public, anon;
grant execute on function is_tester() to authenticated;

create or replace function submit_vibe_report(
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
  v_tester boolean := exists (select 1 from testers where user_id = auth.uid());
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

  if not v_tester and not st_dwithin(v_venue.location, v_point, 100) then
    raise exception 'too_far_from_venue';
  end if;

  if not v_tester and exists (
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
