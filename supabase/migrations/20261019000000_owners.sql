-- Venue owners: someone asks to own a venue, an admin approves, and the owner
-- can then edit the venue's details and post promotions (policies in init).

-- Owners may change only the details they manage, not the name, type or spot.
revoke update on venues from authenticated;
grant update (description, address, opening_hours, contact) on venues to authenticated;

-- One open request per person and venue
create unique index venue_claims_one_pending on venue_claims (venue_id, user_id) where status = 'pending';

create function review_venue_claim(p_claim_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_claim venue_claims;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  select * into v_claim from venue_claims where id = p_claim_id and status = 'pending' for update;
  if not found then
    raise exception 'claim_not_pending';
  end if;
  update venue_claims set status = case when p_approve then 'approved' else 'rejected' end::claim_status
  where id = p_claim_id;
  if p_approve then
    update venues set owner_id = v_claim.user_id, verified = true where id = v_claim.venue_id;
    update profiles set role = 'owner' where id = v_claim.user_id and role = 'user';
    update venue_claims set status = 'rejected'
    where venue_id = v_claim.venue_id and status = 'pending' and id <> p_claim_id;
  end if;
end;
$$;
revoke execute on function review_venue_claim(uuid, boolean) from public, anon;
grant execute on function review_venue_claim(uuid, boolean) to authenticated;

-- Make someone an admin in the SQL editor:
--   update profiles set role = 'admin' where id = (select id from auth.users where email = '...');
