-- Admins get a notification when someone reports a venue closed or renamed,
-- or asks to take over a venue's profile, so they don't have to keep checking /admin.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('video_archived', 'venue_issue', 'venue_claim'));

create function notify_admins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, venue_id)
  select p.id, case tg_table_name when 'venue_issues' then 'venue_issue' else 'venue_claim' end, new.venue_id
  from profiles p
  where p.role = 'admin' and p.id <> new.user_id;
  return new;
end $$;

create trigger venue_issues_notify_admins after insert on venue_issues
  for each row execute function notify_admins();
create trigger venue_claims_notify_admins after insert on venue_claims
  for each row execute function notify_admins();
