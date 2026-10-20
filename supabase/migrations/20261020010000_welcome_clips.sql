-- Clips the admin puts on the welcome screen (page 3) in place of the
-- built-in example animations. Slot 1 is the big clip, 2 and 3 the small ones.
-- Rerunnable.

create table if not exists welcome_clips (
  slot smallint primary key check (slot between 1 and 3),
  video_path text not null,
  label text not null default '',
  updated_at timestamptz not null default now()
);

alter table welcome_clips enable row level security;

-- The welcome screen is shown before login, so anyone may read these.
drop policy if exists "anyone reads welcome clips" on welcome_clips;
create policy "anyone reads welcome clips" on welcome_clips for select using (true);

drop policy if exists "admins manage welcome clips" on welcome_clips;
create policy "admins manage welcome clips" on welcome_clips for all using (is_admin()) with check (is_admin());

grant select on welcome_clips to anon, authenticated;
grant insert, update, delete on welcome_clips to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('welcome', 'welcome', true, 50 * 1024 * 1024, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists "admins upload welcome clips" on storage.objects;
create policy "admins upload welcome clips" on storage.objects for insert to authenticated
  with check (bucket_id = 'welcome' and is_admin());

drop policy if exists "admins delete welcome clips" on storage.objects;
create policy "admins delete welcome clips" on storage.objects for delete to authenticated
  using (bucket_id = 'welcome' and is_admin());
