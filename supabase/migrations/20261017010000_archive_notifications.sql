-- When a venue owner archives a user's video, the author is notified and can
-- withdraw it. A withdrawn video is deleted by the normal cleanup and the owner
-- cannot archive it again.

alter table vibe_reports add column archive_withdrawn boolean not null default false;

grant select (archive_withdrawn) on vibe_reports to anon, authenticated;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('video_archived')),
  report_id uuid references vibe_reports (id) on delete cascade,
  venue_id uuid references venues (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

alter table notifications enable row level security;
create policy "users see own notifications" on notifications for select using (user_id = auth.uid());
create policy "users mark own notifications read" on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function set_video_archived(p_report_id uuid, p_archived boolean) returns void
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
  if p_archived and v_report.archive_withdrawn then
    raise exception 'archive_withdrawn';
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

  if p_archived and not v_report.archived then
    insert into notifications (user_id, type, report_id, venue_id)
    values (v_report.user_id, 'video_archived', v_report.id, v_report.venue_id);
  end if;
end $$;

-- The author takes their video back out of the venue's archive
create function withdraw_archived_video(p_report_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update vibe_reports
  set archived = false,
      archived_at = null,
      archive_withdrawn = true,
      video_expires_at = least(coalesce(video_expires_at, now()), now())
  where id = p_report_id and user_id = auth.uid() and video_path is not null;
  if not found then
    raise exception 'not_video_author';
  end if;
end $$;
