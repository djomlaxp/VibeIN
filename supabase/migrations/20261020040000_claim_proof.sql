-- Proving a venue is yours. The person picks how to prove it:
--   instagram, facebook, website, visit: they show a public code on the
--     venue's own profile or site (or in person); only the real owner can.
--   phone, email: the admin sends a secret code to the venue's public phone
--     or email; the owner types it in the app. The claimant never sees it.
--   document: a photo or PDF of the business registration or a bill.
-- Claims are made only through create_venue_claim().

alter table venue_claims
  add column method text check (method in ('instagram', 'facebook', 'website', 'phone', 'email', 'document', 'visit')),
  add column venue_link text,
  add column code text,
  add column secret_code text,
  add column secret_confirmed boolean not null default false,
  add column secret_attempts smallint not null default 0,
  add column document_path text;

-- The secret code stays hidden from the claimant: no select on it for clients.
revoke select on venue_claims from authenticated, anon;
grant select (id, venue_id, user_id, proof, status, created_at, method, venue_link, code, secret_confirmed, document_path)
  on venue_claims to authenticated;
drop policy if exists "users create claims" on venue_claims;

create or replace function create_venue_claim(
  p_venue_id uuid,
  p_method text,
  p_venue_link text default null,
  p_note text default null,
  p_document_path text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text := lpad((floor(random() * 1000000))::int::text, 6, '0');
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from venues where id = p_venue_id and owner_id is not null) then
    raise exception 'venue_has_owner';
  end if;
  if p_method = 'document' and (p_document_path is null or split_part(p_document_path, '/', 1) <> v_uid::text) then
    raise exception 'document_missing';
  end if;
  if p_method in ('instagram', 'facebook', 'website', 'phone', 'email') and coalesce(trim(p_venue_link), '') = '' then
    raise exception 'venue_link_missing';
  end if;

  insert into venue_claims (venue_id, user_id, proof, method, venue_link, code, secret_code, document_path)
  values (
    p_venue_id, v_uid, nullif(trim(p_note), ''), p_method, nullif(trim(p_venue_link), ''),
    case when p_method in ('instagram', 'facebook', 'website', 'visit') then v_code end,
    case when p_method in ('phone', 'email') then v_code end,
    case when p_method = 'document' then p_document_path end
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function create_venue_claim(uuid, text, text, text, text) from public, anon;
grant execute on function create_venue_claim(uuid, text, text, text, text) to authenticated;

-- The owner types the code the admin sent to the venue's phone or email.
-- Five wrong tries lock the claim; the admin can still approve it by hand.
create or replace function confirm_claim_code(p_claim_id uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_claim venue_claims;
begin
  select * into v_claim from venue_claims
  where id = p_claim_id and user_id = auth.uid() and status = 'pending' for update;
  if not found or v_claim.secret_code is null then
    raise exception 'claim_not_pending';
  end if;
  if v_claim.secret_attempts >= 5 then
    raise exception 'too_many_attempts';
  end if;
  if trim(p_code) = v_claim.secret_code then
    update venue_claims set secret_confirmed = true where id = p_claim_id;
    return true;
  end if;
  update venue_claims set secret_attempts = secret_attempts + 1 where id = p_claim_id;
  return false;
end;
$$;
revoke execute on function confirm_claim_code(uuid, text) from public, anon;
grant execute on function confirm_claim_code(uuid, text) to authenticated;

-- Admin: pending claims with everything needed to check them, including the
-- venue's contacts already in the app and the claimant's email.
create or replace function admin_pending_claims() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'venue_id', c.venue_id, 'venue_name', v.name, 'venue_contact', v.contact,
      'proof', c.proof, 'method', c.method, 'venue_link', c.venue_link, 'code', c.code,
      'secret_code', c.secret_code, 'secret_confirmed', c.secret_confirmed,
      'secret_attempts', c.secret_attempts, 'document_path', c.document_path,
      'email', u.email, 'created_at', c.created_at
    ) order by c.created_at)
    from venue_claims c
    join venues v on v.id = c.venue_id
    left join auth.users u on u.id = c.user_id
    where c.status = 'pending'
  ), '[]'::jsonb);
end;
$$;
revoke execute on function admin_pending_claims() from public, anon;
grant execute on function admin_pending_claims() to authenticated;

-- Private bucket for the documents: the claimant uploads to their own folder,
-- only admins can open them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('claim-docs', 'claim-docs', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "users upload claim docs" on storage.objects;
create policy "users upload claim docs" on storage.objects for insert to authenticated
  with check (bucket_id = 'claim-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admins read claim docs" on storage.objects;
create policy "admins read claim docs" on storage.objects for select to authenticated
  using (bucket_id = 'claim-docs' and is_admin());
