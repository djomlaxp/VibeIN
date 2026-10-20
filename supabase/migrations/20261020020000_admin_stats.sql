-- Statistics for the admin panel, computed in one call. Only admins may run
-- it; it reads across all users, so it runs with the owner's rights.
-- Days and hours are counted in Serbian time. Rerunnable.

create or replace function admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Europe/Belgrade';
  today timestamptz := date_trunc('day', now() at time zone tz) at time zone tz;
  week timestamptz := today - interval '6 days';
  result jsonb;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from profiles),
      'today', (select count(*) from profiles where created_at >= today),
      'week', (select count(*) from profiles where created_at >= week)),
    'reports', jsonb_build_object(
      'total', (select count(*) from vibe_reports),
      'today', (select count(*) from vibe_reports where created_at >= today),
      'week', (select count(*) from vibe_reports where created_at >= week),
      'with_video', (select count(*) from vibe_reports where video_expires_at is not null),
      'with_video_week', (select count(*) from vibe_reports where video_expires_at is not null and created_at >= week)),
    'live_now', (select count(distinct venue_id) from vibe_reports where created_at > now() - interval '90 minutes'),
    'venues', (select count(*) from venues),
    'owners', (select count(distinct owner_id) from venues where owner_id is not null),
    'posts', jsonb_build_object(
      'total', (select count(*) from posts),
      'week', (select count(*) from posts where created_at >= week)),
    'favorites', (select count(*) from favorites),

    -- New sign-ups per day for the last 30 days, oldest first, zeros included
    'signups_by_day', (
      select jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(c, 0)) order by d)
      from generate_series(today - interval '29 days', today, interval '1 day') d
      left join (
        select date_trunc('day', created_at at time zone tz) at time zone tz as day, count(*) c
        from profiles group by 1
      ) s on s.day = d),

    -- When people go out: reports per weekday (1 = Monday) and per hour
    'reports_by_weekday', (
      select jsonb_agg(coalesce(c, 0) order by w)
      from generate_series(1, 7) w
      left join (select extract(isodow from created_at at time zone tz)::int dow, count(*) c from vibe_reports group by 1) s on s.dow = w),
    'reports_by_hour', (
      select jsonb_agg(coalesce(c, 0) order by h)
      from generate_series(0, 23) h
      left join (select extract(hour from created_at at time zone tz)::int hr, count(*) c from vibe_reports group by 1) s on s.hr = h),

    'top_genres', (
      select coalesce(jsonb_agg(jsonb_build_object('genre', music_genre, 'count', c) order by c desc), '[]')
      from (select music_genre, count(*) c from vibe_reports where music_genre is not null group by 1 order by 2 desc limit 8) g),

    'most_reported', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'type', v.type, 'count', c) order by c desc), '[]')
      from (select venue_id, count(*) c from vibe_reports group by 1 order by 2 desc limit 10) r join venues v on v.id = r.venue_id),
    'best_rated', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'type', v.type, 'score', round(a, 1), 'count', c) order by a desc, c desc), '[]')
      from (select venue_id, avg(vibe) a, count(*) c from vibe_reports group by 1 having count(*) >= 3 order by 2 desc, 3 desc limit 10) r
      join venues v on v.id = r.venue_id),
    'most_saved', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'type', v.type, 'count', c) order by c desc), '[]')
      from (select venue_id, count(*) c from favorites group by 1 order by 2 desc limit 10) f join venues v on v.id = f.venue_id),
    'top_reporters', (
      select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(p.display_name, ''), u.email), 'count', c) order by c desc), '[]')
      from (select user_id, count(*) c from vibe_reports group by 1 order by 2 desc limit 10) r
      join profiles p on p.id = r.user_id join auth.users u on u.id = r.user_id),
    'never_reported', (
      select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'type', v.type) order by v.name), '[]')
      from venues v where not exists (select 1 from vibe_reports r where r.venue_id = v.id)),
    'never_reported_count', (select count(*) from venues v where not exists (select 1 from vibe_reports r where r.venue_id = v.id))
  ) into result;

  return result;
end $$;

revoke execute on function admin_stats() from public, anon;
grant execute on function admin_stats() to authenticated;
