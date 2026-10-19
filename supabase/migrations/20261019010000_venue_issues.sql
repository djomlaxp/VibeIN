-- Users tell us a venue has closed or changed its name; an admin checks and
-- then removes the venue or renames it.

create table venue_issues (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('closed', 'renamed')),
  new_name text check (char_length(new_name) between 2 and 60),
  status text not null default 'open' check (status in ('open', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  check (kind <> 'renamed' or new_name is not null)
);

-- One open report per person and venue
create unique index venue_issues_one_open on venue_issues (venue_id, user_id) where status = 'open';

alter table venue_issues enable row level security;
grant select, insert on venue_issues to authenticated;
create policy "users report venue issues" on venue_issues for insert with check (user_id = auth.uid());
create policy "users see own venue issues" on venue_issues for select using (user_id = auth.uid());
create policy "admins manage venue issues" on venue_issues for all using (is_admin()) with check (is_admin());

create function review_venue_issue(p_issue_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_issue venue_issues;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  select * into v_issue from venue_issues where id = p_issue_id and status = 'open' for update;
  if not found then
    raise exception 'issue_not_open';
  end if;
  if not p_accept then
    update venue_issues set status = 'dismissed' where id = p_issue_id;
  elsif v_issue.kind = 'closed' then
    -- Takes its reports, posts and the other open issues with it
    delete from venues where id = v_issue.venue_id;
  else
    update venues set name = v_issue.new_name where id = v_issue.venue_id;
    update venue_issues set status = 'accepted' where id = p_issue_id;
    update venue_issues set status = 'dismissed'
    where venue_id = v_issue.venue_id and kind = 'renamed' and status = 'open';
  end if;
end;
$$;
revoke execute on function review_venue_issue(uuid, boolean) from public, anon;
grant execute on function review_venue_issue(uuid, boolean) to authenticated;
